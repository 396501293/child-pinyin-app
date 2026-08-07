// 进度存取 —— fork 自数学夜航 storage.ts（safeStore 私密模式兜底 / 损坏备份 /
// 合并式加载 / 多档案分片），删其 v1→v2 迁移；key 'pinyin_planet_v1'。
import type { Progress } from './types';
import { defaultProgress } from './types';

export { defaultProgress };

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const KEY = 'pinyin_planet_v1';
const CORRUPT_KEY = 'pinyin_planet_v1_corrupt';

// ── 多档案（三娃）──────────────────────────────────────────────
// 档案 0 沿用 KEY（单档案用户零迁移）；档案 1/2 分片 `${KEY}_p{i}`。
// active/count 存元数据 key；无元数据 = 单档案 active 0。
const PROFILE_META_KEY = 'pinyin_planet_profiles';
export const MAX_PROFILES = 3;

export function profileMeta(store: StorageLike = safeStore()): { active: number; count: number } {
  try {
    const raw = store.getItem(PROFILE_META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as { active?: unknown; count?: unknown };
      const count = Math.min(MAX_PROFILES, Math.max(1, Number(m.count) || 1));
      const active = Math.min(count - 1, Math.max(0, Number(m.active) || 0));
      return { active, count };
    }
  } catch {
    // 解析失败按单档案处理
  }
  return { active: 0, count: 1 };
}

function saveMeta(m: { active: number; count: number }, store: StorageLike): void {
  try {
    store.setItem(PROFILE_META_KEY, JSON.stringify(m));
  } catch {
    // 私密模式：静默降级为单档案
  }
}

export function addProfile(store: StorageLike = safeStore()): void {
  const m = profileMeta(store);
  if (m.count >= MAX_PROFILES) return;
  saveMeta({ ...m, count: m.count + 1 }, store);
}

export function setActiveProfile(i: number, store: StorageLike = safeStore()): void {
  const m = profileMeta(store);
  if (i < 0 || i >= m.count) return;
  saveMeta({ ...m, active: i }, store);
  mem = null; // 切档后内存兜底失效（属于旧档案）
}

const keyFor = (i: number): string => (i === 0 ? KEY : `${KEY}_p${i}`);

// 选人屏头像用：窥视某档案的前沿与星星数（不改 active）。
export function peekProfile(
  i: number,
  store: StorageLike = safeStore(),
): { unlocked: number; stars: number } | null {
  try {
    const raw = store.getItem(keyFor(i));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Progress>;
    let stars = 0;
    for (const planet of Object.values(p.planets ?? {}))
      for (const s of planet?.stars ?? []) stars += Number(s) || 0;
    for (const s of Object.values(p.stations ?? {})) stars += Number(s) || 0;
    return { unlocked: Number(p.unlocked) || 1, stars };
  } catch {
    return null;
  }
}

// In-memory fallback: last successfully saved Progress, used when the real
// store throws (private browsing / quota exceeded) so the app still "works"
// for the duration of the session.
let mem: Progress | null = null;

function deepClone(p: Progress): Progress {
  return JSON.parse(JSON.stringify(p)) as Progress;
}

function noopStore(): StorageLike {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

export function safeStore(): StorageLike {
  try {
    const ls = globalThis.localStorage;
    if (ls) return ls;
  } catch {
    // accessing the property itself can throw in some privacy modes
  }
  return noopStore();
}

// 只守卫 version + object-ness；嵌套字段可缺（旧/手改 blob），ok 路径合并进缺省值。
function isProgressShape(v: unknown): v is Partial<Progress> & { version: 1 } {
  return !!v && typeof v === 'object' && (v as { version?: unknown }).version === 1;
}

type LoadResult =
  | { kind: 'ok'; data: Partial<Progress> & { version: 1 } }
  | { kind: 'missing' }
  | { kind: 'corrupt' }
  | { kind: 'broken' };

function tryLoad(store: StorageLike): LoadResult {
  let raw: string | null;
  try {
    raw = store.getItem(keyFor(profileMeta(store).active));
  } catch {
    return { kind: 'broken' };
  }
  if (raw == null) return { kind: 'missing' };
  try {
    const parsed = JSON.parse(raw);
    if (isProgressShape(parsed)) return { kind: 'ok', data: parsed };
  } catch {
    // fall through to corrupt handling below
  }
  // unparseable OR valid JSON with wrong shape/version: back up raw blob before reset
  try {
    store.setItem(CORRUPT_KEY, raw);
  } catch {
    // best effort; if this throws the store is broken anyway
  }
  return { kind: 'corrupt' };
}

export function loadProgress(store: StorageLike = safeStore()): Progress {
  const r = tryLoad(store);
  if (r.kind === 'broken') return mem ? deepClone(mem) : defaultProgress();
  if (r.kind === 'corrupt') return defaultProgress(); // already backed up to _corrupt key
  if (r.kind === 'missing') return defaultProgress();

  // Merge over defaults so partial blobs degrade gracefully instead of
  // crashing the app at e.g. progress.settings.clipVolume.
  const d = defaultProgress();
  const parsed = r.data;
  return {
    ...d,
    ...parsed,
    planets: { ...d.planets, ...parsed.planets },
    stations: { ...d.stations, ...parsed.stations },
    radar: { ...d.radar, ...parsed.radar },
    launchpad: { ...d.launchpad, ...parsed.launchpad },
    collectionSeen: parsed.collectionSeen ?? [],
    settings: { ...d.settings, ...parsed.settings },
    insight: parsed.insight
      ? { days: parsed.insight.days ?? [], errors: parsed.insight.errors ?? [] }
      : d.insight,
    version: 1,
  };
}

export function saveProgress(p: Progress, store: StorageLike = safeStore()): void {
  mem = deepClone(p);
  try {
    store.setItem(keyFor(profileMeta(store).active), JSON.stringify(p));
  } catch {
    // in-memory fallback (mem) already updated above; ignore storage failure
  }
}
