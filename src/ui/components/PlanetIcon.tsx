// 代码画的扁平糖果星球（零位图素材）：每课一颗，色相/装饰/表情按 lessonId 参数化，
// 13 颗互不相同但同属一个「明亮绘本太空」家族。锁定态的置灰由外层 CSS 负责。
import { useId } from 'preact/hooks';

type Deco = 'spots' | 'ring' | 'stripes' | 'craters';

interface PlanetSpec { body: string; deco: string; ring?: string }

// 课 1-13 的糖果配色 + 装饰轮换（spots→ring→stripes→craters 循环，相邻星球不撞型）。
const SPECS: readonly (PlanetSpec & { kind: Deco })[] = [
  { body: '#FF8FB3', deco: '#E8618C', kind: 'spots' },                    // 1 a o e     蜜桃粉
  { body: '#FFD166', deco: '#EDA53B', ring: '#FFB84D', kind: 'ring' },    // 2 i u ü y w 奶油黄
  { body: '#59DDA9', deco: '#2FB183', kind: 'stripes' },                  // 3 b p m f   薄荷绿
  { body: '#5BC8F5', deco: '#2E9FD8', kind: 'craters' },                  // 4 d t n l   晴空蓝
  { body: '#B18AF0', deco: '#8A5FD6', kind: 'spots' },                    // 5 g k h     葡萄紫
  { body: '#FFA45C', deco: '#E87F2E', ring: '#FFC58A', kind: 'ring' },    // 6 j q x     蜜橘橙
  { body: '#FF9ED2', deco: '#E86FB0', kind: 'stripes' },                  // 7 z c s     泡泡糖粉
  { body: '#4ED8C6', deco: '#2AAB9B', kind: 'craters' },                  // 8 zh ch sh r 湖水青
  { body: '#FFE08A', deco: '#E3B34A', kind: 'spots' },                    // 9 ai ei ui  黄油黄
  { body: '#8FA8F5', deco: '#6379DB', ring: '#B7C6FF', kind: 'ring' },    // 10 ao ou iu 长春花蓝
  { body: '#7FE3B8', deco: '#4BBA8C', kind: 'stripes' },                  // 11 ie üe er 海沫绿
  { body: '#FF8E7E', deco: '#E85F51', kind: 'craters' },                  // 12 an en …  珊瑚橘
  { body: '#FFC24B', deco: '#ED9B22', ring: '#FFDF9E', kind: 'ring' },    // 13 ang eng … 落日金
];

interface PlanetIconProps {
  lessonId: number; // 1..13
  size?: number;
  face?: boolean;   // 表情（点亮/结算庆祝时更精神；地图上也画，孩子认脸比认色快）
}

export function PlanetIcon({ lessonId, size = 96, face = true }: PlanetIconProps) {
  const spec = SPECS[(lessonId - 1) % SPECS.length];
  const clipId = useId();
  const ring = spec.kind === 'ring' && spec.ring;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" class="pp-planet" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="60" cy="60" r="36" />
        </clipPath>
      </defs>
      {/* 环（后半）：整椭圆垫在星体后面 */}
      {ring && (
        <g transform="rotate(-16 60 60)">
          <ellipse cx="60" cy="60" rx="54" ry="15" fill="none" stroke={spec.ring} stroke-width="8" />
        </g>
      )}
      <circle cx="60" cy="60" r="36" fill={spec.body} />
      {/* 右下暗面 + 左上高光：两笔给出体积，仍是扁平语汇 */}
      <circle cx="70" cy="70" r="36" fill="#1B2C55" opacity="0.10" clip-path={`url(#${clipId})`} />
      <ellipse cx="46" cy="44" rx="14" ry="9" fill="#FFFFFF" opacity="0.35" transform="rotate(-24 46 44)" />
      <g clip-path={`url(#${clipId})`}>
        {spec.kind === 'spots' && (
          <>
            <circle cx="42" cy="66" r="7" fill={spec.deco} opacity="0.7" />
            <circle cx="74" cy="42" r="5" fill={spec.deco} opacity="0.7" />
            <circle cx="80" cy="72" r="4" fill={spec.deco} opacity="0.7" />
          </>
        )}
        {spec.kind === 'stripes' && (
          <>
            <rect x="18" y="44" width="84" height="9" rx="4.5" fill={spec.deco} opacity="0.55" transform="rotate(-6 60 60)" />
            <rect x="18" y="68" width="84" height="7" rx="3.5" fill={spec.deco} opacity="0.45" transform="rotate(-6 60 60)" />
          </>
        )}
        {spec.kind === 'craters' && (
          <>
            <circle cx="46" cy="48" r="6" fill={spec.deco} opacity="0.6" />
            <circle cx="72" cy="66" r="8" fill={spec.deco} opacity="0.6" />
            <circle cx="52" cy="78" r="4" fill={spec.deco} opacity="0.6" />
          </>
        )}
      </g>
      {/* 环（前半）：只画星体下方的一段弧 */}
      {ring && (
        <g transform="rotate(-16 60 60)">
          <path d="M 7 62 A 53 15 0 0 0 113 62" fill="none" stroke={spec.ring} stroke-width="8" stroke-linecap="round" />
        </g>
      )}
      {face && (
        <g class="pp-planet-face">
          <circle cx="51" cy="57" r="3.6" fill="#26324F" />
          <circle cx="69" cy="57" r="3.6" fill="#26324F" />
          <circle cx="52.3" cy="55.8" r="1.2" fill="#FFF" />
          <circle cx="70.3" cy="55.8" r="1.2" fill="#FFF" />
          <path d="M53 66 Q60 72 67 66" fill="none" stroke="#26324F" stroke-width="2.6" stroke-linecap="round" />
          <circle cx="43" cy="63" r="4" fill="#FF7BA3" opacity="0.4" />
          <circle cx="77" cy="63" r="4" fill="#FF7BA3" opacity="0.4" />
        </g>
      )}
    </svg>
  );
}

// 空间站（复习关节点）：舱体 + 双太阳能板 + 天线，同一扁平语汇。
export function StationIcon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" class="pp-planet" aria-hidden="true">
      {/* 天线 */}
      <line x1="60" y1="38" x2="60" y2="22" stroke="#9FB3D9" stroke-width="4" stroke-linecap="round" />
      <circle cx="60" cy="18" r="5" fill="#FFD166" />
      {/* 太阳能板 */}
      {[8, 78].map((x) => (
        <g key={x}>
          <rect x={x} y="48" width="34" height="24" rx="5" fill="#5BC8F5" stroke="#2E86C8" stroke-width="3" />
          <line x1={x + 11} y1="50" x2={x + 11} y2="70" stroke="#2E86C8" stroke-width="2.5" />
          <line x1={x + 22} y1="50" x2={x + 22} y2="70" stroke="#2E86C8" stroke-width="2.5" />
        </g>
      ))}
      {/* 舱体 + 舷窗 */}
      <circle cx="60" cy="60" r="22" fill="#F2F5FD" stroke="#9FB3D9" stroke-width="4" />
      <circle cx="60" cy="60" r="10" fill="#8FD6FF" stroke="#5B90C9" stroke-width="3" />
      <circle cx="57" cy="57" r="3" fill="#FFF" opacity="0.8" />
    </svg>
  );
}
