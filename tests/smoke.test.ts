import { describe, expect, it } from 'vitest';
import { STAGE_H, STAGE_W, stageScale } from '../src/ui/scale';

// M0 冒烟测试：仅验证脚手架能跑通 vitest，并覆盖舞台缩放的核心数学。
// 真正的拼音/课程逻辑测试从 M1 起进 tests/core/。
describe('stageScale', () => {
  it('scales up uniformly when the window is exactly 2x the stage', () => {
    expect(stageScale(STAGE_W * 2, STAGE_H * 2)).toBe(2);
  });

  it('letterboxes on the narrower dimension (min of width/height ratios)', () => {
    // 窗口比舞台（4:3）更宽——高度先顶到边，缩放应取高度比（较小者）。
    const wide = stageScale(4000, 768);
    expect(wide).toBeCloseTo(768 / STAGE_H, 5);

    // 窗口比舞台更高——宽度先顶到边，缩放应取宽度比（较小者）。
    const tall = stageScale(1024, 4000);
    expect(tall).toBeCloseTo(1024 / STAGE_W, 5);
  });

  it('shrinks below 1 when the window is smaller than the stage', () => {
    expect(stageScale(512, 384)).toBe(0.5);
  });
});
