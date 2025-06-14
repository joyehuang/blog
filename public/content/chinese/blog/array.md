---
title: "数据结构 - 数组篇"
meta_title: ""
description: "数据结构 - 数组篇"
date: 2024-03-21T05:00:00Z
image: "/images/dataStructure.png"
categories: ["数据结构", "数组"]
draft: false
---

数组分两种：静态数组和动态数组
「静态数组」就是一块连续的内存空间，我们可以通过索引来访问这块内存空间中的元素，这才是数组的原始形态。

而「动态数组」是编程语言为了方便我们使用，在静态数组的基础上帮我们添加了一些常用的 API，比如 `push, insert, remove` 等等方法，这些 API 可以让我们更方便地操作数组元素，不用自己去写代码实现这些操作。

## 静态数组
```cpp
// 定义一个大小为 10 的静态数组
int arr[10];

// 用 memset 函数把数组的值初始化为 0
memset(arr, 0, sizeof(arr));

// 使用索引赋值
arr[0] = 1;
arr[1] = 2;

// 使用索引取值
int a = arr[0];
```

拿 C++ 来举例吧，`int arr[10]` 这段代码到底做了什么事情呢？主要有这么几件事：
1. 在内存中开辟了一段**连续的内存空间**，大小是 `10 * sizeof(int)` 字节。一个 int 在计算机内存中占 4 字节，也就是总共 40 字节。
2. 定义了一个名为 `arr` 的数组指针，指向这段内存空间的首地址。
那么 `arr[1] = 2` 这段代码又做了什么事情呢？主要有这么几件事：
1. 计算 `arr` 的首地址加上 `1 * sizeof(int)` 字节（4 字节）的偏移量，找到了内存空间中的第二个元素的**首地址**。
2. 从这个地址开始的 4 个字节的内存空间中写入了整数 `2`。

静态数组本质上就是一块**连续的**内存空间，`int arr[10]` 这个语句我们可以得知：
1. 我们知道这块内存空间的首地址（数组名 `arr` 就指向这块内存空间的首地址）。
2. 我们知道了每个元素的类型（比如 int），也就是知道了每个元素占用的内存空间大小（比如一个 int 占 4 字节，32 bit）。
3. 这块内存空间是连续的，其大小为 `10 * sizeof(int)` 即 40 字节。
**所以，我们获得了数组的超能力「随机访问」：只要给定任何一个数组索引，我可以在 O(1)的时间内直接获取到对应元素的值**。
因为我可以通过首地址和索引直接计算出目标元素的内存地址。计算机的内存寻址时间可以认为是 O(1)，所以数组的随机访问时间复杂度是 O(1)。

