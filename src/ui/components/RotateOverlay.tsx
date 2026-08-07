// 竖屏时的全屏提示遮罩——本 App 仅横屏（沿用姊妹项目的适配约定，详见设计文档）。
// 注：姊妹项目版本经由 Ico 组件加载精灵图标；本项目的图标体系尚未建立（M0 无美术资产），
// 故此处改用内联 SVG 画一个旋转箭头，避免过早引入整套图标资源依赖。
export function RotateOverlay() {
  return (
    <div class="pp-rotate">
      <div class="pp-rotate-icon">
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-3.5-7.14" />
          <path d="M21 3v6h-6" />
        </svg>
      </div>
      <div class="pp-rotate-text">请把 iPad 横过来</div>
    </div>
  );
}
