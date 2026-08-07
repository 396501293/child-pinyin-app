// 出题器（纯函数 + 种子 Rng）：听音辨认(3选1) / 四声辨音(4选1) / 拼读对接(1-3 段)。
// clip 一律经 manifest 纯查询解析，缺失即 throw——性质测试遍历全课程保证运行时打不中。
import { clipForLetter, clipForSyllable, clipForTonedVowel } from '../audio/manifest';
import { pickDistractors } from './confusables';
import { ALL_FINALS, ALL_INITIALS, LESSONS } from './curriculum';
import type { Lesson, Station } from './curriculum';
import { letterKey, masteryWeight, stateOf, syllableKey, unitOfKey, weightedPick } from './mastery';
import { parseSyllable, toneMark } from './pinyin';
import type { Syllable, Tone } from './pinyin';
import { shuffle } from './rand';
import type { FactState, Rng } from './types';

export interface ListenPick { kind: 'listen-pick'; clip: string; answer: string; options: string[] }
export interface TonePick { kind: 'tone-pick'; clip: string; base: string; answer: string; options: string[] }
export interface BlendStage { role: 'initial' | 'medial' | 'final'; answer: string; options: string[] }
export interface Blend { kind: 'blend'; clip: string; target: Syllable; stages: BlendStage[] }
export type Question = ListenPick | TonePick | Blend;

const TONES: readonly Tone[] = [1, 2, 3, 4];
const LETTER_UNITS = new Set([...ALL_INITIALS, ...ALL_FINALS]);
const MEDIALS = ['i', 'u', 'ü'] as const;

// 掌握度/埋点条目 key：听辨字母 → 'L:*'；带调内容（四声/拼读/带调元音）→ 'S:*'。
export function questionItem(q: Question): string {
  if (q.kind === 'blend') return syllableKey(q.target.text);
  if (q.kind === 'tone-pick') return syllableKey(q.answer);
  return LETTER_UNITS.has(q.answer) ? letterKey(q.answer) : syllableKey(q.answer);
}

// 截至某课（含）已教的声母/韵母——拼读干扰项只从中取，保证不越进度、不跨类。
function taughtUpTo(lessonId: number): { initials: string[]; finals: string[] } {
  const initials: string[] = [];
  const finals: string[] = [];
  for (const l of LESSONS) {
    if (l.id > lessonId) break;
    for (const u of l.newLetters) (ALL_INITIALS.includes(u) ? initials : finals).push(u);
  }
  return { initials, finals };
}

function listenLetter(unit: string, pool: readonly string[], rng: Rng): ListenPick {
  const options = shuffle([unit, ...pickDistractors(unit, pool, rng)], rng);
  return { kind: 'listen-pick', clip: clipForLetter(unit), answer: unit, options };
}

// 四声辨音：选项 = 该底座的 4 个带调形（裸元音经 clipForSyllable 自动路由 tv-*）。
function toneQuiz(base: string, tone: Tone, rng: Rng): TonePick {
  const answer = toneMark(base, tone);
  const options = shuffle(TONES.map((t) => toneMark(base, t)), rng);
  return { kind: 'tone-pick', clip: clipForSyllable(parseSyllable(answer)), base, answer, options };
}

// 拼读对接：声母段（易混声母干扰）→ 介母段（三拼，i/u/ü 全摆）→ 韵母段（易混韵母干扰）。
// 零声母音节（如 èr）只有韵母段——1 段也是合法对接。
function blendQuestion(text: string, lessonId: number, rng: Rng): Blend {
  const target = parseSyllable(text);
  const taught = taughtUpTo(lessonId);
  const stages: BlendStage[] = [];
  if (target.initial !== '') {
    const options = shuffle([target.initial, ...pickDistractors(target.initial, taught.initials, rng)], rng);
    stages.push({ role: 'initial', answer: target.initial, options });
  }
  if (target.medial !== undefined) {
    stages.push({ role: 'medial', answer: target.medial, options: shuffle([...MEDIALS], rng) });
  }
  const options = shuffle([target.final, ...pickDistractors(target.final, taught.finals, rng)], rng);
  stages.push({ role: 'final', answer: target.final, options });
  return { kind: 'blend', clip: clipForSyllable(target), target, stages };
}

