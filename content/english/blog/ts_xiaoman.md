---
title: "Typescript Note 小满zs "
meta_title: ""
description: "Typescript Note 小满zs"
date: 2024-03-21T05:00:00Z
categories: ["Typescript", "Frontend"]
draft: false
---

This article is a collection of notes from Xiaomanzs's TypeScript tutorial, covering the basics of TypeScript to advanced features, including important concepts such as type system, interface, generics, decorators, etc. Through these notes, you can systematically understand the core features and usage of TypeScript.

<!--more-->

# Basic Types
- number: includes integers, floating-point numbers, NaN, Infinity, binary, octal
- string
- boolean
- null
- undefined
- void

## How to debug ts files
### Call typescript and then run js files
```shell
npm i typescript -g
tsc -init # initialize
tsc -w # create a js file
# open a new terminal
node index.js
```
### Install ts-node to directly run ts files
```shell
npm i ts-node -g 
npm init -y
npm i @types/node -D
ts-node .\index.ts
```
# Any Type
- Includes any (arbitrary type) and unknown (unknown type)
1. top type: any, unknown
2. Object
3. Number, String, Boolean (object wrapper types)
4. number, string, boolean (primitive types)
5. custom: 1, 'Hello World', false
6. never
- unknown can only be assigned to itself or any
- unknown type cannot read any properties, methods cannot be called
- unknown is safer than any, preferably use unknown

# Interfaces and Object Types
- Interface in TypeScript is a type declaration method used to define object structures, function signatures, or class contracts, which describes the shape of the required properties and methods of an object
- Number of properties must match
- Interface must be capitalized when defined
- Multiple interfaces with the same name will be merged
```ts
interface A extends B // inherit from interface B {
    name: string
    age?: number // optional
    [propname: string]: any // index signature
    readonly cb: () => boolean // the function can be called but not modified
}

interface B {
    gender: string
}
let a: A = {
    name: 'Joye',
    age: 18,
    gender: 'Male',
    a: 1,
    b: 2,
    c: 3,
    cb: () => {
        return false
    }
}
```
## Function Interface
```ts
interface Fn {
    (name: string): number[]
}

const fn: Fn = function (name: string) {
    return [1]
}
```

# Array Types
```ts
// define an array
// first way
let arr: number[] = [1, 2, 3]
let arr2: boolean[] = [true, false, true]
// second way
let arr3: Array<number> = [1, 2, 3]
let arr4: Array<boolean> = [false, true, true]
```

# Function Types
```ts
// arrow function
const add = (a: number, b: number): number => a + b

// function default values and optional parameters, cannot be used simultaneously
function add(a: number = 5, b?): number { // return type
    return a + b
}
```
## Function this Type
```ts
interface Obj {
    user: number[]
    add: (this: Obj, num: number) => void
}

// ts can define the type of this, not possible in js, must be the first parameter to define the type of this
let obj: Obj = {
    user: [1, 2, 3],
    add(this: Obj, num: number) {
        this.user.push(num)
    }
}
```

## Function Overloading
- Function overloading in TypeScript is used to define the same function that can accept different types or numbers of parameters and return different types of values
```ts
// overload signatures
function greet(name: string): string;
function greet(age: number): string;
// implementation signature
function greet(param: string | number): string {
    if (typeof param === "string") {
        return `Hello, ${param}!`;
    } else {
        return `You are ${param} years old!`;
    }
}

// usage
console.log(greet("Tom"));     // "Hello, Tom!"
console.log(greet(25));        // "You are 25 years old!"
```

# Union Types, Type Assertions, Intersection Types

```ts
// union type
let phone: string | number = '123456789'
let phone1: string | number = 123456789
```
## Type Assertion
```ts
// 1. angle bracket syntax
let someValue: unknown = "this is a string";
let strLength: number = (<string>someValue).length;

// 2. as syntax (recommended)
let someValue: unknown = "this is a string";
let strLength: number = (someValue as string).length;
```
Main uses:
1. When you understand a value's type better than TypeScript
2. Bypassing type checking
3. Handling unknown type data

# Built-in Objects

### ECMAScript Standard Built-in Objects
```ts
let str: String;
let date: Date;
let reg: RegExp;
let error: Error;
let obj: Object;
let bool: Boolean;
let num: Number;
let math: Math;
let json: JSON;
```
### DOM and BOM Built-in Objects
```ts
let body: HTMLElement;
let div: HTMLDivElement;
let canvas: HTMLCanvasElement;
let doc: Document;
let win: Window;
let loc: Location;
let his: History;
let xhr: XMLHttpRequest;
```
### Promise and Typed Arrays
```ts
let promise: Promise<string>;
let buffer: ArrayBuffer;
let int8Array: Int8Array;
let uint8Array: Uint8Array;
let float32Array: Float32Array;
```
### Common Utility Objects
```ts
let map: Map<string, any>;
let set: Set<number>;
let weakMap: WeakMap<object, any>;
let weakSet: WeakSet<object>;
```

