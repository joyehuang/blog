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

# Typescript

## typeof
The typeof operator allows you to use it in type context to reference the type of a variable or property
```tsx
const user = { name: 'kody', isCute: true }
type User = typeof user
// type User = { name: string; isCute: boolean; }
```

## keyof
The keyof operator allows you to obtain
```tsx
type UserKeys = keyof User
// type UserKeys = "name" | "isCute"
```

# Advanced TypeScript Type Operations in React
TypeScript provides powerful type support for React development. Let's dive into some commonly used type operators and techniques.

## typeof Operator
`typeof` allows us to extract types from existing values:
```typescript
const user = { name: 'kody', isCute: true }
type User = typeof user
// Results in type: { name: string; isCute: boolean; }
```
This is particularly useful when deriving types from actual data structures.

## keyof Operator
`keyof` is used to get all keys of a type as a union type:
```typescript
type UserKeys = keyof User
// Results in type: "name" | "isCute"
```

## Combining keyof typeof
This combination is particularly useful when creating types from objects:
```typescript
const operations = {
  '+': (left: number, right: number): number => left + right,
  '-': (left: number, right: number): number => left - right,
  '*': (left: number, right: number): number => left * right,
  '/': (left: number, right: number): number => left / right,
}

type Operator = keyof typeof operations
// Results in type: '+' | '-' | '*' | '/'
```
Note: The order of `typeof keyof` is meaningless because `keyof` must act on types, not values.

## Default Properties (Default Props)
TypeScript makes it easy to define function parameters with default values:
```typescript
function add(a: number = 0, b: number = 0): number {
  return a + b
}
// Returns 0 when no parameters are passed
```

## Record Utility Type
`Record` is used to create object types with specific key and value types:
```typescript
type OperationFn = (left: number, right: number) => number
type Operator = '+' | '-' | '/' | '*'

const operations: Record<Operator, OperationFn> = {
  '+': (left, right) => left + right,
  '-': (left, right) => left - right,
  '*': (left, right) => left * right,
  '/': (left, right) => left / right,
}
```

## Satisfies Operator
`satisfies` is a new operator introduced in TypeScript 4.9 that allows us to validate expression types without affecting inference results:
```typescript
type ValidCandies = 'twix' | 'snickers' | 'm&ms'

// Using type annotation
const candy1: ValidCandies = 'twix'
// candy1's type is ValidCandies

// Using satisfies
const candy2 = 'twix' satisfies ValidCandies
// candy2's type is literal type 'twix'
```
Advantages of `satisfies`:
- Maintains more precise type inference
- Provides type checking without widening types
- Particularly useful in scenarios requiring type safety while maintaining literal types

### Practical Application Tips
1. **Using typeof**:
   - When you need to create types from existing objects
   - Avoid type definition repetition
2. **Using keyof**:
   - When you need to restrict property access
   - Create stricter type constraints
3. **Using Record**:
   - When creating mapping objects
   - Ensure object property completeness
4. **Using satisfies**:
   - When you need type checking but want to maintain literal types
   - Validate implementation without affecting type inference

These TypeScript features can help us create safer, more maintainable code in React development. Proper use of these features can improve code quality and reduce runtime errors.

---

# Detailed Guide to React Form Implementation

## Basic Form Implementation
The simplest form implementation is as follows:
```jsx
function App() {
	return (
		<form>
			<div>
				<label htmlFor="usernameInput">Username:</label>
				<input id="usernameInput" name="username" />
			</div>
			<button type="submit">Submit</button>
		</form>
	)
}```
This implementation has an issue: form submission triggers page refresh.

## Form Submission Address Configuration
By setting the `action` attribute, we can specify the target address for form submission:
```jsx
<form action="api/onboarding">
// api/onboarding is just for testing
```
If `action` is not set, form data will be submitted to the current URL by default.

## Common Form Input Types
HTML5 provides various input types for better user experience:
```jsx
// Password input
<div>
  <label htmlFor="passwordInput">Password:</label>
  <input id="passwordInput" name="password" type="password" />
</div>

// Age input (number type)
<div>
  <label htmlFor="ageInput">Age:</label>
  <input id="ageInput" name="age" type="number" min="0" max="200" />
</div>

// Image upload
<div>
  <label htmlFor="photoInput">Photo:</label>
  <input id="photoInput" name="photo" type="file" accept="image/*" />
</div>

// Color picker
<div>
  <label htmlFor="colorInput">Favorite Color:</label>
  <input id="colorInput" name="color" type="color" />
</div>

// Date selection
<div>
  <label htmlFor="startDateInput">Start Date:</label>
  <input id="startDateInput" name="startDate" type="date" />
</div>
```

## Handling Form Submission Issues
The basic implementation has two main problems:
1. Sensitive information (like passwords) appears in the URL
2. The page completely refreshes, causing client-side code to reload

### Solutions:
1. Use POST method to submit data
Change the browser's default GET to POST, which will transmit data through the request body rather than URL parameters, more suitable for handling sensitive information:
```tsx
<form action="api/onboarding" method="POST"></form>
```
2. Handle POST requests on the server side:
```ts
export async function action({ request }: { request: Request }) {
  const data = await request.formData()
  return respondWithDataTable(data)
}
}```

We use `request.formData()` here because the request isn't a plain string, but in `application/x-www-form-urlencoded` format.

However, there's still an issue: when uploading photos, only the filename is returned, not the photo itself. This is because the browser's default `application/x-www-form-urlencoded` encoding is suitable for simple form data but not for large files like images. Large files can't be represented by string URLs, so we need to add new attributes to the form to let the browser accept the file itself:

```tsx
<form
	action="api/onboarding"
	method="POST"
	encType="multipart/form-data"
></form>
```

The only way to solve the page refresh issue is to handle form submission through JavaScript rather than browser default behavior. In real work, we usually use frameworks like Remix to solve this problem, but the basic idea is to add an onSubmit handler to the form to take over the submission process and prevent browser refresh:

```tsx
<form
	action="api/onboarding"
	method="POST"
	encType="multipart/form-data"
	onSubmit={event => {
		event.preventDefault()
		// ...
	}}
></form>
```

This prevents page refresh, but we still need to manually get the form data. This is where the FormData API comes in:

```tsx
const form = event.currentTarget
const formData = new FormData(form)
// Browser console.log(formData) doesn't show well
// You can view the data this way:
console.log(Object.fromEntries(formData))
// This converts formData to a plain object for easy viewing
// Note: formData may contain multiple values for the same key
// So this method is not recommended in production
```

Complete code
```jsx
function App() {
	return (
		<form
			action="api/onboarding"
			method="POST"
			encType="multipart/form-data"
			onSubmit={event => {
				event.preventDefault()
				const formData = new FormData(event.currentTarget)
				console.log(Object.fromEntries(formData))
			}}
		>
			// your inputs
		</form>
	)
}
```

React also provides a more elegant built-in solution: the form's action attribute can accept a function, which will receive the formData object as a parameter. Note that this is a React-specific feature, native HTML doesn't support using functions as action values:

```jsx
function App() {
	function logFormData(formData: FormData) {
		console.log(Object.fromEntries(formData))
	}
	return (
		<form action={logFormData}>
			// your inputs
		</form>
```

---
# Epic React Fundamental Summary
This article summarizes the key knowledge points from the Epic React Forms Workshop, but does not include practice-intensive content such as styling, inputs, errors, and arrays. For these topics, it is recommended to refer to the original workshop for learning.