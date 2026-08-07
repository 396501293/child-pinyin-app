#!/usr/bin/env bash
# 重新生成 Andika 拼音字体子集（src/assets/fonts/andika-pinyin.woff2）。
#
# 什么时候要跑：`pnpm test` 报「字体子集缺字」时——说明课程数据/界面加了
# 新的拼音字符而字体子集没跟上，不重跑会在界面上渲染成豆腐块。
#
# 为什么不接进构建：子集化依赖 Python 的 fonttools，而构建必须能在
# 只有 Node 的 CI 上跑通（同姊妹项目 subset-font.sh 的理由）。产物已入库，
# 平时无需执行。
#
# 字体：SIL Andika（OFL 许可，识字教学专用：单层 a/g、调号全覆盖）。
# 只子集 Regular——拼音语境不用粗体（CSS 端 font-synthesis:none 禁伪粗）。
# ⚠️ 保留 --layout-features=ccmp,mark,mkmk：万一文本以 NFD 混入（组合调号），
# 这些特性负责把调号正确定位；置空会让秃调号静默上线。
#
# 用法：bash scripts/subset-andika.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ANDIKA_VER='7.000'
ANDIKA_URL="https://github.com/silnrsi/font-andika/releases/download/v${ANDIKA_VER}/Andika-${ANDIKA_VER}.zip"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "── 1/4 准备 Python 环境（fonttools + brotli）──"
python3 -m venv "$WORK/venv"
"$WORK/venv/bin/pip" install --quiet fonttools brotli

echo "── 2/4 下载 SIL Andika ${ANDIKA_VER}（OFL）──"
curl -sL -o "$WORK/andika.zip" "$ANDIKA_URL"
unzip -oq "$WORK/andika.zip" -d "$WORK/andika"
SRC=$(find "$WORK/andika" -name 'Andika-Regular.ttf' | head -1)
[ -n "$SRC" ] || { echo "❌ 未找到 Andika-Regular.ttf"; exit 1; }

echo "── 3/4 生成字符表（node 跑课程数据）──"
mkdir -p src/assets/fonts
node --experimental-strip-types scripts/gen-charset.mjs

echo "── 4/4 子集化 ──"
"$WORK/venv/bin/pyftsubset" "$SRC" \
  --text-file=src/assets/fonts/charset.txt \
  --output-file=src/assets/fonts/andika-pinyin.woff2 \
  --flavor=woff2 --layout-features=ccmp,mark,mkmk --no-hinting --desubroutinize

# 打印字面金属参数（FourLineGrid 的 x-height 对中线定位依赖这些比例，
# 换字体版本后需核对 src/ui/components/FourLineGrid.tsx 里的常量）。
"$WORK/venv/bin/python" - "$SRC" <<'PY'
import sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
upm = f['head'].unitsPerEm
print(f"   metrics: unitsPerEm={upm}"
      f" xHeight={f['OS/2'].sxHeight} ({f['OS/2'].sxHeight/upm:.4f}em)"
      f" capHeight={f['OS/2'].sCapHeight} ({f['OS/2'].sCapHeight/upm:.4f}em)"
      f" ascender={f['hhea'].ascender} descender={f['hhea'].descender}")
PY

BEFORE=$(stat -f%z "$SRC" 2>/dev/null || stat -c%s "$SRC")
AFTER=$(stat -f%z src/assets/fonts/andika-pinyin.woff2 2>/dev/null || stat -c%s src/assets/fonts/andika-pinyin.woff2)
printf '   %dKB → %dKB\n\n✅ 完成。跑 pnpm test 确认 charset 守卫通过。\n' $((BEFORE/1024)) $((AFTER/1024))