// L1-2 练3 替代题：带调元音混合认读（听 ǎ → 从同元音他调 + 邻元音带调形里选，3 项）。
function tonedVowelQuiz(vowel: string, tone: Tone, vowels: readonly string[], rng: Rng): ListenPick {
  const answer = toneMark(vowel, tone);
  const otherTones = TONES.filter((t) => t !== tone);
  const sameVowel = toneMark(vowel, otherTones[Math.floor(rng() * otherTones.length)]);
  const neighbors = vowels.filter((v) => v !== vowel);
  const neighbor = toneMark(
    neighbors[Math.floor(rng() * neighbors.length)],
    TONES[Math.floor(rng() * TONES.length)],
  );
  return {
    kind: 'listen-pick',
    clip: clipForTonedVowel(vowel, tone),
    answer,
    options: shuffle([answer, sameVowel, neighbor], rng),
  };
}

// 练1 = 每个新字母 ×2；练2 = 每个声调底座 × 4 声；练3 = 每个拼读目标 ×1
//（L1-2 无 blends → 每个元音 × 4 声的带调认读）。全部洗牌。
export function buildPractice(lesson: Lesson, practice: 1 | 2 | 3, rng: Rng): Question[] {
  if (practice === 1) {
    const qs = lesson.newLetters.flatMap((u) => [
      listenLetter(u, lesson.newLetters, rng),
      listenLetter(u, lesson.newLetters, rng),
    ]);
    return shuffle(qs, rng);
  }
  if (practice === 2) {
    return shuffle(lesson.toneSets.flatMap((b) => TONES.map((t) => toneQuiz(b, t, rng))), rng);
  }
  if (lesson.blends.length === 0) {
    return shuffle(
      lesson.toneSets.flatMap((v) => TONES.map((t) => tonedVowelQuiz(v, t, lesson.toneSets, rng))),
      rng,
    );
  }
  return shuffle(lesson.blends.map((b) => blendQuestion(b, lesson.id, rng)), rng);
}

const pickN = <T>(arr: readonly T[], n: number, rng: Rng): T[] => shuffle([...arr], rng).slice(0, n);

// 空间站复习：3 听辨 + 3 四声 + 4 拼读，全部取自所覆盖课程（干扰池同源）。
export function buildStation(station: Station, rng: Rng): Question[] {
  const lessons = station.coversLessons.map((id) => LESSONS[id - 1]);
  const letters = lessons.flatMap((l) => l.newLetters);
  const toneBases = lessons.flatMap((l) => l.toneSets);
  const blends = lessons.flatMap((l) => l.blends.map((b) => ({ text: b, lessonId: l.id })));
  const qs: Question[] = [
    ...pickN(letters, 3, rng).map((u) => listenLetter(u, letters, rng)),
    ...pickN(toneBases, 3, rng).map((b) => toneQuiz(b, TONES[Math.floor(rng() * TONES.length)], rng)),
    ...pickN(blends, 4, rng).map((b) => blendQuestion(b.text, b.lessonId, rng)),
  ];
  return shuffle(qs, rng);
}

// ── 自由练习单题（掌握度加权抽样；pool 为 'L:*'/'S:*' key，见 progression 的池函数）──

export function buildRadarQuestion(
  pool: readonly string[],
  states: Record<string, FactState>,
  rng: Rng,
): ListenPick {
  const key = weightedPick(pool, (k) => masteryWeight(stateOf(states, k)), rng);
  return listenLetter(unitOfKey(key), pool.map(unitOfKey), rng);
}

const BLEND_LESSON = new Map<string, number>(
  LESSONS.flatMap((l) => l.blends.map((b) => [b, l.id] as const)),
);

export function buildLaunchpadQuestion(
  pool: readonly string[],
  states: Record<string, FactState>,
  rng: Rng,
): Blend {
  const key = weightedPick(pool, (k) => masteryWeight(stateOf(states, k)), rng);
  const text = unitOfKey(key);
  return blendQuestion(text, BLEND_LESSON.get(text) ?? LESSONS[LESSONS.length - 1].id, rng);
}
