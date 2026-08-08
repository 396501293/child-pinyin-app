// 图鉴收藏品的代码画美术：12 件扁平卡通 SVG，按 item id 索引。
// 主色一律走 CSS token（内联 SVG 的 fill/stroke 支持 var(--candy-*)，与 styles.css
// :root 同源）；少量无 token 的点缀色（奶油高光/皮毛）保留字面值。风格与 PlanetIcon
// 一致：大色块 + 点睛小高光，零素材。未知 id 兜底渲染 collection.ts 的 emoji。
import type { JSX } from 'preact';
import { COLLECTION } from '../../core/collection';

const INK = 'var(--ink)';
const WHITE = 'var(--color-white-100)';

// 通用小圆眼（卡通角色共用）
const Eye = ({ cx, cy, r = 4.5 }: { cx: number; cy: number; r?: number }) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill={INK} />
    <circle cx={cx - r / 3} cy={cy - r / 3} r={r / 3.2} fill={WHITE} />
  </>
);

const star = (cx: number, cy: number, r: number): string => {
  // 五角星 path（尖朝上）
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)} ${(cy + rr * Math.sin(rad)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
};

// 每件收藏一段小 SVG（viewBox 96×96）。保持每件 ≤ 十来个元素，读得完、改得动。
const ART: Record<string, () => JSX.Element> = {
  stardust: () => (
    <>
      <path d={star(48, 50, 30)} fill="var(--candy-yellow)" stroke="var(--candy-yellow-deep)" stroke-width="3" stroke-linejoin="round" />
      <path d={star(20, 24, 8)} fill="#fff3c4" />
      <path d={star(78, 30, 6)} fill="#fff3c4" />
      <Eye cx={41} cy={48} /><Eye cx={55} cy={48} />
      <path d="M42 58 Q48 63 54 58" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" />
    </>
  ),
  'moon-bunny': () => (
    <>
      <path d="M62 12 A38 38 0 1 0 88 62 A30 30 0 0 1 62 12 Z" fill="#ffe9a8" stroke="#e8c46a" stroke-width="3" />
      <ellipse cx="38" cy="26" rx="7" ry="17" fill={WHITE} stroke="#d9c9e8" stroke-width="2.5" />
      <ellipse cx="56" cy="28" rx="7" ry="16" fill={WHITE} stroke="#d9c9e8" stroke-width="2.5" transform="rotate(14 56 28)" />
      <ellipse cx="38" cy="30" rx="3" ry="9" fill="#ffc7dc" />
      <circle cx="47" cy="58" r="20" fill={WHITE} stroke="#d9c9e8" stroke-width="3" />
      <Eye cx={40} cy={56} /><Eye cx={54} cy={56} />
      <path d="M44 66 Q47 69 50 66" fill="none" stroke="#e07a9e" stroke-width="3" stroke-linecap="round" />
    </>
  ),
  'rocket-fin': () => (
    <>
      <rect x="40" y="14" width="18" height="56" rx="8" fill="#f2f5fd" stroke="#9fb3d9" stroke-width="3" />
      <path d="M40 34 C20 44 14 62 16 76 L40 62 Z" fill="var(--candy-pink)" stroke="var(--candy-pink-deep)" stroke-width="3" stroke-linejoin="round" />
      <path d="M58 34 C78 44 84 62 82 76 L58 62 Z" fill="var(--candy-pink)" stroke="var(--candy-pink-deep)" stroke-width="3" stroke-linejoin="round" />
      <circle cx="49" cy="34" r="7" fill="#8fd6ff" stroke="#5b90c9" stroke-width="2.5" />
      <path d="M44 78 Q49 90 54 78" fill="#ffb84d" />
    </>
  ),
  'bubble-alien': () => (
    <>
      <circle cx="48" cy="48" r="40" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.8)" stroke-width="3" />
      <path d="M24 32 A18 18 0 0 1 40 22" fill="none" stroke={WHITE} stroke-width="4" stroke-linecap="round" />
      <ellipse cx="48" cy="54" rx="20" ry="17" fill="var(--candy-sky)" stroke="var(--candy-sky-deep)" stroke-width="3" />
      <circle cx="48" cy="30" r="4" fill="var(--candy-sky)" />
      <line x1="48" y1="34" x2="48" y2="40" stroke="var(--candy-sky-deep)" stroke-width="3" />
      <Eye cx={41} cy={52} r={5.5} /><Eye cx={55} cy={52} r={5.5} />
      <path d="M42 62 Q48 67 54 62" fill="none" stroke="#1c6f99" stroke-width="3" stroke-linecap="round" />
    </>
  ),
  'comet-pup': () => (
    <>
      <path d="M14 24 L52 44 L44 58 Z" fill="#ffd98a" opacity="0.9" />
      <path d="M8 44 L48 54 L44 64 Z" fill="#ffb84d" opacity="0.8" />
      <circle cx="58" cy="52" r="22" fill="#f6d7a8" stroke="#cfa15e" stroke-width="3" />
      <path d="M42 36 C36 28 44 22 50 30 Z" fill="#a9743c" />
      <path d="M74 36 C80 28 72 22 66 30 Z" fill="#a9743c" />
      <Eye cx={51} cy={50} /><Eye cx={65} cy={50} />
      <circle cx="58" cy="58" r="4" fill={INK} />
      <path d="M52 64 Q58 68 64 64" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" />
    </>
  ),
  porthole: () => (
    <>
      <circle cx="48" cy="48" r="38" fill="#9fb3d9" stroke="#6f84ad" stroke-width="3" />
      <circle cx="48" cy="48" r="27" fill="#28407c" />
      <path d={star(42, 46, 7)} fill="var(--candy-yellow)" />
      <circle cx="60" cy="58" r="3" fill="#8fd6ff" />
      <path d="M34 34 A20 20 0 0 1 48 28" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="4" stroke-linecap="round" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <circle key={a} cx={48 + 33 * Math.cos((a * Math.PI) / 180)} cy={48 + 33 * Math.sin((a * Math.PI) / 180)} r="3.2" fill="#e6ecf7" />
      ))}
    </>
  ),
  'three-eye': () => (
    <>
      <path d="M28 78 C14 66 16 34 48 30 C80 34 82 66 68 78 Z" fill="var(--candy-mint)" stroke="var(--candy-mint-deep)" stroke-width="3" stroke-linejoin="round" />
      <Eye cx={36} cy={52} r={5} /><Eye cx={48} cy={48} r={5.5} /><Eye cx={60} cy={52} r={5} />
      <path d="M40 64 Q48 70 56 64" fill="none" stroke="#177950" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="30" cy="64" r="4" fill="#a8f0d2" />
      <circle cx="66" cy="64" r="4" fill="#a8f0d2" />
    </>
  ),
  'nebula-jelly': () => (
    <>
      <path d="M20 52 C20 30 76 30 76 52 Z" fill="var(--candy-grape)" stroke="var(--candy-grape-deep)" stroke-width="3" stroke-linejoin="round" />
      {[28, 40, 52, 64].map((x, i) => (
        <path key={x} d={`M${x} 54 q4 8 0 14 q-4 6 0 12`} fill="none" stroke={i % 2 ? '#c9b6f2' : 'var(--candy-grape)'} stroke-width="5" stroke-linecap="round" />
      ))}
      <Eye cx={40} cy={44} /><Eye cx={56} cy={44} />
      <circle cx="30" cy="26" r="2.6" fill="#e8defc" />
      <circle cx="70" cy="30" r="2.2" fill="#e8defc" />
    </>
  ),
  booster: () => (
    <>
      <rect x="34" y="10" width="28" height="42" rx="10" fill="#f2f5fd" stroke="#9fb3d9" stroke-width="3" />
      <rect x="34" y="24" width="28" height="7" fill="var(--candy-orange)" />
      <path d="M34 50 L26 62 L70 62 L62 50 Z" fill="#9fb3d9" stroke="#6f84ad" stroke-width="3" stroke-linejoin="round" />
      <path d="M36 64 C40 84 56 84 60 64 Z" fill="#ffb84d" />
      <path d="M42 64 C45 77 51 77 54 64 Z" fill="#ff8e5e" />
      <path d="M46 64 C47 71 49 71 50 64 Z" fill="#fff3c4" />
    </>
  ),
  'ring-cat': () => (
    <>
      <path d="M30 38 L26 18 L42 30 Z" fill="var(--candy-orange)" stroke="var(--candy-orange-deep)" stroke-width="3" stroke-linejoin="round" />
      <path d="M66 38 L70 18 L54 30 Z" fill="var(--candy-orange)" stroke="var(--candy-orange-deep)" stroke-width="3" stroke-linejoin="round" />
      <circle cx="48" cy="52" r="26" fill="var(--candy-orange)" stroke="var(--candy-orange-deep)" stroke-width="3" />
      <ellipse cx="48" cy="58" rx="42" ry="10" fill="none" stroke="#f4ecff" stroke-width="5" opacity="0.9" />
      <Eye cx={39} cy={48} /><Eye cx={57} cy={48} />
      <path d="M45 56 L48 59 L51 56" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M42 63 Q48 67 54 63" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" />
    </>
  ),
  'galaxy-dolphin': () => (
    <>
      <path d="M14 58 C22 34 56 24 78 36 C74 40 70 42 66 43 C78 50 76 64 64 70 C60 62 54 58 48 58 C40 70 26 70 14 58 Z"
        fill="var(--candy-sky)" stroke="var(--candy-sky-deep)" stroke-width="3" stroke-linejoin="round" />
      <path d="M46 34 C48 24 58 22 60 28 C54 30 50 32 46 34 Z" fill="var(--candy-sky)" stroke="var(--candy-sky-deep)" stroke-width="3" stroke-linejoin="round" />
      <path d="M20 56 C30 50 42 48 52 50" fill="none" stroke="#bfe9ff" stroke-width="4" stroke-linecap="round" />
      <Eye cx={68} cy={42} r={3.8} />
      <path d={star(24, 26, 5)} fill="var(--candy-yellow)" />
      <path d={star(84, 56, 4)} fill="var(--candy-yellow)" />
    </>
  ),
  'golden-saucer': () => (
    <>
      <path d="M48 22 A20 14 0 0 1 68 38 L28 38 A20 14 0 0 1 48 22 Z" fill="#bfe9ff" stroke="#5b90c9" stroke-width="3" />
      <Eye cx={48} cy={33} r={4} />
      <ellipse cx="48" cy="46" rx="38" ry="13" fill="var(--candy-yellow)" stroke="var(--candy-yellow-deep)" stroke-width="3" />
      {[24, 40, 56, 72].map((x) => (
        <circle key={x} cx={x} cy="49" r="3.4" fill="#fff3c4" />
      ))}
      <path d="M38 60 L32 76 M58 60 L64 76" stroke="#ffe08a" stroke-width="4" stroke-linecap="round" />
    </>
  ),
};

export function CollectibleArt({ id, size = 96 }: { id: string; size?: number }) {
  const draw = ART[id];
  const meta = COLLECTION.find((c) => c.id === id);
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-label={meta?.name ?? id} role="img">
      {draw ? draw() : (
        <text x="48" y="60" font-size="48" text-anchor="middle">{meta?.icon ?? '❓'}</text>
      )}
    </svg>
  );
}
