---
title: "Epic React - 基础篇"
meta_title: ""
description: "Epic React 基础篇"
date: 2024-03-21T05:00:00Z
image: "/images/react.png"
categories: ["React", "前端"]
draft: false
---

# React 基础：理解 DOM 操作的原理

在深入学习 React 之前，让我们先回顾一下最基础的 DOM 操作方式。这有助于我们更好地理解 React 为什么会如此受欢迎，以及它解决了什么问题。
```javascript
<script type="module">
  // 1. 获取根元素
  const rootElement = document.getElementById('root')
  
  // 2. 创建新的 DOM 元素
  const element = document.createElement('div')
  
  // 3. 设置元素属性
  element.className = 'container'
  
  // 4. 设置元素内容
  element.textContent = 'Hello World'
  
  // 5. 将新元素添加到 DOM 树中
  rootElement.append(element)
</script>
```
## 用javascript DOM Api的问题
1. 代码冗长：即便是创建简单的 UI 元素也需要多行代码
2. 维护困难：直接操作 DOM 的代码分散且难以追踪
3. 性能隐患：频繁的 DOM 操作会影响性能

> 这正是 React 等现代前端框架要解决的问题。

---

# Raw React：深入理解 React 的基础概念

在开始使用 React 的高级特性之前，让我们先来了解 React 的基本工作原理。通过对比原生 DOM 操作和 Raw React API，我们可以更好地理解 React 的设计理念。
## 基础 React 实现
```javascript
<script type="module">
  import { createElement } from '/react.js'
  import { createRoot } from '/react-dom/client.js'
  
  // 获取根元素
  const rootElement = document.getElementById('root')
  
  // 使用 React 创建元素
  const element = createElement(
    'div',
    { className: 'container' },
    'Hello World'
  )
  
  // 渲染元素
  createRoot(rootElement).render(element)
</script>
```
这段代码展示了 React 最原始的使用方式。相比直接操作 DOM，React 提供了更加声明式的 API。
## 包管理与依赖
- 在实际开发中，我们需要管理 React 及其相关依赖。这就需要用到：**npm (Node Package Manager)**：JavaScript 生态系统中最主流的包管理工具
- **包注册表 (Package Registry)**：集中式代码仓库，开发者可以在这里发布和共享可重用的代码包
- **ESM 服务**：例如 [esm.sh](https://esm.sh)，它提供了 CDN 形式的 React 包，便于在浏览器中直接使用 ES modules

## React 核心概念：Props 和 Children
### Props（属性）
Props 是 React 中传递数据的基本方式，它让组件之间的数据流动变得可预测和可控。
### Children（子元素）
children 是 React 中的一个特殊 prop，用于定义元素的子内容。有三种方式可以定义 children：
1. 作为单独的prop
```javascript
createElement('div', { className: 'container', children: 'Hello World' })
```
2. 作为多个参数
```typescript
const elementProps = { id: 'element-id' }
const elementType = 'h1'
const reactElement1 = createElement(
  elementType,
  elementProps,
  'Hello',
  ' ',
  'world!'
)
```
3. 当作数组
```typescript	  
const children = ['Hello', ' ', 'world!']
const reactElement2 = createElement(elementType, elementProps, children)
```
## 为什么要了解 Raw React？
虽然在实际开发中我们很少直接使用这些 API，但理解它们有助于：
- 深入理解 React 的工作原理
- 更好地理解 JSX 的本质（JSX 最终会被编译成这些原始 API 调用）
- 在遇到复杂问题时能够更好地进行调试

---

# JSX：React 开发的现代语法

JSX 是 React 开发中最常用的语法糖，它让我们能够用类似 HTML 的语法来编写 React 组件。让我们深入了解 JSX 的核心概念。
## Babel 与 JSX 编译

JSX 代码需要通过 Babel 编译才能在浏览器中运行。在开发环境中，我们需要：
```javascript
<script type="text/babel" data-type="module">
	import * as React from '/react.js'
	import { createRoot } from '/react-dom/client.js'

	const rootElement = document.getElementById('root')
	const element = <div className="container">Hello World</div>

	createRoot(rootElement).render(element)
</script>
```

注意事项：
- 将 `script` 标签的 `type` 设置为 `text/babel`
- 添加 `data-type="module"` 以支持 ES 模块
- Babel 会将 JSX 编译成 `React.createElement` 调用
- 在 JSX 中使用 `className` 而不是 `class` 来定义 CSS 类
## 插值表达式（Interpolation）
JSX 支持在花括号 `{}` 中插入 JavaScript 表达式：
```javascript
const children = 'Hello World'
const className = 'container'
const element = <div className={className}>{children}</div>
```
这种方式让我们能够动态地构建 UI 内容。
## HTML 到 JSX 的转换
从 HTML 转换到 JSX 时需要注意一些语法差异：
```html
<div class="container">
	<p>Here's Sam's favorite food:</p>
	<ul class="sams-food">
		<li>Green eggs</li>
		<li>Ham</li>
	</ul>
</div>
```

```jsx
// 从class变成了className
<div className="container">
	<p>Here's Sam's favorite food:</p>
		<ul className="sams-food">
			<li>Green eggs</li>
			<li>Ham</li>
		</ul>
</div>
```
## React Fragment
React Fragment 是一个特殊的组件，它允许我们将多个元素组合在一起，而不会在 DOM 中添加额外的节点：
```jsx
// 使用 Fragment 的长语法
<React.Fragment>
  <p>Here's Sam's favorite food:</p>
  <ul className="sams-food">
    <li>Green eggs</li>
    <li>Ham</li>
  </ul>
</React.Fragment>

// 使用简写语法
<>
  <p>Here's Sam's favorite food:</p>
  <ul className="sams-food">
    <li>Green eggs</li>
    <li>Ham</li>
  </ul>
</>
```

Fragment 的优点：
- 避免添加不必要的 DOM 节点
- 保持 DOM 结构的清晰
- 不影响 CSS 样式和布局
- 特别适用于列表、表格等需要特定 DOM 结构的场景（多个元素组合时）

这些特性让 JSX 成为了一个强大而灵活的工具，它既保持了 HTML 的直观性，又提供了 JavaScript 的全部能力。理解这些概念对于掌握 React 开发至关重要。

---
# React 组件：从函数到组件的演进
在 React 中，组件是构建用户界面的基础单元。让我们通过几个示例来理解组件的概念和最佳实践。
## 函数式写法
最基础的方式是将组件作为一个普通函数来使用：
```jsx
function message({ children }) {
  return <div className="message">{children}</div>
}

const element = (
  <div className="container">
    {message({ children: 'Hello World' })}
    {message({ children: 'Goodbye World' })}
  </div>
)
```
这种写法虽然可以工作，但没有利用 React 组件的全部特性。
## 使用 React.createElement
```jsx
function message({ children }) {
  return <div className="message">{children}</div>
}

const element = (
  <div className="container">
    {React.createElement(message, { children: 'Hello World' })}
    {React.createElement(message, { children: 'Goodbye World' })}
  </div>
)
```
这种方式更接近 React 的内部工作原理，但在实际开发中较少使用。
## React 组件的标准写法
最后，这是 React 组件的推荐写法：
```jsx
function Message({ children }) {
  return <div className="message">{children}</div>
}

const element = (
  <div className="container">
    <Message>Hello World</Message>
    <Message>Goodbye World</Message>
  </div>
)
```

这种写法有几个重要的特点：
1. **组件名称大写**：React 使用首字母大写来区分自定义组件和原生 DOM 元素
2. **JSX 语法**：使用类似 HTML 的语法使代码更直观
3. **children 属性**：可以像普通 HTML 元素一样包含子内容
4. **声明式风格**：代码更清晰，意图更明确
### 为什么这是最佳实践？
- **可读性**：组件的使用方式与 HTML 类似，降低了学习成本
- **可维护性**：组件的结构和用途一目了然
- **可重用性**：组件可以轻松地在不同地方重复使用
- **封装性**：组件内部的实现细节对外部是隐藏的
### 使用提示
- 始终使用大写字母开头命名自定义组件
- 优先使用 JSX 语法而不是 `React.createElement`
- 保持组件的单一职责
- 合理使用 props 传递数据

通过这种标准的组件写法，我们可以充分利用 React 的组件化特性，构建出可维护、可扩展的应用程序。