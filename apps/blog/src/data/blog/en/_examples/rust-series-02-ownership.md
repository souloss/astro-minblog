---
author: Souloss
pubDatetime: 2026-03-03T10:00:00Z
title: "Understanding Rust's Ownership System"
featured: false
draft: false
category: Tutorial/Rust
tags:
  - Rust
  - Ownership
  - Memory Management
series:
  name: Learning Rust from Scratch
  order: 2
description: "Second article in the Rust series: Deep dive into Rust's Ownership, Borrowing, and Lifetimes—the core mechanisms that differentiate Rust from other languages."
---

## What is Ownership?

Ownership is Rust's most unique feature, enabling Rust to guarantee memory safety without needing a garbage collector. Understanding ownership is crucial for mastering Rust.

### Ownership Rules

Rust's ownership follows three simple rules:

1. Every value in Rust has an **owner** (owner)
2. At any given time, there can only be **one owner** for a value
3. When the owner goes out of scope, the value is **automatically dropped**

```rust
fn main() {
    let s1 = String::from("hello"); // s1 owns this string
    let s2 = s1;                     // ownership moves to s2
    // println!("{}", s1);           // Compile error! s1 is no longer valid
    println!("{}", s2);              // Works fine
}
```

### Move Semantics vs Copy Semantics

For simple types on the stack (like integers, booleans), Rust automatically copies:

```rust
let x = 5;
let y = x; // Copy, both x and y are valid
println!("x = {}, y = {}", x, y); // Works fine
```

For complex types on the heap (like String), the default is move semantics:

```rust
let s1 = String::from("hello");
let s2 = s1.clone(); // Explicit deep copy
println!("s1 = {}, s2 = {}", s1, s2); // Works fine
```

## Borrowing and References

If we don't want to transfer ownership, we can use **references** (borrowing):

### Immutable References

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}

fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s); // Borrow s
    println!("The length of '{}' is {}", s, len); // s is still valid
}
```

### Mutable References

```rust
fn add_world(s: &mut String) {
    s.push_str(", world!");
}

fn main() {
    let mut s = String::from("hello");
    add_world(&mut s);
    println!("{}", s); // Output: hello, world!
}
```

### Borrowing Rules

Rust's borrow checker enforces the following rules:

- At any given time, you can have **either one mutable reference** or **any number of immutable references**
- References must always be **valid**

```rust
let mut s = String::from("hello");

let r1 = &s;     // Immutable reference - OK
let r2 = &s;     // Immutable reference - OK
// let r3 = &mut s; // Mutable reference - Compile error!

println!("{} and {}", r1, r2);

let r3 = &mut s;  // Now r1 and r2 are no longer used, so OK
r3.push_str(" world");
```

## Lifetimes

Lifetimes are Rust's mechanism for ensuring references are always valid. Most of the time, the compiler can infer them automatically, but sometimes explicit annotation is needed:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

Here, `'a` tells the compiler: the returned reference lives at least as long as the shorter of the input references.

### Lifetime Elision Rules

The compiler has three elision rules to automatically infer lifetimes:

1. Each reference parameter gets its own lifetime
2. If there's exactly one input lifetime, it's assigned to all output lifetimes
3. If a method has `&self` or `&mut self`, `self`'s lifetime is assigned to all output lifetimes

## Practical Example

Here's a practical example that combines ownership concepts:

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

## Summary

The ownership system is Rust's foundation. Although you may frequently "battle" with the compiler when learning, once you understand these concepts, you'll find they help you write safer and more efficient code. In the next article, we'll explore Rust's powerful error handling mechanisms.

> **Previous**: [Why Choose Rust?](/en/posts/rust-series-01-introduction)
>
> **Next**: [Rust Error Handling Best Practices](/en/posts/rust-series-03-error-handling)