# Class
> `Class` in TypeScript is a blueprint for creating objects, encapsulating data (properties) and operations on data (methods), supporting inheritance, encapsulation, and polymorphism and other object-oriented features

### Properties
- `public` (default): Public properties, can be accessed anywhere
- `private`: Private properties, can only be accessed within the declaring class
- `protected`: Protected properties, can only be accessed within the declaring class and its subclasses
- `readonly`: Read-only properties, must be initialized at declaration or in the constructor
- `static`: Static properties, belong to the class declaration itself rather than instances

```ts
// Basic class declaration
class Person {
    // Properties
    name: string;                // Public property
    private _age: number;        // Private property
    protected id: number;        // Protected property
    readonly birthDate: Date;    // Read-only property
    static count: number = 0;    // Static property

    // Constructor
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
        Person.count++;
    }

    // Methods
    public sayHello(): void {    // Public method
        console.log(`Hello, I'm ${this.name}`);
    }

    private getAge(): number {   // Private method
        return this.age;
    }

    protected getId(): number {  // Protected method
        return this.id;
    }

    // Static method
    static getCount(): number {
        return Person.count;
    }

    // Accessors
    get userAge(): number {
        return this.age;
    }

    set userAge(age: number) {
        if (age >= 0) {
            this.age = age;
        }
    }
}
```
## Inheritance
```ts
// Inheriting base class
class Employee extends Person {
    constructor(name: string, age: number, public department: string) {
        super(name, age);  // Call parent constructor
    }

    // Method overriding
    sayHello(): void {
        super.sayHello();  // Call parent method
        console.log(`I work in ${this.department}`);
    }
}
```
## Interfaces
```ts
interface Workable {
    work(): void;
}

class Developer extends Employee implements Workable {
    work(): void {
        console.log("Coding...");
    }
}
```
## Example Usage
```ts
const person = new Person("Tom", 25);
person.sayHello();                    // Accessible
// person.age;                        // ❌ Error: private property not accessible
// person.getAge();                   // ❌ Error: private method not accessible

console.log(Person.count);            // Access static property
console.log(Person.getCount());       // Call static method

person.userAge = 26;                  // Use setter
console.log(person.userAge);          // Use getter
```

# Abstract Classes (Base Classes)
- Declared using the `abstract` keyword
- Cannot be directly instantiated
- Abstract methods must be implemented in derived classes
### When to Use Abstract Classes
- When you need to share code between multiple related classes
- When you want to force a group of related classes to follow a specific contract
- When you have partial common implementation, but some parts need to be customized by subclasses

```ts
// Define an abstract class Animal
abstract class Animal {
    // Regular property
    name: string;
    
    // Constructor
    constructor(name: string) {
        this.name = name;
    }
    
    // Implemented concrete method
    eat(): void {
        console.log(`${this.name} is eating.`);
    }
    
    // Abstract method, subclasses must implement
    abstract makeSound(): void;
}

// Implement subclass Dog
class Dog extends Animal {
    // Must implement parent's abstract method
    makeSound(): void {
        console.log('Woof! Woof!');
    }
}

// Implement subclass Cat
class Cat extends Animal {
    makeSound(): void {
        console.log('Meow!');
    }
}

// Cannot directly instantiate abstract class
// const animal = new Animal('Generic Animal'); // This line will error

// Can create subclass instances
const dog = new Dog('Buddy');
dog.eat(); // Output: Buddy is eating.
dog.makeSound(); // Output: Woof! Woof!
```

# Type Inference
```ts
let num = 456
num = '456' // will error, because when assigning 456 to num, ts infers num's type as number

let num
num = 456
num = '456' // won't error, because without assignment ts doesn't infer
```

# Type Aliases
```ts
type s = string
let str: s = '456'
```

# Never Type
> never type represents the type of values that never occur. It is the bottom type in TypeScript, a subtype of all types
- No type is a subtype of never, except never itself
- It can be assigned to any other type
- No type can be assigned to never, except never itself
## Use Cases
- Functions that never return
```ts
function throwError(message: string): never {
    throw new Error(message);
}

function infiniteLoop(): never {
    while (true) {
        // Infinite loop
    }
}
```
- Impossible intersection types
```ts
type NumberAndString = number & string;
```
- Application in exhaustive type checking
```ts
type Shape = Circle | Square;

