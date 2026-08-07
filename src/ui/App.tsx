import { useEffect, useState } from 'preact/hooks';
import { useStageScale } from './scale';
import { RotateOverlay } from './components/RotateOverlay';

// 竖屏检测——结构与姊妹项目 App.tsx 的 usePortrait 一致（scale.ts 旁未导出，本地复刻）。
function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return portrait;
}

// M0 占位：仅搭起 1024×768 固定舞台的缩放外壳 + 竖屏遮罩。
// 后续里程碑（M4/M5）会把地图/学习/练习/结算等屏幕接进 .pp-stage 内部，
// 结构沿用姊妹项目 App.tsx 最外层 JSX 的 viewport/stage/rotate 三段式。
export function App() {
  const scale = useStageScale();
  const portrait = usePortrait();

  return (
    <div class="pp-viewport">
      <div class="pp-stage" style={{ transform: `scale(${scale})` }}>
        <h1 class="pp-placeholder-title">拼音星球</h1>
      </div>
      {portrait && <RotateOverlay />}
    </div>
  );
}
