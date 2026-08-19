#!/usr/bin/env python3
"""tv-o1..o4：以一段干净的 [o] 元音为底，PSOLA 重合成四声 citation 轮廓。

为什么不用 TTS/数据集：edge-tts 念单字带句子语调（声学审计中 tv-o* 全灭——
连"候选"里的 ō/ó/ǒ/ò 文本也被念成降调或平调）；davinfifield 人声数据集
没有裸 o 音节（普通话里 o 不单用）。故取底音元音，按赵元任五度制
（阴平55、阳平35、上声214、去声51）用 Praat Manipulation 强加标准轮廓——
四条共享同一元音音色，是声调听辨的理想最小对立组。

底音 scripts/tv-o-base.mp3 = 换库前 edge-tts XiaoxiaoNeural 念「噢」的元音段
（提交入库保证可复现）。输出直接写 public/audio/tv-o{1..4}.mp3，
响度对齐 −19.7 LUFS（ln-* 中位数），24kHz 单声道 48kbps。

用法：scripts/.venv/bin/python scripts/resynth_tv_o.py
"""

import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import parselmouth
from parselmouth.praat import call

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "scripts" / "tv-o-base.mp3"
OUT_DIR = ROOT / "public" / "audio"
TARGET_I = -19.7
MAX_TP = -1.0

# 说话人音域（底音中位 F0 ≈ 240Hz）：五度制 1→5 度对数均分 170→310 Hz
LOW, HIGH = 170.0, 310.0


def deg(n):
    """五度制第 n 度（1..5，可为小数）→ Hz。"""
    return LOW * (HIGH / LOW) ** ((n - 1) / 4)


# 各声调：目标时长（秒）+ 轮廓控制点（归一时间, 五度）
TONES = {
    1: (0.45, [(0.0, 4.8), (1.0, 4.8)]),                            # 阴平 55
    2: (0.50, [(0.0, 2.8), (0.2, 2.6), (1.0, 5.0)]),                # 阳平 35
    3: (0.60, [(0.0, 2.2), (0.45, 0.8), (0.7, 1.1), (1.0, 3.6)]),   # 上声 214
    4: (0.40, [(0.0, 5.0), (0.15, 4.9), (1.0, 0.9)]),               # 去声 51
}
PAD = 0.06  # 前后静音（秒）


def find_vowel(snd):
    """返回底音中有声段 (t0, t1)。"""
    pitch = snd.to_pitch_ac(time_step=0.01, pitch_floor=65, pitch_ceiling=600)
    f0 = pitch.selected_array["frequency"]
    times = pitch.xs()
    voiced = times[f0 > 0]
    return float(voiced[0]) - 0.02, float(voiced[-1]) + 0.02


def resynth(vowel, tone):
    dur_target, points = TONES[tone]
    dur_src = vowel.duration
    manip = call(vowel, "To Manipulation", 0.01, 65, 600)

    pt = call("Create PitchTier", f"t{tone}", 0, dur_src)
    for t_norm, degree in points:
        call(pt, "Add point", t_norm * dur_src, deg(degree))
    call([pt, manip], "Replace pitch tier")

    dt = call("Create DurationTier", f"d{tone}", 0, dur_src)
    call(dt, "Add point", 0, dur_target / dur_src)
    call([dt, manip], "Replace duration tier")

    out = call(manip, "Get resynthesis (overlap-add)")
    # 淡入淡出防爆音，前后补静音
    fade = min(0.03, out.duration / 4)
    n = out.values.shape[1]
    nf = int(fade * out.sampling_frequency)
    env = np.ones(n)
    env[:nf] = np.linspace(0, 1, nf)
    env[-nf:] = np.linspace(1, 0, nf)
    samples = out.values[0] * env
    sr = int(out.sampling_frequency)
    pad = np.zeros(int(PAD * sr))
    return parselmouth.Sound(np.concatenate([pad, samples, pad]), sampling_frequency=sr)


def measure(path):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path),
         "-af", "loudnorm=print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    data = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', out, re.S).group(0))
    return float(data["input_i"]), float(data["input_tp"])


def main():
    snd = parselmouth.Sound(str(BASE))
    t0, t1 = find_vowel(snd)
    vowel = snd.extract_part(t0, t1, parselmouth.WindowShape.RECTANGULAR, 1, False)
    for tone in (1, 2, 3, 4):
        result = resynth(vowel, tone)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            result.save(tmp.name, "WAV")
            input_i, input_tp = measure(tmp.name)
            gain = min(TARGET_I - input_i, MAX_TP - input_tp)
            dst = OUT_DIR / f"tv-o{tone}.mp3"
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", tmp.name,
                 "-af", f"volume={gain:.2f}dB", "-ar", "24000", "-ac", "1",
                 "-b:a", "48k", str(dst)],
                check=True,
            )
            Path(tmp.name).unlink()
        print(f"tv-o{tone}.mp3  时长 {result.duration:.2f}s  gain {gain:+.1f}dB")


if __name__ == "__main__":
    main()
