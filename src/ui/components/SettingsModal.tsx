// 家长设置面板 —— fork 自数学夜航 SettingsModal，砍养成/教具项，加语音音量滑杆。
// 齿轮长按 1.5s 打开（长按逻辑在 GalaxyMap）。面向家长：字号偏小（20-24px）。
// 所有改动即时经 onUpdateSettings 持久化。M5 会在此追加进度/易错音小结。
import { useEffect, useRef, useState } from 'preact/hooks';
import { MAX_PROFILES, profileMeta } from '../../core/storage';
import type { Progress } from '../../core/types';

interface SettingsModalProps {
  settings: Progress['settings'];
  onUpdateSettings: (patch: Partial<Progress['settings']>) => void;
  onResetProgress: () => void;
  onUnlockAll: () => void;     // 解锁全部星球（开发/家长直达）
  onAddProfile: () => void;    // 添加档案（多娃分开存档）
  onSwitchProfile: () => void; // 清选人标记后重载出选人屏
  onClose: () => void;
}

// 二次确认按钮（重置/解锁/添加档案共用）：首点变红提示，5s 内再点执行，超时还原。
function ConfirmButton({ label, confirmLabel, onConfirm }: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const click = () => {
    if (!confirm) {
      setConfirm(true);
      timer.current = window.setTimeout(() => setConfirm(false), 5000);
    } else {
      window.clearTimeout(timer.current);
      onConfirm();
    }
  };
  return (
    <button class={'pp-set-action' + (confirm ? ' is-confirm' : '')} onClick={click}>
      {confirm ? confirmLabel : label}
    </button>
  );
}

export function SettingsModal({ settings, onUpdateSettings, onResetProgress, onUnlockAll, onAddProfile, onSwitchProfile, onClose }: SettingsModalProps) {
  const profiles = profileMeta();
  const volumePct = Math.round(settings.clipVolume * 100);
  return (
    <div class="pp-set-mask" onClick={onClose}>
      {/* 阻止冒泡：点卡片内部不关闭 */}
      <div class="pp-set-card" onClick={(e) => e.stopPropagation()}>
        <button class="pp-set-close" onClick={onClose} aria-label="关闭设置">✕</button>
        <div class="pp-set-title">家长设置</div>

        {/* 语音音量：即时写 settings.clipVolume 并作用于 voice.ts 主增益（App 端接线） */}
        <div class="pp-set-row">
          <span class="pp-set-label">拼音语音音量</span>
          <input
            class="pp-set-slider"
            type="range"
            min="0"
            max="100"
            step="5"
            value={volumePct}
            aria-label="拼音语音音量"
            onInput={(e) => onUpdateSettings({ clipVolume: Number((e.target as HTMLInputElement).value) / 100 })}
          />
          <span class="pp-set-vol">{volumePct}%</span>
        </div>

        {/* 多档案：一娃一档 */}
        {profiles.count < MAX_PROFILES && (
          <ConfirmButton
            label="添加一位小宇航员（多孩子分开存档）"
            confirmLabel="再点一次确认添加（添加后不可删）"
            onConfirm={onAddProfile}
          />
        )}
        {profiles.count > 1 && (
          <button class="pp-set-action" onClick={onSwitchProfile}>切换小宇航员</button>
        )}

        <ConfirmButton label="解锁全部星球" confirmLabel="再点一次确认解锁" onConfirm={onUnlockAll} />
        <ConfirmButton label="重置进度" confirmLabel="再点一次确认重置（星星和图鉴都会消失）" onConfirm={onResetProgress} />
      </div>
    </div>
  );
}
