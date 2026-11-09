// 看拼音选图：3 张大图卡（public/pics/{picId}.webp，Agnes 生成、离线预缓存）。
// 交互契约与 PinyinCards 一致：excluded 半透明禁用、答对闪亮、刚点错那张抖动。
import type { Feedback } from '../session';

const PIC_BASE = `${import.meta.env.BASE_URL}pics/`;

interface PicCardsProps {
  options: readonly string[]; // picId
  answer: string;
  excluded: readonly string[];
  lastWrong?: string;
  feedback: Feedback;
  onPick: (value: string) => void;
}

export function PicCards({ options, answer, excluded, lastWrong, feedback, onPick }: PicCardsProps) {
  return (
    <div class="pp-cards pp-cards--pic">
      {options.map((id) => {
        const isExcluded = excluded.includes(id);
        const isCorrectFlash = feedback === 'right' && id === answer;
        let cls = 'pp-card pp-card--pic';
        if (isCorrectFlash) cls += ' pp-card--correct';
        else if (isExcluded) {
          cls += ' pp-card--excluded';
          if (feedback === 'wrong' && id === lastWrong) cls += ' pp-card--shake';
        }
        const clickable = !isExcluded && !isCorrectFlash && feedback === null;
        return (
          <button key={id} class={cls} onClick={clickable ? () => onPick(id) : undefined} disabled={!clickable && !isCorrectFlash}>
            <img class="pp-card-pic" src={`${PIC_BASE}${id}.webp`} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}
