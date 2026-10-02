# Lab demos review — 2026-10-03

五个交互条目与统一 header 按压反馈。截图取自本地生产构建，已逐张读图检查；完整的 1440px / 375px × 明暗主题截图及交互记录保存于 `~/research/lab-demos-2026-10-03/`。

## 页面

- [Lab 列表](index-1440-light.png)
- [复制按钮别撒谎](honest-copy-1440-light.png)：真实 Clipboard API、execCommand 兜底、模拟两条路径失败。
- [工具栏提示要有热身](warm-tooltip-1440-light.png)：420ms 冷进入，同组即时、Tab 即时、Escape 关闭、触屏直接执行。
- [CSS 动画与旋转](animation-rotation-1440-light.png)：forwards 覆盖 transform 与 backwards 释放控制权；重播和键盘聚焦已测。
- [状态形状](status-shapes-1440-light.png)：[375px 暗色](status-shapes-375-dark.png)，灰度 / 24px / 静止组合已测。
- [减少动态效果入口](motion-entry-guards-1440-light.png)：首次进入、重放、延迟、异步加载后复查、运行中取消。

## Header 关键帧

四个按钮（语言、终端、主题、手机菜单）实测按压矩阵均为 `matrix(0.94, 0, 0, 0.94, 0, 0)`，释放后为 `none`。

![原尺寸](header-rest.png)
![按下主题按钮](header-toggleDarkMode-pressed.png)
![释放回弹](header-released.png)
![键盘按下，保留焦点环](header-keyboard-pressed.png)
![系统减少动态效果时不缩放](header-reduced-pressed.png)

## 验证

- `bun run check`：0 errors / 0 warnings，3 hints（两个既有 GSC 未使用变量，一个按任务要求使用的 execCommand 弃用提示）。
- `bun run build`：通过。现有 Vercel adapter 提示本地 Node 24 与函数运行时版本差异；未修改部署设置。
- `bun run test`：135 pass / 0 fail，包含 5 个新增异步行为用例。
- `bun test`：源码测试通过，但自动发现的 8 个既有友链脚本测试因缺少 `ipaddr.js` 无法载入。未扩大本 PR 修改依赖。
- 改动文件 ESLint、Prettier、`git diff --check` 通过。
- 浏览器：24 个页面/主题/宽度组合无横向溢出；五个 React 岛屿正常水合；复制、tooltip、旋转、状态和入口取消路径均通过交互断言。

## DESIGN.md 核对

- 颜色：新增 UI 全用语义 token；修掉 Lab 分类标签原有通用色板类名，统一语义 muted 表面。没有新增色值或私有素材。
- 字体：继承站点字体，不给普通 UI 添加 mono；正文沿用 MDX 排版。
- 间距与形状：16 / 20 / 24px 容器间距，6px 控件、8px 面板，复用 DemoFrame。
- 响应式：只使用 640px 断点；375px 对照面板按顺序堆叠。
- 动效：控件反馈使用 0.25s ease；复制标签叠放并做 blur/opacity/scale 切换。实验中的 420ms 延迟、700ms 入场与 2.4s 演示播放属于教学参数。
- 减少动态：新增 CSS 动效统一 media override；WAAPI 在入口与偏好变化时处理；状态动效单次、不循环。
- 输入：原生 button / checkbox；可见焦点、可访问名称；hover 变换限制为精细悬停指针；header 仅 active 缩放，布局和事件功能保持原样。
- 子主题：没有修改 terminal / Jojo 的内部视觉规则。

## 出处

1. 复制：`feat/microinteractions-20260919-r3` 的 `src/lib/copy.ts`。
2. Tooltip：同分支 `src/components/Header.astro` 的 `mountWarmTooltips`。
3. 旋转：本站手绘风样式踩坑，重建示例。
4. 状态：Jojo 表情库的状态信号设计，仅思路；SVG 为简单几何图形。
5. Reduced motion：本站 `src/lib/jojo/intro/entry.ts`、`controller.ts` 的入场修复，仅生命周期思路。

内容影响：新增五篇中文 Lab 条目及索引卡片。配置 / analytics / 生产部署设置未改。只创建任务分支 PR 和自动 Preview，不合并。
