// fork 自数学夜航 profiles.test.ts：多档案（三娃）分片与元数据，key 前缀换 pinyin_planet。
import { expect, test } from 'vitest';
import type { StorageLike } from '../../src/core/storage';
import {
  MAX_PROFILES,
  addProfile,
  defaultProgress,
  loadProgress,
  peekProfile,
  profileMeta,
  saveProgress,
  setActiveProfile,
} from '../../src/core/storage';

function memStore(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}

test('无元数据 → 单档案 active 0（单档案用户行为逐位不变）', () => {
  const st = memStore();
  expect(profileMeta(st)).toEqual({ active: 0, count: 1 });
  const p = defaultProgress();
  p.unlocked = 7;
  saveProgress(p, st);
  expect(st.data['pinyin_planet_v1']).toBeTruthy(); // 原 key
  expect(loadProgress(st).unlocked).toBe(7);
});

test('addProfile：上限 3；新档案空进度、不切换 active', () => {
  const st = memStore();
  addProfile(st);
  expect(profileMeta(st)).toEqual({ active: 0, count: 2 });
  addProfile(st);
  addProfile(st); // 超限忽略
  expect(profileMeta(st).count).toBe(MAX_PROFILES);
});

test('档案分片隔离：档 1 的写入不碰档 0；切回档 0 读回原进度', () => {
  const st = memStore();
  const p0 = defaultProgress();
  p0.unlocked = 12;
  saveProgress(p0, st);
  addProfile(st);
  setActiveProfile(1, st);
  expect(loadProgress(st).unlocked).toBe(1); // 新档案空进度
  const p1 = defaultProgress();
  p1.unlocked = 5;
  saveProgress(p1, st);
  expect(st.data['pinyin_planet_v1_p1']).toBeTruthy();
  setActiveProfile(0, st);
  expect(loadProgress(st).unlocked).toBe(12); // 档 0 未被拆家
  setActiveProfile(1, st);
  expect(loadProgress(st).unlocked).toBe(5);
});

test('setActiveProfile 越界忽略', () => {
  const st = memStore();
  setActiveProfile(2, st); // count=1，越界
  expect(profileMeta(st).active).toBe(0);
  setActiveProfile(-1, st);
  expect(profileMeta(st).active).toBe(0);
});

test('元数据损坏 → 按单档案处理', () => {
  const st = memStore();
  st.data['pinyin_planet_profiles'] = '{nope';
  expect(profileMeta(st)).toEqual({ active: 0, count: 1 });
});

test('peekProfile：窥视星星数与前沿，不动 active；缺档给 null', () => {
  const st = memStore();
  expect(peekProfile(0, st)).toBeNull();
  const p = defaultProgress();
  p.unlocked = 4;
  p.planets[1] = { learned: true, stars: [3, 2, 1] };
  p.stations.r1 = 2;
  saveProgress(p, st);
  expect(peekProfile(0, st)).toEqual({ unlocked: 4, stars: 8 });
  expect(profileMeta(st).active).toBe(0);
  expect(peekProfile(1, st)).toBeNull(); // 档 1 尚无数据
});

test('peekProfile：blob 损坏给 null 不炸', () => {
  const st = memStore();
  st.data['pinyin_planet_v1'] = '{broken';
  expect(peekProfile(0, st)).toBeNull();
});
