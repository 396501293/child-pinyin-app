// 轻软音效层 —— fork 自数学夜航 sound.ts 的 WebAudio 合成引擎，
// 音色从像素方波改调成柔和太空系（sine/triangle：圆润、无棱角）。
//
// 边界（无惩罚铁律，与姊妹项目同）：
//   - 答错不配任何音效（选项抖动 + 变灰已是全部反馈）
// 音量刻意压低（0.04-0.10）——音效是质感衬底，不与拼音语音抢注意力。
//
// 注意：本模块与 voice.ts 各持一个 AudioContext（音效 vs 语音，互不共享增益/打断逻辑，
// 家长音量滑杆只作用于语音）。iOS 上双 context 并存的解锁/混音行为在 M6 真机验收覆盖；
// 若设备上出现互相抢占，再考虑合并到单 context 的方案。

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // 无 WebAudio 环境（旧 WebView/测试）：静默降级
  }
}

// 单音 + 指数衰减包络；delay 用于组装短乐句
function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; vol?: number; delay?: number } = {},
): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(opts.vol ?? 0.06, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

// 全部 4 个音：答对轻钟 / 对接咚+嗡 / 得星闪烁琶音 / 结算和弦
export const sfx = {
  // 答对：温柔的上行双音钟（G5 → C6），衬在夸奖语音底下
  right: () => {
    tone(784, 0.14, { vol: 0.05 });
    tone(1047, 0.22, { delay: 0.09, vol: 0.045 });
  },
  // 对接：低频「咚」的落座感 + 一丝嗡鸣（舱体震动）
  dock: () => {
    tone(165, 0.09, { type: 'triangle', vol: 0.1 });
    tone(330, 0.22, { delay: 0.05, vol: 0.04 });
  },
  // 得星/学完：闪烁琶音（E6-G6-C7）
  star: () => {
    tone(1319, 0.1, { vol: 0.05 });
    tone(1568, 0.1, { delay: 0.08, vol: 0.045 });
    tone(2093, 0.2, { delay: 0.16, vol: 0.04 });
  },
  // 结算小号角：C 大调分解和弦铺开
  chord: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.55, { type: 'triangle', vol: 0.04, delay: i * 0.07 }),
    );
  },
} as const;
