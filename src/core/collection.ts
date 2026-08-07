// 宇宙图鉴：12 个收藏品（外星小伙伴 / 火箭部件 / 星云宠物），
// 星星总数（满 123）达门槛即点亮——纯派生，无经济系统、无消耗。
import type { Progress } from './types';

export interface CollectionItem {
  readonly id: string;
  readonly name: string;
  readonly icon: string;      // emoji（M4/M5 可替换为 SVG key）
  readonly threshold: number; // 需要的星星总数
}

export const COLLECTION: readonly CollectionItem[] = [
  { id: 'stardust',       name: '小星尘',       icon: '✨', threshold: 5 },
  { id: 'moon-bunny',     name: '月亮兔',       icon: '🐇', threshold: 10 },
  { id: 'rocket-fin',     name: '火箭尾翼',     icon: '🚀', threshold: 18 },
  { id: 'bubble-alien',   name: '泡泡星人啵啵', icon: '🫧', threshold: 27 },
  { id: 'comet-pup',      name: '彗星小狗嗖嗖', icon: '🐶', threshold: 36 },
  { id: 'porthole',       name: '飞船舷窗',     icon: '🪟', threshold: 48 },
  { id: 'three-eye',      name: '三眼豆豆',     icon: '👽', threshold: 60 },
  { id: 'nebula-jelly',   name: '星云水母幽幽', icon: '🎐', threshold: 72 },
  { id: 'booster',        name: '超级助推器',   icon: '🔥', threshold: 84 },
  { id: 'ring-cat',       name: '土星环猫咪',   icon: '🐱', threshold: 96 },
  { id: 'galaxy-dolphin', name: '银河海豚',     icon: '🐬', threshold: 104 },
  { id: 'golden-saucer',  name: '金色飞碟',     icon: '🛸', threshold: 110 },
];

export const unlockedItems = (totalStars: number): CollectionItem[] =>
  COLLECTION.filter((c) => c.threshold <= totalStars);

// 本次拿星后新点亮的收藏品（庆祝弹层用）；已在图鉴里看过的不重复弹。
export function newlyUnlocked(p: Progress, prevStars: number, nowStars: number): CollectionItem[] {
  return COLLECTION.filter(
    (c) => prevStars < c.threshold && c.threshold <= nowStars && !p.collectionSeen.includes(c.id),
  );
}

// 图鉴到访：把（已解锁的）收藏记为「看过」。幂等；无新增时返回原对象——
// 调用方可据引用相等跳过落盘。纯函数，不改入参。
export function markCollectionSeen(p: Progress, ids: readonly string[]): Progress {
  const fresh = ids.filter((id) => !p.collectionSeen.includes(id));
  if (fresh.length === 0) return p;
  return { ...p, collectionSeen: [...p.collectionSeen, ...fresh] };
}
