# BookMyTix: Senior Technical Interview & Final-Year Viva Guide

> **Target Audience:** Principal Engineering Reviewers, Hiring Managers, Technical Interviewers, Final-Year Project Examiners  
> **Topic:** High-Concurrency Architectures, FinTech Integrity, AI Boundaries & Distributed Ticketing Systems  

---

## 1. High-Concurrency & Distributed Seat Locking

### Q1: How does BookMyTix prevent double-booking when hundreds of users click the exact same seat simultaneously?
**Answer:**
We prevent double-booking using a two-tier defense combining **cryptographic reservation tokens** and **database-level ACID unique constraints**:
1. When a user selects a seat and clicks "Lock Seats", the backend executes an atomic operation on the `seat_locks` table.
2. The `seat_locks` table has an index constraint:
   ```sql
   CREATE UNIQUE INDEX idx_unique_active_seat_lock ON seat_locks (show_id, show_seat_id);
   ```
3. When two concurrent requests arrive at the same millisecond (`Promise.allSettled` in our automated test suite), PostgreSQL accepts the first insert and rejects the second with a unique constraint violation error.
4. Our `seatLockService` catches this violation and converts it into a `409 Conflict` HTTP response: `"Seat X is currently reserved by another customer"`.
5. The winning user receives an 8-minute TTL reservation token (`lockToken`). Only requests carrying this cryptographic `lockToken` can transition the reservation into a checkout order.

### Q2: How do you handle abandoned reservations where a user locks a seat and closes their browser?
**Answer:**
We implement a **hybrid passive-active lock expiration strategy**:
1. **TTL Timestamp:** Every lock record contains an `expires_at` column set to `NOW() + INTERVAL '8 minutes'`.
2. **Lazy Sweeping:** Every query fetching seats (`GET /api/shows/:id/seats`) executes a fast indexed sweep:
   ```sql
   DELETE FROM seat_locks WHERE show_id = $1 AND expires_at < NOW() RETURNING show_seat_id;
   ```
3. **Event-Driven Push:** When expired locks are deleted, our `seatEventService` broadcasts a `seat_released` event over Server-Sent Events (SSE), instantly turning the seat green on all other active users' screens without requiring page reloads.
4. **Client Beacon Cleanup:** In the frontend (`SeatMapModal.tsx`), when the modal unmounts or before unload, an asynchronous release beacon releases the held seats immediately.

---

## 2. FinTech, Payments & Deterministic State Machine

### Q3: Why is a strict State Machine necessary for ticket booking, and what happens if a network failure occurs during payment?
**Answer:**
A ticket reservation represents real-world financial liability and perishable auditorium inventory. A naive status column allowing arbitrary updates causes severe vulnerabilities (e.g., an attacker changing a failed booking to confirmed).
1. We enforce an explicit **Booking State Machine** (`server/services/bookingStateMachine.ts`):
   - Allowed transitions: `pending` $\rightarrow$ `payment_pending` $\rightarrow$ `confirmed` $\rightarrow$ `refund_pending` $\rightarrow$ `refunded`.
   - Explicit terminal states: `failed`, `expired`, `cancelled`.
2. If network drops before the frontend receives payment confirmation:
   - Razorpay automatically dispatches a webhook event (`payment.captured`) to `/api/checkout/webhook`.
   - The webhook verifies the `X-Razorpay-Signature` HMAC-SHA256 signature against our raw request body.
   - Using an **idempotency key** (`order_id` / `payment_id`), the backend transitions the booking to `confirmed` and issues digital QR passes even if the user never returned to the checkout page.

### Q4: How do you protect against price manipulation on the frontend (e.g., modifying seat prices in DevTools)?
**Answer:**
**Zero financial calculations are trusted from the frontend**:
1. When a client initiates checkout, it sends only `{ showId, seatIds: [101, 102], couponCode: "WELCOME50" }`.
2. The server (`checkoutService.ts`) independently queries the database for base screen pricing and category multipliers (`recliner: 1.6x`, `premium: 1.25x`, `standard: 1.0x`).
3. Convenience fees (₹40/seat), statutory GST (18%), and server-validated coupon discounts are computed strictly in Node.js.
4. Razorpay payment orders are created server-side in smallest currency unit (paise) derived solely from the server calculation. If client tampered with prices, the backend calculation remains authoritative.

---

## 3. Practical AI Engineering & Architectural Boundaries

