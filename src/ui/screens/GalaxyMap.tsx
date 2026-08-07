// 星系航线图：15 节点蛇形路径（13 颗课程星球 + 2 座复习空间站）。
// 节点态：locked（置灰+🔒）/ available（脉冲呼吸）/ cleared（点亮 + 星）。
// 点星球开「星球面板」选 学/练1/练2/练3（顺序 gating 见 ui/gating.ts）；
// 点空间站直接开复习会话。齿轮长按 1.5s 进家长设置（fork 自数学夜航 Map）。
import { useEffect, useRef, useState } from 'preact/hooks';
import { unlockedItems } from '../../core/collection';
import type { Lesson, NodeId } from '../../core/curriculum';
import { nodeToContent } from '../../core/curriculum';
import {
  launchpadUnlocked,
  MAX_NODE,
  nodeState,
  planetOf,
  radarUnlocked,
  totalStars,
} from '../../core/progression';
import type { Progress } from '../../core/types';
import { practiceLabel, practiceUnlocked } from '../gating';
import { PlanetIcon, StationIcon } from '../components/PlanetIcon';
import { StarRow, starsToRow } from '../components/StarRow';

interface GalaxyMapProps {
  progress: Progress;
  onStartLearn: (node: NodeId) => void;
  onStartPractice: (node: NodeId, practice: 1 | 2 | 3) => void;
  onOpenRadar: () => void;
  onOpenLaunchpad: () => void;
  onOpenCollection: () => void;
  onOpenSettings: () => void;
}

// 左下入口条目：解锁 → 可点玩具按钮；未解锁 → 置灰 🔒 + 开放条件提示
//（复用原「敬请期待」占位的观感，hint 换成真实门槛）。badge = 图鉴有新收藏。
function EntryChip({ open, label, hint, badge, onOpen }: {
  open: boolean;
  label: string;
  hint: string;
  badge?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      class={'pp-entry' + (open ? ' is-open' : ' is-locked')}
      disabled={!open}
      onClick={open ? onOpen : undefined}
    >
      {open ? label : `🔒 ${label}`}
      {!open && <span class="pp-entry-hint">{hint}</span>}
      {open && badge && <span class="pp-entry-new">新!</span>}
    </button>
  );
}

// 蛇形路径几何：3 行 × 5 列，第 2 行反向。ROW_Y/COL_X 与 PATH_D 手工耦合——改动需同步。
const ROW_Y = [215, 400, 585];
const COL_X = [122, 322, 522, 722, 922];
const PATH_D =
  'M 122 215 H 922 C 1014 215 1014 400 922 400 H 122 C 30 400 30 585 122 585 H 922';

// 节点序 → 坐标：row1 L→R（1-5）、row2 R→L（6-10）、row3 L→R（11-15）。
function nodePos(n: NodeId): { x: number; y: number } {
  const i = n - 1;
  const row = Math.floor(i / 5);
  const col = i % 5;
  return { x: COL_X[row === 1 ? 4 - col : col], y: ROW_Y[row] };
}

