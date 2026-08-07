// 结算屏：0-3 颗大星逐颗弹出 + 星球亮相庆祝。dumb 组件：星级/解锁横幅由
// App 在进结算前算定并落盘（数学夜航纪律：结算数据不在 render 时算）。
import type { Lesson } from '../../core/curriculum';
import type { Star } from '../../core/types';
import { practiceLabel } from '../gating';
import { PlanetIcon, StationIcon } from '../components/PlanetIcon';

interface ResultProps {
  stars: Star;
  station: boolean;
  lesson: Lesson | null;  // station 时 null
  practice: 1 | 2 | 3;
  unlockedNext: boolean;  // 本次点亮推进了解锁链 → 「解锁新星球」横幅
  onRetry: () => void;    // 再来一次（同一练重开）
  onBackToMap: () => void;
}

const SUB: Record<Star, string> = {
  3: '全对！你是拼音小达人！',
  2: '真棒！就差一点点全对！',
  1: '完成啦！再练一遍更棒！',
  0: '再试一次吧！', // 防御性：完成即 ≥1★（progression.starsFor），0 仅在异常态出现
};

export function Result({ stars, station, lesson, practice, unlockedNext, onRetry, onBackToMap }: ResultProps) {
  return (
    <div class="pp-result">
      <div class="pp-result-card">
        <div class="pp-result-hero">
          {/* 亮相的星球/空间站 + 放射光环 */}
          <div class="pp-result-burst" aria-hidden="true" />
          {station ? <StationIcon size={148} /> : <PlanetIcon lessonId={lesson?.id ?? 1} size={148} />}
        </div>

        <div class="pp-result-title">
          {station ? '空间站复习完成！' : (
            <>
              <span class="pp-py pp-result-title-py">{lesson?.title}</span>
              {` · ${lesson ? practiceLabel(lesson, practice) : ''}完成！`}
            </>
          )}
        </div>

        {/* 三颗大星逐颗弹出（CSS 动画按序延迟） */}
        <div class="pp-result-stars">
          {[0, 1, 2].map((i) => (
            <svg key={i} width="76" height="76" viewBox="0 0 24 24"
              class={'pp-result-star' + (i < stars ? ' is-on' : '')}
              style={{ animationDelay: `${0.25 + i * 0.3}s` }}>
              <path d="M12 1.8l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.6 6.8-.8z" />
            </svg>
          ))}
        </div>

        <div class="pp-result-sub">{SUB[stars]}</div>
        {unlockedNext && <div class="pp-result-unlock">🚀 解锁了新星球！</div>}

        <div class="pp-result-actions">
          <button class="pp-btn pp-btn--ghost" onClick={onRetry}>再来一次</button>
          {/* 基础 .pp-btn 即主按钮观感（糖果粉），无需修饰类 */}
          <button class="pp-btn" onClick={onBackToMap}>回星系 ▶</button>
        </div>
      </div>
    </div>
  );
}
