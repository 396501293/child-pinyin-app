// 极简 LRU 缓存：voice.ts 的解码缓冲用（全量 PCM ≈50-70MB，不能全留）。
// Map 迭代序即插入序：get/set 时重插到队尾，队首即最久未用。
export class LruCache<K, V> {
  private readonly map = new Map<K, V>();

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new Error(`LruCache: capacity must be >= 1, got ${capacity}`);
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value); // 刷新为最近使用
    return value;
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      this.map.delete(this.map.keys().next().value!); // 挤掉最久未用
    }
  }

  get size(): number {
    return this.map.size;
  }
}
