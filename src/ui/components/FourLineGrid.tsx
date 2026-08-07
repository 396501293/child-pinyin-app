// 四线三格（SVG）：拼音书写教学的标准格线。四条线夹出上/中/下三格，
// 字母的 x 高恰好占满中格，升部与调号入上格、降部入下格——与课本一致。
//
// 定位原理：SVG <text> 的 y 是基线；把基线钉在第三条线上，再按
// F = 中格高 / x-height比例 反推字号，x 高即与中格逐像素对齐。
// 金属参数来自 Andika 7.000（scripts/subset-andika.sh 会打印，换字体版本需核对）：
//   xHeight = 1040/2048 = 0.5078em；capHeight = 0.7251em；升部/调号 ≤ 上格（2×0.5078em）。
// 支持多字符单元（zh / ang / zhuō）：宽度按字符数放大，文本居中。

const X_HEIGHT_EM = 0.5078; // Andika OS/2.sxHeight / unitsPerEm
const CHAR_W_EM = 0.62;     // 小写平均步进的宽松上界（宽度只须「够」，文本居中不裁切）

interface FourLineGridProps {
  text: string;
  band?: number;     // 中格高（px）；字号 = band / 0.5078 ≈ 1.97 × band
  minWidth?: number; // 卡片场景强制等宽用
}

export function FourLineGrid({ text, band = 56, minWidth = 0 }: FourLineGridProps) {
  const F = band / X_HEIGHT_EM;
  const padX = Math.round(band * 0.5);
  const padY = Math.round(band * 0.3);
  const w = Math.max(Math.ceil(text.length * CHAR_W_EM * F) + padX * 2, band * 3, minWidth);
  const h = band * 3 + padY * 2;
  const y = (i: number) => padY + band * i; // 四条线：i = 0..3
  return (
    <svg class="pp-flg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label={text}>
      {/* 中格淡淡着色：告诉孩子「字的身体住在这一格」 */}
      <rect x="0" y={y(1)} width={w} height={band} class="pp-flg-mid" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="0" y1={y(i)} x2={w} y2={y(i)} class={i === 1 || i === 2 ? 'pp-flg-line pp-flg-line--mid' : 'pp-flg-line'} />
      ))}
      <text x={w / 2} y={y(2)} class="pp-flg-text pp-py" font-size={F} text-anchor="middle">
        {text}
      </text>
    </svg>
  );
}
