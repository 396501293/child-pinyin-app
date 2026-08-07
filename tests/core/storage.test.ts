// fork 自数学夜航 storage.test.ts，适配 Progress 形状与 key 'pinyin_planet_v1'（无 v1 迁移）。
import { expect, test } from 'vitest';
import { defaultProgress, loadProgress, saveProgress } from '../../src/core/storage';

const fakeStore = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
};

test('default progress shape', () => {
  const p = defaultProgress();
  expect(p).toMatchObject({
    version: 1,
    planets: {},
    stations: { r1: 0, r2: 0 },
    unlocked: 1,
    radar: { items: {}, sessions: 0, total: 0 },
    launchpad: { items: {}, sessions: 0, streak: 0, bestStreak: 0, total: 0 },
    collectionSeen: [],
    settings: { clipVolume: 1 },
    insight: { days: [], errors: [] },
  });
});

test('save/load round-trip（含掌握度与图鉴切片）', () => {
  const s = fakeStore();
  const p = defaultProgress();
  p.unlocked = 7;
  p.planets[3] = { learned: true, stars: [3, 2, 1] };
  p.stations.r1 = 2;
  p.radar.items['L:b'] = { s: 2, cd: 1 };
  p.radar.sessions = 4;
  p.launchpad = { items: { 'S:bà': { s: 3, cd: 3 } }, sessions: 2, streak: 5, bestStreak: 9, total: 40 };
  p.collectionSeen = ['stardust'];
  p.insight.errors = [{ item: 'L:b', picked: 'd', at: 123 }];
  saveProgress(p, s);
  expect(s.dump()).toHaveProperty('pinyin_planet_v1');
  expect(loadProgress(s)).toEqual(p);
});

test('部分 blob（缺 radar/launchpad 切片）合并出缺省切片，不炸', () => {
  const s = fakeStore({ pinyin_planet_v1: JSON.stringify({ version: 1, unlocked: 9 }) });
  const p = loadProgress(s);
  expect(p.unlocked).toBe(9); // blob 其余保留
  expect(p.radar).toEqual({ items: {}, sessions: 0, total: 0 });
  expect(p.launchpad.bestStreak).toBe(0);
  expect(p.settings.clipVolume).toBe(1);
});

test('radar 切片只有 items 时计数器补缺省', () => {
  const s = fakeStore({
    pinyin_planet_v1: JSON.stringify({ version: 1, radar: { items: { 'L:b': { s: 2, cd: 1 } } } }),
  });
  const p = loadProgress(s);
  expect(p.radar.items['L:b']).toEqual({ s: 2, cd: 1 });
  expect(p.radar.sessions).toBe(0);
  expect(p.radar.total).toBe(0);
});

test('仅 {version:1} 的空 blob 等于缺省进度', () => {
  const s = fakeStore({ pinyin_planet_v1: JSON.stringify({ version: 1 }) });
  expect(loadProgress(s)).toEqual(defaultProgress());
});

test('损坏 JSON → 先备份到 _corrupt key，再回缺省', () => {
  const s = fakeStore({ pinyin_planet_v1: '{oops' });
  const p = loadProgress(s);
  expect(p).toEqual(defaultProgress());
  expect(s.dump().pinyin_planet_v1_corrupt).toBe('{oops');
});

test('形状不对（version 不是 1）→ 备份 + 重置', () => {
  const blob = JSON.stringify({ version: 2, x: 1 });
  const s = fakeStore({ pinyin_planet_v1: blob });
  expect(loadProgress(s)).toEqual(defaultProgress());
  expect(s.dump().pinyin_planet_v1_corrupt).toBe(blob);
});

test('storage 抛错 → 会话期内存兜底可读回', () => {
  const boom = {
    getItem: () => { throw new Error(); },
    setItem: () => { throw new Error(); },
    removeItem: () => {},
  };
  const p = defaultProgress();
  p.unlocked = 9;
  saveProgress(p, boom); // 不抛
  expect(loadProgress(boom).unlocked).toBe(9); // 内存兜底读回
});
