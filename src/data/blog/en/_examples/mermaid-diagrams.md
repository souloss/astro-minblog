---
title: Mermaid Diagram Examples
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: This article demonstrates how to create various diagrams using ```mermaid code block syntax, including flowcharts, sequence diagrams, class diagrams, state diagrams, and more.
tags:
  - mermaid
  - diagram
  - tutorial
category: Blog/Tutorial
featured: true
draft: false
---

This article demonstrates how to create various Mermaid diagrams using the ` ```mermaid ` code block syntax. This approach is simpler and more intuitive than using components.

---

## 1. Flowchart

### 1.1 Basic Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Condition}
    B -->|Yes| C[Action A]
    B -->|No| D[Action B]
    C --> E[End]
    D --> E
```

### 1.2 Horizontal Flowchart

```mermaid
flowchart LR
    A[User Request] --> B[Load Balancer]
    B --> C[Server A]
    B --> D[Server B]
    C --> E[(Database)]
    D --> E
    E --> F[Cache Layer]
    F --> G[Response]
```

### 1.3 Flowchart with Subgraphs

```mermaid
flowchart TB
    subgraph Client
        A[Browser]
        B[Mobile App]
    end
    subgraph Server
        C[API Gateway]
        D[Service A]
        E[Service B]
    end
    subgraph Data Layer
        F[(MySQL)]
        G[(Redis)]
        H[(MongoDB)]
    end
    A & B --> C
    C --> D & E
    D --> F & G
    E --> G & H
```

### 1.4 Different Node Shapes

```mermaid
flowchart TD
    A[Rectangular Node]
    B(Rounded Rectangle)
    C([Stadium Shape])
    D[[Subroutine]]
    E[(Database)]
    F((Circle))
    G>Flag]
    H{Diamond}
    I{{Hexagon}}
    J[/Parallelogram/]
    K[\Parallelogram Alt\]
    A --> B --> C --> D
    D --> E --> F --> G
    G --> H --> I --> J --> K
```

---

## 2. Sequence Diagram

### 2.1 Basic Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database

    User->>Frontend: Send request
    Frontend->>API: POST /api/login
    API->>Database: Query user
    Database-->>API: Return data
    API-->>Frontend: Return Token
    Frontend-->>User: Login success
```

### 2.2 Sequence Diagram with Loops and Conditions

```mermaid
sequenceDiagram
    loop Every 30 seconds
        Client->>Server: Heartbeat
        Server-->>Client: Heartbeat ACK
    end

    Client->>Server: Request data
    alt Success
        Server-->>Client: Return data
    else Failure
        Server-->>Client: Return error
        Client->>Client: Retry logic
    end
```

### 2.3 Sequence Diagram with Notes

```mermaid
sequenceDiagram
    participant Alice
    participant Bob
    participant Charlie

    Alice->>Bob: Hello Bob!
    Note right of Bob: Bob is thinking...
    Bob->>Charlie: Hello Charlie!
    Note over Alice,Charlie: A note spanning multiple participants
    Charlie-->>Bob: Hello Bob!
    Bob-->>Alice: Hello Alice!
```

---

## 3. Class Diagram

### 3.1 Basic Class Diagram

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

### 3.2 Class Relationships

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

## 4. State Diagram

### 4.1 Basic State Diagram

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Processing: Start
    Processing --> Completed: Success
    Processing --> Cancelled: Failure
    Completed --> [*]
    Cancelled --> [*]
```

### 4.2 State Diagram with Nested States

```mermaid
stateDiagram-v2
    [*] --> NotLoggedIn
    NotLoggedIn --> LoggingIn: Enter credentials
    LoggingIn --> LoggedIn: Valid
    LoggingIn --> NotLoggedIn: Invalid

    state LoggedIn {
        [*] --> Browsing
        Browsing --> Shopping: Select product
        Shopping --> Checkout: Add to cart
        Checkout --> Browsing: Cancel
    }

    LoggedIn --> NotLoggedIn: Logout
```

---

## 5. ER Diagram

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

## 6. Gantt Chart

```mermaid
gantt
    title Project Development Plan
    dateFormat YYYY-MM-DD

    section Analysis
        Requirements     :a1, 2024-01-01, 7d
        Documentation    :a2, after a1, 5d
        Review           :milestone, after a2, 0d

    section Design
        Architecture     :b1, after a2, 7d
        UI Design        :b2, after a2, 10d
        Database Design  :b3, after b1, 5d

    section Development
        Backend          :c1, after b3, 21d
        Frontend         :c2, after b2, 21d
        API Integration  :c3, after c1, 7d

    section Testing
        Unit Tests       :d1, after c1, 7d
        Integration      :d2, after c3, 5d
        Deploy           :milestone, after d2, 0d
```

---

## 7. Pie Chart

```mermaid
pie showData
    title Programming Language Usage
    "TypeScript" : 35
    "Python" : 25
    "Go" : 20
    "Rust" : 12
    "Others" : 8
```

---

## 8. Git Graph

```mermaid
gitGraph
    commit id: "Initial commit"
    commit id: "Add base features"
    branch develop
    checkout develop
    commit id: "Developing"
    commit id: "Feature A"
    branch feature/auth
    checkout feature/auth
    commit id: "Implement auth"
    commit id: "Add tests"
    checkout develop
    merge feature/auth id: "Merge auth module"
    commit id: "Feature B"
    checkout main
    merge develop id: "v1.0 Release" tag: "v1.0"
    branch hotfix
    checkout hotfix
    commit id: "Fix critical bug"
    checkout main
    merge hotfix id: "v1.0.1 Release" tag: "v1.0.1"
    commit id: "Further improvements"
```

---

## 9. User Journey

```mermaid
journey
    title User Shopping Experience
    section Browse
        Open homepage: 5: User
        Search products: 4: User
        View details: 4: User
    section Purchase
        Add to cart: 4: User
        Checkout: 3: User, System
        Confirm order: 5: User
    section Delivery
        Wait for shipping: 2: User
        Receive package: 5: User
        Leave review: 4: User
```

---

## 10. Mindmap

```mermaid
mindmap
  root((Web Development))
    Frontend
      HTML/CSS
      JavaScript
        TypeScript
        Frameworks
          Vue
          React
          Angular
    Backend
      Node.js
        Express
        NestJS
      Python
        Django
        FastAPI
      Go
        Gin
        Echo
    Database
      Relational
        MySQL
        PostgreSQL
      NoSQL
        MongoDB
        Redis
    DevOps
      CI/CD
        GitHub Actions
        GitLab CI
      Containerization
        Docker
        Kubernetes
```

---

## 11. Additional Features

### 11.1 Style Customization

```mermaid
flowchart TD
    A[Start] --> B[Process]
    B --> C[End]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
```

### 11.2 Links and Interactions

```mermaid
flowchart TD
    A[Visit Website] --> B[View Docs]
    A --> C[GitHub Repo]

    click A "https://mermaid.js.org/" _blank
    click B "https://mermaid.js.org/intro/" _blank
    click C "https://github.com/mermaid-js/mermaid" _blank
```

---

## References

- [Mermaid Official Documentation](https://mermaid.js.org/)
- [Mermaid GitHub](https://github.com/mermaid-js/mermaid)
- [Mermaid Live Editor](https://mermaid.live/)
