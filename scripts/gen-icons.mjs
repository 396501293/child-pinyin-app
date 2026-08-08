// 生成 PWA / apple-touch 图标：把 scripts/icon.svg（糖果粉星球 + 白色 ā）
// 栅格化成 manifest / index.html 引用的三种尺寸。
// 运行：node scripts/gen-icons.mjs
//
// - 背景满铺出血、不预裁圆角：iOS 主屏会自己裁，Android maskable 由
//   系统按形状裁（icon.svg 已把星球+字面收在中心 80% 安全区内）。
// - 2× 超采样后缩到目标尺寸：librsvg 直出目标尺寸时细描边会发虚。
// - 调色板量化（PNG-8）：扁平插画色数有限，压掉约 3/4 体积且肉眼无损；
//   图标进 PWA 预缓存，体积直接影响首次安装的下载量（同姊妹项目）。
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(join(root, 'scripts', 'icon.svg'));
const outDir = join(root, 'public', 'icons');

await mkdir(outDir, { recursive: true });

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of targets) {
  // icon.svg 固有尺寸 512：density 按目标尺寸的 2 倍换算（72 为 librsvg 基准 DPI）
  await sharp(svg, { density: (72 * size * 2) / 512 })
    .resize(size, size)
    .png({ palette: true, quality: 90, effort: 10 })
    .toFile(join(outDir, name));
  console.log(`wrote ${name} (${size}×${size})`);
}
