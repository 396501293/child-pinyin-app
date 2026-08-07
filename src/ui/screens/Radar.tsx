// 聪耳雷达：无尽听辨自由练习（第 3 颗星球通关后开放）。dumb 组件——
// 出题/批改/掌握度/结算全在 App（FreeSession 镜像 + freePlayRef 真身）。
// 主视觉：声呐脉冲环包着大喇叭重播键（题音自动播，随时可再听）；
// 无计时无失败态，退出（←）是唯一终点。
import type { FreeSession } from '../session';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { PinyinCards } from '../components/PinyinCard';

interface RadarProps {
  session: FreeSession;
  onPick: (value: string) => void;
  onReplay: () => void;
  onExit: () => void;
}

export function Radar({ session, onPick, onReplay, onExit }: RadarProps) {
  const q = session.current;
  if (q.kind !== 'listen-pick') return null; // 雷达只出听辨题（buildRadarQuestion 保证）

  return (
    <div class="pp-practice pp-radar">
      <button class="pp-back pp-practice-back" onClick={onExit} aria-label="回星系">←</button>

      {/* 顶部计数：第 N 题 + 低调的答对小计（无尽模式没有进度轨） */}
      <div class="pp-free-top">
        <span class="pp-free-count">第 {session.answered + 1} 题</span>
        <span class="pp-free-sub">✓ {session.firstTry}</span>
      </div>

      {/* 声呐罩：三圈脉冲环 + 大喇叭重播 */}
      <div class="pp-radar-scope">
        {[0, 1, 2].map((i) => (
          <span key={i} class="pp-radar-ring" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
        <button class="pp-replay pp-radar-replay" onClick={onReplay} aria-label="再听一遍">🔊</button>
      </div>
      <div class="pp-prompt-text pp-radar-prompt">听一听，是哪一个？</div>

      <PinyinCards
        options={q.options}
        answer={q.answer}
        excluded={session.excluded}
        lastWrong={session.lastWrong}
        feedback={session.feedback}
        size="listen"
        onPick={onPick}
      />

      {session.feedback && <FeedbackOverlay variant={session.feedback} />}
    </div>
  );
}
