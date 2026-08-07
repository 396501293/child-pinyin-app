import { describe, expect, test } from 'vitest';
import { LessonSession } from '../../src/core/lessonFlow';
import type { ListenPick, Question } from '../../src/core/questions';
import { defaultProgress } from '../../src/core/types';
import type { Progress } from '../../src/core/types';
import { dayNumber } from '../../src/core/insight';
import { seeded } from './helpers';

// 手搓 listen-pick（answer 用真实字母单元 → 条目 key 'L:*'；clip 不经 manifest，仅运行时字段）
const lp = (answer: string): ListenPick => ({
  kind: 'listen-pick',
  clip: `sm-${answer}`,
  answer,
  options: [answer, 'x1', 'x2'],
});
const queueOf = (...answers: string[]): Question[] => answers.map(lp);
const NOW = new Date(2026, 7, 7, 12).getTime(); // 本地正午，日界安全

describe('会话推进（无挫败流）', () => {
  test('全对：逐题推进，firstTry = total，3 星', () => {
    const s = new LessonSession(queueOf('b', 'p', 'm', 'f'), { node: 3, practice: 1 }, seeded(1));
    expect(s.total).toBe(4);
    while (!s.isDone()) {
      const q = s.current();
      expect(q).not.toBeNull();
      expect(s.answer(true)).toEqual({ advance: true });
    }
    expect(s.current()).toBeNull();
    expect(s.firstTry).toBe(4);
    expect(s.starsEarned()).toBe(3);
  });

  test('答错不推进：同题留在原地直到答对；重试答对不计 firstTry', () => {
    const s = new LessonSession(queueOf('b', 'p'), { node: 3, practice: 1 }, seeded(2));
    const q0 = s.current();
    expect(s.answer(false, 'd')).toEqual({ advance: false });
    expect(s.current()).toBe(q0); // 原地重试
    expect(s.answer(false, 'p')).toEqual({ advance: false });
    expect(s.current()).toBe(q0); // 仍不推进
    expect(s.answer(true)).toEqual({ advance: true });
    expect(s.firstTry).toBe(0);
  });

  test('会话结束后 answer 是 no-op', () => {
    const s = new LessonSession(queueOf('b'), { node: 3, practice: 1 }, seeded(3));
    s.answer(true);
    expect(s.isDone()).toBe(true);
    expect(s.answer(true)).toEqual({ advance: false });
    expect(s.firstTry).toBe(1);
  });
});

describe('再见面（+3..5 强制重现）', () => {
  test('首错条目在 +3..5 处重现（多种子验界）', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const s = new LessonSession(
        queueOf('b', 'p', 'm', 'f', 'd', 't', 'n', 'l'),
        { node: 3, practice: 1 },
        seeded(seed),
      );
      expect(s.answer(false, 'x')).toEqual({ advance: false }); // q0 'b' 首错
      expect(s.length).toBe(9); // 已插入 1 条再见面
      s.answer(true); // 原地答对，推进
      let reappearAt = -1;
      let step = 1;
      while (!s.isDone()) {
        const q = s.current();
        if (q && q.kind === 'listen-pick' && q.answer === 'b' && reappearAt < 0) reappearAt = step;
        s.answer(true);
        step++;
      }
      expect(reappearAt).toBeGreaterThanOrEqual(3); // 插入位 idx+3..idx+5
      expect(reappearAt).toBeLessThanOrEqual(5);
    }
  });

  test('队列太短则追加到末尾兜底', () => {
    const s = new LessonSession(queueOf('b', 'p'), { node: 3, practice: 1 }, seeded(4));
    s.answer(false, 'x');
    expect(s.length).toBe(3);
    s.answer(true); // b
    s.answer(true); // p
    const tail = s.current();
    expect(tail && tail.kind === 'listen-pick' && tail.answer).toBe('b'); // 再见面在队尾
    s.answer(true);
    expect(s.isDone()).toBe(true);
  });

  test('每条目每会话至多一次再见面（再见面上再错不加插）', () => {
    const s = new LessonSession(queueOf('b', 'p'), { node: 3, practice: 1 }, seeded(5));
    s.answer(false, 'x'); // b 首错 → 插一条
    expect(s.length).toBe(3);
    s.answer(true); // b
    s.answer(true); // p
    s.answer(false, 'y'); // 再见面的 b 又错 → 不再插
    expect(s.length).toBe(3);
    s.answer(true);
    expect(s.isDone()).toBe(true);
  });

  test('再见面不计入星级分母，firstTry 也不加分', () => {
    const s = new LessonSession(queueOf('b', 'p', 'm', 'f', 'd'), { node: 3, practice: 1 }, seeded(6));
    s.answer(false, 'x'); // b 错
    s.answer(true);
    while (!s.isDone()) s.answer(true); // 其余全对（含再见面）
    expect(s.total).toBe(5);
    expect(s.firstTry).toBe(4); // 4/5 = 80% → 2 星
    expect(s.starsEarned()).toBe(2);
  });
});

