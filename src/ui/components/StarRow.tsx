// 三颗星（得几颗亮几颗）。SVG 五角星，实心金黄 / 空心描边。
// filled 也可当「三格各自是否达标」的布尔行用（地图节点：练1/2/3 各占一颗）。
interface StarRowProps {
  filled: readonly boolean[]; // 长度即星位数（主线恒 3）
  size?: number;
}

const STAR_PATH =
  'M12 1.8l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.6 6.8-.8z';

export function StarRow({ filled, size = 22 }: StarRowProps) {
  return (
    <span class="pp-starrow" aria-label={`${filled.filter(Boolean).length}/${filled.length} 星`}>
      {filled.map((on, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" class={on ? 'pp-star is-on' : 'pp-star'}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

export const starsToRow = (n: number): boolean[] => [n >= 1, n >= 2, n >= 3];
