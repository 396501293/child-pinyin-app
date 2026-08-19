#!/usr/bin/env python3
"""从 davinfifield/mp3-chinese-pinyin-sound（Unlicense，公有领域）导入人声带调音节。

背景：edge-tts 念单字带句子语调而非 citation tone（声学审计 41/168 失败，家长反馈
「一二三四声分不出来」），带调音节全部换成该人声数据集；声母/韵母呼读音与台词仍用 TTS。

映射（我们的 clipId → 数据集文件名 stem）：
  sy-{base}{tone} → {base}{tone}，ü 记法：数据集用 uu（nǚ=nuu3），我们 file 用 v（sy-nv3.mp3）
  tv-{vowel}{tone} → 单元音成音节的书写形：i→yi、u→wu、ü→yu；a/e 直用；o 数据集无（tv-o* 仍 TTS）
  zt-{syllable} → citation 读音（全 T1，惟 ri=T4）
处理：测 input_i 后纯增益对齐 −19.7 LUFS（ln-* 中位数；不用 loudnorm 动态模式，
短音频会抽吸），true peak 封顶 −1 dBTP，重采样 24kHz 单声道 48kbps（与 TTS 音一致）。

用法：scripts/.venv/bin/python scripts/import_pinyin_dataset.py <数据集mp3目录> [--out 输出目录]
默认输出 public/audio/（覆盖同名旧 TTS 音）。gen_voice.py 会跳过 source!="tts" 的 clip。
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_JSON = ROOT / "src" / "data" / "audio-script.json"
TARGET_I = -19.7  # ln-* 台词的中位响度（LUFS）
MAX_TP = -1.0  # 增益后 true peak 上限（dBTP）

TV_TO_SYLLABLE = {"a": "a", "o": None, "e": "e", "i": "yi", "u": "wu", "ü": "yu"}
ZT_STEM = {
    "zhi": "zhi1", "chi": "chi1", "shi": "shi1", "ri": "ri4", "zi": "zi1",
    "ci": "ci1", "si": "si1", "yi": "yi1", "wu": "wu1", "yu": "yu1", "ye": "ye1",
    "yue": "yue1", "yuan": "yuan1", "yin": "yin1", "yun": "yun1", "ying": "ying1",
}


def dataset_stem(clip_id):
    """clipId → 数据集文件 stem；None = 数据集不覆盖（如 tv-o*）。"""
    if clip_id.startswith("sy-"):
        return clip_id[3:].replace("ü", "uu")
    if clip_id.startswith("tv-"):
        base = TV_TO_SYLLABLE[clip_id[3:-1]]
        return base + clip_id[-1] if base else None
    if clip_id.startswith("zt-"):
        return ZT_STEM[clip_id[3:]]
    return None


def measure(path):
    """返回 (input_i, input_tp)。"""
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path),
         "-af", "loudnorm=print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    block = re.search(r'\{[^{}]*"input_i"[^{}]*\}', out, re.S)
    data = json.loads(block.group(0))
    return float(data["input_i"]), float(data["input_tp"])


def convert(src, dst):
    input_i, input_tp = measure(src)
    gain = TARGET_I - input_i
    gain = min(gain, MAX_TP - input_tp)  # 防削波：增益后 TP 不超 −1 dBTP
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
         "-af", f"volume={gain:.2f}dB", "-ar", "24000", "-ac", "1",
         "-b:a", "48k", str(dst)],
        check=True,
    )
    return gain


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", help="mp3-chinese-pinyin-sound 的 mp3/ 目录")
    parser.add_argument("--out", default=str(ROOT / "public" / "audio"))
    args = parser.parse_args()
    dataset = Path(args.dataset)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = json.loads(SCRIPT_JSON.read_text(encoding="utf-8"))
    done, skipped, missing = 0, [], []
    for clip_id, clip in doc["clips"].items():
        if not clip_id.startswith(("sy-", "tv-", "zt-")):
            continue
        stem = dataset_stem(clip_id)
        if stem is None:
            skipped.append(clip_id)
            continue
        src = dataset / f"{stem}.mp3"
        if not src.exists():
            missing.append((clip_id, src.name))
            continue
        gain = convert(src, out_dir / clip["file"])
        print(f"{clip_id:<12} ← {src.name:<12} gain {gain:+.1f} dB")
        done += 1

    print(f"\n转换 {done} 条；数据集不覆盖（保持 TTS）：{skipped}")
    if missing:
        print(f"✗ 数据集缺文件：{missing}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
