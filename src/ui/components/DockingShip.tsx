// 拼读对接飞船：机头 + 按段数排开的对接舱（声母舱/介母舱/韵母舱）+ 尾焰。
// 已对接的舱亮起并显示部件字母；当前段的舱虚线脉冲等待对接；未来段静默半透明。
// 纯展示组件——选中部件由 Practice 的选项卡触发，App 批改后经 docked/stage 流回。
import type { BlendStage } from '../../core/questions';

const ROLE_CN: Record<BlendStage['role'], string> = {
  initial: '声母舱',
  medial: '介母舱',
  final: '韵母舱',
};

interface DockingShipProps {
  stages: readonly BlendStage[];
  docked: readonly string[]; // 已对接部件文本（按段序，长度 ≤ 当前段号）
  stage: number;             // 当前段游标
}

export function DockingShip({ stages, docked, stage }: DockingShipProps) {
  return (
    <div class="pp-ship">
      {/* 尾焰（火箭朝右飞） */}
      <svg width="52" height="72" viewBox="0 0 52 72" class="pp-ship-flame" aria-hidden="true">
        <path d="M50 36 C28 22 14 26 2 36 C14 46 28 50 50 36 Z" fill="#FFB84D" />
        <path d="M50 36 C34 27 24 29 14 36 C24 43 34 45 50 36 Z" fill="#FF8E5E" />
      </svg>
      {stages.map((st, i) => {
        const state = i < docked.length ? 'docked' : i === stage ? 'active' : 'waiting';
        return (
          <div key={i} class={`pp-ship-pod pp-ship-pod--${st.role} is-${state}`}>
            {state === 'docked' ? (
              <span class="pp-py pp-ship-pod-text">{docked[i]}</span>
            ) : (
              <span class="pp-ship-pod-label">{ROLE_CN[st.role]}</span>
            )}
          </div>
        );
      })}
      {/* 机头 */}
      <svg width="58" height="88" viewBox="0 0 58 88" class="pp-ship-nose" aria-hidden="true">
        <path d="M2 6 C36 14 52 30 54 44 C52 58 36 74 2 82 Z" fill="#F2F5FD" stroke="#9FB3D9" stroke-width="4" stroke-linejoin="round" />
        <circle cx="22" cy="44" r="10" fill="#8FD6FF" stroke="#5B90C9" stroke-width="3" />
        <circle cx="19" cy="41" r="3" fill="#FFF" opacity="0.85" />
      </svg>
    </div>
  );
}
