// 拼读发射台：无尽拼读自由练习 + 连击（第 5 颗星球通关后开放）。
// blend 题面复用 Practice 同一组 dumb 组件（FourLineGrid/DockingShip/PinyinCards）——
// 复用的是组件而非 Practice 内部；题面 JSX 十余行与 Practice 相似是接受的最小重复
// （抽共享外壳要给 Practice 换骨架，M4 已稳不动它——任务注记）。
// 连击铁律：只被答错清零、退出不清（core/freePlay.ts）；里程碑 5/10/20 小庆祝。
import type { FreeSession } from '../session';
import { DockingShip } from '../components/DockingShip';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { FourLineGrid } from '../components/FourLineGrid';
import { PinyinCards } from '../components/PinyinCard';

interface LaunchpadProps {
  session: FreeSession;
  onPick: (value: string) => void;
  onReplay: () => void;
  onExit: () => void;
}

// 发射条上火箭的位置：每答对一题飞远一点，20 题后停在最右（视觉够用即可）。
const rocketLeft = (answered: number): string => `${Math.min(3 + answered * 4.5, 93)}%`;

export function Launchpad({ session, onPick, onReplay, onExit }: LaunchpadProps) {
  const q = session.current;
  if (q.kind !== 'blend') return null; // 发射台只出拼读题（buildLaunchpadQuestion 保证）
  const st = q.stages[session.stage];

  return (
    <div class="pp-practice pp-launchpad">
      <button class="pp-back pp-practice-back" onClick={onExit} aria-label="回星系">←</button>

      {/* 顶部计数：第 N 题 + 连击火焰（连击 0 时熄灭低调） */}
      <div class="pp-free-top">
        <span class="pp-free-count">第 {session.answered + 1} 题</span>
        <span class={'pp-streak' + (session.streak > 0 ? ' is-live' : '')}>
          🔥 连对 {session.streak}
        </span>
      </div>

      {/* 发射条：小火箭随答对数向右飞（left 过渡动画） */}
      <div class="pp-launch-strip" aria-hidden="true">
        <span class="pp-launch-rocket" style={{ left: rocketLeft(session.answered) }}>🚀</span>
      </div>

      <div class="pp-prompt pp-launch-prompt">
        <button class="pp-replay" onClick={onReplay} aria-label="再听一遍">🔊</button>
        <span class="pp-prompt-text">把飞船拼出来！</span>
      </div>

      <div class="pp-blend">
        <FourLineGrid text={q.target.text} band={44} />
        <DockingShip stages={q.stages} docked={session.docked} stage={session.stage} />
        <PinyinCards
          options={st.options}
          answer={st.answer}
          excluded={session.excluded}
          lastWrong={session.lastWrong}
          feedback={session.feedback}
          size="stage"
          onPick={onPick}
        />
      </div>

      {/* 连击里程碑横幅：飘在反馈遮罩之上（z>10），纯展示不挡点击 */}
      {session.milestone !== null && (
        <div class="pp-milestone">🎉 连对 {session.milestone} 题！</div>
      )}
      {session.feedback && <FeedbackOverlay variant={session.feedback} />}
    </div>
  );
}
