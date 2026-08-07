import { render } from 'preact';
import { App } from './ui/App';
import './styles.css';

// TODO(M2): 接入音频子系统时在此初始化（姊妹项目对应处调用 initTTS()）。

render(<App />, document.getElementById('app')!);