### 增
#### 数组末尾追加（append）元素
```js
// 大小为 10 的数组已经装了 4 个元素
var arr = new Array(10);
for (var i = 0; i < 4; i++) {
    arr[i] = i;
}

// 现在想在数组末尾追加一个元素 4
arr[4] = 4;

// 再在数组末尾追加一个元素 5
arr[5] = 5;

// 依此类推
// ...
```
- 直接通过索引赋值在数组末尾增加元素
- 时间复杂度：O（1）
#### 数组中间插入（insert）元素
```js
// 大小为 10 的数组已经装了 4 个元素
var arr = new Array(10);
for (var i = 0; i < 4; i++) {
    arr[i] = i;
}

// 在索引 2 置插入元素 666
// 需要把索引 2 以及之后的元素都往后移动一位
// 注意要倒着遍历数组中已有元素避免覆盖，不懂的话请看下方可视化面板
for (var i = 4; i > 2; i--) {
    arr[i] = arr[i - 1];
}

// 现在第 3 个位置空出来了，可以插入新元素
arr[2] = 666;
```
- 需要使用数据搬移，然后再插入新元素
- 时间复杂度：O(n)
#### 数组空间已满
```js
// 大小为 10 的数组已经装满了
var arr = new Array(10);
for (var i = 0; i < 10; i++) {
    arr[i] = i;
}

// 现在想在数组末尾追加一个元素 10
// 需要先扩容数组
var newArr = new Array(20);
// 把原来的 10 个元素复制过去
for (var i = 0; i < 10; i++) {
    newArr[i] = arr[i];
}

// 释放旧数组的内存空间
// ...

// 在新的大数组中追加新元素
newArr[10] = 10;
```
- 因为连续内存必须一次性分配，所以必须重新申请一块更大的连续内存
- 将原来的数组复制到新分配到内存里
- 旧内存会通过垃圾回收机制被重新利用
- 时间复杂度：O(n)
### 删
#### 删除末尾元素
```js
// 大小为 10 的数组已经装了 5 个元素
var arr = new Array(10);
for (var i = 0; i < 5; i++) {
    arr[i] = i;
}

// 删除末尾元素，暂时用 -1 代表元素已删除
arr[4] = -1;
```
- 用索引赋值即可
- 时间复杂度：O(1)
#### 删除中间元素
```js
// 大小为 10 的数组已经装了 5 个元素
var arr = new Array(10);
for (var i = 0; i < 5; i++) {
    arr[i] = i;
}

// 删除 arr[1]
// 需要把 arr[1] 之后的元素都往前移动一位
// 注意要正着遍历数组中已有元素避免覆盖，不懂的话请看下方可视化面板
for (var i = 1; i < 4; i++) {
    arr[i] = arr[i + 1];
}

// 最后一个元素置为 -1 代表已删除
arr[4] = -1;
```
- 同样涉及数据搬移,从被删除索引开始，将后一位的值赋值到前一个
- 最后删除最后一个元素即可，赋值为-1
- 时间复杂度：O(n)
### 总结
综上，静态数组的增删查改操作的时间复杂度是：
- 增：
    - 在末尾追加元素：O(1)
    - 在中间（非末尾）插入元素：O(N)
- 删：
    - 删除末尾元素：O(1)
    - 删除中间（非末尾）元素：O(N)
- 查：给定指定索引，查询索引对应的元素的值，时间复杂度 O(1)
- 改：给定指定索引，修改索引对应的元素的值，时间复杂度 O(1)

> 这里到查与改是给定索引的情况，如果给定一个值让你去数组中搜素和修改，这时的时间复杂度是O(n)，因为需要依靠遍历


## 动态数组
动态数组底层还是静态数组，只是自动帮我们进行数组空间的扩缩容，并把增删查改操作进行了封装，让我们使用起来更方便而已。动态数组不可能解决静态数组在增加与删除方面的效率差问题，因为这是连续内存空间导致的，而连续内存空间就不可避免地面对数据搬移与缩扩容的问题。
```js
// 创建动态数组
// 不用显式指定数组大小，它会根据实际存储的元素数量自动扩缩容
var arr = [];

for (var i = 0; i < 10; i++) {
    // 在末尾追加元素，时间复杂度 O(1)
    arr.push(i);
}

// 在中间插入元素，时间复杂度 O(N)
// 在索引 2 的位置插入元素 666
arr.splice(2, 0, 666);

// 在头部插入元素，时间复杂度 O(N)
arr.unshift(-1);

// 删除末尾元素，时间复杂度 O(1)
arr.pop();

// 删除中间元素，时间复杂度 O(N)
// 删除索引 2 的元素
arr.splice(2, 1);

// 根据索引查询元素，时间复杂度 O(1)
var a = arr[0];

// 根据索引修改元素，时间复杂度 O(1)
arr[0] = 100;

// 根据元素值查找索引，时间复杂度 O(N)
var index = arr.indexOf(666);
```

## 动手实现动态数组
### 关键点
1. 自动扩缩容
2. 索引越界的检查
3. 删除元素谨防内存泄漏

<section class="under-development">
  这部分内容正在通过 git push 部署中...
  预计完成时间: T-minus 72小时
</section>