### Q5: What is the cardinal rule when integrating Generative AI into a transactional commerce platform like BookMyTix?
**Answer:**
**The Cardinal Rule: AI must be advisory and never authoritative over financial, inventory, or security boundaries.**
- **Advisory (AI Allowed):**
  - Natural language intent parsing (e.g., mapping "Find action movies in Hindi tonight" to `{ genre: "Action", language: "Hindi", status: "now_showing" }`).
  - Content-based movie recommendations with human-readable rationale badges.
  - Contextual customer service inquiries grounded in verified database records (RAG).
- **Authoritative (AI Forbidden):**
  - LLMs are never permitted to generate ticket prices, grant discounts, authorize refunds, issue seat locks, or bypass authentication checks.
  - Every AI query output is validated against deterministic Zod schemas before being used to filter database queries.

### Q6: What happens if the Gemini AI API is down, rate-limited, or unreachable?
**Answer:**
We implemented a **Dual-Mode Discovery Architecture**:
1. When a user submits a natural query, the service first attempts to invoke Gemini 1.5 Flash.
2. If `GEMINI_API_KEY` is missing or the external API call fails, our **Deterministic NLP Fallback Engine** (`server/services/aiDiscoveryService.ts`) takes over instantly in sub-millisecond execution.
3. The deterministic parser uses regex-based entity extraction across our validated genres, languages, rating constraints, and duration bounds (`parseIntentDeterministic`), guaranteeing 100% platform uptime with zero external dependencies.

---

## 4. Application Security & Defenses

### Q7: How does BookMyTix prevent Insecure Direct Object Reference (IDOR) attacks on digital tickets?
**Answer:**
In many naive implementations, endpoints like `/api/bookings/:id` simply query `WHERE id = :id`. An attacker could increment the ID and view or cancel strangers' tickets.
In BookMyTix:
1. `bookingService.getBookingById(bookingId, userId)` scopes queries to `WHERE bookings.id = $1 AND bookings.user_id = $2`.
2. If the user ID does not match, the system throws an `AppError('Booking not found or access denied', 404)`, preventing attackers from even discovering valid booking IDs.
3. Cancellation (`/api/bookings/:id/cancel`) similarly enforces ownership: only the user who booked the ticket (or a verified admin with dispute privileges) can trigger cancellation.

### Q8: How does BookMyTix prevent SQL Injection and Cross-Site Scripting (XSS)?
**Answer:**
- **SQL Injection:** We use **Drizzle ORM** with native parameterized queries across all database operations. User search strings are never concatenated into raw SQL strings; they are passed as bind variables (`$1`, `$2`), completely immunizing the application against SQLi (verified in our test suite with `' OR '1'='1` and `'; DROP TABLE; --`).
- **XSS:** All user-generated content (reviews, support ticket messages) is escaped by React's Virtual DOM upon rendering. Additionally, inputs are validated against strict Zod schemas on backend entrypoints.

---

## 5. Performance Engineering & Database Optimization

### Q9: What indexes were created, and how did you verify query performance?
**Answer:**
We performed an indexing audit on `server/db/schema.ts`:
1. `idx_shows_starts_at` & `idx_shows_movie_id`: Accelerates showtime queries by movie and date from full table scans to index range scans.
2. `idx_seat_locks_show_id` & `idx_seat_locks_expires_at`: Ensures lock sweeps execute in sub-millisecond time.
3. `idx_unique_active_seat_lock`: Enforces concurrency safety while providing instant $O(1)$ lock lookup.
4. `idx_movies_slug`: Provides $O(1)$ lookups for SEO-friendly URLs.
5. In our real-time performance audit benchmark (`scripts/performance_audit.ts`):
   - Health liveness: **4ms** (p50)
   - Show listing: **296ms** (p50)
   - Natural language discovery: **294ms** (p50)
   - Real-time seat layout calculation: **1,452ms** (p50 for dynamic 96-seat grid with live pricing & lock sweeps)

---

## 6. SRE & Cloud Deployment

### Q10: How is BookMyTix containerized for production?
**Answer:**
1. **Multi-Stage Dockerfile:**
   - *Stage 1 (Builder):* Uses `node:20-alpine`, installs dependencies, compiles Vite frontend and TypeScript backend into `dist/`.
   - *Stage 2 (Runtime):* Creates a minimal Alpine image, installs only production dependencies, copies compiled artifacts.
2. **Security Hardening:** The container runs under an unprivileged user `bookmytix` (UID 10001, GID 10001), preventing root privilege escalation attacks.
3. **Container Healthcheck:** Leverages `HEALTHCHECK --interval=30s --timeout=5s CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1`.
