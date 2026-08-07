// 选项卡片排 —— fork 自数学夜航 Options.tsx，值从数字改字符串、文字走 Andika。
// excluded 项半透明且禁用；答对时正确项闪亮；答错时仅刚点错那一项 shake
//（旧排除项保持静止半透明，避免整排重抖）。
import type { Feedback } from '../session';

interface PinyinCardsProps {
  options: readonly string[];
  answer: string;          // 正确项（feedback='right' 时闪亮）
  excluded: readonly string[];
  lastWrong?: string;
  feedback: Feedback;
  size: 'listen' | 'tone' | 'stage'; // 练1 三大卡 / 练2 四声宽卡 / 拼读段选卡
  onPick: (value: string) => void;
}

export function PinyinCards({ options, answer, excluded, lastWrong, feedback, size, onPick }: PinyinCardsProps) {
  return (
    <div class={`pp-cards pp-cards--${size}`}>
      {options.map((v, i) => {
        const isExcluded = excluded.includes(v);
        const isCorrectFlash = feedback === 'right' && v === answer;
        let cls = `pp-card pp-card--${size}`;
        if (isCorrectFlash) cls += ' pp-card--correct';
        else if (isExcluded) {
          cls += ' pp-card--excluded';
          if (feedback === 'wrong' && v === lastWrong) cls += ' pp-card--shake';
        }
        const clickable = !isExcluded && !isCorrectFlash && feedback === null;
        return (
          <button key={i} class={cls} onClick={clickable ? () => onPick(v) : undefined} disabled={!clickable && !isCorrectFlash}>
            <span class="pp-py pp-card-text">{v}</span>
          </button>
        );
      })}
    </div>
  );
}
