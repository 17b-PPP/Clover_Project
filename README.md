# Field Latex Project — เวอร์ชัน HTML / CSS / JavaScript

ระบบการจัดการรับซื้อน้ำยางพารา (สหกรณ์กองทุนสวนยางบ้านบางบอน) ที่แปลงมาจากโปรเจค
Next.js เดิม (ยังดูได้ในประวัติ git) ให้เป็น **HTML, CSS และ JavaScript แยกไฟล์กันชัดเจน**
โดยการทำงานและหน้าตาเหมือนเดิมทุกอย่าง และใช้ฐานข้อมูลเดียวกัน

| ส่วน | ภาษา / เครื่องมือ |
| --- | --- |
| หน้าเว็บ | HTML (`pages/`) |
| ตกแต่งหน้าเว็บ | CSS ธรรมดา (`public/css/`) — ไม่ใช้ Tailwind |
| การทำงานบนหน้าเว็บ | JavaScript ธรรมดา (`public/js/`) — ไม่ใช้ React ยกเว้นกราฟ |
| กราฟ 3 ตัว | React + recharts เวอร์ชันเดิม (รวมเป็นไฟล์ `public/vendor/react-recharts.js`) |
| เซิร์ฟเวอร์ + API | JavaScript บน Node.js + Express (`server/`) |
| ฐานข้อมูล | PostgreSQL ผ่าน Prisma (ไฟล์ `prisma/schema.prisma` ชุดเดิม) |

---

## วิธีติดตั้งและรัน

ต้องมี Node.js เวอร์ชัน 20.6 ขึ้นไป (ทดสอบกับ Node.js 24)

```bash
npm install        # ติดตั้งแพ็กเกจ + สร้าง Prisma client + สร้างไฟล์ React/recharts ให้อัตโนมัติ
npm run dev        # โหมดพัฒนา (แก้โค้ดฝั่งเซิร์ฟเวอร์แล้วรีสตาร์ตเอง)
# หรือ
npm start          # โหมด production
```

เปิดเว็บที่ <http://localhost:3000>
(เปลี่ยนพอร์ตได้ด้วยตัวแปร `PORT`)

- ไฟล์ `.env` (DATABASE_URL, DIRECT_URL, SESSION_SECRET) ไม่ถูกเก็บเข้า git
  ถ้าย้ายโปรเจคไปเครื่องอื่นต้องคัดลอกไฟล์นี้ไปด้วย
- เปิดจากมือถือ/แท็บเล็ตในวง LAN ได้ทันที — ดูที่อยู่ในบรรทัด `Network:` ตอนเซิร์ฟเวอร์เริ่มทำงาน
- ถ้าลบโฟลเดอร์ `public/vendor/` ไป สร้างใหม่ได้ด้วย `npm run build:vendor`

---

## โครงสร้างโฟลเดอร์

```
Clover Project_2/
├── pages/                    ← หน้าเว็บ HTML (หนึ่งไฟล์ต่อหนึ่งหน้า)
│   └── partials/             ← ชิ้นส่วน HTML ที่ใช้ซ้ำหลายหน้า (เมนูซ้าย, ใบเสร็จ, ตัวแบ่งหน้า ...)
├── public/                   ← ไฟล์ที่เบราว์เซอร์โหลดได้โดยตรง
│   ├── css/                  ← สไตล์ (base, components, layout, receipt, member, pages/*)
│   ├── js/
│   │   ├── core/             ← ตัวช่วยพื้นฐาน (จัดการ DOM, โหลดข้อมูล, ย่อรูป ...)
│   │   ├── components/       ← ส่วนประกอบที่ใช้ซ้ำ (หน้าต่าง, ช่องค้นหา, เมนูซ้าย, กระดิ่ง ...)
│   │   ├── charts/           ← กราฟ (React + recharts)
│   │   └── pages/            ← การทำงานของแต่ละหน้า (ชื่อตรงกับไฟล์ใน pages/)
│   ├── fonts/                ← ฟอนต์ Noto Sans Thai (ไฟล์ชุดเดียวกับที่ Next.js ใช้)
│   └── vendor/               ← React + recharts ที่รวมแล้ว (สร้างอัตโนมัติ)
├── shared/format.js          ← ฟังก์ชันจัดรูปแบบวันที่/ตัวเลข ใช้ทั้งเซิร์ฟเวอร์และหน้าเว็บ
├── server/
│   ├── server.js             ← จุดเริ่มต้นของเซิร์ฟเวอร์
│   ├── middleware/           ← ตรวจสิทธิ์การเข้าถึง (แทน proxy.ts)
│   ├── routes/               ← API ทุกเส้น + การส่งหน้า HTML
│   └── lib/                  ← session, รหัสผ่าน, ตรวจข้อมูล, ฐานข้อมูล (data/), สร้าง Excel (export/)
├── docs/, report/, schema.md ← เอกสารประกอบโปรเจค
├── prisma/schema.prisma      ← โครงสร้างฐานข้อมูล (ชุดเดิม)
├── scripts/build-vendor.js   ← สร้างไฟล์ public/vendor/react-recharts.js
└── vendor-src/               ← ไฟล์ต้นทางของ react-recharts.js
```

