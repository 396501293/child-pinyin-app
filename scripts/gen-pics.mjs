// 词句卫星配图生成（Agnes AI 文生图）。一次性开发工具，不进构建；产物 webp 直接入库，CI 不碰。
// 提示词与文件名唯一来源：src/data/wordbank.ts（WordEntry.pic / picId）。
//
// 用法（Node ≥ 22.6，需 --experimental-strip-types 读 .ts 词库）：
//   AGNES_API_KEY=... node --experimental-strip-types scripts/gen-pics.mjs           # 只出缺失的
//   ... scripts/gen-pics.mjs baba mama        # 只出指定 picId（强制重出）
//   ... scripts/gen-pics.mjs --force          # 全部重出
//   KEEP_RAW=1 保留原图到 .raw-pics/（已 gitignore），配合 --reprocess 只重做去底/缩放不调 API
//   免费账号限流约 10 次/分钟：串行出图、每张间隔 GAP_MS（默认 7000），429 自动退避
//
// 处理：纯白底洪泛去底 → 裁到内容边界 → 等比放进 320×320 透明画布 → webp q82。
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { MOONS, picId } from '../src/data/wordbank.ts';

const ENDPOINT = 'https://apihub.agnes-ai.com/v1/images/generations';
// 2.5 与 2.1 接口/参数/价格一致（官方文档 2026-11 核对），仅画质与提示词贴合更好。
const MODEL = 'agnes-image-2.5-flash';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'pics');
const RAW_DIR = join(ROOT, '.raw-pics');
const SIZE = 320;

// 统一风格：明亮扁平卡通（与应用的糖果色主题一致）；粗描边 + 纯白底是洪泛去底的前提。
const STYLE =
  "cute flat vector illustration for a children's picture card, thick dark navy outline, " +
  'bright candy colors, soft simple shading, rounded friendly shapes, no text, no letters, no numbers, ' +
  'no watermark, single centered subject filling 85% of the frame, plain pure white background, no ground shadow';

const ASSETS = Object.fromEntries(
  MOONS.flatMap((m) => m.words.filter((w) => w.pic).map((w) => [picId(w), w.pic])),
);

// 从四边洪泛近白像素当背景 → alpha 0；边缘羽化 1px。
async function dewhite(buf, TOL = 18) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const isBg = (i) => {
    const o = i * ch;
    return data[o] >= 255 - TOL && data[o + 1] >= 255 - TOL && data[o + 2] >= 255 - TOL;
  };
  const mask = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (mask[i] || !isBg(i)) continue;
    mask[i] = 1;
    const x = i % w, y = (i - x) / w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = mask[i] ? 0 : 255;
  // sharp 坑：单通道 raw 经 blur 后会被提升为 3 通道，必须按 info.channels 步长取回单通道。
  const { data: sd, info: si } = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .blur(1).linear(1.6, -64).raw().toBuffer({ resolveWithObject: true });
  const soft = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) soft[i] = sd[i * si.channels];
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = data[i * ch]; rgb[i * 3 + 1] = data[i * ch + 1]; rgb[i * 3 + 2] = data[i * ch + 2];
  }
  return sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(soft, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

async function generate(prompt) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AGNES_API_KEY}` },
    body: JSON.stringify({ model: MODEL, size: '1K', ratio: '1:1', prompt: `${prompt}, ${STYLE}` }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, 'base64');
  const url = json?.data?.[0]?.url;
  if (!url) throw new Error(`返回无图: ${JSON.stringify(json).slice(0, 300)}`);
  const img = await fetch(url);
  if (!img.ok) throw new Error(`下载失败 ${img.status}`);
  return Buffer.from(await img.arrayBuffer());
}

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };
const REPROCESS = process.argv.includes('--reprocess');

async function make(id, prompt) {
  const rawPath = join(RAW_DIR, `${id}.png`);
  let raw;
  if (REPROCESS && (await exists(rawPath))) raw = await readFile(rawPath);
  else {
    raw = await generate(prompt);
    if (process.env.KEEP_RAW) { await mkdir(RAW_DIR, { recursive: true }); await writeFile(rawPath, raw); }
  }
  const cut = await dewhite(raw);
  const out = await sharp(cut).trim({ threshold: 10 })
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  await writeFile(join(OUT, `${id}.webp`), out);
  console.log(`✓ ${id}  ${(out.length / 1024).toFixed(0)}KB`);
}

async function main() {
  if (!process.env.AGNES_API_KEY && !REPROCESS) { console.error('缺 AGNES_API_KEY'); process.exit(1); }
  await mkdir(OUT, { recursive: true });
  const args = process.argv.slice(2);
  const force = args.includes('--force') || REPROCESS;
  const picked = args.filter((a) => !a.startsWith('--'));
  for (const p of picked) if (!(p in ASSETS)) { console.error(`未知 picId: ${p}`); process.exit(1); }
  let ids = picked.length ? picked : Object.keys(ASSETS);
  if (!picked.length && !force) {
    const keep = [];
    for (const id of ids) if (!(await exists(join(OUT, `${id}.webp`)))) keep.push(id);
    ids = keep;
  }
  console.log(`待出图 ${ids.length} 张`);
  // 免费账号限流约 10 次/分钟（2026-11 实测：并发 4 时半分钟出 10 张后连续 429）。
  // 串行 + 每张间隔 GAP_MS；429 退避 60s 重试，最多 5 次；--reprocess 不调 API，不等。
  const gap = REPROCESS ? 0 : Number(process.env.GAP_MS ?? 7000);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let failed = 0;
  for (const [n, id] of ids.entries()) {
    if (n > 0) await sleep(gap);
    for (let attempt = 1; attempt <= 5; attempt++) {
      try { await make(id, ASSETS[id]); break; }
      catch (e) {
        const limited = e.message.includes('API 429');
        console.error(`✗ ${id}（第 ${attempt} 次）: ${limited ? '429 限流，60s 后重试' : e.message}`);
        if (attempt === 5 || (!limited && attempt === 2)) { failed++; break; }
        await sleep(limited ? 60_000 : 3000);
      }
    }
  }
  console.log(failed ? `完成，失败 ${failed} 张` : '全部完成');
  if (failed) process.exitCode = 1;
}
main();
