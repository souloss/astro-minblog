---
author: Souloss
pubDatetime: 2026-03-03T10:00:00Z
title: "理解 Rust 的所有权系统"
featured: false
draft: false
category: 教程/Rust
tags:
  - Rust
  - 所有权
  - 内存管理
series:
  name: 从零开始学 Rust
  order: 2
description: "Rust 系列第二篇：深入解析 Rust 的所有权（Ownership）、借用（Borrowing）和生命周期（Lifetime）—— Rust 区别于其他语言的核心机制。"
---

## 什么是所有权？

所有权是 Rust 最独特的特性，它使 Rust 能在不需要垃圾回收的情况下保证内存安全。理解所有权对于掌握 Rust 至关重要。

### 所有权规则

Rust 的所有权遵循三条简单规则：

1. Rust 中的每一个值都有一个**所有者**（owner）
2. 同一时刻，一个值只能有**一个所有者**
3. 当所有者离开作用域时，该值将被**自动释放**

```rust
fn main() {
    let s1 = String::from("hello"); // s1 拥有这个字符串
    let s2 = s1;                     // 所有权转移给 s2
    // println!("{}", s1);           // 编译错误！s1 不再有效
    println!("{}", s2);              // 正常运行
}
```

### 移动语义 vs 复制语义

对于栈上的简单类型（如整数、布尔值），Rust 会自动复制：

```rust
let x = 5;
let y = x; // 复制，x 和 y 都有效
println!("x = {}, y = {}", x, y); // 正常运行
```

对于堆上的复杂类型（如 String），默认是移动语义：

```rust
let s1 = String::from("hello");
let s2 = s1.clone(); // 显式深拷贝
println!("s1 = {}, s2 = {}", s1, s2); // 正常运行
```

## 借用与引用

如果我们不想转移所有权，可以使用**引用**（借用）：

### 不可变引用

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}

fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s); // 借用 s
    println!("'{}' 的长度是 {}", s, len); // s 仍然有效
}
```

### 可变引用

```rust
fn add_world(s: &mut String) {
    s.push_str(", world!");
}

fn main() {
    let mut s = String::from("hello");
    add_world(&mut s);
    println!("{}", s); // 输出: hello, world!
}
```

### 借用规则

Rust 的借用检查器强制执行以下规则：

- 在任意时刻，你可以拥有**一个可变引用**或**任意数量的不可变引用**
- 引用必须始终**有效**

```rust
let mut s = String::from("hello");

let r1 = &s;     // 不可变引用 - OK
let r2 = &s;     // 不可变引用 - OK
// let r3 = &mut s; // 可变引用 - 编译错误！

println!("{} and {}", r1, r2);

let r3 = &mut s;  // 此时 r1 和 r2 已不再使用，所以 OK
r3.push_str(" world");
```

## 生命周期

生命周期是 Rust 用来确保引用始终有效的机制。大多数情况下编译器能自动推断，但有时需要显式标注：

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

这里的 `'a` 告诉编译器：返回的引用至少和输入中较短的那个引用活得一样久。

### 生命周期省略规则

编译器有三条省略规则来自动推断生命周期：

1. 每个引用参数获得各自的生命周期
2. 如果只有一个输入生命周期，它被赋予所有输出生命周期
3. 如果方法有 `&self` 或 `&mut self`，`self` 的生命周期被赋予所有输出生命周期

## 实际应用示例

以下是一个综合运用所有权概念的实际例子：

```rust
struct TextEditor {
    content: String,
    history: Vec<String>,
}

impl TextEditor {
    fn new() -> Self {
        TextEditor {
            content: String::new(),
            history: Vec::new(),
        }
    }

    fn write(&mut self, text: &str) {
        self.history.push(self.content.clone());
        self.content.push_str(text);
    }

    fn undo(&mut self) {
        if let Some(prev) = self.history.pop() {
            self.content = prev;
        }
    }

    fn content(&self) -> &str {
        &self.content
    }
}
```

## 小结

所有权系统是 Rust 的基石。虽然初学时可能会频繁与编译器"搏斗"，但一旦理解了这些概念，你会发现它们能帮助你写出更安全、更高效的代码。下一篇我们将探讨 Rust 强大的错误处理机制。

> **上一篇**：[为什么选择 Rust？](/zh/posts/rust-series-01-introduction)
>
> **下一篇**：[Rust 错误处理最佳实践](/zh/posts/rust-series-03-error-handling)
