#!/usr/bin/env bash
# 重新生成拼音语音 mp3（edge-tts，微软在线 TTS）。
#
# 什么时候要跑：src/data/audio-script.json 增改了 clip（新台词、换载字、
# 听审后改 say）时。跳过已存在文件，可随时中断续跑。
#
# 为什么不接进构建：edge-tts 依赖 Python + 微软非官方端点（会挂/限流），
# 而构建必须能在只有 Node 的 CI 上跑通。产物（public/audio/*.mp3）已入库，
# 平时无需执行——与数学夜航 subset-font.sh 同哲学：本地生成、产物提交、CI 不碰。
#
# 用法：bash scripts/gen-voice.sh [--force] [--only 前缀]
#   --force       忽略已存在文件全量重生成
#   --only sy-    只处理 id 以该前缀开头的 clip
#
# 附带产物：
#   scripts/qa-listen.html   听审页（file:// 直接打开，人耳挑 candidates）
#   scripts/audio-qa/        candidates 候选音（gitignore，仅本地听审用；
#                            刻意不放 public/——Vite 会整目录拷进 dist 被 PWA 预缓存）
set -euo pipefail
cd "$(dirname "$0")/.."

VENV=scripts/.venv
if [ ! -x "$VENV/bin/python" ]; then
  echo "── 准备 Python 环境（edge-tts）──"
  python3 -m venv "$VENV"
fi
"$VENV/bin/python" -c 'import edge_tts' 2>/dev/null || "$VENV/bin/pip" install --quiet edge-tts

exec "$VENV/bin/python" scripts/gen_voice.py "$@"
