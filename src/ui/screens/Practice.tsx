// 练习屏外壳：按 Question.kind 切三种题面——
//   listen-pick：3 张大拼音卡；tone-pick：4 张四声宽卡；blend：对接飞船逐段选。
// dumb 组件：题目/反馈/排除全由 session 镜像与回调驱动（fork 自数学夜航 Quiz）。
// 退出键小而靠角（数学夜航模式：直接退出无确认，会话作废由 App 负责 teardown）。
import type { Question } from '../../core/questions';
import type { Session } from '../session';
import { PinyinCards } from '../components/PinyinCard';
import { DockingShip } from '../components/DockingShip';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { FourLineGrid } from '../components/FourLineGrid';

interface PracticeProps {
  session: Session;
  onPick: (value: string) => void; // 三种题共用；blend 由 App 按当前段批改
  onReplay: () => void;            // 大 🔊 重播本题音频
  onExit: () => void;
}

const PROMPT: Record<Question['kind'], string> = {
  'listen-pick': '听一听，是哪一个？',
  'tone-pick': '听一听，是第几声？',
  blend: '把飞船拼出来！',
};

export function Practice({ session, onPick, onReplay, onExit }: PracticeProps) {
  const q = session.current;
  if (!q) return null; // 结算瞬间的空帧（App 立即切 result）

  return (
    <div class="pp-practice">
      <button class="pp-back pp-practice-back" onClick={onExit} aria-label="回星系">←</button>

      {/* 火箭进度轨：再见面插题会加长，每帧按 length 重画 */}
      <div class="pp-trail" aria-label={`第 ${session.qIndex + 1} 题，共 ${session.length} 题`}>
        {Array.from({ length: session.length }, (_, i) => (
          i === session.qIndex
            ? <span key={i} class="pp-trail-rocket">🚀</span>
            : <span key={i} class={'pp-trail-dot' + (i < session.qIndex ? ' is-done' : '')} />
        ))}
      </div>

      {/* 提示行：大喇叭重播 + 一句话题干 */}
      <div class="pp-prompt">
        <button class="pp-replay" onClick={onReplay} aria-label="再听一遍">🔊</button>
        <span class="pp-prompt-text">{PROMPT[q.kind]}</span>
      </div>

      {q.kind === 'blend' ? (
        <div class="pp-blend">
          <FourLineGrid text={q.target.text} band={44} />
          <DockingShip stages={q.stages} docked={session.docked} stage={session.stage} />
          <PinyinCards
            options={q.stages[session.stage].options}
            answer={q.stages[session.stage].answer}
            excluded={session.excluded}
            lastWrong={session.lastWrong}
            feedback={session.feedback}
            size="stage"
            onPick={onPick}
          />
        </div>
      ) : (
        <PinyinCards
          options={q.options}
          answer={q.answer}
          excluded={session.excluded}
          lastWrong={session.lastWrong}
          feedback={session.feedback}
          size={q.kind === 'tone-pick' ? 'tone' : 'listen'}
          onPick={onPick}
        />
      )}

      {session.feedback && <FeedbackOverlay variant={session.feedback} />}
    </div>
  );
}
