---
title: "Typescript笔记 小满zs "
meta_title: ""
description: "Typescript笔记 小满zs"
date: 2024-03-21T05:00:00Z
image: "/images/ts.png"
categories: ["Typescript", "Frontend"]
draft: false
---

本文是学习小满zs的TypeScript教程时的笔记整理，涵盖了TypeScript的基础知识到高级特性，包括类型系统、接口、泛型、装饰器等重要概念。通过这些笔记，你可以系统地了解TypeScript的核心特性和使用方法。

<!--more-->

# 基础类型
- number： 包含了整数，浮点数，NaN，Infinity，二进制，八进制
- string
- boolean
- null
- undefined
- void

## 如何调试ts文件
### 调用typescript然后运行js文件
```shell
npm i typescript -g
tsc -init #初始化
tsc -w # 创建一个js文件
# 打开一个新的终端
node index.js
```
### 安装ts-node直接运行ts文件
```shell
npm i ts-node -g 
npm init -y
npm i @types/node -D
ts-node .\index.ts
```
# 任意类型
- 包含any（任意类型）和unknown（未知类型）
1. top type 顶级类型 any unknown
2. Object
3. Number String Boolean （对象包装类型）
4. number string boolean （基本类型）
5. 自定义：1， 'Hello World'， false
6. never
- unknown 只能赋值给自身或者是any
- unknown 类型无法读取任何属性，方法也不可以被调用
- unknown 比any更加安全，优先使用unknown

# 接口和对象类型
- Interface 在 TypeScript 中是一种用于定义对象结构、函数签名或类的契约的类型声明方式，它描述了一个对象所必需的属性和方法的形状
- 属性数量必须一致
- 定义接口时必须大写
- 多个同名接口会合并
```ts
interface A extends B // 继承B接口{
	name:string
	age？:number //可选
	[propname:string]:any // 索引签名
	readonly cb:()=>boolean // 该函数可以被调用但是无法被修改
}

interface B {
	gender:string
}
let a:A = {
	name = 'Joye',
	age = 18,
	gender = 'Male'
	a = 1,
	b = 2,
	c = 3
	cb:()=>{
		return false
	}
}
```
## 函数接口
```ts
interface Fn{
	(name:string):number[]
}

const fn:Fn= function (name:string){
	return [1]
}
```

# 数组类型
```ts
// define an array
// first way
let arr:number[] = [1, 2, 3]
let arr2:boolean[] = [True, False, True]
// seconnd way
let arr3:Array<number> = [1, 2, 3]
let arr4:Array<boolean> = [False, True, True]
```

# 函数类型
```ts
// 箭头函数
const add = (a:number, b:number):number => a + b

// 函数默认值和可选参数，不可同时
function add(a:number = 5, b?):number{ // 返回值的类型
	return a + b
}
```
## 函数this类型
```ts
interface Obj{
	user: number[]
	add:(this:Obj, num:number)=>void
}

// ts可以定义this的类型，在js中无法使用，必须是第一个参数定义this的类型
let obj:Obj = {
	user = [1, 2, 3],
	add(this:Obj, num:number){
		this.user.push(num)
	}
}
```

## 函数重载
- 函数重载（Function Overloading）在 TypeScript 中用于定义同一个函数可以接受不同类型或数量的参数，并返回不同类型的值
```ts
// 重载签名
function greet(name: string): string;
function greet(age: number): string;
// 实现签名
function greet(param: string | number): string {
    if (typeof param === "string") {
        return `Hello, ${param}!`;
    } else {
        return `You are ${param} years old!`;
    }
}

// 使用
console.log(greet("Tom"));     // "Hello, Tom!"
console.log(greet(25));        // "You are 25 years old!"
```

# 联合类型，类型断言，交叉类型

```ts
// 联合类型
let phone:string | number = '123456789'
let phone1:string | number = 123456789
```
## 函数断言（Type Assertion）
```ts
// 1. 尖括号语法
let someValue: unknown = "this is a string";
let strLength: number = (<string>someValue).length;

// 2. as 语法 (推荐)
let someValue: unknown = "this is a string";
let strLength: number = (someValue as string).length;
```
主要用途：
1. 当你比 TypeScript 更了解某个值的类型时
2. 绕过类型检查
3. 处理 unknown 类型数据

