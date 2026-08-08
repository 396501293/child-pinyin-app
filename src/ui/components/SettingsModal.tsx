// 家长设置面板 —— fork 自数学夜航 SettingsModal，砍养成/教具项，加语音音量滑杆。
// 齿轮长按 1.5s 打开（长按逻辑在 GalaxyMap）。面向家长：字号偏小（15-24px）。
// M5：追加学习进度总览（13 课 + 空间站 + 自由练习）与易错音小结（insight.topErrors）。
// 所有设置改动即时经 onUpdateSettings 持久化；卡片整体可滚（max-height 在 CSS）。
import { useEffect, useRef, useState } from 'preact/hooks';
import { LESSONS, STATIONS } from '../../core/curriculum';
import { topErrors } from '../../core/insight';
import { unitOfKey } from '../../core/mastery';
import { planetOf, totalStars } from '../../core/progression';
import { MAX_PROFILES, profileMeta } from '../../core/storage';
import type { Progress } from '../../core/types';

interface SettingsModalProps {
  progress: Progress; // 进度总览/易错音直接读全量（面板只读不写）
  onUpdateSettings: (patch: Partial<Progress['settings']>) => void;
  onResetProgress: () => void;
  onUnlockAll: () => void;     // 解锁全部星球（开发/家长直达）
  onFillStars: () => void;     // 一键满星（仅 DEV 构建可见——测自由练习门槛/图鉴用）
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

// 条目 key（'L:b'/'S:bà'）→ 家长可读行：类别标签 + 拼音（拼音一律走 .pp-py）。
const itemKind = (item: string): string => (item.startsWith('L:') ? '字母' : '音节');

export function SettingsModal({ progress, onUpdateSettings, onResetProgress, onUnlockAll, onFillStars, onAddProfile, onSwitchProfile, onClose }: SettingsModalProps) {
  const profiles = profileMeta();
  const settings = progress.settings;
  const volumePct = Math.round(settings.clipVolume * 100);
  const errs = topErrors(progress, 5);
  const recentErrors = progress.insight.errors.slice(-8).reverse(); // slice 已拷贝，reverse 不碰原数组
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

        {/* ── 学习进度总览：13 课（学 + 三练星）+ 空间站 ── */}
        <div class="pp-set-section">
          学习进度<span class="pp-set-section-tail">★ {totalStars(progress)} / 123</span>
        </div>
        <div class="pp-set-grid">
          <div class="pp-set-grow pp-set-grow--head" aria-hidden="true">
            <span /><span />
            <span>学</span><span>练1</span><span>练2</span><span>练3</span>
          </div>
          {LESSONS.map((l) => {
            const pl = planetOf(progress, l.id);
            return (
              <div class="pp-set-grow" key={l.id}>
                <span class="pp-set-gnum">{l.id}</span>
                <span class="pp-py pp-set-gtitle">{l.title}</span>
                <span class={'pp-set-gcell' + (pl.learned ? ' is-on' : '')}>{pl.learned ? '✓' : '·'}</span>
                {pl.stars.map((s, i) => (
                  <span key={i} class={'pp-set-gcell' + (s > 0 ? ' is-on' : '')}>{s > 0 ? '★'.repeat(s) : '·'}</span>
                ))}
              </div>
            );
          })}
          {STATIONS.map((st, i) => {
            const s = progress.stations[st.id] ?? 0;
            return (
              <div class="pp-set-grow" key={st.id}>
                <span class="pp-set-gnum">🛰</span>
                <span class="pp-set-gtitle">空间站 {i + 1}</span>
                <span class="pp-set-gcell" />
                <span class={'pp-set-gcell pp-set-gcell--wide' + (s > 0 ? ' is-on' : '')}>
                  {s > 0 ? '★'.repeat(s) : '·'}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── 自由练习小结 ── */}
        <div class="pp-set-section">自由练习</div>
        <div class="pp-set-stats">
          <span>📡 聪耳雷达：{progress.radar.sessions} 次 · 共答 {progress.radar.total} 题</span>
          <span>
            🚀 拼读发射台：{progress.launchpad.sessions} 次 · 共答 {progress.launchpad.total} 题
            · 最长连对 {progress.launchpad.bestStreak}（当前 {progress.launchpad.streak}）
          </span>
        </div>

        {/* ── 易错音（近 14 天首答口径，见 insight.ts）── */}
        <div class="pp-set-section">易错音（近 14 天）</div>
        {errs.length === 0 ? (
          <div class="pp-set-empty">最近没有反复出错的拼音，很棒！</div>
        ) : (
          <div class="pp-set-errs">
            {errs.map((e) => (
              <div class="pp-set-err" key={e.item}>
                <span class="pp-set-errkind">{itemKind(e.item)}</span>
                <span class="pp-py pp-set-errpy">{unitOfKey(e.item)}</span>
                <span class="pp-set-errn">错 {e.wrong} 次 / 共练 {e.n} 次</span>
              </div>
            ))}
          </div>
        )}
        {recentErrors.length > 0 && (
          <details class="pp-set-detail">
            <summary>最近错题明细（新→旧）</summary>
            {recentErrors.map((e, i) => (
              <div class="pp-set-detail-row" key={i}>
                <span class="pp-py pp-set-errpy">{unitOfKey(e.item)}</span>
                <span class="pp-set-detail-mid">听错成</span>
                <span class="pp-py pp-set-errpy">{e.picked}</span>
              </div>
            ))}
          </details>
        )}

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
        {/* 开发后门：满星（unlock-all 不给星，测不了自由练习门槛/图鉴）。仅 DEV 构建渲染。 */}
        {import.meta.env.DEV && (
          <ConfirmButton label="一键满星（开发调试）" confirmLabel="再点一次确认满星" onConfirm={onFillStars} />
        )}
        <ConfirmButton label="重置进度" confirmLabel="再点一次确认重置（星星和图鉴都会消失）" onConfirm={onResetProgress} />
      </div>
    </div>
  );
}
