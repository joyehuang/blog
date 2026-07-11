# Joye Personal Blog — Video Brand Guide

## 1. Visual Theme

Joye 的站点是 light-first 的个人技术主页：近白纸张底色、墨黑正文、极淡灰卡片，再用天蓝和少量琥珀色做情绪标记。它既像一份克制的工程师简历，也保留了终端、网格和命令行提示符带来的“会动手”气质。信息密度偏高，但通过大面积留白和细边框保持轻盈。视频应保留这种“清爽、诚实、工程感”的性格，不做霓虹赛博朋克，也不堆泛科技粒子。

## 2. Quick Reference

### Colors

- **Paper White** `#FCFCFD`：主背景与浅色卡片底。
- **Pure White** `#FFFFFF`：浮层与高亮卡片。
- **Ink Black** `#09090B`：标题与主正文；在 `#FCFCFD` 上约 19.2:1，AA 通过。
- **Quiet Graphite** `#45454A`：次级正文；在 `#FCFCFD` 上约 9.1:1，AA 通过。
- **Soft Panel** `#F2F2F3`：标签、列表卡片、数据单元格。
- **Hairline** `#DFDFE2`：边框和分隔线；只作结构，不作正文。
- **Sky Signal** `#7DD3FC`：技术高亮、光带和关键节点；不要在白底上当小号正文。
- **Deep Sky** `#0B5284`：可读的蓝色强调文字；在白底上约 8.1:1，AA 通过。
- **Summer Amber** `#F59E0B`：活动标签、数字击中和稀有暖色强调；白底小正文对比不足，只作大字或装饰。
- **Terminal Night** `#06090D`：终端场景背景。
- **Terminal Green** `#4ADE80`：终端状态灯与成功提示；在深色底上使用，不在白底作正文。
- **Steel Blue** `#2D3843`：玻璃终端边框与阴影色。

### Fonts

- **Display / body:** `Satoshi Variable`，可变字重 100–900。
  - Normal: `capture/assets/fonts/Satoshi-Variable.ttf`
  - Italic: `capture/assets/fonts/Satoshi-VariableItalic.ttf`
- **Mono / data:** `JetBrains Mono`。
  - 400: `capture/assets/fonts/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf`
  - 500: `capture/assets/fonts/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8-qxjPQ.ttf`
  - 600: `capture/assets/fonts/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8FqtjPQ.ttf`
  - Italic 400: `capture/assets/fonts/tDba2o-flEEny0FZhsfKu5WU4xD-IQ-PuZJJXxfpAO-LflOQ.ttf`
- 中文回退：`"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`。

## 3. Component Stylings

### Paper Card

- `background: #F2F2F3`; `border: 1px solid #DFDFE2`; `border-radius: 12–16px`。
- 默认无阴影；悬浮仅做 `translateY(-2px)` 与非常轻的阴影。

### Article Row

- 近白底、细灰边框、`12px` 圆角、横向日期 + 标题 + 箭头。
- 日期与标签用 JetBrains Mono，标题用 Satoshi / 中文回退。

### Terminal Glass

- `background: linear-gradient(rgba(255,255,255,.95), rgba(255,255,255,.88))`。
- `border: 1px solid rgba(45,56,67,.32)`；`border-radius: 14px`。
- `backdrop-filter: blur(18px) saturate(1.4)`；仅终端浮层使用玻璃效果。

### Status Pill

- `background: #F2F2F3`; `color: #45454A`; `border: 1px dashed #DFDFE2`。
- `padding: 2px 8px`; `border-radius: 999px`; 11–12px Mono。

### Summer Pill

- `background: rgba(245,158,11,.15)`；`border: 1px solid rgba(245,158,11,.4)`。
- 暖色只在一两个节点出现，避免整片变黄。

### Data Cell

- 数字 24–64px、500–700；标签 11–13px；`tabular-nums`。
- 数字用 Ink Black 或 Deep Sky，背景用 Soft Panel。

## 4. Spacing & Layout

- 基础单位 `4px`；主要间距：`8, 12, 16, 24, 32, 48, 64`。
- 竖屏安全区：左右至少 `72px`，底部字幕区至少 `180px`。
- 单镜头只保留一个主视觉：人物/数据/文章观点/CTA 四者不要同时争抢。
- 卡片圆角以 `12–16px` 为主，药丸只用于标签和短 CTA。
- 留白是核心品牌资产；每屏至少 25% 画面保持安静。

## 5. Iteration Guide

1. 每个浅色镜头以 `#FCFCFD` 为底，正文只能用 `#09090B` 或 `#45454A`。
2. 蓝色强调默认用 `#0B5284` 做文字、`#7DD3FC` 做光带；不要让浅蓝承担小字可读性。
3. 数据与代码一律用 JetBrains Mono；叙事标题用 Satoshi Variable 700–900。
4. 卡片使用 `#F2F2F3` + `#DFDFE2` 细边框，默认无重阴影。
5. 终端场景才允许 `#06090D` 深底与 `#4ADE80` 状态绿；其他场景保持纸张感。
6. 动画以滚动、光标、列表推进、数字计数和卡片推入为主，不使用随机粒子雨。
7. 截图只作为真实站点证据；主叙事由重构的文章卡片、数据和作者视觉承担。
8. 暖色 `#F59E0B` 每个镜头最多一个焦点，用于“热门”“行动”或 CTA 的一次击中。
9. 中文字幕每行不超过 16 个汉字，最多两行，确保小红书/B站竖屏直接发布。
10. 结尾必须完整呈现 `joyehuang.me` 与四个平台账号，至少停留 4 秒。