# 内置对象

### ECMAScript标准内置对象
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
### DOM 和 BOM内置对象
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
### Promise 和 类型化数组
```ts
let promise: Promise<string>;
let buffer: ArrayBuffer;
let int8Array: Int8Array;
let uint8Array: Uint8Array;
let float32Array: Float32Array;
```
### 常用工具对象
```ts
let map: Map<string, any>;
let set: Set<number>;
let weakMap: WeakMap<object, any>;
let weakSet: WeakSet<object>;
```

# Class
> `Class` 在 TypeScript 中是一个用于创建对象的蓝图，它封装了数据（属性）和操作数据的方法，支持继承、封装和多态等面向对象的特性

### 属性
- `public`（默认）：公共属性，可以在任何地方被访问
- `private`：私有属性，只能在声明的类内部访问
- `protected`：受保护属性，只能在生命的类和其子类中访问
- `readonly`：只读属性，必须在声明时或构造函数中初始化
- `static`：静态属性，属于类声明本身而不是实例

```ts
// 基本类声明
class Person {
	// 属性
	name: string;                // 公共属性
	private _age: number;         // 私有属性
	protected id: number;        // 受保护属性
	readonly birthDate: Date;    // 只读属性
	static count: number = 0;    // 静态属性

	// 构造函数
	constructor(name: string, age: number) {
		this.name = name;
		this.age = age;
		Person.count++;
	}

	// 方法
	public sayHello(): void {    // 公共方法
		console.log(`Hello, I'm ${this.name}`);
	}

	private getAge(): number {   // 私有方法
		return this.age;
	}

	protected getId(): number {  // 受保护方法
		return this.id;
	}

	// 静态方法
	static getCount(): number {
		return Person.count;
	}

	// 访问器
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
## 继承
```ts
// 继承基类
class Employee extends Person {
	constructor(name: string, age: number, public department: string) {
		super(name, age);  // 调用父类构造函数
	}

	// 方法重写
	sayHello(): void {
		super.sayHello();  // 调用父类方法
		console.log(`I work in ${this.department}`);
	}
}
```
## 接口
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
## 示例使用
```ts
const person = new Person("Tom", 25);
person.sayHello();                    // 可以访问
// person.age;                        // ❌ 错误：私有属性不可访问
// person.getAge();                   // ❌ 错误：私有方法不可访问

console.log(Person.count);            // 访问静态属性
console.log(Person.getCount());       // 调用静态方法

person.userAge = 26;                  // 使用 setter
console.log(person.userAge);          // 使用 getter
```

# 抽象类（基类）
- 使用`abstract`关键字声明
- 不能被直接实例化
- 抽象方法必须在派生类中实现
### 使用抽象类的场景
- 当你需要在多个相关类之间共享代码
- 当你想强制一组相关的类遵循一个特定的契约
- 当你有部分通用实现，但某些需要子类特别定制

```ts
// 定义一个抽象类 Animal
abstract class Animal {
	// 普通属性
	name: string;
	
	// 构造函数
	constructor(name: string) {
		this.name = name;
	}
	
	// 已实现的具体方法
	eat(): void {
		console.log(`${this.name} is eating.`);
	}
	
	// 抽象方法，子类必须实现
	abstract makeSound(): void;
}

// 实现子类 Dog
class Dog extends Animal {
	// 必须实现父类的抽象方法
	makeSound(): void {
		console.log('Woof! Woof!');
	}
}

// 实现子类 Cat
class Cat extends Animal {
	makeSound(): void {
		console.log('Meow!');
	}
}

// 无法直接实例化抽象类
// const animal = new Animal('Generic Animal'); // 这行会报错

// 可以创建子类实例
const dog = new Dog('Buddy');
dog.eat(); // 输出: Buddy is eating.
dog.makeSound(); // 输出: Woof! Woof!
```