function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}

function getArea(shape: Shape) {
    if ("radius" in shape) {
        return Math.PI * shape.radius ** 2;
    } else if ("width" in shape) {
        return shape.width * shape.width;
    } else {
        // If Shape type adds a new type but it's not handled here
        // TypeScript will report an error at compile time
        return assertNever(shape);
    }
}
```
- Application in conditional types
```ts
type NonNullable<T> = T extends null | undefined ? never : T;

// Examples
type A = NonNullable<string | null>; // string
type B = NonNullable<null>; // never
```

# Symbol
- Symbol is a primitive data type introduced in ES6, its main feature is that each Symbol value is unique, immutable
```ts
const sym1 = Symbol();
const sym2 = Symbol('description'); // can add description
const sym3 = Symbol('description');

console.log(sym2 == sym3); // false
```
- Symbol as object property key
```ts
const symbolKey = Symbol('myKey');
const obj = {
    [symbolKey]: 'Symbol value',
    normalKey: 'Normal value'
};

console.log(obj[symbolKey]); // 'Symbol value'
// Symbol properties don't appear in regular object property enumeration
console.log(Object.keys(obj)); // ['normalKey']
console.log(Object.getOwnPropertySymbols(obj)); // [Symbol(myKey)]
```
- Global Symbol registry
```ts
const globalSym = Symbol.for('globalSymbol');
const anotherGlobalSym = Symbol.for('globalSymbol');

console.log(globalSym === anotherGlobalSym); // true
console.log(Symbol.keyFor(globalSym)); // 'globalSymbol'
```

---
## Main Uses
- Creating unique identifiers to avoid naming conflicts
- Implementing special behaviors for objects (via built-in Symbols)
- Defining private or internal properties for classes or objects
## Things to Note
- Symbol values cannot be converted to numbers
- Symbol values can be converted to strings and booleans
- Symbol properties don't appear in $for...in$, $Object.keys()$ and other normal enumerations

# Generics
Generics are one of the most powerful features in TypeScript, allowing us to write reusable, type-safe code. Essentially, generics allow us to define functions, interfaces, or classes without specifying the exact type, and then specify the type when using them.

## Why Do We Need Generics?

1. **Type Safety**: Detect type-related errors at compile time
2. **Code Reuse**: Avoid writing duplicate code for different types
3. **Flexibility**: Can handle multiple types while maintaining type information

## Main Use Cases

### 1. Generic Functions

The most common use case for generic functions is when the function's parameter type and return value type are related. For example, a function that accepts any type of parameter and returns a value of the same type
```ts
function identity<T>(arg: T): T {
    return arg;
}

// Usage
let output1 = identity<string>("myString");  // Explicitly specify type
let output2 = identity(123);  // Type inferred as number
```

### 2. Generic Interfaces

Generic interfaces are commonly used to describe reusable data structures or API response shapes. The most typical example is an interface for handling HTTP responses, as the response data type may vary by interface
```ts
interface GenericIdentityFn<T> {
    (arg: T): T;
}

let myIdentity: GenericIdentityFn<number> = identity;
```
### 3. Generic Classes

Generic classes are typically used to create container classes that can handle different types of data. For example, creating a generic data storage class that can store any type of data
```ts
class GenericNumber<T> {
    zeroValue: T;
    add: (x: T, y: T) => T;

    constructor(zero: T, addFn: (x: T, y: T) => T) {
        this.zeroValue = zero;
        this.add = addFn;
    }
}

// Usage
let stringNumeric = new GenericNumber<string>('', (x: string, y: string) => x + y);
```

## Generic Constraints
```ts
interface Lengthwise {
    length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
    console.log(arg.length);  // Now we can ensure it has the length property
    return arg;
}
```

# Namespace
> Namespace is a way to organize and encapsulate code provided by TypeScript, which can avoid naming conflicts in the global scope

```ts
namespace Validation {
    // Private, can only be accessed within the namespace
    const lettersRegexp = /^[A-Za-z]+$/;
    
    // Exported can be accessed outside the namespace
    export interface StringValidator {
        isValid(s: string): boolean;
    }
    
    export class LettersValidator implements StringValidator {
        isValid(s: string): boolean {
            return lettersRegexp.test(s);
        }
    }
}

// Usage
let validator = new Validation.LettersValidator();
```

# Object Mixing
```ts
interface A {
    age: number
}
interface B {
    name: string
}
let a: A = {
    age: 18
}

let b: B = {
    name: 'joye'
}
// Spread operator, shallow copy, returns new type
let c = {...a, ...b}

