// 宇宙图鉴：12 件收藏品 4×3 网格。已解锁 → 彩色卡（代码画 SVG + 名字）；
// 未解锁 → 剪影 + ⭐N 门槛提示。newIds = 本次到访新点亮的收藏（App 进屏时
// 用 markCollectionSeen 已落盘），逐张播 pop 揭示动画 + 「新!」角标。
import { COLLECTION } from '../../core/collection';
import { CollectibleArt } from '../components/CollectibleArt';

interface CollectionProps {
  stars: number;          // totalStars（页眉 ★ N / 123 与解锁判定同源）
  newIds: readonly string[];
  onExit: () => void;
}

export function Collection({ stars, newIds, onExit }: CollectionProps) {
  return (
    <div class="pp-collection">
      <div class="pp-screen-top">
        <button class="pp-back" onClick={onExit} aria-label="回星系">←</button>
        <div class="pp-screen-title">宇宙图鉴</div>
        <div class="pp-coll-stars">★ {stars} / 123</div>
      </div>

      <div class="pp-coll-grid">
        {COLLECTION.map((c) => {
          const open = c.threshold <= stars;
          const isNew = newIds.includes(c.id);
          const revealIndex = isNew ? newIds.indexOf(c.id) : 0;
          return (
            <div
              key={c.id}
              class={'pp-coll-card' + (open ? ' is-open' : ' is-locked') + (isNew ? ' is-new' : '')}
              style={isNew ? { animationDelay: `${0.25 + revealIndex * 0.35}s` } : undefined}
            >
              <div class="pp-coll-art"><CollectibleArt id={c.id} size={92} /></div>
              {open ? (
                <div class="pp-coll-name">{c.name}</div>
              ) : (
                <div class="pp-coll-need">⭐ {c.threshold} 颗星</div>
              )}
              {isNew && <span class="pp-coll-newtag">新!</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