# 类型推论
```ts
let num = 456
num = '456' // 会报错，因为在赋值456给num的时候，ts推论num的类型是数字了

let num
num = 456
num = '456' // 不会报错，因为没有赋值ts就没有推论
```

# 类型别名
```ts
type s = string
let str:s = '456'
```

# never类型
> never 类型表示那些永远不会出现的值的类型。它是 TypeScript 中的底部类型（bottom type），是所有类型的子类型
- 没有任何类型是never是子类型，除了never自身
- 它可以赋值给任何其他类型
- 除了never自身外，其他任何类型都不能赋值给never
## 使用场景
- 永远不会返回的函数
```ts
function throwError(message: string): never {
	throw new Error(message);
}

function infiniteLoop(): never {
	while (true) {
		// 无限循环
	}
}
```
- 永远不可能存在的交叉类型
```ts
type NumberAndString = number & string;
```
- 在详尽的类型检查中的应用
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
		// 如果 Shape 类型增加了新的类型但这里没有处理
		// TypeScript 会在编译时报错
		return assertNever(shape);
	}
}
```
- 在条件类型中的应用
```ts
type NonNullable<T> = T extends null | undefined ? never : T;

// 示例
type A = NonNullable<string | null>; // string
type B = NonNullable<null>; // never
```

# Symbol
- symbol是ES6引入的一个基本数据类型，它的主要特点是每个Symbol值都是唯一的，不可变的
```ts
const sym1 = Symbol();
const sym2 = Symbol('description'); // 可以添加描述
const sym3 = Symbol('description');

console.log(sym2 == sym)' // false
```
- Symbol作为对象属性键
```ts
const symbolKey = Symbol('myKey');
const obj = {
	[symbolKey]: 'Symbol value',
	normalKey: 'Normal value'
};

console.log(obj[symbolKey]); // 'Symbol value'
// Symbol 属性不会出现在常规的对象属性枚举中
console.log(Object.keys(obj)); // ['normalKey']
console.log(Object.getOwnPropertySymbols(obj)); // [Symbol(myKey)]
```
- 全局Symbol注册表
```ts
const symbolKey = Symbol('myKey');
const obj = {
	[symbolKey]: 'Symbol value',
	normalKey: 'Normal value'
};

console.log(obj[symbolKey]); // 'Symbol value'
// Symbol 属性不会出现在常规的对象属性枚举中
console.log(Object.keys(obj)); // ['normalKey']
console.log(Object.getOwnPropertySymbols(obj)); // [Symbol(myKey)]
```

---
## 主要用途
- 创建唯一的标识符，避免命名冲突
- 实现对象的特殊行为（通过内置Symbol）
- 定义累或对象的私有或内部属性
## 需要注意的点
- Symbol值不能转换成数字
- Symbol值可以转换为字符串和布尔值
- Symbol属性不会出现在 $for...in$ , $Object.keys()$ 等普通枚举中

# 泛型
泛型是 TypeScript 中最强大的特性之一，它允许我们编写可重用的、类型安全的代码。本质上，泛型就是允许我们在定义函数、接口或类时，不预先指定具体的类型，而在使用时再指定类型的一种特性。

##  为什么需要泛型？

1. **类型安全**：在编译时就能发现类型相关的错误
2. **代码复用**：避免为不同类型写重复的代码
3. **灵活性**：可以处理多种类型，同时保持类型信息

## 主要使用场景

### 1. 泛型函数

泛型函数最常见的使用场景是当函数的参数类型和返回值类型有关联时。比如一个函数接收任何类型的参数并返回同样类型的值
```ts
function identity<T>(arg: T): T {
	return arg;
}

// 使用方式
let output1 = identity<string>("myString");  // 显式指定类型
let output2 = identity(123);  // 类型推断为 number
```

### 2. 泛型接口

泛型接口常用于描述可复用的数据结构或 API 响应的形状。最典型的例子是处理 HTTP 响应的接口，因为响应数据的类型可能因接口而
```ts
interface GenericIdentityFn<T> {
	(arg: T): T;
}

