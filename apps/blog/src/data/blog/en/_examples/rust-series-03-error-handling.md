---
author: Souloss
pubDatetime: 2026-03-05T10:00:00Z
title: "Rust Error Handling Best Practices"
featured: false
draft: false
category: Tutorial/Rust
tags:
  - Rust
  - Error Handling
  - Result
series:
  name: Learning Rust from Scratch
  order: 3
description: "Third article in the Rust series: Learn how to use Result and Option types in Rust, master the ? operator and custom error types, and write robust error handling code."
---

## Why is Rust's Error Handling Different?

In most languages, error handling relies on exception mechanisms (try-catch). Rust takes a completely different approach—handling errors through the **type system**. This means the compiler forces you to handle every possible error case, leaving nothing unhandled.

## Two Types of Errors

Rust divides errors into two categories:

- **Recoverable errors** (`Result<T, E>`): Like file not found, network timeout, etc.
- **Unrecoverable errors** (`panic!`): Like array out-of-bounds access, assertion failures, etc.

### panic! — Unrecoverable Errors

When the program encounters a situation it cannot handle, you can use `panic!` to terminate:

```rust
fn divide(a: f64, b: f64) -> f64 {
    if b == 0.0 {
        panic!("Division by zero!");
    }
    a / b
}
```

In real development, you should try to avoid panic and use `Result` instead.

## The Result Type

`Result` is Rust's most commonly used error handling type:

```rust
enum Result<T, E> {
    Ok(T),   // Success, contains return value
    Err(E),  // Failure, contains error information
}
```

### Basic Usage

```rust
use std::fs;

fn read_config() -> Result<String, std::io::Error> {
    let content = fs::read_to_string("config.toml")?;
    Ok(content)
}

fn main() {
    match read_config() {
        Ok(content) => println!("Config content: {}", content),
        Err(e) => eprintln!("Failed to read config: {}", e),
    }
}
```

### The ? Operator

The `?` operator is the essence of Rust error handling—it makes code concise and elegant:

```rust
use std::fs::File;
use std::io::{self, Read};

// Without ? operator
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

// With ? operator — concise and elegant
fn read_file(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}
```

## The Option Type

`Option` is used to represent a value that may or may not exist:

```rust
enum Option<T> {
    Some(T), // Has value
    None,    // No value
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
        Some(name) => println!("Found user: {}", name),
        None => println!("User not found"),
    }

    // Or use if let shorthand
    if let Some(name) = find_user(1) {
        println!("Welcome, {}!", name);
    }
}
```

## Custom Error Types

In real projects, we usually need custom error types:

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
                write!(f, "Resource not found: {}", resource)
            }
            AppError::Unauthorized => {
                write!(f, "Unauthorized access")
            }
            AppError::DatabaseError(msg) => {
                write!(f, "Database error: {}", msg)
            }
            AppError::ValidationError { field, message } => {
                write!(f, "Field '{}' validation failed: {}", field, message)
            }
        }
    }
}

impl std::error::Error for AppError {}
```

### Simplifying with thiserror

In real projects, it's recommended to use the `thiserror` crate to simplify error definitions:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
enum AppError {
    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Unauthorized access")]
    Unauthorized,

    #[error("IO error")]
    IoError(#[from] std::io::Error),

    #[error("JSON parse error")]
    JsonError(#[from] serde_json::Error),
}
```

## Error Handling Best Practices

### 1. Library Code Should Return Result

```rust
pub fn parse_config(input: &str) -> Result<Config, ConfigError> {
    // Don't panic in library code
    // Let the caller decide how to handle errors
    todo!()
}
```

### 2. Use anyhow to Simplify Application-Level Error Handling

```rust
use anyhow::{Context, Result};

fn main() -> Result<()> {
    let config = std::fs::read_to_string("config.toml")
        .context("Failed to read config file")?;

    let port: u16 = config
        .parse()
        .context("Failed to parse port number")?;

    println!("Server starting on port {}", port);
    Ok(())
}
```

### 3. Use unwrap Wisely

```rust
// Only use unwrap/expect in these cases:
// 1. In test code
#[test]
fn test_parse() {
    let result = parse("valid input").unwrap();
    assert_eq!(result, expected);
}

// 2. When certain it won't fail (use expect with a reason)
let home = std::env::var("HOME")
    .expect("HOME environment variable must be set");
```

## Summary

Rust's error handling mechanism requires more upfront investment, but it ensures your code won't have unhandled errors. The combination of `Result` + `?` operator makes error handling both safe and elegant. In the next article, we'll explore Rust's concurrency programming model.

> **Previous**: [Understanding Rust's Ownership System](/en/posts/rust-series-02-ownership)
>
> **Next**: [Rust Concurrency in Practice](/en/posts/rust-series-04-concurrency)
