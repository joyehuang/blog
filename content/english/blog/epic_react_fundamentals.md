---
title: "Epic React - Fundamentals"
meta_title: ""
description: "Epic React Fundamentals "
date: 2024-03-21T05:00:00Z
image: "/images/react.png"
categories: ["React", "Frontend"]
draft: false
---

# React Basics: Understanding the Principles of DOM Operations

Before diving deep into React, let's review the most basic way of DOM operations. This will help us better understand why React is so popular and what problems it solves.
```javascript
<script type="module">
  // 1. Get the root element
  const rootElement = document.getElementById('root')
  
  // 2. Create new DOM element
  const element = document.createElement('div')
  
  // 3. Set element attributes
  element.className = 'container'
  
  // 4. Set element content
  element.textContent = 'Hello World'
  
  // 5. Add new element to DOM tree
  rootElement.append(element)
</script>
```
## Problems with JavaScript DOM API
1. Verbose code: Even creating simple UI elements requires multiple lines of code
2. Difficult to maintain: Direct DOM manipulation code is scattered and hard to track
3. Performance concerns: Frequent DOM operations affect performance

> This is exactly what modern frontend frameworks like React aim to solve.

---

# Raw React: Deep Understanding of React's Basic Concepts

Before starting to use React's advanced features, let's understand how React works at its core. By comparing native DOM operations with Raw React API, we can better understand React's design philosophy.
## Basic React Implementation
```javascript
<script type="module">
  import { createElement } from '/react.js'
  import { createRoot } from '/react-dom/client.js'
  
  // Get root element
  const rootElement = document.getElementById('root')
  
  // Create element using React
  const element = createElement(
    'div',
    { className: 'container' },
    'Hello World'
  )
  
  // Render element
  createRoot(rootElement).render(element)
</script>
```
This code demonstrates the most primitive way of using React. Compared to direct DOM manipulation, React provides a more declarative API.
## Package Management and Dependencies
- In actual development, we need to manage React and its related dependencies. This requires:
- **npm (Node Package Manager)**: The most mainstream package manager in the JavaScript ecosystem
- **Package Registry**: A centralized code repository where developers can publish and share reusable code packages
- **ESM Service**: Such as [esm.sh](https://esm.sh), which provides React packages in CDN form for direct use of ES modules in browsers

## React Core Concepts: Props and Children
### Props
Props are the basic way of passing data in React, making data flow between components predictable and controllable.
### Children
Children is a special prop in React used to define element's child content. There are three ways to define children:
1. As a standalone prop
```javascript
createElement('div', { className: 'container', children: 'Hello World' })
```
2. As multiple arguments
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
3. As an array
```typescript	  
const children = ['Hello', ' ', 'world!']
const reactElement2 = createElement(elementType, elementProps, children)
```
## Why Learn Raw React?
Although we rarely use these APIs directly in actual development, understanding them helps:
- Deeply understand how React works
- Better understand the essence of JSX (JSX eventually compiles into these raw API calls)
- Better debug complex problems when encountered

---

# JSX: Modern Syntax for React Development

JSX is the most commonly used syntax sugar in React development, allowing us to write React components using HTML-like syntax. Let's dive deep into the core concepts of JSX.
## Babel and JSX Compilation

JSX code needs to be compiled through Babel to run in browsers. In development environment, we need:
```javascript
<script type="text/babel" data-type="module">
	import * as React from '/react.js'
	import { createRoot } from '/react-dom/client.js'

	const rootElement = document.getElementById('root')
	const element = <div className="container">Hello World</div>

	createRoot(rootElement).render(element)
</script>
```

Important notes:
- Set script tag's type to text/babel
- Add data-type="module" to support ES modules
- Babel will compile JSX into React.createElement calls
- Use className instead of class in JSX to define CSS classes
## Interpolation
JSX supports inserting JavaScript expressions within curly braces {}:
```javascript
const children = 'Hello World'
const className = 'container'
const element = <div className={className}>{children}</div>
```
This approach allows us to dynamically build UI content.
## Converting HTML to JSX
When converting from HTML to JSX, note some syntax differences:
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
// class becomes className
<div className="container">
	<p>Here's Sam's favorite food:</p>
		<ul className="sams-food">
			<li>Green eggs</li>
			<li>Ham</li>
		</ul>
</div>
```
## React Fragment
React Fragment is a special component that allows us to group multiple elements together without adding extra nodes to the DOM:
```jsx
// Using Fragment long syntax
<React.Fragment>
  <p>Here's Sam's favorite food:</p>
  <ul className="sams-food">
    <li>Green eggs</li>
    <li>Ham</li>
  </ul>
</React.Fragment>

// Using short syntax
<>
  <p>Here's Sam's favorite food:</p>
  <ul className="sams-food">
    <li>Green eggs</li>
    <li>Ham</li>
  </ul>
</>
```

Benefits of Fragment:
- Avoids adding unnecessary DOM nodes
- Maintains clear DOM structure
- Doesn't affect CSS styles and layout
- Particularly suitable for scenarios requiring specific DOM structure (when combining multiple elements)

These features make JSX a powerful and flexible tool, maintaining HTML's intuitiveness while providing all of JavaScript's capabilities. Understanding these concepts is crucial for mastering React development.

---
# React Components: Evolution from Functions to Components
In React, components are the basic building blocks of user interfaces. Let's understand the concept of components and best practices through several examples.
## Functional Approach
The most basic way is to use components as regular functions:
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
While this approach works, it doesn't utilize all features of React components.
## Using React.createElement
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
This approach is closer to React's internal workings but is less commonly used in actual development.
## Standard React Component Writing
Finally, this is the recommended way to write React components:
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

This approach has several important characteristics:
1. **Capitalized Component Names**: React uses capitalization to distinguish custom components from native DOM elements
2. **JSX Syntax**: Uses HTML-like syntax for more intuitive code
3. **children Property**: Can contain child content like regular HTML elements
4. **Declarative Style**: Code is clearer, intentions more explicit
### Why This Is Best Practice?
- **Readability**: Component usage is similar to HTML, reducing learning curve
- **Maintainability**: Component structure and purpose are clear at a glance
- **Reusability**: Components can be easily reused in different places
- **Encapsulation**: Component's internal implementation details are hidden from outside
### Usage Tips
- Always use capitalized names for custom components
- Prefer JSX syntax over React.createElement
- Keep components single-responsibility
- Use props reasonably for data passing

Through this standard component writing approach, we can fully utilize React's component features to build maintainable, scalable applications.

---