// 星球面板（选中某课程星球时弹出）：学 + 三练，各带星与锁。
function PlanetPanel({ lesson, node, progress, onClose, onStartLearn, onStartPractice }: {
  lesson: Lesson;
  node: NodeId;
  progress: Progress;
  onClose: () => void;
  onStartLearn: (node: NodeId) => void;
  onStartPractice: (node: NodeId, practice: 1 | 2 | 3) => void;
}) {
  const planet = planetOf(progress, lesson.id);
  const practices: Array<1 | 2 | 3> = [1, 2, 3];
  return (
    <div class="pp-panel-mask" onClick={onClose}>
      <div class="pp-panel" onClick={(e) => e.stopPropagation()}>
        <button class="pp-panel-close" onClick={onClose} aria-label="关闭">✕</button>
        <div class="pp-panel-side">
          <PlanetIcon lessonId={lesson.id} size={132} />
          <div class="pp-panel-lesson">第 {lesson.id} 课</div>
          <div class="pp-py pp-panel-title">{lesson.title}</div>
        </div>
        <div class="pp-panel-rows">
          <button class="pp-panel-row pp-panel-row--learn" onClick={() => onStartLearn(node)}>
            <span class="pp-panel-row-name">学一学</span>
            <span class="pp-panel-row-tail">{planet.learned ? '✓ 学过啦' : '从这里开始'}</span>
          </button>
          {practices.map((p) => {
            const open = practiceUnlocked(planet, p);
            const label = practiceLabel(lesson, p);
            return (
              <button
                key={p}
                class={'pp-panel-row' + (open ? '' : ' is-locked')}
                disabled={!open}
                onClick={open ? () => onStartPractice(node, p) : undefined}
              >
                <span class="pp-panel-row-name">
                  {open ? '' : '🔒 '}练{p} · {label}
                </span>
                <StarRow filled={starsToRow(planet.stars[p - 1])} size={24} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GalaxyMap({ progress, onStartLearn, onStartPractice, onOpenRadar, onOpenLaunchpad, onOpenCollection, onOpenSettings }: GalaxyMapProps) {
  const [selected, setSelected] = useState<NodeId | null>(null);

  // 齿轮长按 1.5s 才打开设置（防孩子误触）：pointerdown 起计时，抬起/移出取消。
  const gearTimer = useRef<number | undefined>(undefined);
  const startHold = () => {
    gearTimer.current = window.setTimeout(onOpenSettings, 1500);
  };
  const cancelHold = () => {
    window.clearTimeout(gearTimer.current);
    gearTimer.current = undefined;
  };
  useEffect(() => () => window.clearTimeout(gearTimer.current), []);

  const nodes = Array.from({ length: MAX_NODE }, (_, i) => (i + 1) as NodeId);
  // 前沿 = 第一个 available 节点（小火箭停靠处）
  const frontier = nodes.find((n) => nodeState(progress, n) === 'available');
  const stars = totalStars(progress);

  const tapNode = (n: NodeId) => {
    const c = nodeToContent(n);
    if (c.kind === 'station') onStartPractice(n, 1); // 空间站：直接开复习（practice 无意义传 1）
    else setSelected(n);
  };

  const selectedContent = selected !== null ? nodeToContent(selected) : null;

  return (
    <div class="pp-map">
      {/* 顶栏 */}
      <div class="pp-map-top">
        <div class="pp-map-title">拼音星球</div>
        <div class="pp-map-stars">★ {stars} / 123</div>
      </div>

      {/* 蛇形航线 */}
      <svg class="pp-map-path" width="1024" height="768" viewBox="0 0 1024 768" aria-hidden="true">
        <path d={PATH_D} fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 20" />
      </svg>

      {/* 15 节点 */}
      {nodes.map((n) => {
        const { x, y } = nodePos(n);
        const state = nodeState(progress, n);
        const c = nodeToContent(n);
        const cls = `pp-node is-${state}`;
        return (
          <div key={n} class={cls} style={{ left: x, top: y }}>
            <button
              class="pp-node-btn"
              disabled={state === 'locked'}
              onClick={state === 'locked' ? undefined : () => tapNode(n)}
              aria-label={c.kind === 'lesson' ? `第 ${c.lesson.id} 课 ${c.lesson.title}` : '空间站'}
            >
              {c.kind === 'lesson' ? (
                <PlanetIcon lessonId={c.lesson.id} size={n === frontier ? 100 : 88} />
              ) : (
                <StationIcon size={n === frontier ? 100 : 88} />
              )}
              {state === 'locked' && <span class="pp-node-lock">🔒</span>}
              {n === frontier && <span class="pp-node-rocket">🚀</span>}
            </button>
            <div class={c.kind === 'lesson' ? 'pp-py pp-node-label' : 'pp-node-label'}>
              {c.kind === 'lesson' ? c.lesson.title : '空间站'}
            </div>
            {state !== 'locked' && (
              <StarRow
                size={15}
                filled={
                  c.kind === 'lesson'
                    ? // 星球节点：三颗星对应 练1/2/3 各自是否 ≥1★（星级细节看面板）
                      planetOf(progress, c.lesson.id).stars.map((s) => s >= 1)
                    : starsToRow(progress.stations[c.station.id] ?? 0)
                }
              />
            )}
          </div>
        );
      })}

      {/* 左下：自由练习/图鉴入口（门槛见 progression.radarUnlocked/launchpadUnlocked） */}
      <div class="pp-map-entries">
        <EntryChip
          open={radarUnlocked(progress)}
          label="📡 聪耳雷达"
          hint="第 3 颗星球通关后开放"
          onOpen={onOpenRadar}
        />
        <EntryChip
          open={launchpadUnlocked(progress)}
          label="🚀 拼读发射台"
          hint="第 5 颗星球通关后开放"
          onOpen={onOpenLaunchpad}
        />
        <EntryChip
          open={stars > 0}
          label="📖 宇宙图鉴"
          hint="拿到第 1 颗星开放"
          badge={unlockedItems(stars).some((c) => !progress.collectionSeen.includes(c.id))}
          onOpen={onOpenCollection}
        />
      </div>

      {/* 右下齿轮：长按 1.5s 打开家长设置 */}
      <button
        class="pp-gear"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="家长设置（长按打开）"
      >
        ⚙️
      </button>

      {selected !== null && selectedContent?.kind === 'lesson' && (
        <PlanetPanel
          lesson={selectedContent.lesson}
          node={selected}
          progress={progress}
          onClose={() => setSelected(null)}
          onStartLearn={onStartLearn}
          onStartPractice={onStartPractice}
        />
      )}
    </div>
  );
}
