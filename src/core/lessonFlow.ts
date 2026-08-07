// 练习会话运行时 —— fork 自数学夜航 TimesTableSession 骨架，改无挫败流：
// 答错不推进（同一题原地重试直到答对），只有首答计入星级；
// 每个条目首次答错在 +3..5 处强制再见面一次（再见面不计入星级分母）。
import { nodeToContent } from './curriculum';
import type { NodeId } from './curriculum';
import { recordAnswer } from './insight';
import { planetCleared, planetOf, starsFor, unlockAfterClear } from './progression';
import { questionItem } from './questions';
import type { Question } from './questions';
import { shuffle } from './rand';
import type { Progress, Rng, Star } from './types';

// node 必须经 curriculum.nodeOfLesson(lesson.id) 映射（L9-13 因 r1 占 node 9 而错位 +1）——
// 拿 lesson.id 直接当 node，L9+ 的星星会被静默写进 stations.r1。空间站会话 practice 无意义，传 1。
export interface LessonMeta { node: NodeId; practice: 1 | 2 | 3 }

interface Entry { q: Question; remeet: boolean }
interface LogRow { item: string; ok: boolean; picked?: string } // 每次「首答」一行，供 insight

export class LessonSession {
  private readonly queue: Entry[];
  private readonly meta: LessonMeta;
  private readonly rng: Rng;
  private idx = 0;
  private attempted = false; // 当前条目是否已答错过（还没答对）
  private readonly wrongOnce = new Set<string>(); // 已安排过再见面的条目（每会话至多一次）
  private readonly log: LogRow[] = [];
  private firstTryCount = 0;
  readonly total: number; // 星级分母 = 计划题数（再见面追加不计入）

  constructor(queue: Question[], meta: LessonMeta, rng: Rng) {
    this.queue = queue.map((q) => ({ q, remeet: false }));
    this.meta = meta;
    this.rng = rng;
    this.total = queue.length;
  }

  get firstTry(): number { return this.firstTryCount; }
  get length(): number { return this.queue.length; } // 含已插入的再见面
  get index(): number { return this.idx; }
  isDone(): boolean { return this.idx >= this.queue.length; }
  current(): Question | null { return this.isDone() ? null : this.queue[this.idx].q; }

  // 再见面的题克隆并重洗选项（Blend 逐段重洗）：防孩子靠「记位置」而非听音答对重现题。
  private reshuffled(q: Question): Question {
    if (q.kind === 'blend') {
      return { ...q, stages: q.stages.map((st) => ({ ...st, options: shuffle([...st.options], this.rng) })) };
    }
    return { ...q, options: shuffle([...q.options], this.rng) };
  }

  // 首次答错 → 在 本题序号 + rand(3,5) 处再出一次（越界则会话末尾追加兜底）。
  private scheduleRemeet(q: Question): void {
    const pos = this.idx + 3 + Math.floor(this.rng() * 3); // +3..5
    const entry: Entry = { q: this.reshuffled(q), remeet: true };
    if (pos >= this.queue.length) this.queue.push(entry);
    else this.queue.splice(pos, 0, entry);
  }

  // 判定语义：每「次呈现」一题一判——多段的 Blend 由 UI 逐段收集，任一段选错即整题
  // answer(false, picked=该段错选单元)；只有全部段一次通过才 answer(true)。
  // 答错不推进（原地重试），仅每条目的「首答」计星/埋点/触发再见面。
  answer(correct: boolean, picked?: string): { advance: boolean } {
    if (this.isDone()) return { advance: false };
    const entry = this.queue[this.idx];
    const item = questionItem(entry.q);
    if (!this.attempted) { // 本条目「首答」：计星、埋点、必要时安排再见面
      this.log.push(correct ? { item, ok: true } : { item, ok: false, ...(picked !== undefined && { picked }) });
      if (correct && !entry.remeet) this.firstTryCount++;
      if (!correct && !this.wrongOnce.has(item)) {
        this.scheduleRemeet(entry.q);
        this.wrongOnce.add(item);
      }
    }
    if (correct) {
      this.idx++;
      this.attempted = false;
      return { advance: true };
    }
    this.attempted = true; // 原地重试，不推进
    return { advance: false };
  }

  starsEarned(): Star { return starsFor(this.firstTryCount, this.total); }

  // 结算落盘：星星 max 合并 → 点亮即推进解锁链 → 回放埋点日志进 insight。
  // 纯函数且幂等（只读内部状态，相同入参重复调用结果逐位相同，不改 p）；
  // 每会话结束后应恰好调用一次，并把结果 saveProgress 落盘（M4 职责）。
  commitToProgress(p: Progress, now: number = Date.now()): Progress {
    const stars = this.starsEarned();
    const content = nodeToContent(this.meta.node);
    let next: Progress;
    if (content.kind === 'lesson') {
      const id = content.lesson.id;
      const planet = planetOf(p, id);
      const merged = [...planet.stars] as [Star, Star, Star];
      const i = this.meta.practice - 1;
      merged[i] = Math.max(merged[i], stars) as Star;
      next = { ...p, planets: { ...p.planets, [id]: { ...planet, stars: merged } } };
      if (planetCleared(next, id)) next = unlockAfterClear(next, this.meta.node);
    } else {
      const id = content.station.id;
      const merged = Math.max(p.stations[id] ?? 0, stars) as Star;
      next = { ...p, stations: { ...p.stations, [id]: merged } };
      if (merged >= 1) next = unlockAfterClear(next, this.meta.node);
    }
    for (const row of this.log) next = recordAnswer(next, row.item, row.ok, row.picked, now);
    return next;
  }
}
