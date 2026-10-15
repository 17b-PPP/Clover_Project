# คู่มือสถาปัตยกรรมระบบหลังบ้านและแนวข้อสอบป้องกันโปรเจกต์ (Backend Architecture & Defense Master Guide)
## ระบบบริหารจัดการสหกรณ์รับซื้อน้ำยางพารา (Clover Project)

---

## สารบัญเนื้อหา (Table of Contents)
- [ส่วนที่ 1: เอกสารอธิบายการทำงานของ Backend ทั้งหมดอย่างละเอียด](#ส่วนที่-1-เอกสารอธิบายการทำงานของ-backend-ทั้งหมดอย่างละเอียด)
  - [1.1 ภาพรวมสถาปัตยกรรมและเทคโนโลยีสแตก (Architecture Overview)](#11-ภาพรวมสถาปัตยกรรมและเทคโนโลยีสแตก-architecture-overview)
  - [1.2 สภาพแวดล้อมและการเริ่มต้นระบบ (server.js, env.js)](#12-สภาพแวดล้อมและการเริ่มต้นระบบ-serverjs-envjs)
  - [1.3 เลเยอร์ฐานข้อมูลและ Prisma ORM (Database Schema & Prisma Layer)](#13-เลเยอร์ฐานข้อมูลและ-prisma-orm-database-schema--prisma-layer)
  - [1.4 ระบบความปลอดภัยและการจัดการเซสชันแบบแยกโดเมน (Security & Dual-Session Management)](#14-ระบบความปลอดภัยและการจัดการเซสชันแบบแยกโดเมน-security--dual-session-management)
  - [1.5 การควบคุมสิทธิ์ (RBAC) และ Access Guard Middleware](#15-การควบคุมสิทธิ์-rbac-และ-access-guard-middleware)
  - [1.6 การจัดการคำขอ ตัวช่วย HTTP และระบบบันทึกประวัติ (Audit Trail)](#16-การจัดการคำขอ-ตัวช่วย-http-และระบบบันทึกประวัติ-audit-trail)
  - [1.7 Data Access Layer และตรรกะทางธุรกิจ (Business Logic & Transactions)](#17-data-access-layer-และตรรกะทางธุรกิจ-business-logic--transactions)
  - [1.8 สถาปัตยกรรม REST API และ BFF Pattern (Backend-For-Frontend)](#18-สถาปัตยกรรม-rest-api-และ-bff-pattern-backend-for-frontend)
  - [1.9 การเรนเดอร์หน้าเว็บ (Server-Side Include) และโมดูลช่วยเสริม](#19-การเรนเดอร์หน้าเว็บ-server-side-include-และโมดูลช่วยเสริม)
- [ส่วนที่ 2: รวมแนวข้อสอบป้องกันโปรเจกต์เชิงลึก (Backend Defense Q&A)](#ส่วนที่-2-รวมแนวข้อสอบป้องกันโปรเจกต์เชิงลึก-backend-defense-qa)
  - [หมวดที่ 1: สถาปัตยกรรมและหลักการออกแบบระบบ [Q1 - Q5]](#หมวดที่-1-สถาปัตยกรรมและหลักการออกแบบระบบ-q1---q5)
  - [หมวดที่ 2: ความปลอดภัย การยืนยันตัวตน และการควบคุมสิทธิ์ [Q6 - Q10]](#หมวดที่-2-ความปลอดภัย-การยืนยันตัวตน-และการควบคุมสิทธิ์-q6---q10)
  - [หมวดที่ 3: ความถูกต้องทางข้อมูล ธุรกรรมการเงิน และความพร้อมกัน [Q11 - Q15]](#หมวดที่-3-ความถูกต้องทางข้อมูล-ธุรกรรมการเงิน-และความพร้อมกัน-q11---q15)
  - [หมวดที่ 4: การทำงานกับฐานข้อมูลและ Prisma ORM [Q16 - Q20]](#หมวดที่-4-การทำงานกับฐานข้อมูลและ-prisma-orm-q16---q20)
  - [หมวดที่ 5: ประสิทธิภาพ ความเสถียร และการบำรุงรักษาในระยะยาว [Q21 - Q25]](#หมวดที่-5-ประสิทธิภาพ-ความเสถียร-และการบำรุงรักษาในระยะยาว-q21---q25)

---

# ส่วนที่ 1: เอกสารอธิบายการทำงานของ Backend ทั้งหมดอย่างละเอียด

### 1.1 ภาพรวมสถาปัตยกรรมและเทคโนโลยีสแตก (Architecture Overview)
ระบบหลังบ้านของ **Clover Project** ถูกสร้างขึ้นด้วยแนวคิด **Layered Architecture (สถาปัตยกรรมแบบแบ่งชั้น)** โดยแบ่งการทำงานออกเป็นชั้นที่ชัดเจน:
1. **Client Layer:** เว็บเบราว์เซอร์แยก 2 กลุ่ม คือ เจ้าหน้าที่/ผู้ดูแลระบบ (Staff/Admin Portal) และ สมาชิกสหกรณ์ (Member Self-Service Portal)
2. **Express Runtime Pipeline:** จัดการ Static File, การจำกัดขนาดข้อมูล 50MB, และการตรวจสิทธิ์ด้วย `accessGuard`
3. **Routers Layer:** แบ่งเป็น `pagesRouter` สำหรับส่งหน้าเว็บ (SSR) และ `apiRouter` สำหรับ REST API / BFF Endpoints
4. **Data Access Layer (DAL):** รวบรวม Business Logic, การคำนวณสูตรน้ำยาง, การแบ่งสัดส่วนรายได้, และการตัดยอดเงิน
5. **Prisma ORM Layer:** ให้บริการ Type-Safe Data Mapping และจัดการ Database Connection Pool แบบ Singleton
6. **PostgreSQL Database:** จัดเก็บข้อมูลแบบเชิงสัมพันธ์ (Relational) พร้อมรองรับทศนิยมที่แม่นยำสูง (`Decimal(12,2)`)

```
+---------------------------------------------------------------------------------------------------+
|                                       CLIENT LAYER (Web Browser)                                  |
|  - Staff / Admin Portal (Desktop/Tablet)              - Member Self-Service Portal (Mobile-First) |
+---------------------------------------------------------------------------------------------------+
                                                  |  (HTTP/HTTPS Requests, Signed Cookies)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                      EXPRESS 5.2.1 RUNTIME PIPELINE                               |
|  1. Express Static Asset Server (/public, /shared) -> Zero overhead static asset bypass           |
|  2. Raw Text Body Parser (/api, 50MB Limit)        -> Safe memory limit, handles Base64 photos     |
|  3. Access Guard Middleware (RBAC)                -> Role resolution, dual-token cryptographic ver.|
+---------------------------------------------------------------------------------------------------+
                  |                                                                 |
                  v                                                                 v
+------------------------------------+            +-------------------------------------------------+
|      PAGES ROUTER (SSR ENGINE)     |            |             API ROUTERS (/api/v1)               |
|  - Component Include Engine        |            |  - /auth, /member-auth (Session creation)       |
|  - HTML Partial Stitching          |            |  - /members, /employees, /contracts             |
|  - Layout Context Injection        |            |  - /purchases, /withdrawals, /dividends         |
|  - 404 Fallback Delivery           |            |  - /page-data (BFF Aggregator), /member-portal  |
+------------------------------------+            +-------------------------------------------------+
                  |                                                                 |
                  +--------------------------------+--------------------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
|                                   DATA ACCESS LAYER (DAL) (/server/lib/data/*)                    |
|  - members.js, employees.js, contracts.js, purchases.js, withdrawals.js, dividends.js, users.js    |
|  - Business Rules Validation, Zero-Trust Financial Recalculations, Remainder Cent Preservation    |
+---------------------------------------------------------------------------------------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
|                                  PRISMA ORM 6.19.3 (Data Mapping Layer)                           |
|  - Singleton Client (globalThis.prisma) -> Connection pool reuse, no socket leakage               |
|  - Atomic Transactions (prisma.$transaction) -> ACID compliant financial state updates           |
+---------------------------------------------------------------------------------------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
|                                   POSTGRESQL RELATIONAL DATABASE                                  |
|  - Exact-precision Decimals (Decimal(12,2))   - Unique Constraints & Indexes                      |
|  - Append-only Financial & Audit Ledgers      - Referential Integrity via Foreign Keys            |
+---------------------------------------------------------------------------------------------------+
```

---

### 1.2 สภาพแวดล้อมและการเริ่มต้นระบบ (server.js, env.js)
- **`server/env.js`:** โหลดตัวแปรสภาพแวดล้อม (`DATABASE_URL`, `SESSION_SECRET`, `PORT`, `NODE_ENV`) ด้วย `process.loadEnvFile()` ก่อนที่โมดูลอื่นจะเริ่มทำงาน
- **`server/server.js`:** ลำดับการจัดการคำขอ:
  1. `app.disable("x-powered-by")` ป้องกัน Information Disclosure
  2. ให้บริการไฟล์คงที่ใน `/public` และ `/shared` ทันทีโดยไม่ต้องตรวจสิทธิ์
  3. `express.text({ type: () => true, limit: "50mb" })` สำหรับ `/api` เพื่อรองรับการอัปโหลดภาพถ่ายโปรไฟล์แบบ Base64 ขนาดใหญ่
  4. Middleware `accessGuard` ตรวจสิทธิ์การเข้าถึงแบบรวมศูนย์
  5. เมานต์ `/api` เข้ากับ `apiRouter` และเมานต์เส้นทางหน้าเว็บเข้ากับ `pagesRouter`
  6. ดักจับข้อผิดพลาดและกรณีไม่พบหน้า (404) ด้วย `sendNotFound` และ Global Error Handler

---

### 1.3 เลเยอร์ฐานข้อมูลและ Prisma ORM (Database Schema & Prisma Layer)
- **โมเดลหลักใน `prisma/schema.prisma`:**
  - `Member`: สมาชิกเจ้าของสวนยาง (มียอดเงินสะสม `walletBalance` และเงินปันผลสะสม `dividendBalance`)
  - `Employee`: คนกรีดยาง/ลูกจ้าง
  - `MePair`: สัญญาจับคู่ระหว่างสมาชิกและคนกรีดยาง พร้อมสัดส่วนแบ่งรายได้ (`memberShare`, `employeeShare`)
  - `Purchase`: บันทึกการรับซื้อน้ำยางพารา (น้ำหนักสด, DRC%, น้ำหนักยางแห้ง, ราคากลาง, ส่วนแบ่งคนกรีด, ส่วนแบ่งเจ้าของสวน)
  - `Withdrawal`: ประวัติการเบิกเงินสดแบบ Append-only พร้อม Snapshot `balanceBefore` และ `balanceAfter`
  - `DividendPayment`: ประวัติการจ่ายเงินปันผลประจำปี พร้อม Database Constraint `@@unique([memberId, buddhistYear])` ป้องกันการจ่ายซ้ำปีเดิม
  - `Staff`: เจ้าหน้าที่และผู้ดูแลระบบ (Role: `STAFF` หรือ `ADMIN`)
  - `ActivityLog`: ตาราง Audit Trail บันทึกทุกความเคลื่อนไหวในระบบ
  - `ReferencePrice` และ `ReferencePriceHistory`: ราคากลางยางพารารายวันพร้อมประวัติการเปลี่ยนแปลง
- **Prisma Client Singleton (`server/lib/prisma.js`):** เก็บอินสแตนซ์ไว้ใน `globalThis.prisma` ในโหมดพัฒนา เพื่อป้องกัน Connection Pool รั่วไหล (Connection Exhaustion)

---

### 1.4 ระบบความปลอดภัยและการจัดการเซสชันแบบแยกโดเมน (Security & Dual-Session Management)
- **Cryptographic Signed Cookies (HMAC-SHA256):**
  - ไม่ใช้ Session Table ในฐานข้อมูล ทำให้เซิร์ฟเวอร์เป็น Stateless และประหยัด I/O
  - คุกกี้เจ้าหน้าที่: `session` เซ็นด้วย `SESSION_SECRET`
  - คุกกี้สมาชิก: `member_session` เซ็นด้วย Derived Key พิเศษที่แปลงจาก `crypto.createHmac("sha256", secret).update("member-session-v1").digest()`
  - **Cryptographic Domain Separation:** โทเค็นของสมาชิกไม่สามารถนำมาใช้สวมรอยเป็นเจ้าหน้าที่ได้ และโทเค็นเจ้าหน้าที่ไม่สามารถนำมาใช้สวมรอยเป็นสมาชิกได้
- **การจัดเก็บรหัสผ่าน (`server/lib/auth.js`):**
  - อัลกอริทึม `crypto.scrypt` (Memory-Hard Function) ต้านทานการแฮกด้วย GPU/ASIC
  - สุ่ม Salt 16 ไบต์ใหม่ทุกครั้ง ป้องกัน Rainbow Table
  - ตรวจสอบรหัสผ่านด้วย `crypto.timingSafeEqual` ป้องกันการโจมตีแบบ Timing Attack

---

### 1.5 การควบคุมสิทธิ์ (RBAC) และ Access Guard Middleware
`server/middleware/access-guard.js` คัดกรองทุกคำขอ:
- เส้นทางสาธารณะ: `/api/auth/*`, `/api/member-auth/*` ผ่านได้ทันที
- สิทธิ์เฉพาะ ADMIN: `/users`, `/audit-log`, `/api/users/*`, `/api/audit-log/*` หากไม่ใช่ ADMIN จะส่ง 403 Forbidden
- สิทธิ์ Staff: `/purchases`, `/withdrawals`, `/dividends` หากยังไม่ล็อกอินจะส่ง 401 หรือ Redirect ไป `/login`
- สิทธิ์ Member: `/member/*`, `/api/member-portal/*` ต้องมี `member_session` ที่ถูกต้อง
- **กลไก `usingDefaultPassword`:** บล็อกการเข้าถึงหน้างานทั้งหมด บังคับให้เจ้าหน้าที่ต้องเปลี่ยนรหัสผ่านเริ่มต้นก่อนเสมอ

---

### 1.6 การจัดการคำขอ ตัวช่วย HTTP และระบบบันทึกประวัติ (Audit Trail)
- `server/lib/request-body.js`: ฟังก์ชัน `readJsonBody(req)` ดักจับ JSON Parse Error อย่างปลอดภัย ป้องกันเซิร์ฟเวอร์ค้างหรือแครช
- `server/lib/api-error.js`: คลาสจัดการ Error รวมศูนย์ กำหนด HTTP Status Code อย่างเป็นระบบ
- `server/lib/activity-log.js`: บันทึก Audit Log อัตโนมัติทุกครั้งที่มีการล็อกอิน, รับซื้อ, เบิกเงิน, จ่ายปันผล, หรือแก้ไขสัญญา

---

### 1.7 Data Access Layer และตรรกะทางธุรกิจ (Business Logic & Transactions)
- **Zero-Trust Calculation ใน `purchases.js`:** คำนวณน้ำหนักยางแห้งและยอดเงินใหม่ที่เซิร์ฟเวอร์เสมอ โดยเพิกเฉยต่อตัวเลขที่หน้าบ้านส่งมา
- **Remainder Rounding Preservation:** คำนวณส่วนของคนกรีด ปัดเศษทศนิยม 2 ตำแหน่ง แล้วนำยอดรวมลบออกเพื่อได้ส่วนของเจ้าของสวน ป้องกันเศษสตางค์รั่วไหล
- **ACID Transaction:**
  - การรับซื้อ: เพิ่มแถว `Purchase` + บวกเงินเข้า `Member.walletBalance` ในคำสั่งเดียว
  - การเบิกเงิน: สร้างประวัติ `Withdrawal` + หักเงินจาก `Member.walletBalance` ในคำสั่งเดียว
  - การจ่ายปันผล: บันทึก `DividendPayment` + บวกเงินเข้า `walletBalance` และ `dividendBalance` ในคำสั่งเดียว

---

### 1.8 สถาปัตยกรรม REST API และ BFF Pattern (Backend-For-Frontend)
- **BFF Pattern ใน `server/routes/page-data.routes.js`:**
  - รวมข้อมูลทั้งหมดที่แต่ละหน้าต้องการ (Aggregated Page Data) ส่งกลับไปใน **HTTP Roundtrip เดียว**
  - ขจัดปัญหา Waterfall Network Requests ทำให้หน้าเว็บโหลดและแสดงผลได้ทันที

---

### 1.9 การเรนเดอร์หน้าเว็บ (Server-Side Include) และโมดูลช่วยเสริม
- **ระบบ `@include` ใน `server/routes/pages.routes.js`:** นำโครงสร้าง HTML มาผูกกับส่วนประกอบย่อย (Sidebar, Header) และฉีดบริบทผู้ใช้ก่อนส่งออก
- **ExcelJS Export (`purchase-summary-workbook.js`):** สร้างรายงานสรุปยอดการรับซื้อเป็นไฟล์ Excel (.xlsx) คุณภาพสูง จัดความกว้างคอลัมน์และสูตรคำนวณอัตโนมัติ
- **In-Memory Thai Address (`server/lib/thai-address.js`):** ค้นหาตำบล อำเภอ จังหวัด และรหัสไปรษณีย์ได้เร็วกว่า 1 มิลลิวินาที

---

# ส่วนที่ 2: รวมแนวข้อสอบป้องกันโปรเจกต์เชิงลึก (Backend Defense Q&A)

### หมวดที่ 1: สถาปัตยกรรมและหลักการออกแบบระบบ [Q1 - Q5]

#### Q1: ทำไมจึงเลือกใช้สถาปัตยกรรมแบบ Layered Architecture (Routes -> DAL -> Prisma -> DB) แทนที่จะเขียนคำสั่งคิวรีฐานข้อมูลลงใน Route Controller โดยตรง?
- **เจตนาของผู้สอบ:** วัดความเข้าใจในหลักการ Separation of Concerns, Maintainability และ Testability
- **แนวทางการตอบ:**
  เพื่อปฏิบัติตามหลักการ Separation of Concerns:
  1. *Routes Layer* รับผิดชอบเฉพาะเรื่อง HTTP (พารามิเตอร์, คุกกี้, Status Code)
  2. *Data Access Layer (DAL)* กักเก็บ Business Logic ทั้งหมด (สูตรคำนวณ, สัดส่วนรายได้, ACID Transactions)
  3. *Prisma ORM* รับผิดชอบ Data Mapping และความปลอดภัยของ SQL
  การแยกเช่นนี้ทำให้ในอนาคตหากต้องการเพิ่มช่องทางอื่น เช่น CLI Tool, Background Worker หรือ GraphQL สามารถเรียกใช้ DAL ได้ทันทีโดยไม่ต้องเขียนตรรกะซ้ำซ้อน และยังเขียน Unit Test ได้ง่ายขึ้น

#### Q2: เหตุใดระบบจึงออกแบบสถาปัตยกรรมแบบไฮบริด คือมีทั้ง Server-Side Rendering (SSR) ร่วมกับ BFF Aggregated Page Data API?
- **เจตนาของผู้สอบ:** ทดสอบความรู้เรื่อง Network Latency, Initial Page Load Time และความแตกต่างระหว่าง SSR กับ Client-Side Rendering
- **แนวทางการตอบ:**
  เป็นการผสมผสานข้อดีของ MPA และ SPA:
  - SSR ช่วยให้เบราว์เซอร์ได้รับโครงสร้างหลักของหน้าเว็บ (HTML Layout, Navigation, Header) มาพร้อมใช้งานทันทีตั้งแต่ First Paint ทำให้ First Contentful Paint (FCP) รวดเร็วมาก
  - BFF Pattern (`/api/page-data/:pageName`) ช่วยรวบรวมข้อมูลทั้งหมดที่หน้านั้นต้องใช้มาใน HTTP Request เดียว ลดปัญหา Waterfall Requests (ยิงขอสมาชิก -> ขอราคากลาง -> ขอยอดขาย) ลดภาระเครือข่ายและทำให้หน้าบ้านผูกข้อมูลกับ DOM ได้ทันที

#### Q3: ใน server.js มีการใช้ express.text({ type: () => true, limit: "50mb" }) แทน express.json() ทั่วไป เพราะเหตุใด และมีความเสี่ยงหรือผลกระทบอย่างไร?
- **เจตนาของผู้สอบ:** ตรวจสอบว่าผู้พัฒนาเข้าใจพฤติกรรม Middleware และคำนึงถึง Denial of Service (DoS) หรือไม่
- **แนวทางการตอบ:**
  1. *เหตุผลที่ต้องใช้:* ในการลงทะเบียนสมาชิกและคนกรีดยาง มีการแนบรูปถ่ายใบหน้าและบัตรประชาชนในรูปแบบ Base64 Data URL ซึ่งมีขนาดใหญ่ หากใช้ `express.json({ limit: "1mb" })` ปกติจะเกิด `PayloadTooLargeError`
  2. *การบริหารความเสี่ยงและทรัพยากร:* การรับเป็น Raw Text จะยังไม่ Parse เป็น JavaScript Object ใน Global Middleware ทำให้ประหยัด Memory และ CPU จะ Parse ด้วย `readJsonBody(req)` เฉพาะใน Route ที่ต้องการใช้งานจริงเท่านั้น มีการกำหนดเพดานไว้ที่ 50MB และทุก API ถูกปกป้องด้วย `accessGuard` ป้องกันบุคคลภายนอกยิงข้อมูลขนาดใหญ่เข้ามาก่อกวน

#### Q4: ระบบใช้ Singleton Pattern ใน server/lib/prisma.js เพื่อจุดประสงค์ใด หากไม่ทำเช่นนี้จะเกิดปัญหาอะไรกับ Node.js Event Loop และ Database Connections?
- **เจตนาของผู้สอบ:** วัดความเข้าใจเชิงลึกเรื่อง Connection Pooling, Resource Leakage และ Node.js Module Lifecycle
- **แนวทางการตอบ:**
  `PrismaClient` จะสร้าง Connection Pool (ประมาณ 10-20 connections ต่อ 1 client) ไปยัง PostgreSQL ในโหมด Development มีการรีโหลดโมดูลบ่อยครั้ง หากสร้าง `new PrismaClient()` ใหม่ทุกครั้ง Connection เก่าที่ค้างอยู่จะไม่ถูกปิดทันที เกิดสภาวะ Connection Leak จนเกินค่า `max_connections` ของฐานข้อมูล ส่งผลให้ฐานข้อมูลปฏิเสธการเชื่อมต่อใหม่ (Too many connections) การเก็บอินสแตนซ์ไว้ใน `globalThis.prisma` ทำให้ทั้งโปรเซสใช้อินสแตนซ์เดิมร่วมกันเสมอ

#### Q5: การจัดการ State ของแอปพลิเคชันมีการเก็บข้อมูลไว้ในหน่วยความจำของเซิร์ฟเวอร์หรือไม่ และสถาปัตยกรรมนี้รองรับการขยายระบบแนวนอน (Horizontal Scaling) ได้อย่างไร?
- **เจตนาของผู้สอบ:** ประเมินความเข้าใจเรื่อง Stateless Architecture, Sticky Sessions และการ Scale ด้วย Load Balancer
- **แนวทางการตอบ:**
  ระบบถูกออกแบบให้เป็น Stateless Server ในส่วนของเซสชันผู้ใช้:
  - เซสชันเก็บในรูปแบบ Signed Cookie (HMAC-SHA256) ที่เบราว์เซอร์ของผู้ใช้ ไม่มีการเก็บ Session Table ในหน่วยความจำของเซิร์ฟเวอร์
  - สถานะทางธุรกิจทั้งหมดเก็บไว้ที่ฐานข้อมูลกลาง PostgreSQL
  ทำให้ระบบสามารถขยายระบบแนวนอน (Horizontal Scaling) โดยเพิ่มโหนดเซิร์ฟเวอร์ Node.js หลัง Load Balancer ได้ทันทีโดยไม่ต้องใช้ Sticky Session ขอเพียงทุกโหนดใช้ `SESSION_SECRET` เดียวกัน

---

### หมวดที่ 2: ความปลอดภัย การยืนยันตัวตน และการควบคุมสิทธิ์ [Q6 - Q10]

#### Q6: ทำไมระบบจึงเลือกใช้ Signed Cookie (HMAC-SHA256) แทนการเก็บ JWT ใน LocalStorage หรือการเก็บ Session Table ในฐานข้อมูล?
- **เจตนาของผู้สอบ:** วัดความเข้าใจเรื่อง Web Security (XSS vs CSRF) และ Performance Overhead ของ Database Lookups
- **แนวทางการตอบ:**
  1. *ไม่เก็บใน LocalStorage:* เพราะเสี่ยงต่อช่องโหว่ XSS สคริปต์อันตรายสามารถอ่าน LocalStorage ได้โดยตรง แต่ระบบใช้คุกกี้ที่มีแฟล็ก `HttpOnly` ซึ่งเบราว์เซอร์ไม่อนุญาตให้ JavaScript ใดๆ เข้าถึงได้
  2. *ไม่ใช้ Session Table ใน DB:* ช่วยลดภาระการ Query ฐานข้อมูลในทุกๆ Request ทำให้ตรวจสอบความถูกต้องของเซสชันได้รวดเร็วในระดับ CPU
  3. *การป้องกันการปลอมแปลง:* โทเค็นมีลายเซ็น HMAC-SHA256 หากมีใครพยายามแก้ไข Payload ลายเซ็นจะไม่ตรงและคำขอจะถูกปฏิเสธทันที

#### Q7: อธิบายหลักการทำงานของฟังก์ชัน Hash รหัสผ่านด้วย crypto.scrypt และทำไมจึงต้องใช้ crypto.timingSafeEqual ในการตรวจสอบรหัสผ่าน?
- **เจตนาของผู้สอบ:** ประเมินความรู้ด้าน Applied Cryptography และความเข้าใจเรื่อง Timing Attacks
- **แนวทางการตอบ:**
  1. *`crypto.scrypt`:* เป็น Memory-Hard Key Derivation Function ที่บังคับให้ต้องใช้หน่วยความจำ RAM สูงในการคำนวณ ต้านทานการ Brute-Force ด้วยการ์ดจอ (GPU) หรือชิป ASIC พร้อมสุ่ม Salt 16 ไบต์ใหม่ทุกครั้ง ป้องกัน Rainbow Table
  2. *`crypto.timingSafeEqual`:* ตัวดำเนินการ `===` ปกติจะหยุดทันทีที่พบตัวอักษรที่ไม่ตรงกัน ทำให้ผู้โจมตีสามารถวัดเวลาตอบสนองเพื่อเดาตัวอักษรทีละตัวได้ (Timing Attack) การใช้ `timingSafeEqual` บังคับให้ CPU ใช้เวลาเปรียบเทียบเท่ากันทุกไบต์เสมอ ขจัดช่องโหว่นี้โดยสมบูรณ์

#### Q8: ระบบมีมาตรการป้องกันปัญหาการข้ามสิทธิ์ดูข้อมูลของสมาชิกคนอื่น (Insecure Direct Object References - IDOR) ใน Member Portal อย่างไร?
- **เจตนาของผู้สอบ:** ตรวจสอบว่าระบบยึดหลัก Zero-Trust หรือไม่
- **แนวทางการตอบ:**
  ใน `server/routes/member-portal.routes.js` และ `server/lib/data/member-portal.js` ระบบใช้หลักการ **Server-Derived Identity**:
  - API จะไม่รับพารามิเตอร์ `memberId` จาก URL Query หรือ Request Body จาก Client เลย
  - เซิร์ฟเวอร์จะถอดรหัส `clover_member_session` ที่ผ่านการยืนยันตัวตนแล้วเพื่อนำ `session.memberId` มาใช้เป็นเงื่อนไข `where` ในการคิวรีฐานข้อมูลเสมอ ทำให้สมาชิกไม่สามารถแอบแก้พารามิเตอร์เพื่อดูข้อมูลของสมาชิกคนอื่นได้

#### Q9: กลไก usingDefaultPassword ทำงานอย่างไร และเหตุใดจึงถือเป็นข้อกำหนดความปลอดภัยที่สำคัญสำหรับระบบสารสนเทศของสหกรณ์?
- **เจตนาของผู้สอบ:** วัดความเข้าใจเรื่อง Security Governance, Password Lifecycle และ Non-Repudiation
- **แนวทางการตอบ:**
  เมื่อสร้างบัญชีเจ้าหน้าที่ใหม่ ระบบจะตั้งค่า `usingDefaultPassword: true` เมื่อเข้าสู่ระบบ `accessGuard` จะบล็อกการเข้าถึงหน้าเว็บและ API ทั้งหมด ยกเว้นหน้าจอและ Endpoint เปลี่ยนรหัสผ่าน เมื่อเจ้าหน้าที่เปลี่ยนรหัสผ่านส่วนตัวสำเร็จ แฟล็กนี้จะกลายเป็น `false` จึงจะเข้าใช้งานระบบได้ เป็นการป้องกันไม่ให้ผู้อื่นสวมรอยใช้รหัสผ่านเริ่มต้น และสร้างหลักประกันความรับผิดชอบส่วนบุคคล (Non-Repudiation) ใน Audit Log

#### Q10: ระบบมีมาตรการป้องกันการโจมตีทางเว็บที่พบบ่อย (SQL Injection, CSRF, XSS, Directory Traversal) อย่างไรบ้าง?
- **เจตนาของผู้สอบ:** ตรวจสอบการปฏิบัติตามมาตรฐาน OWASP Top 10
- **แนวทางการตอบ:**
  - *SQL Injection:* ป้องกันด้วย Prisma ORM ซึ่งแปลงคำสั่งเป็น Parameterized Queries / Prepared Statements ทั้งหมด
  - *XSS:* ใช้คุกกี้แฟล็ก `HttpOnly` ป้องกันการขโมยเซสชัน และ Escape ข้อมูล HTML ในการแสดงผล
  - *CSRF:* ใช้คุกกี้แฟล็ก `SameSite=Lax` ป้องกันการส่งคุกกี้ข้ามเว็บไซต์ที่ไม่พึงประสงค์
  - *Directory Traversal:* ใช้ `path.resolve` และ `path.join` ร่วมกับการปิด Directory Browsing ใน Express

---

### หมวดที่ 3: ความถูกต้องทางข้อมูล ธุรกรรมการเงิน และความพร้อมกัน [Q11 - Q15]

#### Q11: ในการบันทึกการรับซื้อน้ำยาง (Purchase) และการเบิกเงิน (Withdrawal) ระบบรับประกันคุณสมบัติ ACID และป้องกันข้อมูลคลาดเคลื่อนได้อย่างไร?
- **เจตนาของผู้สอบ:** ตรวจสอบความเข้าใจเรื่อง Transaction Management และคุณสมบัติ ACID
- **แนวทางการตอบ:**
  ระบบใช้ `prisma.$transaction` ในการผูกคำสั่งเข้าด้วยกัน:
  - *Atomicity:* การสร้างรายการซื้อ/เบิก และการอัปเดตยอดเงินสะสมในตาราง Member จะต้องสำเร็จทั้งคู่ หากมีข้อผิดพลาดจะเกิดการ Rollback ทั้งหมด ยอดเงินจะไม่คลาดเคลื่อน
  - *Consistency:* ใช้ชนิดข้อมูล `Decimal(12,2)` สำหรับตัวเลขการเงินทั้งหมด
  - *Isolation:* PostgreSQL จัดการผ่าน MVCC ป้องกันไม่ให้คำขออื่นมองเห็นข้อมูลระหว่างประมวลผล
  - *Durability:* ข้อมูลถูกบันทึกลง Write-Ahead Log (WAL) ของฐานข้อมูล ไม่สูญหายแม้ไฟดับ

#### Q12: สมมติว่ามีเจ้าหน้าที่ 2 คนกดอนุมัติการเบิกเงินของสมาชิกคนเดียวกันในเวลาเดียวกัน (Race Condition / Double Spending) ระบบป้องกันปัญหานี้อย่างไร?
- **เจตนาของผู้สอบ:** วัดความเข้าใจเรื่อง Concurrency Issues, Row-Level Locking และ Atomic Operations
- **แนวทางการตอบ:**
  ใน `server/lib/data/withdrawals.js` คำสั่งอัปเดตยอดเงินใช้:
  `data: { walletBalance: { decrement: input.amount } }`
  ซึ่งแปลงเป็นคำสั่ง SQL: `UPDATE "Member" SET "walletBalance" = "walletBalance" - $1 WHERE "id" = $2;`
  ใน PostgreSQL คำสั่ง UPDATE จะล็อกแถวนั้นแบบ Row-Level Lock โดยอัตโนมัติ ทำให้คำขอที่สองต้องรอจนกว่าคำขอแรกจะเสร็จสิ้น และเมื่อผูกกับเงื่อนไขยอดเงินคงเหลือ คำขอที่สองจะถูกปฏิเสธทันทีหากยอดเงินคงเหลือไม่เพียงพอ

#### Q13: ตรรกะการคำนวณเงินและน้ำหนักในระบบรับซื้อน้ำยางและเงินปันผล ยึดหลัก Zero-Trust อย่างไร ทำไมเซิร์ฟเวอร์จึงไม่เชื่อตัวเลขที่ Client ส่งมา?
- **เจตนาของผู้สอบ:** ประเมินหลักการออกแบบ API ที่ปลอดภัย (Never Trust Client Input)
- **แนวทางการตอบ:**
  Client เป็นสภาพแวดล้อมที่ควบคุมไม่ได้และสามารถถูกดัดแปลงได้ผ่าน DevTools หรือสคริปต์:
  - ในการรับซื้อ เซิร์ฟเวอร์จะรับเฉพาะ `rawWeightKg` และ `dryPercentage` แล้วดึงราคากลางมาคำนวณ `dryWeightKg`, `totalAmount`, `employeePayout`, `ownerPayout` ใหม่ทั้งหมดบนเซิร์ฟเวอร์
  - ในการจ่ายปันผล เซิร์ฟเวอร์จะรับเฉพาะ `buddhistYear` และ `rate` แล้วคิวรียอดขายจริงทั้งหมดในปีนั้นมาคำนวณใหม่ ป้องกันการแก้ไขยอดเงินใน Payload ส่งเข้าสู่ระบบ

#### Q14: ทำไมในตาราง Withdrawal และ DividendPayment ถึงต้องมีการบันทึกฟิลด์ Snapshot เช่น balanceBefore และ balanceAfter ทั้งๆ ที่สามารถคำนวณย้อนหลังได้?
- **เจตนาของผู้สอบ:** วัดความเข้าใจเรื่อง Audit Trail, Performance และ Point-in-time Reconstruction
- **แนวทางการตอบ:**
  1. *Audit Trail & Non-Repudiation:* เพื่อเป็นหลักฐานถาวรที่ไม่สามารถเปลี่ยนแปลงได้ สามารถตรวจพิสูจน์สมการ `balanceAfter = balanceBefore - amount` ได้ทันทีในแต่ละรายการเมื่อมีข้อพิพาททางการเงิน
  2. *Query Performance:* ช่วยให้อ่านยอดเงินย้อนหลังมาแสดงใน Statement หรือใบเสร็จได้ในความซับซ้อน $O(1)$ โดยไม่ต้องนำรายการซื้อและเบิกหลายหมื่นรายการตั้งแต่ตั้งสหกรณ์มาคำนวณ Running Total ใหม่ทุกครั้ง

#### Q15: การคำนวณและการบันทึกประวัติการจ่ายเงินปันผลประจำปี (DividendPayment) มีการป้องกันการจ่ายซ้ำในปีเดิมซ้ำซ้อนระดับ Database Constraint อย่างไร?
- **เจตนาของผู้สอบ:** ตรวจสอบว่าผู้ออกแบบใช้ Database Constraint หรือพึ่งพาแค่ Application if/else
- **แนวทางการตอบ:**
  มีการป้องกัน 2 ชั้น:
  1. ชั้น Application ตรวจสอบประวัติก่อนคำนวณ
  2. ชั้น Database กำหนดเงื่อนไข `@@unique([memberId, buddhistYear])` ในโมเดล `DividendPayment`
  หากมีเจ้าหน้าที่ 2 คนกดจ่ายปันผลในปีเดียวกันพร้อมกันจนผ่านชั้น Application มาได้ทั้งคู่ ฐานข้อมูล PostgreSQL จะ Reject คำขอที่สองทันทีด้วยข้อผิดพลาด Unique Constraint Violation (Prisma P2002) จึงไม่มีทางจ่ายเงินปันผลซ้ำสองรอบได้

---

### หมวดที่ 4: การทำงานกับฐานข้อมูลและ Prisma ORM [Q16 - Q20]

#### Q16: อธิบายความสัมพันธ์ระหว่าง Member, Employee และ MePair ใน Prisma Schema ทำไมจึงต้องมีโมเดล MePair คั่นกลาง?
- **เจตนาของผู้สอบ:** ทดสอบความรู้เรื่อง Many-to-Many Relationship และ Junction Table Attributes
- **แนวทางการตอบ:**
  ความสัมพันธ์ระหว่างสมาชิกและคนกรีดยางเป็นแบบ Many-to-Many (สมาชิก 1 คนอาจมีคนกรีดหลายคน และคนกรีด 1 คนอาจกรีดให้สมาชิกหลายคน) โมเดล `MePair` ทำหน้าที่เป็น Junction Table ที่เก็บข้อมูลสำคัญของสัญญาจ้าง ได้แก่ สัดส่วนแบ่งรายได้ (`memberShare`, `employeeShare`), วันที่เริ่มและสิ้นสุดสัญญา, และไฟล์เอกสารแนบสัญญา ซึ่งเป็นข้อมูลเฉพาะของคู่สัญญานั้นๆ

#### Q17: ในการคิวรีข้อมูลที่มีความสัมพันธ์หลายชั้นใน Prisma ORM มีการป้องกันปัญหา N+1 Query Problem อย่างไร?
- **เจตนาของผู้สอบ:** ประเมินทักษะการเพิ่มประสิทธิภาพคิวรี (Query Optimization)
- **แนวทางการตอบ:**
  1. ใช้ `include` หรือ `select` ของ Prisma ซึ่งจะรวมคำสั่งหรือใช้ `IN (...)` เพื่อดึงข้อมูลความสัมพันธ์ทั้งหมดในคราวเดียว แทนการเขียนลูปวนคิวรี
  2. ใช้ `Promise.all` ในการรันคิวรีที่ไม่เกี่ยวข้องกันแบบขนาน (Parallel Execution) เช่น ใน `getDividendData()` ช่วยลดเวลารวมให้เท่ากับคิวรีตัวที่ช้าที่สุดเพียงตัวเดียว

#### Q18: มีการออกแบบ Database Index อย่างไรใน schema.prisma เพื่อรองรับการค้นหาและสรุปยอดที่มีข้อมูลปริมาณมาก?
- **เจตนาของผู้สอบ:** ตรวจสอบความเข้าใจเรื่อง Indexing Strategies และ B-Tree Indexes
- **แนวทางการตอบ:**
  - Foreign Key Index: `@@index([memberId])` ใน Purchase, Withdrawal, DividendPayment, MePair ช่วยให้ค้นหาข้อมูลรายคนได้เร็วในระดับ $O(\log N)$
  - Date & Time Index: `@@index([recordDate])` ใน Purchase และ `@@index([actionTime])` ใน ActivityLog ช่วยให้การกรองข้อมูลตามช่วงเวลาและสรุปยอดรายวัน/เดือนใช้ Index Scan ได้ทันที
  - Composite Index: `@@index([targetType, targetId])` ใน ActivityLog เพื่อค้นหาประวัติของเอนทิตีเฉพาะตัวได้อย่างรวดเร็ว

#### Q19: หากในอนาคตฐานข้อมูลมีรายการรับซื้อ (Purchase) หลายล้านแถว Backend มีกลยุทธ์การทำ Pagination หรือ Data Aggregation อย่างไร?
- **เจตนาของผู้สอบ:** ประเมินวิสัยทัศน์ด้าน Scalability และ Big Data Handling
- **แนวทางการตอบ:**
  1. ใช้ Keyset Pagination (Cursor Pagination) ด้วย `cursor: { id: lastId }, take: 50` แทน Offset Pagination (`skip, take`) ซึ่งจะทำให้ความเร็วในการเปิดหน้าถัดไปคงที่เท่ากันทุกหน้า
  2. ใช้ Database Aggregation Functions ผ่าน `prisma.purchase.aggregate()` เพื่อให้ PostgreSQL คำนวณผลรวมในระดับ Engine โดยไม่ต้องดึงข้อมูลออกมาในหน่วยความจำ Node.js
  3. ทำ Table Partitioning ในระดับ PostgreSQL โดยแบ่งตาราง Purchase ตามช่วงปีของ `recordDate`

#### Q20: การลบข้อมูล (Delete) ในระบบนี้ใช้แบบ Soft Delete หรือ Hard Delete และมีผลกระทบต่อ Referential Integrity อย่างไร?
- **เจตนาของผู้สอบ:** ตรวจสอบความเข้าใจเรื่อง Data Retention และ Referential Integrity
- **แนวทางการตอบ:**
  ใช้ **Soft Delete / Status Deactivation** โดยเปลี่ยนฟิลด์ `status` เป็น `Inactive` หากใช้ Hard Delete ข้อมูลในตาราง Purchase, Withdrawal และ DividendPayment ที่อ้างอิง Foreign Key `memberId` จะเกิดปัญหาข้อมูลกำพร้า (Orphaned Records) ทำให้ยอดบัญชีและการตรวจสอบย้อนหลังของสหกรณ์เสียหาย การใช้ Soft Delete ช่วยรักษา Referential Integrity และประวัติการเงินในอดีตไว้อย่างสมบูรณ์

---

### หมวดที่ 5: ประสิทธิภาพ ความเสถียร และการบำรุงรักษาในระยะยาว [Q21 - Q25]

#### Q21: ระบบจัดการ Error Handling อย่างไรเพื่อไม่ให้ Node.js Process เกิด Unhandled Promise Rejection จนเซิร์ฟเวอร์ Crash?
- **เจตนาของผู้สอบ:** วัดความเข้าใจในระบบ Async Lifecycle และ High Availability
- **แนวทางการตอบ:**
  1. ใช้ Custom Error Classes แยกแยะระหว่าง Operational Errors กับ System Bugs
  2. ใช้ **Express 5.2.1** ซึ่งรองรับ Native Async Error Handling โดยจะส่ง Error จาก Promise ที่ Rejected ไปยัง Error Middleware ตัวสุดท้ายโดยอัตโนมัติโดยไม่ต้องเขียน try/catch ทุกจุด
  3. มี Global Error Middleware ใน `server/server.js` ดักจับข้อผิดพลาดและส่ง HTTP Status ที่เหมาะสมกลับไป ทำให้โปรเซสของเซิร์ฟเวอร์ทำงานต่อไปได้อย่างเสถียร

#### Q22: กลไก Activity Log มีการบันทึกข้อมูลอะไรบ้าง และหากการบันทึก Log ล้มเหลว จะส่งผลให้ Business Transaction หลักล้มเหลวไปด้วยหรือไม่?
- **เจตนาของผู้สอบ:** ตรวจสอบความเข้าใจเรื่อง Audit Logging Policy และ Decoupling
- **แนวทางการตอบ:**
  บันทึก `staffId`, `action`, `targetType`, `targetId`, `status`, `description` และ `actionTime` การบันทึก Log ถูกออกแบบให้ทำงานแบบแยกส่วน (Isolated Execution) ในบล็อก try/catch หากการบันทึก Log ล้มเหลว ระบบจะพ่นข้อความเตือนออกทาง Console แต่จะไม่ส่งผลให้หรือ Rollback ธุรกรรมทางธุรกิจหลักที่สำเร็จไปแล้ว เพื่อให้การดำเนินงานของสหกรณ์ไม่หยุดชะงัก

#### Q23: การส่งออกไฟล์สรุปยอดซื้อขายเป็น Excel ด้วย ExcelJS มีการจัดการเรื่อง Memory Usage อย่างไร เมื่อต้องจัดการข้อมูลขนาดใหญ่?
- **เจตนาของผู้สอบ:** ประเมินทักษะการจัดการ Memory และ Stream Processing
- **แนวทางการตอบ:**
  1. ใช้ Selective Projection ด้วย Prisma `select` ดึงเฉพาะฟิลด์ที่จำเป็นต่อรายงาน ตัดฟิลด์รูปถ่ายและข้อมูลที่ไม่เกี่ยวข้องออก ลดขนาด Memory Heap ลงกว่า 70%
  2. รวบรวมข้อมูลและส่งออกเป็นไบนารี Buffer ผ่าน HTTP Stream ทันที
  3. หากข้อมูลมีขนาดใหญ่ระดับแสนแถวขึ้นไป สามารถเปลี่ยนไปใช้ `ExcelJS.stream.xlsx.WorkbookWriter` ซึ่งจะสตรีมข้อมูลทีละแถวลงเน็ตเวิร์กโดยไม่ต้องเก็บทั้งสเปรดชีตไว้ใน RAM

#### Q24: ระบบจัดการเรื่อง Timezone และวันที่ระหว่าง UTC ใน PostgreSQL กับ วันที่ปี พ.ศ. (Thai Buddhist Era) อย่างไรเพื่อไม่ให้เกิดข้อผิดพลาดในการตัดรอบบัญชี?
- **เจตนาของผู้สอบ:** ตรวจสอบความเข้าใจเรื่อง Timezone Pitfalls และการจัดการปฏิทินท้องถิ่น
- **แนวทางการตอบ:**
  1. จัดเก็บวันที่ทั้งหมดใน PostgreSQL เป็นเวลามาตรฐานสากล **UTC** เสมอ
  2. ในการคำนวณปี พ.ศ. ใช้ฟังก์ชัน `date.getUTCFullYear() + 543` อิงตามปีสากลของวันที่บันทึกจริง ทำให้การตัดรอบปีปันผลมีความแน่นอน (Deterministic) ไม่ขึ้นกับ Timezone ของเครื่องเซิร์ฟเวอร์
  3. การแปลงวันที่และเวลาเป็นภาษาไทยจะเกิดขึ้นเฉพาะใน Presentation Layer ผ่าน `Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok" })`

#### Q25: หากต้องการนำระบบ Backend นี้ขึ้น Production ในสภาพแวดล้อมจริง ต้องมีขั้นตอนและแนวทางการปรับปรุงความปลอดภัย (Production Hardening) อะไรเพิ่มเติมบ้าง?
- **เจตนาของผู้สอบ:** ประเมินความพร้อมสู่การใช้งานจริง (Production Readiness & Infrastructure Security)
- **แนวทางการตอบ:**
  1. *Containerization:* สร้าง Dockerfile แบบ Multi-stage รันด้วยผู้ใช้ธรรมดาที่ไม่ใช่ Root (`USER node`)
  2. *HTTPS & Security Flags:* ติดตั้ง SSL Certificate และเปิดใช้งานคุกกี้แฟล็ก `Secure: true` ในโหมด Production
  3. *Security Headers & Rate Limiting:* ติดตั้ง `helmet` ป้องกัน HTTP Header Vulnerabilities และติดตั้ง `express-rate-limit` ป้องกัน Brute-force Login
  4. *Process Management:* ใช้ PM2 หรือ Kubernetes ร่วมกับ Health Check Endpoint (`/healthz`) เพื่อทำ Auto-restart และ Zero-Downtime Deployment
  5. *Database Backup:* ตั้งค่า Automated Daily Backup และ Point-in-Time Recovery (PITR) ของ PostgreSQL บนคลาวด์
