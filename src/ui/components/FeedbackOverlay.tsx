// 答对/答错的全屏反馈遮罩 + 居中卡片（pop 入场）。遮罩同时挡住一切点击。
// ⚠️ 即便无视觉也必须渲染遮罩：推进/结算时序依赖反馈期挡住选项与退出键——
// 答对 1.1s 推进窗（blend 为拼读序列播完）内不许二次作答或退出，
// 答错 0.9s 清除窗内不许连点。改动遮罩的可点性/层级（z-index、无 onClick）
// 需同步审视 App 的 answer/advance/finishSession 时序（fork 自数学夜航的同名契约）。
export function FeedbackOverlay({ variant }: { variant: 'right' | 'wrong' }) {
  const right = variant === 'right';
  return (
    <div class="pp-feedback-mask">
      <div class={'pp-feedback-card ' + (right ? 'pp-feedback-card--right' : 'pp-feedback-card--wrong')}>
        {right ? '太棒了！⭐' : '再试一次！'}
      </div>
    </div>
  );
}
