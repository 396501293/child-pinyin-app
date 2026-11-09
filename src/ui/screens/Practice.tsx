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
import { PicCards } from '../components/PicCards';
import { ReadAlong } from '../components/ReadAlong';

interface PracticeProps {
  session: Session;
  onPick: (value: string) => void; // 选择题共用；blend 由 App 按当前段批改
  onTapSyllable: (index: number) => void; // read-along 点读
  onReadDone: () => void;               // read-along 读完
  onReplay: () => void;            // 大 🔊 重播本题音频
  onExit: () => void;
}

const PROMPT: Record<Question['kind'], string> = {
  'listen-pick': '听一听，是哪一个？',
  'tone-pick': '听一听，是第几声？',
  blend: '把飞船拼出来！',
  'word-pick': '听一听，是哪个词？',
  'pic-pick': '读一读，是哪张图？',
  'read-along': '点一点，读一读！',
};

export function Practice({ session, onPick, onTapSyllable, onReadDone, onReplay, onExit }: PracticeProps) {
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
        {/* 看拼音选图考「自己读」：不给喇叭（播了就成听辨）；点读题的整句按钮在题面里 */}
        {q.kind !== 'pic-pick' && q.kind !== 'read-along' && (
          <button class="pp-replay" onClick={onReplay} aria-label="再听一遍">🔊</button>
        )}
        <span class="pp-prompt-text">{PROMPT[q.kind]}</span>
      </div>

      {q.kind === 'pic-pick' ? (
        <div class="pp-picq">
          <div class="pp-py pp-picq-word">{q.text}</div>
          <PicCards
            options={q.options}
            answer={q.answer}
            excluded={session.excluded}
            lastWrong={session.lastWrong}
            feedback={session.feedback}
            onPick={onPick}
          />
        </div>
      ) : q.kind === 'read-along' ? (
        <ReadAlong
          syl={q.syl}
          hz={q.hz}
          tapped={session.tapped}
          onTap={onTapSyllable}
          onPlayAll={onReplay}
          onDone={onReadDone}
        />
      ) : q.kind === 'blend' ? (
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
          size={q.kind === 'tone-pick' ? 'tone' : q.kind === 'word-pick' ? 'word' : 'listen'}
          onPick={onPick}
        />
      )}

      {session.feedback && <FeedbackOverlay variant={session.feedback} />}
    </div>
  );
}
