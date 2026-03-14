---
author: Souloss
pubDatetime: 2026-03-05T10:00:00Z
title: "Rust 错误处理最佳实践"
featured: false
draft: false
category: 教程/Rust
tags:
  - Rust
  - 错误处理
  - Result
series:
  name: 从零开始学 Rust
  order: 3
description: "Rust 系列第三篇：学习 Rust 中 Result 和 Option 类型的使用方式，掌握 ? 操作符和自定义错误类型，编写健壮的错误处理代码。"
---

## 为什么 Rust 的错误处理与众不同？

在大多数语言中，错误处理依赖于异常机制（try-catch）。而 Rust 采用了完全不同的方式——通过**类型系统**来处理错误。这意味着编译器会强制你处理每一个可能的错误情况，不会有遗漏。

## 两种错误类型

Rust 将错误分为两种：

- **可恢复错误**（`Result<T, E>`）：如文件未找到、网络超时等
- **不可恢复错误**（`panic!`）：如数组越界访问、断言失败等

### panic! —— 不可恢复错误

当程序遇到无法处理的情况时，可以使用 `panic!` 终止程序：

```rust
fn divide(a: f64, b: f64) -> f64 {
    if b == 0.0 {
        panic!("除以零！");
    }
    a / b
}
```

在实际开发中，应该尽量避免 panic，转而使用 `Result`。

## Result 类型

`Result` 是 Rust 最常用的错误处理类型：

```rust
enum Result<T, E> {
    Ok(T),   // 成功，包含返回值
    Err(E),  // 失败，包含错误信息
}
```

### 基本用法

```rust
use std::fs;

fn read_config() -> Result<String, std::io::Error> {
    let content = fs::read_to_string("config.toml")?;
    Ok(content)
}

fn main() {
    match read_config() {
        Ok(content) => println!("配置内容: {}", content),
        Err(e) => eprintln!("读取配置失败: {}", e),
    }
}
```

### ? 操作符

`?` 操作符是 Rust 错误处理的精髓——它使代码简洁而优雅：

```rust
use std::fs::File;
use std::io::{self, Read};

// 不使用 ? 操作符
fn read_file_verbose(path: &str) -> Result<String, io::Error> {
    let file = match File::open(path) {
        Ok(f) => f,
        Err(e) => return Err(e),
    };
    let mut contents = String::new();
    match file.read_to_string(&mut contents) {
        Ok(_) => Ok(contents),
        Err(e) => Err(e),
    }
}

// 使用 ? 操作符 —— 简洁优雅
fn read_file(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}
```

## Option 类型

`Option` 用于表示一个值可能存在也可能不存在：

```rust
enum Option<T> {
    Some(T), // 有值
    None,    // 无值
}
```

```rust
fn find_user(id: u64) -> Option<String> {
    let users = vec![(1, "Alice"), (2, "Bob"), (3, "Charlie")];
    users
        .into_iter()
        .find(|(uid, _)| *uid == id)
        .map(|(_, name)| name.to_string())
}

fn main() {
    match find_user(2) {
        Some(name) => println!("找到用户: {}", name),
        None => println!("用户未找到"),
    }

    // 或使用 if let 简写
    if let Some(name) = find_user(1) {
        println!("欢迎, {}!", name);
    }
}
```

## 自定义错误类型

在真实项目中，我们通常需要自定义错误类型：

```rust
use std::fmt;

#[derive(Debug)]
enum AppError {
    NotFound(String),
    Unauthorized,
    DatabaseError(String),
    ValidationError { field: String, message: String },
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(resource) => {
                write!(f, "资源未找到: {}", resource)
            }
            AppError::Unauthorized => {
                write!(f, "未授权访问")
            }
            AppError::DatabaseError(msg) => {
                write!(f, "数据库错误: {}", msg)
            }
            AppError::ValidationError { field, message } => {
                write!(f, "字段 '{}' 验证失败: {}", field, message)
            }
        }
    }
}

impl std::error::Error for AppError {}
```

### 使用 thiserror 简化

在实际项目中，推荐使用 `thiserror` crate 来简化错误定义：

```rust
use thiserror::Error;

#[derive(Error, Debug)]
enum AppError {
    #[error("资源未找到: {0}")]
    NotFound(String),

    #[error("未授权访问")]
    Unauthorized,

    #[error("IO 错误")]
    IoError(#[from] std::io::Error),

    #[error("JSON 解析错误")]
    JsonError(#[from] serde_json::Error),
}
```

## 错误处理最佳实践

### 1. 库代码应返回 Result

```rust
pub fn parse_config(input: &str) -> Result<Config, ConfigError> {
    // 不要在库代码中 panic
    // 让调用者决定如何处理错误
    todo!()
}
```

### 2. 使用 anyhow 简化应用层错误处理

```rust
use anyhow::{Context, Result};

fn main() -> Result<()> {
    let config = std::fs::read_to_string("config.toml")
        .context("无法读取配置文件")?;

    let port: u16 = config
        .parse()
        .context("无法解析端口号")?;

    println!("服务启动于端口 {}", port);
    Ok(())
}
```

### 3. 合理使用 unwrap

```rust
// 仅在以下情况使用 unwrap/expect：
// 1. 在测试代码中
#[test]
fn test_parse() {
    let result = parse("valid input").unwrap();
    assert_eq!(result, expected);
}

// 2. 在确定不会失败时（使用 expect 并提供原因）
let home = std::env::var("HOME")
    .expect("HOME 环境变量必须设置");
```

## 小结

Rust 的错误处理机制虽然需要更多的前期投入，但它确保了你的代码不会出现未处理的错误。`Result` + `?` 操作符的组合让错误处理既安全又优雅。在下一篇文章中，我们将探讨 Rust 的并发编程模型。

> **上一篇**：[理解 Rust 的所有权系统](/zh/posts/rust-series-02-ownership)
>
> **下一篇**：[Rust 并发编程实战](/zh/posts/rust-series-04-concurrency)