let myIdentity: GenericIdentityFn<number> = identity;
```
### 3. 泛型类

泛型类通常用于创建可以处理不同类型数据的容器类。比如创建一个通用的数据存储类，它可以存储任何类型的数据
```ts
class GenericNumber<T> {
	zeroValue: T;
	add: (x: T, y: T) => T;

	constructor(zero: T, addFn: (x: T, y: T) => T) {
		this.zeroValue = zero;
		this.add = addFn;
	}
}

// 使用
let stringNumeric = new GenericNumber<string>('', (x: string, y: string) => x + y);
```

## 泛型约束
```ts
interface Lengthwise {
	length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
	console.log(arg.length);  // 现在可以确保有 length 属性
	return arg;
}
```

# namespace
> 命名空间是typescript提供的一种组织和封装代码的方式，可以避免全局作用于的命名冲突

```ts
namespace Validation {
	// 私有的,只能在命名空间内访问
	const lettersRegexp = /^[A-Za-z]+$/;
	
	// 导出的可以在命名空间外访问
	export interface StringValidator {
		isValid(s: string): boolean;
	}
	
	export class LettersValidator implements StringValidator {
		isValid(s: string): boolean {
			return lettersRegexp.test(s);
		}
	}
}

// 使用
let validator = new Validation.LettersValidator();
```

# 对象混入
```ts
interface A {
	age:number
}
interface B{
	name:string
}
let a:A = {
	age:18
}

let b:B = {
	name = 'joye'
}
// 扩展运算符 浅拷贝，返回新的类型
let c = {...a, ...b}

// Object.assign 浅拷贝，交叉类型
let c2 = Object.assign({}, a, b)
```

[[深浅拷贝]] - 额外说明

# 装饰器
>ts中装饰器是作为实验特性，想要使用需要将下面tsconfig中的两个功能设置为true

```ts
"experimentalDecorators": true, /* Enable experimental support for legacy experimental decorators. */

"emitDecoratorMetadata": true, /* Emit design-type metadata for decorated declarations in source files. */
```

> 在 OOP (面向对象编程)中，装饰器模式是一种允许动态地往一个对象上添加自定义行为，而又不影响该对象所属的类的其他实例的一种设计模式。
## 类装饰器 （ ClassDecorator)
-  类装饰器在类声明之前声明（紧靠着类声明），用来`监视`、`修改`或者`替换`类定义
- 类装饰器不能用在声明文件中( .d.ts)，也不能用在任何外部上下文中（比如`declare`的类）。
- 类装饰器表达式会在运行时当作函数被调用，类的构造函数作为其唯一的参数。
- 如果类装饰器返回一个值，它会使用提供的构造函数来替换类的声明。
### 代码展示
- 用了一个闭包就可以传参了
- 利用函数柯里化解决传参问题， 向装饰器传入一些参数，也可以叫 参数注解
```ts
const Base:ClassDecorator = (target) => {
	target.prototype.name = 'joye'
	target.prototype.age = 18
}

@Base
class Person{
	// some code
}

let joye = new Person as any
console.log(joye.name) // joye
```
## 属性装饰器 (Property Decorator)
### 传入的参数
- 目标对象的构造函数（对于静态成员）或原型对象（对于实例成员）
- 属性的名称
### 代码展示
```ts
// 1. 定义一个最简单的属性装饰器
function log(target: any, key: string) {
	console.log(`有一个属性被装饰了！`)
	console.log(`属性名是: ${key}`)
}

// 2. 使用这个装饰器
class Student {
	@log
	name: string;

	constructor(name: string) {
		this.name = name;
	}
}

