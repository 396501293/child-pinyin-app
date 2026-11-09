// 句子点读：每个音节一块「拼音在上、汉字在下」的大字块，点一下播该音节人声
//（轻声无人声的由 App 降级播整句）。点过的字块亮起；全部点过后出现「读完啦」。
// 不计对错——纯展示组件，状态（tapped）由 App 的 session 镜像持有。
interface ReadAlongProps {
  syl: readonly string[];
  hz: string;
  tapped: readonly number[];
  onTap: (index: number) => void;
  onPlayAll: () => void;
  onDone: () => void;
}

export function ReadAlong({ syl, hz, tapped, onTap, onPlayAll, onDone }: ReadAlongProps) {
  const chars = [...hz];
  const allTapped = syl.every((_, i) => tapped.includes(i));
  return (
    <div class="pp-read">
      <div class="pp-read-line">
        {syl.map((s, i) => (
          <button
            key={i}
            class={'pp-read-tile' + (tapped.includes(i) ? ' is-tapped' : '')}
            onClick={() => onTap(i)}
            aria-label={`${s} ${chars[i]}`}
          >
            <span class="pp-py pp-read-py">{s}</span>
            <span class="pp-read-hz">{chars[i]}</span>
          </button>
        ))}
        <span class="pp-read-hz pp-read-stop">。</span>
      </div>
      <div class="pp-read-actions">
        <button class="pp-read-all" onClick={onPlayAll}>🔊 读整句</button>
        {allTapped && <button class="pp-read-done" onClick={onDone}>读完啦 ✓</button>}
      </div>
    </div>
  );
}
