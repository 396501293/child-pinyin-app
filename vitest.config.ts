import { defineConfig } from 'vitest/config';

// 测试全部是纯逻辑（无 JSX/插件依赖），独立配置即可。
// M3 计划的种子化性质测试（每课 × 数百 seeds 的出题遍历）在 CI 慢跑器上可能超过默认 5s 单测超时，故上调。
export default defineConfig({
  test: { testTimeout: 60_000 },
});
