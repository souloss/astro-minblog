---
author: Souloss
pubDatetime: 2026-03-07T10:00:00Z
title: "Rust 并发编程实战"
featured: false
draft: false
category: 教程/Rust
tags:
  - Rust
  - 并发
  - async/await
series:
  name: 从零开始学 Rust
  order: 4
description: "Rust 系列第四篇：探索 Rust 的并发编程能力，包括线程、消息传递、共享状态以及 async/await 异步编程模型。"
---

## Rust 的并发安全保证

Rust 有一个著名的口号：**「无畏并发」（Fearless Concurrency）**。得益于所有权系统和类型系统，Rust 在编译时就能排除绝大部分并发错误，如数据竞争。

## 线程基础

### 创建线程

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..=5 {
            println!("子线程: 计数 {}", i);
            thread::sleep(Duration::from_millis(500));
        }
    });

    for i in 1..=3 {
        println!("主线程: 计数 {}", i);
        thread::sleep(Duration::from_millis(700));
    }

    handle.join().unwrap();
    println!("所有线程已完成");
}
```

### 使用 move 闭包

当需要在线程间传递数据所有权时：

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3, 4, 5];

    let handle = thread::spawn(move || {
        let sum: i32 = data.iter().sum();
        println!("数据总和: {}", sum);
        sum
    });

    // data 已移动，此处无法再使用
    let result = handle.join().unwrap();
    println!("线程返回: {}", result);
}
```

## 消息传递

Rust 标准库提供了 `mpsc`（多生产者，单消费者）通道来实现线程间通信：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    // 创建多个生产者
    for id in 0..3 {
        let tx_clone = tx.clone();
        thread::spawn(move || {
            let messages = vec![
                format!("worker-{}: 任务开始", id),
                format!("worker-{}: 处理中...", id),
                format!("worker-{}: 任务完成", id),
            ];
            for msg in messages {
                tx_clone.send(msg).unwrap();
                thread::sleep(std::time::Duration::from_millis(100));
            }
        });
    }

    drop(tx); // 关闭原始发送端

    // 接收所有消息
    for received in rx {
        println!("收到: {}", received);
    }
}
```

## 共享状态

### Mutex（互斥锁）

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

    println!("最终计数: {}", *counter.lock().unwrap());
}
```

### RwLock（读写锁）

当读操作远多于写操作时，`RwLock` 比 `Mutex` 更高效：

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let config = Arc::new(RwLock::new(String::from("初始配置")));

    let mut handles = vec![];

    // 多个读取线程
    for i in 0..5 {
        let config = Arc::clone(&config);
        handles.push(thread::spawn(move || {
            let value = config.read().unwrap();
            println!("读取线程 {}: {}", i, *value);
        }));
    }

    // 一个写入线程
    {
        let config = Arc::clone(&config);
        handles.push(thread::spawn(move || {
            let mut value = config.write().unwrap();
            *value = String::from("更新后的配置");
            println!("配置已更新");
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }
}
```

## Async/Await 异步编程

对于 I/O 密集型任务，Rust 的 async/await 模型比线程更加高效：

### 基础异步函数

```rust
use tokio; // 最常用的异步运行时

async fn fetch_data(url: &str) -> Result<String, reqwest::Error> {
    let response = reqwest::get(url).await?;
    let body = response.text().await?;
    Ok(body)
}

#[tokio::main]
async fn main() {
    match fetch_data("https://api.example.com/data").await {
        Ok(data) => println!("获取到数据: {} bytes", data.len()),
        Err(e) => eprintln!("请求失败: {}", e),
    }
}
```

### 并发执行多个任务

```rust
use tokio;

async fn process_task(id: u32) -> String {
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    format!("任务 {} 完成", id)
}

#[tokio::main]
async fn main() {
    // 并发执行多个异步任务
    let tasks: Vec<_> = (1..=5)
        .map(|id| tokio::spawn(process_task(id)))
        .collect();

    for task in tasks {
        match task.await {
            Ok(result) => println!("{}", result),
            Err(e) => eprintln!("任务失败: {}", e),
        }
    }
}
```

### 使用 Stream 处理异步数据流

```rust
use tokio_stream::StreamExt;

async fn process_stream() {
    let mut stream = tokio_stream::iter(vec![1, 2, 3, 4, 5])
        .map(|x| x * 2)
        .filter(|x| *x > 4);

    while let Some(value) = stream.next().await {
        println!("流数据: {}", value);
    }
}
```

## 实战：并发 Web 爬虫

以下是一个综合运用并发概念的简单爬虫示例：

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
            .map_err(|e| format!("请求 {} 失败: {}", url, e))?;

        let body = resp.text().await
            .map_err(|e| format!("读取 {} 失败: {}", url, e))?;

        Ok(body.len())
    }
}
```

## Send 和 Sync Trait

Rust 的并发安全靠两个标记 trait 来保证：

- **`Send`**：类型可以安全地在线程间转移所有权
- **`Sync`**：类型可以安全地被多个线程共享引用

绝大多数类型自动实现了这两个 trait。如果你使用了不满足这些约束的类型（如 `Rc<T>`），编译器会在编译时报错，阻止你写出有数据竞争的代码。

## 小结

Rust 的并发编程模型是其最强大的特性之一。无论你使用线程、消息传递还是异步编程，编译器都会在背后守护你的代码安全。这就是「无畏并发」的真正含义——你可以放心大胆地编写并发代码，因为编译器已经帮你排除了绝大部分隐患。

> **上一篇**：[Rust 错误处理最佳实践](/zh/posts/rust-series-03-error-handling)

**恭喜你完成了「从零开始学 Rust」系列！** 现在你已经掌握了 Rust 最核心的四大概念。继续实践，多写项目，你会越来越感受到 Rust 的魅力。
