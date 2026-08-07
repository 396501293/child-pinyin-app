import { render } from 'preact';
import { App } from './ui/App';
import { initVoice } from './audio/voice';
import './styles.css';

// render 前初始化音频：initVoice 注册首手势解锁 AudioContext + 回前台重 resume，
// 内部同时 initTTS()（Web Speech 降级通道）——不重复调 initTTS，免挂双份 voiceschanged 监听。
initVoice();

render(<App />, document.getElementById('app')!);
