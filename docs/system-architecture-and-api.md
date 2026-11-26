# BookMyTix: Enterprise Architectural Specification & API Reference

> **Document Type:** Production Architecture, System Design & API Specification  
> **Classification:** Technical Reference / Engineering Audit  
> **Version:** 2.4.0-Enterprise  
> **Status:** Verified & Audited  

---

## 1. System Overview & Problem Statement

### 1.1 The Challenge
Modern entertainment and multiplex ticketing systems (e.g., BookMyShow, Fandango, PVR-INOX) face critical distributed systems challenges:
1. **High Concurrency & Flash-Sale Traffic:** High demand for blockbuster releases creates extreme contention where hundreds of concurrent requests contend for the exact same seat within milliseconds.
2. **Double-Booking & Race Conditions:** Naive booking solutions experience phantom reservations, double-booked auditoriums, and transaction anomalies.
3. **Financial Determinism vs Non-Deterministic AI:** Modern platforms must leverage generative AI and natural language discovery without allowing non-deterministic model outputs to alter ticket pricing, seat locking, convenience fees, or refund calculations.
4. **Resilience & Observability:** Preventing cascading database exhaustion under burst loads while maintaining sub-second user responsiveness and auditability.

### 1.2 The BookMyTix Solution
BookMyTix is an enterprise-grade entertainment discovery and ticketing platform built with:
- **ACID Transaction Isolation & Distributed Seat Reservation Engine:** Employs temporary 8-minute cryptographic seat locks with automatic TTL sweeps and PostgreSQL unique constraint guarantees to eliminate double-booking.
- **Strict Separation of Concerns:** AI engines operate solely on read-only metadata and natural language intent parsing; all pricing, fee calculations, and inventory locks remain 100% deterministic and server-enforced.
- **Multi-Tenant Role-Based Access Control (RBAC):** Cryptographically enforced permissions across `customer`, `admin`, and `cinema_manager` roles.
- **Idempotent Payment Lifecycle State Machine:** Strict transition validation (`pending` $\rightarrow$ `payment_pending` $\rightarrow$ `confirmed` $\rightarrow$ `refund_pending` $\rightarrow$ `refunded`) paired with HMAC-SHA256 signature verification.

---

## 2. Technology Stack & Justification

| Layer | Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + TypeScript + Vite** | Predictable state reconciliation, sub-second HMR, type safety, modular component hierarchy. |
| **Styling & Design System** | **Tailwind CSS + Lucide Icons** | Dark cinematic aesthetic, zero runtime CSS overhead, accessible contrast ratios, responsive grid systems. |
| **Backend Runtime** | **Node.js (v20 LTS) + Express + TypeScript** | Asynchronous non-blocking I/O ideal for high-throughput concurrency, real-time SSE streams, and modular routers. |
| **Persistence & ORM** | **PostgreSQL 16 + Drizzle ORM** | ACID transactional guarantees, row-level locking, type-safe SQL construction with zero query generation bloat. |
| **Database Pool** | **node-postgres (pg) with KeepAlive** | Connection pooling (max: 20, idleTimeout: 30s) resilient against serverless compute cold starts. |
| **AI & NLP Engine** | **Gemini 1.5 Flash + Deterministic NLP Fallback** | Dual-mode intent parsing: sub-second cloud LLM parsing with zero-dependency offline keyword parsing fallback. |
| **In-Memory Caching** | **In-Memory LRU / TTL Cache** | Cache layer with prefix eviction and real-time hit/miss observability. |
| **Containerization & CI** | **Docker Multi-Stage + GitHub Actions** | Production-ready Alpine container running under unprivileged user `bookmytix` (UID 10001). |

---

## 3. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client_Layer ["Client Tier (Browser & Mobile)"]
        UI["React 18 SPA (Dark Cinematic UI)"]
        State["Auth Context & Real-Time SSE Listener"]
    end

    subgraph Edge_Layer ["Gateway & Reverse Proxy"]
        Nginx["Nginx / Cloudflare Edge (SSL Termination & Compression)"]
        RateLimit["Rate Limiter (100 req/min per IP)"]
    end

    subgraph Service_Tier ["Application Tier (Node.js / Express TS)"]
        AuthMW["JWT & RBAC Middleware"]
        CorrMW["Correlation ID & Prometheus Metrics MW"]
        
        subgraph Core_Services ["Micro-Services Domain"]
            MovieSvc["Movie Discovery & Recommendation Svc"]
            SeatLockSvc["Seat Lock & Concurrency Engine"]
            BookingSvc["Booking & State Machine Svc"]
            PaymentSvc["FinTech & Razorpay Gateway Svc"]
            AISvc["Gemini 1.5 Flash & Deterministic NLP Svc"]
            SupportSvc["Customer Support & RBAC Audit Svc"]
        end
    end

    subgraph Persistence_Tier ["Data & Caching Tier"]
        Postgres[("PostgreSQL 16 (Neon / Enterprise DB)")]
        CacheStore[("TTL / LRU In-Memory Cache Store")]
    end

    UI -->|HTTPS / REST & SSE| Nginx
    Nginx --> RateLimit
    RateLimit --> AuthMW
    AuthMW --> CorrMW
    CorrMW --> Core_Services
    
    SeatLockSvc <-->|ACID Transactions & Locks| Postgres
    BookingSvc <-->|State Machine & Bookings| Postgres
    MovieSvc <-->|Indexed Catalog Queries| Postgres
    MovieSvc <-->|Read Cache| CacheStore
    AISvc <-->|Read-only Movie Metadata| Postgres
    PaymentSvc <-->|Idempotency Keys & Audits| Postgres
