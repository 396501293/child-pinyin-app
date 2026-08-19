#!/usr/bin/env python3
"""声调声学审计：对带调 clip（tv-*/sy-*/zt-*）提取 F0 轮廓并判型，与 id 里的预期声调对照。

用法（scripts/.venv 里需已 pip install praat-parselmouth numpy）：
  scripts/.venv/bin/python scripts/tone_audit.py                # 审计 public/audio
  scripts/.venv/bin/python scripts/tone_audit.py --dir <目录>   # 审计任意目录（文件名同 clip file）
  scripts/.venv/bin/python scripts/tone_audit.py --only tv-     # 只看某前缀
  scripts/.venv/bin/python scripts/tone_audit.py --json out.json  # 机器可读输出（挑选候选用）

判型（对轮廓半音化后）：
  T1 阴平=平（全程起伏小）· T2 阳平=升 · T3 上声=降后升（谷在中段）· T4 去声=降
失败口径：形状不符，或形状虽符但音域过小（T2/T3/T4 < 2 半音≈听不出来）。
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import parselmouth

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_JSON = ROOT / "src" / "data" / "audio-script.json"
AUDIO_DIR = ROOT / "public" / "audio"

# zt-* 的 id 不带调号，预期声调按其 citation 读音（载字）固定
ZT_TONES = {
    "zhi": 1, "chi": 1, "shi": 1, "ri": 4, "zi": 1, "ci": 1, "si": 1,
    "yi": 1, "wu": 1, "yu": 1, "ye": 1, "yue": 1, "yuan": 1, "yin": 1,
    "yun": 1, "ying": 1,
}

MIN_RANGE_ST = 2.0  # T2/T3/T4 的最小可辨音域（半音）


def expected_tone(clip_id):
    """从 clip id 解析预期声调；不带调（sm-/ym-/ln-）返回 None。"""
    if clip_id.startswith(("tv-", "sy-")):
        digit = clip_id[-1]
        return int(digit) if digit.isdigit() else None
    if clip_id.startswith("zt-"):
        return ZT_TONES.get(clip_id[3:])
    return None


def f0_contour(path):
    """返回 (times, f0_semitones re median)。

    抗噪管线（实测数据集/TTS 都需要）：
    1. 只取有声帧；
    2. 按「时间断开 或 相邻帧跳变 >2.5 半音」切段，取最长段 = 主元音——
       擦音（sh/z/x…）常被误跟踪出 500+Hz 的假高频点，与元音之间必有断点/跳变；
    3. 段内按强度掐头去尾（< 峰值 −15dB 的边缘帧 = 尾气/爬行嗓）；
    4. 3 点中值滤波，半音化（re 段中位数）。
    """
    snd = parselmouth.Sound(str(path))
    pitch = snd.to_pitch_ac(time_step=0.01, pitch_floor=65, pitch_ceiling=600)
    f0 = pitch.selected_array["frequency"]
    strength = pitch.selected_array["strength"]
    times = pitch.xs()
    voiced = f0 > 0
    if voiced.sum() < 5:
        return None, None
    f0, times, strength = f0[voiced], times[voiced], strength[voiced]

    # 2. 切段：短无声隙（≤120ms）若两侧 F0 连续则桥接——
    #    上声谷底常有爬行嗓失跟踪，硬切会把 V 形砍成一半
    runs, start = [], 0
    for i in range(1, len(f0)):
        gap = times[i] - times[i - 1] > 0.12
        jump = abs(12 * np.log2(f0[i] / f0[i - 1])) > 2.5
        if gap or jump:
            runs.append((start, i))
            start = i
    runs.append((start, len(f0)))
    # 主段 = 周期性强度总和最大的段（元音赢过被误跟踪的擦音段）
    a, b = max(runs, key=lambda r: float(strength[r[0]:r[1]].sum()))
    if b - a < 5:
        return None, None

    # 2b. 补谷底回升段：主段若整体下行，且其后 ≤0.5s 内有一段
    #     「起点低于主段起点、且在主段终点 ±6 半音内、段内净升 ≥2 半音」的段，
    #     视为上声被爬行嗓截断的回升半支，拼接回来（去声的爬行尾勾升幅到不了 2 半音）
    k = max(2, (b - a) // 5)
    main_falls = np.median(f0[b - k:b]) < np.median(f0[a:a + k]) * 2 ** (-1.5 / 12)
    tail_idx = None
    if main_falls:
        for r0, r1 in runs:
            if r0 < b or r1 - r0 < 5 or times[r0] - times[b - 1] > 0.5:
                continue
            st_vs_start = 12 * np.log2(f0[r0] / f0[a])
            st_vs_end = 12 * np.log2(f0[r0] / f0[b - 1])
            net_rise = 12 * np.log2(f0[r1 - 1] / f0[r0])
            if st_vs_start <= -1.0 and abs(st_vs_end) <= 6.0 and net_rise >= 2.0:
                tail_idx = (r0, r1)
                break

    # 3. 强度门限只掐主段的头（起音擦音）；不掐尾——上声回升尾极弱
    intensity = snd.to_intensity(minimum_pitch=65)
    dbs = np.array([intensity.get_value(t) for t in times[a:b]], dtype=float)
    dbs = np.nan_to_num(dbs, nan=-np.inf)
    lo = a + int(np.argmax(dbs >= np.nanmax(dbs) - 20))
    if b - lo < 5:
        lo = a
    if tail_idx:
        f0 = np.concatenate([f0[lo:b], f0[tail_idx[0]:tail_idx[1]]])
        times = np.concatenate([times[lo:b], times[tail_idx[0]:tail_idx[1]]])
    else:
        f0, times = f0[lo:b], times[lo:b]

    # 4. 中值滤波 + 半音化
    if len(f0) >= 3:
        f0 = np.array([np.median(f0[max(0, i - 1):i + 2]) for i in range(len(f0))])
    st = 12 * np.log2(f0 / np.median(f0))
    return times, st


def classify(st):
    """返回 (shape, features)。shape ∈ level/rising/dipping/falling/ambiguous。

    用「三段中位数」l1/l2/l3 抗边缘噪点（擦音假高频、尾部爬行嗓中值滤波压不净），
    音域用 10–90 百分位距同理。
    """
    n = len(st)
    third = max(2, n // 3)
    l1 = float(np.median(st[:third]))
    l2 = float(np.median(st[third:n - third])) if n - 2 * third >= 2 else float(np.median(st))
    l3 = float(np.median(st[-third:]))
    p10, p90 = np.percentile(st, [10, 90])
    rng = float(p90 - p10)
    net = l3 - l1

    feats = {"range": rng, "net": net, "l1": l1, "l2": l2, "l3": l3}

    if l2 <= l1 - 0.75 and l2 <= l3 - 0.75:
        return "dipping", feats
    if rng <= 1.5:
        return "level", feats
    if net >= 1.25 and l2 <= l3 + 0.5:
        return "rising", feats
    if net <= -1.25 and l2 <= l1 + 0.5:
        return "falling", feats
    return "ambiguous", feats


def judge(tone, shape, feats):
    """返回 (ok, reason)。"""
    rng = feats["range"]
    net = feats["net"]
    l1, l2, l3 = feats["l1"], feats["l2"], feats["l3"]
    if tone == 1:
        if shape == "level":
            return True, ""
        # 起音滑入/收尾漂移：净变 ≤2 半音、主体起伏 ≤3.5 半音仍算平
        if abs(net) <= 2.0 and rng <= 3.5:
            return True, "近平"
        return False, f"应平实为{shape}"
    if rng < MIN_RANGE_ST:
        return False, f"音域仅 {rng:.1f}st（<2 听不出）"
    if tone == 2:
        if shape == "rising":
            return True, ""
        if shape == "dipping" and net >= 1.0:
            return True, "先微降后升（阳平常态）"
        return False, f"应升实为{shape}"
    if tone == 3:
        if shape == "dipping":
            return True, ""
        # 半上（降到低平不回升）：降幅大头在前段完成，与去声（全程陡降）区分
        if shape == "falling" and l1 - l3 > 0 and (l1 - l2) / (l1 - l3) >= 0.65:
            return True, "半上（低降不回升）"
        # 低升：跟踪器丢了爬行嗓的下降段、只剩回升段时的形态
        if shape == "rising" and net >= 2.0:
            return True, "低升（降段被爬行嗓吃掉）"
        return False, f"应降后升实为{shape}"
    if tone == 4:
        if shape == "falling":
            return True, ""
        # 降后带一点爬行嗓回勾仍算降：谷够深且大势向下
        if shape == "dipping" and net <= -3.0:
            return True, "降+尾部微勾（爬行嗓）"
        return False, f"应降实为{shape}"
    return True, ""


def audit_file(path, tone):
    _, st = f0_contour(path)
    if st is None:
        return {"ok": False, "shape": "unvoiced", "reason": "有声帧不足", "feats": {}}
    shape, feats = classify(st)
    ok, reason = judge(tone, shape, feats)
    return {"ok": ok, "shape": shape, "reason": reason, "feats": feats}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", default=str(AUDIO_DIR), help="音频目录（默认 public/audio）")
    parser.add_argument("--only", default="", help="只审计 id 以该前缀开头的 clip")
    parser.add_argument("--json", default="", help="额外输出机器可读 JSON 到该路径")
    parser.add_argument("--files", nargs="*", default=None,
                        help="直接审计文件列表（文件名须含调号，如 ma3.mp3 / tv-a2.cand1.mp3）")
    args = parser.parse_args()

    rows = []
    if args.files is not None:
        for f in args.files:
            p = Path(f)
            stem = p.stem
            digit = next((c for c in reversed(stem) if c.isdigit()), None)
            tone = int(digit) if digit and digit in "1234" else None
            if tone is None:
                continue
            rows.append((stem, tone, audit_file(p, tone)))
    else:
        doc = json.loads(SCRIPT_JSON.read_text(encoding="utf-8"))
        audio_dir = Path(args.dir)
        for clip_id, clip in doc["clips"].items():
            if args.only and not clip_id.startswith(args.only):
                continue
            tone = expected_tone(clip_id)
            if tone is None:
                continue
            path = audio_dir / clip["file"]
            if not path.exists():
                rows.append((clip_id, tone, {"ok": False, "shape": "missing",
                                             "reason": "文件缺失", "feats": {}}))
                continue
            rows.append((clip_id, tone, audit_file(path, tone)))

    fails = [(i, t, r) for i, t, r in rows if not r["ok"]]
    print(f"{'clip':<14}{'预期':<4}{'实测':<11}{'判定':<4}{'音域st':>7}{'净变st':>7}  备注")
    for clip_id, tone, r in rows:
        f = r["feats"]
        rng = f"{f['range']:.1f}" if f else "-"
        net = f"{f['net']:+.1f}" if f else "-"
        mark = "ok" if r["ok"] else "✗"
        print(f"{clip_id:<14}T{tone:<3}{r['shape']:<11}{mark:<4}{rng:>7}{net:>7}  {r['reason']}")

    by_group = {}
    for clip_id, tone, r in rows:
        g = clip_id.split("-")[0]
        by_group.setdefault(g, [0, 0])
        by_group[g][0] += 1
        if not r["ok"]:
            by_group[g][1] += 1
    by_tone = {}
    for clip_id, tone, r in rows:
        by_tone.setdefault(tone, [0, 0])
        by_tone[tone][0] += 1
        if not r["ok"]:
            by_tone[tone][1] += 1
    print(f"\n共 {len(rows)} 条，失败 {len(fails)} 条 "
          f"({100 * len(fails) / max(1, len(rows)):.0f}%)")
    for g, (total, bad) in sorted(by_group.items()):
        print(f"  {g}-*: {bad}/{total} 失败")
    for t, (total, bad) in sorted(by_tone.items()):
        print(f"  T{t}: {bad}/{total} 失败")

    if args.json:
        out = [{"clip": i, "tone": t, **r} for i, t, r in rows]
        Path(args.json).write_text(json.dumps(out, ensure_ascii=False, indent=1),
                                   encoding="utf-8")

    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
