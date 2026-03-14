---
title: Mermaid 图表示例
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: 本文展示如何使用 ```mermaid 代码块语法创建各种图表，包括流程图、时序图、类图、状态图等。
tags:
  - mermaid
  - 图表
  - 教程
category: 博客/教程
featured: true
draft: false
---

本文展示如何使用 ` ```mermaid ` 代码块语法创建各种 Mermaid 图表。这种方式比使用组件更简洁直观。

---

## 一、流程图 (Flowchart)

### 1.1 基本流程图

```mermaid
flowchart TD
    A[开始] --> B{条件判断}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E
```

### 1.2 横向流程图

```mermaid
flowchart LR
    A[用户请求] --> B[负载均衡]
    B --> C[服务器A]
    B --> D[服务器B]
    C --> E[(数据库)]
    D --> E
    E --> F[缓存层]
    F --> G[响应返回]
```

### 1.3 带子图的流程图

```mermaid
flowchart TB
    subgraph 客户端
        A[浏览器]
        B[移动App]
    end
    subgraph 服务端
        C[API网关]
        D[微服务A]
        E[微服务B]
    end
    subgraph 数据层
        F[(MySQL)]
        G[(Redis)]
        H[(MongoDB)]
    end
    A & B --> C
    C --> D & E
    D --> F & G
    E --> G & H
```

### 1.4 不同形状的节点

```mermaid
flowchart TD
    A[矩形节点]
    B(圆角矩形)
    C([体育场形])
    D[[子程序]]
    E[(数据库)]
    F((圆形))
    G>旗帜形]
    H{菱形}
    I{{六边形}}
    J[/平行四边形/]
    K[\平行四边形\]
    A --> B --> C --> D
    D --> E --> F --> G
    G --> H --> I --> J --> K
```

---

## 二、时序图 (Sequence Diagram)

### 2.1 基本时序图

```mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant API
    participant 数据库

    用户->>前端: 发起请求
    前端->>API: POST /api/login
    API->>数据库: 查询用户
    数据库-->>API: 返回数据
    API-->>前端: 返回Token
    前端-->>用户: 登录成功
```

### 2.2 带循环和条件的时序图

```mermaid
sequenceDiagram
    loop 每30秒
        Client->>Server: 心跳检测
        Server-->>Client: 心跳响应
    end

    Client->>Server: 请求数据
    alt 成功
        Server-->>Client: 返回数据
    else 失败
        Server-->>Client: 返回错误
        Client->>Client: 重试逻辑
    end
```

### 2.3 带注释的时序图

```mermaid
sequenceDiagram
    participant Alice
    participant Bob
    participant Charlie

    Alice->>Bob: 你好 Bob!
    Note right of Bob: Bob 思考中...
    Bob->>Charlie: 你好 Charlie!
    Note over Alice,Charlie: 这是跨越多个参与者的注释
    Charlie-->>Bob: 你好 Bob!
    Bob-->>Alice: 你好 Alice!
```

---

## 三、类图 (Class Diagram)