```

---

## 4. Database Schema & Entity-Relationship Model

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : places
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ SEAT_LOCKS : holds
    USERS ||--o{ SUPPORT_TICKETS : opens
    
    THEATRES ||--o{ SCREENS : contains
    THEATRES ||--o{ SHOWS : hosts
    THEATRES ||--o{ FOOD_ITEMS : sells
    
    MOVIES ||--o{ SHOWS : exhibits
    MOVIES ||--o{ REVIEWS : receives
    
    SCREENS ||--o{ SHOWS : schedules
    
    SHOWS ||--o{ SHOW_SEATS : provisions
    SHOWS ||--o{ SEAT_LOCKS : locks
    SHOWS ||--o{ BOOKINGS : books
    
    BOOKINGS ||--o{ TICKETS : issues
    BOOKINGS ||--o{ PAYMENTS : settles
    BOOKINGS ||--o{ BOOKING_FOOD_ITEMS : includes
    
    SHOW_SEATS ||--o| TICKETS : generates
    SHOW_SEATS ||--o| SEAT_LOCKS : restricts

    USERS {
        int id PK
        string email UK
        string passwordHash
        string role "customer | admin | cinema_manager"
        string preferredCity
    }

    MOVIES {
        int id PK
        string title
        string slug UK
        string genre
        string language
        string rating
        string status "now_showing | coming_soon"
    }

    THEATRES {
        int id PK
        string name
        string city
        string location
    }

    SHOWS {
        int id PK
        int movieId FK
        int theatreId FK
        int screenId FK
        timestamp startsAt
        decimal price
        string format
    }

    SHOW_SEATS {
        int id PK
        int showId FK
        string seatNumber
        string row
        string category "standard | premium | recliner"
        decimal price
        string status "available | booked"
    }

    SEAT_LOCKS {
        int id PK
        int showId FK
        int showSeatId FK
        int userId FK
        string lockToken UK
        timestamp expiresAt
    }

    BOOKINGS {
        int id PK
        string bookingRef UK
        int userId FK
        int showId FK
        decimal totalPrice
        string status "pending | payment_pending | confirmed | cancelled | refunded"
    }

    TICKETS {
        int id PK
        int bookingId FK
        int showSeatId FK
        string qrToken UK
        string ticketRef UK
    }

    PAYMENTS {
        int id PK
        int bookingId FK
        string orderId UK
        string paymentId UK
        decimal amount
        string status "pending | success | failed | refunded"
    }
```

---

## 5. High-Concurrency Seat Reservation Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor UserA as Customer A
    actor UserB as Customer B
    participant API as BookMyTix Show API
    participant Engine as Seat Lock Engine
    participant DB as PostgreSQL
    participant SSE as Real-time Event Broadcaster

    UserA->>API: POST /api/shows/204/lock-seats { seat_ids: [5775] }
    UserB->>API: POST /api/shows/204/lock-seats { seat_ids: [5775] }
    
    critical Concurrent DB Lock Acquisition
        API->>Engine: lockSeats(showId: 204, seatIds: [5775], userIdA)
        API->>Engine: lockSeats(showId: 204, seatIds: [5775], userIdB)
        Engine->>DB: INSERT INTO seat_locks (show_id, show_seat_id, user_id, expires_at)
        DB-->>Engine: Customer A Insert SUCCESS (LockToken Issued)
        Engine->>DB: INSERT INTO seat_locks (show_id, show_seat_id, user_id, expires_at)
        DB-->>Engine: Customer B Insert CONFLICT (Active Lock Exists)
    end

    Engine-->>API: Customer A: 200 OK { lockToken: "a8f...", remainingSeconds: 480 }
    Engine-->>API: Customer B: 409 Conflict { error: "Seat 5775 is currently reserved" }
    
    API-->>UserA: 200 OK (8-minute reservation starts)
    API-->>UserB: 409 Conflict (Prompt to pick another seat)

    Engine->>SSE: emit('seat_locked', { seatIds: [5775], userId: UserA.id })
    SSE-->>UserB: Push event: Seat 5775 now held by another customer