// Object.assign, shallow copy, intersection type
let c2 = Object.assign({}, a, b)
```

# Decorators
> In TypeScript, decorators are an experimental feature. To use them, you need to set the following two features in tsconfig to true

```ts
"experimentalDecorators": true, /* Enable experimental support for legacy experimental decorators. */

"emitDecoratorMetadata": true, /* Emit design-type metadata for decorated declarations in source files. */
```

> In OOP (Object-Oriented Programming), the decorator pattern is a design pattern that allows behavior to be added to an individual object dynamically without affecting the behavior of other objects from the same class.
## Class Decorator (ClassDecorator)
- Class decorators are declared immediately before a class declaration (right next to the class declaration), used to `monitor`, `modify`, or `replace` class definitions
- Class decorators cannot be used in declaration files (`.d.ts`), nor in any external context (such as `declare` classes)
- Class decorator expressions are called as functions at runtime, with the class constructor as their only parameter
- If a class decorator returns a value, it replaces the class declaration with the provided constructor
### Code Example
- Using a closure allows for parameter passing
- Using function currying to solve parameter passing problems, also called parameter annotation
```ts
const Base: ClassDecorator = (target) => {
    target.prototype.name = 'joye'
    target.prototype.age = 18
}

@Base
class Person {
    // some code
}

let joye = new Person as any
console.log(joye.name) // joye
```
## Property Decorator (Property Decorator)
### Parameters
- The target object's constructor (for static members) or prototype object (for instance members)
- The property name
### Code Example
```ts
// 1. Define a simple property decorator
function log(target: any, key: string) {
    console.log(`A property has been decorated!`)
    console.log(`Property name is: ${key}`)
}