// 3. 创建实例
const student = new Student("小明");
// 输出
// 有一个属性被装饰了！
// 属性名是: name
```
## 参数装饰器
- 第一个参数： 对于静态成员来说是类的构造函数，对于实例成员是类的原型对象
- 第二个参数： 成员的名字
- 第三个参数： 参数在函数参数列表中的索引
## 方法装饰器 (MethodDecorator)
### 传入参数
- 第一个参数： 对于静态成员来说是类的构造函数，对于实例成员是类的原型对象
- 第二个参数： 是方法的名称
- 第三个参数： 是方法的描述 修饰方法

## 装饰器工厂
### 代码展示（用类装饰器例子）
```ts
const Base = (name:string) => {
	const fn:ClassDecorator = (target) => {
	target.prototype.name = name
	target.prototype.age = 18
	}
	return fn
}

@Base('joyeh')
class Person{
	// some code
}

let joye = new Person as any
console.log(joye.name)
```

# 发布订阅模式

> [!NOTE] 额外阅读
> 原理讲解 + 代码实现 - https://juejin.cn/post/6862803836781002760
## 图片示例

![[Pasted image 20241218185508.png]]
- 租户和租客在通过房产中介签订合同之前都不知道自己的租户/租客
## 特性
- 发布订阅模式是一种**消息规范**， 发布者不会将==消息发给特定的接受者，而且将消息发送至一个消息中心==， 同样的，接受者也不会在接受之前知道自己将接受来自谁的信息。
### 优点
1. 松耦合（Independence）
	- **发布-订阅模式**可以将众多需要通信的子系统(Subsystem)解耦，每个子系统独立管理。而且即使部分子系统取消订阅，也不会影响**事件总线**的整体管理。 **发布-订阅模式**中每个应用程序都可以专注于其核心功能，而**事件总线**负责将消息路由到每个**订阅者**手里。
2. 高伸缩性（Scalability）
	- **发布-订阅模式**增加了系统的可伸缩性，提高了发布者的响应能力。原因是**发布者**(Publisher)可以快速地向输入通道发送一条消息，然后返回到其核心处理职责，而不必等待子系统处理完成。然后**事件总线**负责确保把消息传递到每个**订阅者**(Subscriber)手里。
3. 高可靠性（Reliability）
	- **发布-订阅模式**提高了可靠性。异步的消息传递有助于应用程序在增加的负载下继续平稳运行，并且可以更有效地处理间歇性故障。
4. 灵活性（Flexibility）
	- 你不需要关心不同的组件是如何组合在一起的，只要他们共同遵守一份协议即可。 **发布-订阅模式**允许延迟处理或者按计划的处理。例如当系统负载大的时候，订阅者可以等到非高峰时间才接收消息，或者根据特定的计划处理消息。
### 缺点
1. 在创建订阅者本身会消耗内存，但当订阅消息后，没有进行发布，而订阅者会一直保存在内存中，占用内存；
2. 创建订阅者需要消耗一定的时间和内存。如果过度使用的话，反而使代码不好理解及代码不好维护。
### 使用场景
1. 应用程序需要**向大量消费者广播信息**。例如微信订阅号就是一个消费者量庞大的广播平台。
2. 应用程序需要与一个或多个独立开发的应用程序或服务**通信**，这些应用程序或服务可能使用不同的平台、编程语言和通信协议。
3. 应用程序可以向消费者发送信息，而不需要消费者的实时响应。

# Set，Map， WeakSet， WeakMap

> [!NOTE] 额外阅读
> https://juejin.cn/post/7156759373220577310#heading-15
> https://juejin.cn/post/6844904179052314632
> https://juejin.cn/post/7041574685363945479
> 

## Set

```ts
let a = new Set<number>([1, 2, 3, 3]) // 自动去重

a.add(4) // [1, 2, 3, 4]
a.delete(3) // [1, 2, 4]
a.clear() // []
a.has(1) // false
```
## Map
> Map 是 ES6 中引入的一种新的数据结构，保存键值对，并且能够记住键的原始插入顺序。

```ts
let nameSiteMapping = new Map()
// 设置 Map 对象
nameSiteMapping.set("Google", 1);
nameSiteMapping.set("Runoob", 2);
nameSiteMapping.set("Taobao", 3);
 
// 获取键对应的值
console.log(nameSiteMapping.get("Runoob")); // 2
 