### 3.1 基本类图

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
        +fetch()
    }
    class Cat {
        +String color
        +meow()
        +scratch()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

### 3.2 类关系

```mermaid
classDiagram
    class Order {
        +int id
        +Date created
        +calculateTotal()
    }
    class Customer {
        +int id
        +String name
        +String email
    }
    class OrderItem {
        +int quantity
        +float price
    }
    class Product {
        +int id
        +String name
        +float price
    }

    Customer "1" --> "*" Order : places
    Order "1" --> "*" OrderItem : contains
    Product "1" --> "*" OrderItem : "ordered in"
```

---

## 四、状态图 (State Diagram)

### 4.1 基本状态图

```mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中: 开始处理
    处理中 --> 已完成: 处理成功
    处理中 --> 已取消: 处理失败
    已完成 --> [*]
    已取消 --> [*]
```

### 4.2 带嵌套状态的状态图

```mermaid
stateDiagram-v2
    [*] --> 未登录
    未登录 --> 登录中: 输入凭证
    登录中 --> 已登录: 验证成功
    登录中 --> 未登录: 验证失败

    state 已登录 {
        [*] --> 浏览
        浏览 --> 购物: 选择商品
        购物 --> 结算: 添加购物车
        结算 --> 浏览: 取消订单
    }

    已登录 --> 未登录: 注销
```

---

## 五、实体关系图 (ER Diagram)

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        int id PK
        string username
        string email
        string password
        datetime created_at
    }
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        int id PK
        int user_id FK
        datetime order_date
        string status
        float total
    }
    PRODUCT ||--o{ ORDER_ITEM : "included in"
    PRODUCT {
        int id PK
        string name
        string description
        float price
        int stock
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        float unit_price
    }
    CATEGORY ||--o{ PRODUCT : categorizes
    CATEGORY {
        int id PK
        string name
        string description
    }
```

---

## 六、甘特图 (Gantt Chart)

```mermaid
gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD

    section 需求分析
        需求调研     :a1, 2024-01-01, 7d
        需求文档     :a2, after a1, 5d
        需求评审     :milestone, after a2, 0d

    section 设计阶段
        架构设计     :b1, after a2, 7d
        UI设计       :b2, after a2, 10d
        数据库设计   :b3, after b1, 5d

    section 开发阶段
        后端开发     :c1, after b3, 21d
        前端开发     :c2, after b2, 21d
        API集成      :c3, after c1, 7d

    section 测试部署
        单元测试     :d1, after c1, 7d
        集成测试     :d2, after c3, 5d
        部署上线     :milestone, after d2, 0d
```

---

## 七、饼图 (Pie Chart)

```mermaid
pie showData
    title 编程语言使用占比
    "TypeScript" : 35
    "Python" : 25
    "Go" : 20
    "Rust" : 12
    "Others" : 8
```

---

## 八、Git 图 (Git Graph)

```mermaid
gitGraph
    commit id: "初始化项目"
    commit id: "添加基础功能"
    branch develop
    checkout develop
    commit id: "开发中"
    commit id: "新功能A"
    branch feature/auth
    checkout feature/auth
    commit id: "实现认证"
    commit id: "添加测试"
    checkout develop
    merge feature/auth id: "合并认证模块"
    commit id: "新功能B"
    checkout main
    merge develop id: "v1.0 发布" tag: "v1.0"
    branch hotfix
    checkout hotfix
    commit id: "修复紧急Bug"
    checkout main
    merge hotfix id: "v1.0.1 发布" tag: "v1.0.1"
    commit id: "后续优化"
```

---

## 九、用户旅程图 (User Journey)

```mermaid
journey
    title 用户购物体验旅程
    section 浏览商品
        打开首页: 5: 用户
        搜索商品: 4: 用户
        查看详情: 4: 用户
    section 购买流程
        加入购物车: 4: 用户
        结算付款: 3: 用户, 系统
        确认订单: 5: 用户
    section 收货评价
        等待发货: 2: 用户
        确认收货: 5: 用户
        评价商品: 4: 用户
```

---

## 十、思维导图 (Mindmap)

```mermaid
mindmap
  root((Web开发))
    前端
      HTML/CSS
      JavaScript
        TypeScript
        框架
          Vue
          React
          Angular
    后端
      Node.js
        Express
        NestJS
      Python
        Django
        FastAPI
      Go
        Gin
        Echo
    数据库
      关系型
        MySQL
        PostgreSQL
      NoSQL
        MongoDB
        Redis
    DevOps
      CI/CD
        GitHub Actions
        GitLab CI
      容器化
        Docker
        Kubernetes
```

---

## 十一、其他特性

### 11.1 样式定制

```mermaid
flowchart TD
    A[开始] --> B[处理]
    B --> C[结束]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
```

### 11.2 链接和交互

```mermaid
flowchart TD
    A[访问官网] --> B[查看文档]
    A --> C[GitHub仓库]

    click A "https://mermaid.js.org/" _blank
    click B "https://mermaid.js.org/intro/" _blank
    click C "https://github.com/mermaid-js/mermaid" _blank
```

---

## 参考资料

- [Mermaid 官方文档](https://mermaid.js.org/)
- [Mermaid GitHub](https://github.com/mermaid-js/mermaid)
- [Mermaid Live Editor](https://mermaid.live/)
