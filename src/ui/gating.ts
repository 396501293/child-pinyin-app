// 主线顺序 gating 与学屏计数的纯谓词（UI 层职责——core 的 commit 接受任意练格写星，
// 见 types.PlanetProgress 注释；顺序约束只在这里长牙）。纯函数，tests/ui/gating.test.ts 覆盖。
import type { Lesson } from '../core/curriculum';
import type { PlanetProgress } from '../core/types';

// 练1 需「学」完成；练2 需练1 ≥1★；练3 需练2 ≥1★。
export function practiceUnlocked(planet: PlanetProgress, practice: 1 | 2 | 3): boolean {
  if (practice === 1) return planet.learned;
  return planet.stars[practice - 2] >= 1;
}

// 学屏卡片单元：新授字母 + 整体认读（都要点过才算「学」完成——
// 整体认读同样是本课教学内容，见 curriculum.Lesson.wholeRead）。
export const learnUnits = (lesson: Lesson): string[] => [
  ...lesson.newLetters,
  ...(lesson.wholeRead ?? []),
];

export const allVisited = (units: readonly string[], visited: ReadonlySet<string>): boolean =>
  units.every((u) => visited.has(u));
