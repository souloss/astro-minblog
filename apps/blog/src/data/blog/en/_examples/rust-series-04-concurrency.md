---
author: Souloss
pubDatetime: 2026-03-07T10:00:00Z
title: "Rust Concurrency in Practice"
featured: false
draft: false
category: Tutorial/Rust
tags:
  - Rust
  - Concurrency
  - async/await
series:
  name: Learning Rust from Scratch
  order: 4
description: "Fourth article in the Rust series: Explore Rust's concurrency capabilities, including threads, message passing, shared state, and the async/await asynchronous programming model."
---

## Rust's Concurrency Safety Guarantee

Rust has a famous motto: **"Fearless Concurrency"**. Thanks to the ownership system and type system, Rust can eliminate the vast majority of concurrency errors at compile time, such as data races.

## Thread Basics

### Creating Threads

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..=5 {
            println!("Child thread: count {}", i);
            thread::sleep(Duration::from_millis(500));
        }
    });

    for i in 1..=3 {
        println!("Main thread: count {}", i);
        thread::sleep(Duration::from_millis(700));
    }

    handle.join().unwrap();
    println!("All threads completed");
}
```

### Using move Closures

When you need to transfer data ownership between threads:

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3, 4, 5];

    let handle = thread::spawn(move || {
        let sum: i32 = data.iter().sum();
        println!("Data sum: {}", sum);
        sum
    });

    // data has been moved, cannot be used here anymore
    let result = handle.join().unwrap();
    println!("Thread returned: {}", result);
}
```

## Message Passing

Rust's standard library provides `mpsc` (multiple producers, single consumer) channels for inter-thread communication:

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    // Create multiple producers
    for id in 0..3 {
        let tx_clone = tx.clone();
        thread::spawn(move || {
            let messages = vec![
                format!("worker-{}: task started", id),
                format!("worker-{}: processing...", id),
                format!("worker-{}: task completed", id),
            ];
            for msg in messages {
                tx_clone.send(msg).unwrap();
                thread::sleep(std::time::Duration::from_millis(100));
            }
        });
    }

    drop(tx); // Close the original sender

    // Receive all messages
    for received in rx {
        println!("Received: {}", received);
    }
}
```

## Shared State

### Mutex (Mutual Exclusion Lock)

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", *counter.lock().unwrap());
}
```

### RwLock (Read-Write Lock)

When reads far outnumber writes, `RwLock` is more efficient than `Mutex`:

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let config = Arc::new(RwLock::new(String::from("Initial config")));

    let mut handles = vec![];

    // Multiple reader threads
    for i in 0..5 {
        let config = Arc::clone(&config);
        handles.push(thread::spawn(move || {
            let value = config.read().unwrap();
            println!("Reader thread {}: {}", i, *value);
        }));
    }

    // One writer thread
    {
        let config = Arc::clone(&config);
        handles.push(thread::spawn(move || {
            let mut value = config.write().unwrap();
            *value = String::from("Updated config");
            println!("Config updated");
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }
}
```

## Async/Await Asynchronous Programming

For I/O-bound tasks, Rust's async/await model is more efficient than threads:

### Basic Async Functions

```rust
use tokio; // Most commonly used async runtime

async fn fetch_data(url: &str) -> Result<String, reqwest::Error> {
    let response = reqwest::get(url).await?;
    let body = response.text().await?;
    Ok(body)
}

#[tokio::main]
async fn main() {
    match fetch_data("https://api.example.com/data").await {
        Ok(data) => println!("Fetched data: {} bytes", data.len()),
        Err(e) => eprintln!("Request failed: {}", e),
    }
}
```

### Concurrent Execution of Multiple Tasks

```rust
use tokio;

async fn process_task(id: u32) -> String {
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    format!("Task {} completed", id)
}

#[tokio::main]
async fn main() {
    // Execute multiple async tasks concurrently
    let tasks: Vec<_> = (1..=5)
        .map(|id| tokio::spawn(process_task(id)))
        .collect();

    for task in tasks {
        match task.await {
            Ok(result) => println!("{}", result),
            Err(e) => eprintln!("Task failed: {}", e),
        }
    }
}
```

### Using Stream for Async Data Streams

```rust
use tokio_stream::StreamExt;

async fn process_stream() {
    let mut stream = tokio_stream::iter(vec![1, 2, 3, 4, 5])
        .map(|x| x * 2)
        .filter(|x| *x > 4);

    while let Some(value) = stream.next().await {
        println!("Stream data: {}", value);
    }
}
```

## Practical Example: Concurrent Web Crawler

Here's a simple crawler example that combines concurrency concepts:

```rust
use std::sync::Arc;
use tokio::sync::Semaphore;

struct Crawler {
    semaphore: Arc<Semaphore>,
    client: reqwest::Client,
}

impl Crawler {
    fn new(max_concurrent: usize) -> Self {
        Crawler {
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            client: reqwest::Client::new(),
        }
    }

    async fn fetch(&self, url: String) -> Result<usize, String> {
        let _permit = self.semaphore.acquire().await
            .map_err(|e| e.to_string())?;

        let resp = self.client.get(&url).send().await
            .map_err(|e| format!("Request {} failed: {}", url, e))?;

        let body = resp.text().await
            .map_err(|e| format!("Read {} failed: {}", url, e))?;

        Ok(body.len())
    }
}
```

## Send and Sync Traits

Rust's concurrency safety is ensured by two marker traits:

- **`Send`**: Types can safely transfer ownership between threads
- **`Sync`**: Types can safely have references shared between threads

Most types automatically implement these traits. If you use types that don't satisfy these constraints (like `Rc<T>`), the compiler will error at compile time, preventing you from writing code with data races.

## Summary

Rust's concurrency model is one of its most powerful features. Whether you use threads, message passing, or async programming, the compiler guards your code's safety in the background. This is the true meaning of "fearless concurrency"—you can confidently write concurrent code because the compiler has already eliminated most hazards for you.

> **Previous**: [Rust Error Handling Best Practices](/en/posts/rust-series-03-error-handling)
>
> **Congratulations on completing the "Learning Rust from Scratch" series!** You've now mastered Rust's four core concepts. Keep practicing, build more projects, and you'll increasingly appreciate Rust's charm.