```

---

## 6. Payment & Booking State Machine Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Seats Locked (8-min TTL)
    Pending --> PaymentPending: Checkout Initiated (Razorpay Order Created)
    Pending --> Expired: TTL Elapsed (8-min Timeout)
    
    PaymentPending --> Confirmed: Webhook / Verification (HMAC SHA-256 Valid)
    PaymentPending --> Failed: Payment Gateway Declined / Cancelled
    PaymentPending --> Expired: Payment Session Timeout
    
    Confirmed --> RefundPending: User Requests Cancellation (>=2h before show)
    Confirmed --> Completed: Show Showtime Reached
    
    RefundPending --> Refunded: Razorpay Refund API Confirmed
    
    Expired --> [*]: Seats Released Automatically
    Failed --> [*]: Seats Released Automatically
    Refunded --> [*]: Seats Returned to Inventory
    Completed --> [*]
```

---

## 7. REST API Reference

### 7.1 Movie & Discovery Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/movies` | Public | Paginated movie catalog with filtering by city, language, genre, format, and status. |
| `GET` | `/api/movies/:id` | Public | Comprehensive movie details including cast, crew, ratings, and scheduled cinemas. |
| `GET` | `/api/movies/suggestions?q=` | Public | Sub-50ms debounced autocompletion suggestions. |
| `GET` | `/api/movies/:id/reviews` | Public | Verified audience reviews and ratings. |
| `POST` | `/api/movies/:id/reviews` | Bearer | Submit user movie review and rating. |

### 7.2 Showtimes & Real-Time Seat Engine

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/shows` | Public | List scheduled shows with cinema, screen, format, and start time filters. |
| `GET` | `/api/shows/:id/seats` | Public/Bearer | Dynamic auditorium seat layout with real-time lock status and category prices. |
| `POST` | `/api/shows/:id/lock-seats` | Bearer | Temporarily reserve candidate seats with an 8-minute TTL lock token. |
| `POST` | `/api/shows/:id/release-seats` | Bearer | Release active seat locks held by the authenticated user. |
| `GET` | `/api/shows/:id/seat-events` | Public | Server-Sent Events (SSE) stream for live auditorium seat state synchronization. |

### 7.3 Checkout, Payment & Ticketing

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/checkout/summary` | Bearer | Server-calculated order breakdown (subtotal, convenience fee, GST, discounts). |
| `POST` | `/api/checkout/create-order` | Bearer | Initiates Razorpay payment order tied to locked seats with idempotency key. |
| `POST` | `/api/checkout/verify-payment` | Bearer | Validates HMAC-SHA256 signature and transitions booking state to `confirmed`. |
| `POST` | `/api/checkout/webhook` | System | Razorpay webhook receiver with HMAC signature verification and idempotency check. |
| `GET` | `/api/bookings` | Bearer | Authenticated customer's booking history (upcoming, past, cancelled). |
| `GET` | `/api/bookings/:id` | Bearer | Secure digital pass details with IDOR validation. |
| `POST` | `/api/bookings/:id/cancel` | Bearer | Eligible cancellation engine with automated seat release and refund initiation. |
| `GET` | `/api/tickets/verify/:token` | Public/Staff | Physical gate QR verification endpoint for theatre entry validation. |

### 7.4 AI Services & Observability

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/ai/discover?q=` | Public | Natural language conversational movie discovery with intent extraction. |
| `GET` | `/api/ai/recommendations` | Bearer/Public | Hybrid content-based, popularity, and preference recommendation feed. |
| `POST` | `/api/ai/assistant` | Public | Contextual RAG-grounded assistant for showtimes, policies, and ticketing inquiries. |
| `GET` | `/api/health` | Public | Liveness probe returning status, uptime, and timestamp. |
| `GET` | `/api/ready` | Public | Readiness probe performing an end-to-end database connectivity ping. |
| `GET` | `/api/metrics` | Public/Admin | Prometheus/OpenMetrics latency histograms, status counters, and memory usage. |

---

## 8. Security Verification Matrix

| Vulnerability Vector | Defense Mechanism | Verification Standard |
| :--- | :--- | :--- |
| **SQL Injection (SQLi)** | Parameterized queries via Drizzle ORM. Zero string concatenation. | Audited with `' OR '1'='1`, `'; DROP TABLE; --`, `UNION SELECT`. |
| **Cross-Site Scripting (XSS)** | React JSX HTML entity encoding + server-side string escaping on UGC. | Audited with `<script>alert(1)</script>` and `<img src=x onerror=...>` payloads. |
| **Insecure Direct Object Reference (IDOR)** | Server-side user ownership checks (`booking.userId === req.user.id`). | Verified: User B receives 404/403 when requesting or cancelling User A's booking. |
| **Tampered Payment Signatures** | Cryptographic `crypto.createHmac('sha256', SECRET)` signature validation. | Verified: Altered amounts or invalid signatures trigger immediate HTTP 400 rejection. |
| **Seat Sniping & Race Conditions** | PostgreSQL unique index on `(show_id, show_seat_id)` in `seat_locks`. | Verified: Simultaneous requests result in exactly 1 lock success and 1 conflict (409). |
| **Privilege Escalation** | `requireRole(['admin'])` backend middleware validation on `/api/admin/*`. | Verified: Standard customer JWTs attempting admin access are rejected with 403 Forbidden. |