ทุกไฟล์ HTML / CSS / JavaScript มีคอมเมนต์ภาษาไทยอธิบายการทำงานไว้ที่หัวไฟล์และในแต่ละส่วน

---

## หน้าเว็บแต่ละหน้า

| URL | HTML | JavaScript | ไฟล์เดิมใน Next.js |
| --- | --- | --- | --- |
| `/login` | `pages/login.html` | `public/js/pages/login.js` | `app/login/page.tsx` |
| `/members` | `pages/members.html` | `public/js/pages/members.js` | `app/(app)/members/*` |
| `/employees` | `pages/employees.html` | `public/js/pages/employees.js` | `app/(app)/employees/*` |
| `/contracts` | `pages/contracts.html` | `public/js/pages/contracts.js` | `app/(app)/contracts/*` |
| `/purchases` | `pages/purchases.html` | `public/js/pages/purchases.js` | `app/(app)/purchases/*` |
| `/withdrawals` | `pages/withdrawals.html` | `public/js/pages/withdrawals.js` | `app/(app)/withdrawals/*` |
| `/reference-price` | `pages/reference-price.html` | `public/js/pages/reference-price.js` | `app/(app)/reference-price/*` |
| `/dividends` | `pages/dividends.html` | `public/js/pages/dividends.js` | `app/(app)/dividends/*` |
| `/performance/purchase-summary` | `pages/purchase-summary.html` | `public/js/pages/purchase-summary.js` | `app/(app)/performance/purchase-summary/*` |
| `/users` (ผู้ดูแลระบบ) | `pages/users.html` | `public/js/pages/users.js` | `app/(app)/users/*` |
| `/audit-log` (ผู้ดูแลระบบ) | `pages/audit-log.html` | `public/js/pages/audit-log.js` | `app/(app)/audit-log/*` |
| `/member/login` | `pages/member-login.html` | `public/js/pages/member-login.js` | `app/(member)/member/login/page.tsx` |
| `/member/dashboard` | `pages/member-dashboard.html` | `public/js/pages/member-dashboard.js` | `app/(member)/member/(portal)/dashboard/*` |
| `/member/finance` | `pages/member-finance.html` | `public/js/pages/member-finance.js` | `app/(member)/member/(portal)/finance/*` |
| `/member/sales` | `pages/member-sales.html` | `public/js/pages/member-sales.js` | `app/(member)/member/(portal)/sales/*` |

---

## สิ่งที่เปลี่ยน "วิธีทำ" (ผลลัพธ์ที่ผู้ใช้เห็นเหมือนเดิม)

1. **การดึงข้อมูลของหน้า** — เดิม `page.tsx` ดึงข้อมูลบนเซิร์ฟเวอร์ตอนสร้างหน้า
   เวอร์ชันนี้หน้า HTML จะเรียก API แทน:
   - ฝั่งพนักงาน: `GET /api/page-data/<ชื่อหน้า>` (`server/routes/page-data.routes.js`)
   - ฝั่งสมาชิก: `GET /api/member-portal/<dashboard|finance|sales>` (`server/routes/member-portal.routes.js`)
   ระหว่างรอข้อมูลจะแสดงไอคอนโหลดในหน้าเดียวกับที่เดิมมี `loading.tsx`
2. **เมนูด้านซ้าย** — เซิร์ฟเวอร์ฝังข้อมูลผู้ใช้ลงในหน้า HTML ตอนส่งหน้า (แทน `layout.tsx`)
   เมนูจึงแสดงครบทันที
3. **ชิ้นส่วน HTML ที่ใช้ซ้ำ** — เขียนครั้งเดียวใน `pages/partials/` แล้วเซิร์ฟเวอร์นำไปใส่ในหน้า
   ตามคำสั่ง `<!-- @include partials/ชื่อไฟล์.html -->`
4. **API เดิมทุกเส้น** (`/api/members`, `/api/purchases`, ...) ใช้ชื่อ พารามิเตอร์ ข้อความตอบกลับ
   และสถานะเหมือนเดิมทุกตัว