describe('星级数学', () => {
  const run = (answers: string[], wrongOn: Set<number>) => {
    const s = new LessonSession(queueOf(...answers), { node: 3, practice: 1 }, seeded(7));
    let planned = 0;
    while (!s.isDone()) {
      const q = s.current();
      const isPlannedIdx = planned < answers.length;
      if (isPlannedIdx && wrongOn.has(planned) && q && q.kind === 'listen-pick' && q.answer === answers[planned]) {
        s.answer(false, 'z');
      }
      s.answer(true);
      planned++;
    }
    return s;
  };

  test('10 题错 2 → 8/10 → 2 星；错 3 → 1 星', () => {
    const letters = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k'];
    expect(run(letters, new Set([0, 1])).starsEarned()).toBe(2);
    expect(run(letters, new Set([0, 1, 2])).starsEarned()).toBe(1);
  });

  test('空队列 0 星（守卫）', () => {
    const s = new LessonSession([], { node: 3, practice: 1 }, seeded(8));
    expect(s.isDone()).toBe(true);
    expect(s.starsEarned()).toBe(0);
  });
});

describe('commitToProgress（纯、幂等）', () => {
  const allCorrect = (node: number, practice: 1 | 2 | 3, answers: string[]): LessonSession => {
    const s = new LessonSession(queueOf(...answers), { node, practice: practice }, seeded(9));
    while (!s.isDone()) s.answer(true);
    return s;
  };

  test('星星写入对应练格，unlock 不动（星球未点亮）', () => {
    const s = allCorrect(3, 1, ['b', 'p', 'm', 'f']);
    const p = s.commitToProgress(defaultProgress(), NOW);
    expect(p.planets[3].stars).toEqual([3, 0, 0]);
    expect(p.unlocked).toBe(1);
  });

  test('点亮星球（三练全 ≥1★）→ 解锁链推进到下一节点', () => {
    const base = defaultProgress();
    base.planets[3] = { learned: true, stars: [0, 1, 1] };
    base.unlocked = 3;
    const p = allCorrect(3, 1, ['b', 'p']).commitToProgress(base, NOW);
    expect(p.planets[3].stars).toEqual([3, 1, 1]);
    expect(p.unlocked).toBe(4);
  });

  test('星星 max 合并：已有更高星不被降级', () => {
    const base = defaultProgress();
    base.planets[3] = { learned: true, stars: [3, 3, 3] };
    base.unlocked = 4;
    const s = new LessonSession(queueOf('b', 'p', 'm'), { node: 3, practice: 1 }, seeded(10));
    s.answer(false, 'x'); // 1 错 → 2/3 → 1 星
    while (!s.isDone()) s.answer(true);
    expect(s.starsEarned()).toBe(1);
    const p = s.commitToProgress(base, NOW);
    expect(p.planets[3].stars).toEqual([3, 3, 3]);
  });

  test('learned 标记不被 commit 覆盖', () => {
    const base = defaultProgress();
    base.planets[3] = { learned: true, stars: [0, 0, 0] };
    const p = allCorrect(3, 2, ['b', 'p']).commitToProgress(base, NOW);
    expect(p.planets[3].learned).toBe(true);
    expect(p.planets[3].stars).toEqual([0, 3, 0]);
  });

  test('空间站：节点 9 → stations.r1，≥1★ 即解锁节点 10', () => {
    const base = defaultProgress();
    base.unlocked = 9;
    const p = allCorrect(9, 1, ['b', 'p', 'm']).commitToProgress(base, NOW);
    expect(p.stations.r1).toBe(3);
    expect(p.unlocked).toBe(10);
  });

  test('幂等：同一入参重复 commit 结果逐位相同，且不改源 Progress', () => {
    const s = new LessonSession(queueOf('b', 'p', 'm'), { node: 3, practice: 1 }, seeded(11));
    s.answer(false, 'd');
    while (!s.isDone()) s.answer(true);
    const base = defaultProgress();
    const snapshot = JSON.parse(JSON.stringify(base)) as Progress;
    const a = s.commitToProgress(base, NOW);
    const b = s.commitToProgress(base, NOW);
    expect(a).toEqual(b);
    expect(base).toEqual(snapshot); // 源未被就地修改
  });

  test('insight：每次首答各记一行（含再见面），错题带 picked 进缓冲', () => {
    const s = new LessonSession(queueOf('b', 'p', 'm', 'f'), { node: 3, practice: 1 }, seeded(12));
    s.answer(false, 'd'); // b 首错（picked 'd'）
    s.answer(false, 'p'); // 重试再错：不重复计
    s.answer(true);       // 重试对：不计 firstTry
    while (!s.isDone()) s.answer(true); // p/m/f + b 再见面
    const p = s.commitToProgress(defaultProgress(), NOW);
    const today = p.insight.days.find((d) => d.d === dayNumber(NOW));
    expect(today).toBeDefined();
    expect(today?.items['L:b']).toEqual({ n: 2, ok: 1 }); // 首答错 + 再见面首答对
    expect(today?.items['L:p']).toEqual({ n: 1, ok: 1 });
    expect(p.insight.errors).toEqual([{ item: 'L:b', picked: 'd', at: NOW }]);
  });
});