// 2. Use this decorator
class Student {
    @log
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

// 3. Create instance
const student = new Student("Xiaoming");
// Output
// A property has been decorated!
// Property name is: name
```
## Parameter Decorator
- First parameter: For static members, the class constructor; for instance members, the class prototype object
- Second parameter: The member name
- Third parameter: The parameter's index in the function parameter list
## Method Decorator (MethodDecorator)
### Parameters
- First parameter: For static members, the class constructor; for instance members, the class prototype object
- Second parameter: The method name
- Third parameter: The method descriptor

## Decorator Factory
### Code Example (using class decorator example)
```ts
const Base = (name: string) => {
    const fn: ClassDecorator = (target) => {
    target.prototype.name = name
    target.prototype.age = 18
    }
    return fn
}

@Base('joyeh')
class Person {
    // some code
}

let joye = new Person as any
console.log(joye.name)
```

# Publish-Subscribe Pattern

## Image Example

![Publish-Subscribe Pattern](Pasted%20image%2020241218185508.png)
- Tenants and renters don't know their tenant/renter before signing a contract through a real estate agent
## Characteristics
- The publish-subscribe pattern is a **message specification**, where publishers don't send ==messages to specific recipients, but send messages to a message center==. Similarly, receivers don't know who they're receiving messages from before receiving them.
### Advantages
1. Loose Coupling (Independence)
	- The **publish-subscribe pattern** can decouple many subsystems that need to communicate, each subsystem is managed independently. And even if some subsystems unsubscribe, it won't affect the overall management of the **event bus**. In the **publish-subscribe pattern**, each application can focus on its core functionality, while the **event bus** is responsible for routing messages to each **subscriber**.
2. High Scalability
	- The **publish-subscribe pattern** increases system scalability and improves publisher responsiveness. This is because the **publisher** can quickly send a message to the input channel and then return to its core processing responsibilities without waiting for subsystems to complete processing. Then the **event bus** is responsible for ensuring the message is delivered to each **subscriber**.
3. High Reliability
	- The **publish-subscribe pattern** improves reliability. Asynchronous message passing helps applications continue to run smoothly under increased load and can handle intermittent failures more effectively.
4. Flexibility
	- You don't need to worry about how different components are combined, as long as they follow a common protocol. The **publish-subscribe pattern** allows for delayed processing or scheduled processing. For example, when system load is high, subscribers can wait until non-peak time to receive messages, or process messages according to a specific schedule.
### Disadvantages
1. Creating subscribers consumes memory, but when subscribed to messages that aren't published, subscribers will remain in memory, occupying memory;
2. Creating subscribers consumes a certain amount of time and memory. If overused, it makes the code harder to understand and maintain.
### Use Cases
1. Applications need to **broadcast information to a large number of consumers**. For example, WeChat subscription accounts are a broadcast platform with a large number of consumers.
2. Applications need to **communicate** with one or more independently developed applications or services that may use different platforms, programming languages, and communication protocols.
3. Applications can send information to consumers without requiring real-time responses from consumers.

# Set, Map, WeakSet, WeakMap

## Set

```ts
let a = new Set<number>([1, 2, 3, 3]) // automatic deduplication

a.add(4) // [1, 2, 3, 4]
a.delete(3) // [1, 2, 4]
a.clear() // []
a.has(1) // false
```
## Map
> Map is a new data structure introduced in ES6 that stores key-value pairs and can remember the original insertion order of the keys.

```ts
let nameSiteMapping = new Map()
// Set Map object
nameSiteMapping.set("Google", 1);
nameSiteMapping.set("Runoob", 2);
nameSiteMapping.set("Taobao", 3);
 
// Get value for key
console.log(nameSiteMapping.get("Runoob")); // 2
 
// Check if Map contains value for key
console.log(nameSiteMapping.has("Taobao")); // true
console.log(nameSiteMapping.has("Zhihu")); // false
 
// Return number of key/value pairs in Map
console.log(nameSiteMapping.size); // 3
 
// Delete Runoob
console.log(nameSiteMapping.delete("Runoob")); // true
console.log(nameSiteMapping);// Map { 'Google' => 1, 'Taobao' => 3 }

// Remove all key/value pairs from Map
nameSiteMapping.clear(); // Clear Map
console.log(nameSiteMapping); // Map {}
```


 > Weak reference: Objects in WeakSet are all weak references, meaning garbage collection does not consider WeakSet references to the object. In other words, if no other objects reference that object, the garbage collection mechanism will automatically reclaim the memory occupied by that object, regardless of whether the object still exists in the WeakSet.
 
## WeakSet
- Derived from Set, but is the weak reference version
- Differences from Set:
	- Key must be an object or symbol
	- Supports only part of Set's methods (delete, get, has, set)
	- When _GC_ cleans up references, data will be deleted
## WeakMap
- Derived from Map, but is the weak reference version
- Differences from Map:
	- Key must be an object
	- Supports only part of Map's methods (delete, get, has, set)
	- When _GC_ cleans up references, data will be deleted
### Code Example
```ts
let obj: any = { name: 'fedaily' }
const map = new Map()
map.set('account', obj)

const weakmap = new WeakMap()
weakmap.set(obj, 'account') 

obj = null // Here obj is set to null
console.log(map) // { name: 'fedaily' }
console.log(weakmap) // undefined
```

# Proxy Reflect (ES6)

- `Proxy` object is used to create a proxy for an object, enabling basic operation interception and customization (such as property lookup, assignment, enumeration, function calls, etc.).
- Suppose we have an object `obj`, using the `Proxy` object can create a proxy for us, like going to a law firm to find a lawyer before we go to court, and the lawyer fully represents us. With this proxy, we can do some interception or customization on this `obj`, for example when someone wants to talk to us directly, our lawyer can first intercept and decide whether to allow talking to me, then make a decision. This lawyer is the proxy for our object; if someone wants to modify the `obj` object, they must go through the lawyer first.
## Code Example
```ts
function sum(a: any, b: any) {
    return a + b;
  }
  // Using reflect
  let p1 = new Proxy(sum, {
    apply: function(target, thisArg, argumentsList) {
      const modifiedArgs = [argumentsList[0], argumentsList[1] * 100];
      return Reflect.apply(target, thisArg, modifiedArgs);
    }
  });
  
  let p2 = new Proxy(sum, {
    apply: function(target, thisArg, argumentsList) {
        return argumentsList[0] + 100 * argumentsList[1]
    }
  })

  // Normal call
  console.log(sum(1, 2)); // 3
  // Call after proxy
  console.log(p1(1, 2)); // 201
  console.log(p2(1, 2)); // 201
  ```
# Type Guards
> A type inference behavior that narrows a variable's type within a statement's block scope [inside if statement or conditional operator expression].

- Type check: `typeof`
- Property or method check: `in`
- Instance check: `instanceof`
- Literal equality check: `==`, `===`, `!=`, `!==`

## Code Example
```ts
// typeof has flaws - arrays, objects, functions, null all return object
const isString = (str: any) => typeof str == 'string'

const isArr = (arr: any) => arr instanceof Array
```

# Covariance, Contravariance, Bivariance, Invariance
## Covariance (Duck Typing)
- ==Allows a subtype to be converted to a supertype==
```ts
// Supertype
interface A {
    name: string,
    age: number
}

// Subtype
interface B {
    name: string,
    age: number,
    sexy: string
}

let a: A = {
    name: 'joye',
    age: 12
}

let b: B = {
    name: 'd3athh',
    age: 20,
    sex: 'male',
}

// Covariance
a = b
```