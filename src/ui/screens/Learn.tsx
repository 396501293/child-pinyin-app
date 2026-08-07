// 学一学：本课新授字母逐个上四线三格卡，点卡片 → 播呼读音 + 弹跳；
// 整体认读音节（有的课）另起一排，同样点读。全部点过 → 大 CTA「去练习」。
// visited 是本屏的瞬时视图态（关掉重开清零）；「学过」的持久化由 App 在
// onComplete 里写 planets[id].learned（幂等）。
import { useState } from 'preact/hooks';
import type { Lesson } from '../../core/curriculum';
import { allVisited, learnUnits } from '../gating';
import { FourLineGrid } from '../components/FourLineGrid';

interface LearnProps {
  lesson: Lesson;
  learned: boolean; // 已学过（重游时 CTA 直接可用，不必重新点满）
  onTapUnit: (unit: string, kind: 'letter' | 'whole') => void; // App: playClip
  onComplete: () => void;   // 全部点过（App markLearned，幂等）
  onGoPractice: () => void; // → 练1
  onExit: () => void;
}

export function Learn({ lesson, learned, onTapUnit, onComplete, onGoPractice, onExit }: LearnProps) {
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set());
  const units = learnUnits(lesson);
  const done = learned || allVisited(units, visited);

  // 卡片尺寸随本课单元数收缩：L1 三张大卡（字号 ~142px），多单元课收到还放得下。
  const band = units.length <= 4 ? 72 : units.length <= 6 ? 58 : 46;

  const tap = (unit: string, kind: 'letter' | 'whole') => {
    onTapUnit(unit, kind);
    if (visited.has(unit)) return;
    const next = new Set(visited);
    next.add(unit);
    setVisited(next);
    if (allVisited(units, next)) onComplete();
  };

  const card = (unit: string, kind: 'letter' | 'whole') => (
    <button key={unit} class={'pp-learn-card' + (visited.has(unit) ? ' is-visited' : '')} onClick={() => tap(unit, kind)}>
      <FourLineGrid text={unit} band={band} />
      {visited.has(unit) && <span class="pp-learn-check">⭐</span>}
    </button>
  );

  return (
    <div class="pp-learn">
      <div class="pp-screen-top">
        <button class="pp-back" onClick={onExit} aria-label="回星系">←</button>
        <div class="pp-screen-title">
          第 {lesson.id} 课 · <span class="pp-py pp-screen-title-py">{lesson.title}</span>
        </div>
      </div>

      <div class="pp-learn-cards">{lesson.newLetters.map((u) => card(u, 'letter'))}</div>

      {(lesson.wholeRead ?? []).length > 0 && (
        <div class="pp-learn-whole">
          <div class="pp-learn-whole-tag">整体认读</div>
          <div class="pp-learn-cards pp-learn-cards--whole">
            {lesson.wholeRead!.map((w) => card(w, 'whole'))}
          </div>
        </div>
      )}

      <div class="pp-learn-foot">
        {done ? (
          <button class="pp-cta" onClick={onGoPractice}>去练习 ▶</button>
        ) : (
          <div class="pp-learn-hint">点一点卡片，听一听发音吧！</div>
        )}
      </div>
    </div>
  );
}