// 判断 Map 中是否包含键对应的值
console.log(nameSiteMapping.has("Taobao")); // true
console.log(nameSiteMapping.has("Zhihu")); // false
 
// 返回 Map 对象键/值对的数量
console.log(nameSiteMapping.size); // 3
 
// 删除 Runoob
console.log(nameSiteMapping.delete("Runoob")); // true
console.log(nameSiteMapping);// Map { 'Google' => 1, 'Taobao' => 3 }

// 移除 Map 对象的所有键/值对
nameSiteMapping.clear(); // 清除 Map
console.log(nameSiteMapping); // Map {}
```


 > 弱引用：WeakSet 中的对象都是弱引用，即垃圾回收机制不考虑 WeakSet 对该对象的引用，也就是说，如果其他对象都不再引用该对象，那么垃圾回收机制会自动回收该对象所占用的内存，不考虑该对象还存在于 WeakSet 之中。
 
## WeakSet
- 起源于set，但是是弱引用版本
- 区别与set：
	- key必须是对象或者symbol
	- 支持部分set的方法（delete，get，has，set）
	- 当 _GC_ 清理引用时，数据会被删除
## WeakMap
- 起源于map，但是是弱引用版本
- 区别与map：
	- key必须是对象
	- 支持部分map的方法（delete，get，has，set）
	- 当 _GC_ 清理引用时，数据会被删除
### 代码展示
```ts
let obj:any = { name: 'fedaily' }
const map = new Map()
map.set('account', obj)

const weakmap = new WeakMap()
weakmap.set(obj, 'account') 

obj = null // 这里将obj置为null
console.log(map) // { name: 'fedaily' }
console.log(weakmap) // undefined
```

# proxy Reflect （es6）

> [!NOTE] 额外阅读
> https://juejin.cn/post/7105199226472103950
- `Proxy` 对象用于创建一个对象的代理，从而实现基本操作的拦截和自定义（如属性查找、赋值、枚举、函数调用等）。
- 假如我们有一个对象 `obj`，使用 `Proxy` 对象可以给我们创建一个代理，就好比我们打官司之前，可以先去律师事务所找一个律师，律师全权代理我们。有了这个代理之后，就可以对这个 `obj` 做一些拦截或自定义，比如对方想要直接找我们谈话时，我们的律师可以先进行拦截，他来判断是否允许和我谈话，然后再做决定。这个律师就是我们对象的代理，有人想要修改 `obj` 对象，必须先经过律师那一关。
## 代码展示
```ts
function sum(a:any, b:any) {
	return a + b;
}
// 用reflect
let p1 = new Proxy(sum, {
	apply: function (target, thisArg, argumentsList) {
		const modifiedArgs = [argumentsList[0], argumentsList[1] * 100];
		return Reflect.apply(target, thisArg, modifiedArgs);
	}
});

let p2 = new Proxy(sum, {
	apply: function (target,thisArg, argumentsList){
		return argumentsList[0] + 100 * argumentsList[1]
	}
})

// 正常调用
console.log(sum(1, 2)); // 3
// 代理之后调用
console.log(p1(1, 2)); // 201
console.log(p2(1, 2)); // 201
```
# 类型守卫
> 在 语句的块级作用域【if语句内或条目运算符表达式内】缩小变量的一种类型推断的行为。

- 类型判断：`typeof`
- 属性或者方法判断：`in`
- 实例判断：`instanceof`
- 字面量相等判断：`==`, `===`, `!=`, `!==`

## 代码展示
```ts
// typeof是有缺陷的 数组，对象，函数，null都会返回object
const isString = (str:any) => typeof str == 'string'

const isArr = (arr:any) => arr instanceof Array
```

# 协变，逆变，双向协变，不变
## 协变（鸭子类型）
- ==允许子类型转换为父类型==
```ts
// 父类型
interface A {
	name:string,
	age:number
}

// 子类型
interface B {
	name:string,
	age:number,
	sexy:string
}

let a:A = {
	name:'joye',
	age:12
}

let b:B = {
	name:'d3athh',
	age:20,
	sex:'male',
}

// 协变
a = b
```
