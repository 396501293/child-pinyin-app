// 解锁链 + 星级 + 自由练习门槛/练习池。全部纯函数，不落盘。
import { LESSONS, nodeToContent, STATIONS } from './curriculum';
import type { NodeId } from './curriculum';
import { letterKey, syllableKey } from './mastery';
import type { PlanetProgress, Progress, Star } from './types';

export const MAX_NODE = 15; // [L1..L8, R1, L9..L13, R2]

// 星级按首次正确率：100%→3★，≥80%→2★，完成即有 1★（无挫败）；空会话 0★ 守卫。
export function starsFor(firstTry: number, total: number): Star {
  if (total <= 0) return 0;
  const ratio = Math.max(0, firstTry) / total;
  if (ratio >= 1) return 3;
  if (ratio >= 0.8) return 2;
  return 1;
}

export const planetOf = (p: Progress, lessonId: number): PlanetProgress =>
  p.planets[lessonId] ?? { learned: false, stars: [0, 0, 0] };

// 星球「点亮」= 练1/2/3 都拿到至少 1 星（学-learned 不设门槛，只是引导）。
export const planetCleared = (p: Progress, lessonId: number): boolean =>
  planetOf(p, lessonId).stars.every((s) => s >= 1);

export function nodeState(p: Progress, n: NodeId): 'locked' | 'available' | 'cleared' {
  if (n > p.unlocked) return 'locked';
  const c = nodeToContent(n);
  const cleared =
    c.kind === 'lesson' ? planetCleared(p, c.lesson.id) : (p.stations[c.station.id] ?? 0) >= 1;
  return cleared ? 'cleared' : 'available';
}

export const unlockAfterClear = (p: Progress, node: NodeId): Progress => ({
  ...p,
  unlocked: Math.max(p.unlocked, Math.min(node + 1, MAX_NODE)),
});

// 自由练习门槛：聪耳雷达 = 点亮第 3 颗星球；拼读发射台 = 点亮第 5 颗。
export const radarUnlocked = (p: Progress): boolean => planetCleared(p, 3);
export const launchpadUnlocked = (p: Progress): boolean => planetCleared(p, 5);

// 星星总数：13 星球 × (3 练 × 3★) + 2 空间站 × 3★ = 123 满。
export function totalStars(p: Progress): number {
  let sum = 0;
  for (const l of LESSONS) for (const s of planetOf(p, l.id).stars) sum += s;
  for (const st of STATIONS) sum += p.stations[st.id] ?? 0;
  return sum;
}

// 雷达池：已点亮星球的字母单元（'L:*'）；未解锁时为空（UI 门槛与池同源）。
export function radarPool(p: Progress): string[] {
  if (!radarUnlocked(p)) return [];
  return LESSONS.filter((l) => planetCleared(p, l.id)).flatMap((l) =>
    l.newLetters.map(letterKey),
  );
}

// 发射台池：已点亮星球的拼读音节（'S:*'）；L1-2 无 blends，天然不入池。
export function launchpadPool(p: Progress): string[] {
  if (!launchpadUnlocked(p)) return [];
  return LESSONS.filter((l) => planetCleared(p, l.id)).flatMap((l) =>
    l.blends.map(syllableKey),
  );
}
