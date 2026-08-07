// voice.ts 的可测纯部件；AudioContext 接线本身不在 node 下测（M6 真机验收）。
import { describe, expect, it } from 'vitest';
import { clipUrl } from '../../src/audio/voice';

describe('clipUrl', () => {
  it('joins deploy base, audio dir and file', () => {
    expect(clipUrl('/child-pinyin-app/', 'sy-ba4.mp3')).toBe('/child-pinyin-app/audio/sy-ba4.mp3');
    expect(clipUrl('/', 'ln-welcome.mp3')).toBe('/audio/ln-welcome.mp3');
  });
});
