// 词库（src/data/wordbank.ts）→ audio-script.json：补齐词句卫星要用的 clip 条目。
// 幂等：只新增缺失条目，已有条目（含 v1 的 168 条人声音节）一字不动。
//
//   sy-{base}{tone}  词句里出现的带调音节 → source: davinfifield（人声，由 import_pinyin_dataset.py --missing-only 导入）
//   sy-{base}0       轻声：仅数据集有 *5 文件的才建（见 NEUTRAL_IN_DATASET）；其余轻声无 clip，点读降级播整词/整句
//   wd-*             整词 → TTS（say = 汉字）
//   st-{课}-{n}      整句 → TTS（say = 汉字 + 句号，让 TTS 收句调）
//
// 用法：node --experimental-strip-types scripts/sync-wordbank-audio.mjs
// 之后：scripts/.venv/bin/python scripts/import_pinyin_dataset.py <数据集 mp3 目录> --missing-only
//       bash scripts/gen-voice.sh --only wd- && bash scripts/gen-voice.sh --only st-
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOONS, sentenceClipId, splitTone, syllableClipId, wordClipId } from '../src/data/wordbank.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'src', 'data', 'audio-script.json');

// davinfifield/mp3-chinese-pinyin-sound 里存在的轻声文件（{base}5.mp3），2026-11 核对。
const NEUTRAL_IN_DATASET = new Set(['ma', 'de', 'le', 'ne', 'dei']);

const doc = JSON.parse(readFileSync(SCRIPT, 'utf8'));
const clips = doc.clips;
const fileOf = (id) => id.replace(/ü/g, 'v') + '.mp3';
const added = { sy: 0, wd: 0, st: 0 };
const add = (id, clip, kind) => {
  if (id in clips) return;
  clips[id] = { say: clip.say, file: fileOf(id), ...(clip.source && { source: clip.source }) };
  added[kind]++;
};

for (const moon of MOONS) {
  const entries = [...moon.words, ...moon.sentences];
  for (const e of entries) {
    [...e.hz].forEach((ch, i) => {
      const syl = e.syl[i];
      const { base, tone } = splitTone(syl);
      if (tone === 0 && !NEUTRAL_IN_DATASET.has(base)) return;
      add(syllableClipId(syl), { say: ch, source: 'davinfifield' }, 'sy');
    });
  }
  for (const w of moon.words) add(wordClipId(w), { say: w.hz }, 'wd');
  moon.sentences.forEach((s, i) => add(sentenceClipId(moon.lesson, i), { say: s.hz + '。' }, 'st'));
}

writeFileSync(SCRIPT, JSON.stringify(doc, null, 2) + '\n');
console.log(`新增 sy ${added.sy} / wd ${added.wd} / st ${added.st}，共 ${Object.keys(clips).length} 条`);
