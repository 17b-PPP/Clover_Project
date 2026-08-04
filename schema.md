generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ==========================================
// ENUMS
// ==========================================

enum UserRole {
  MEMBER
  STAFF
  ADMIN
}

enum MemberStatus {
  Active
  Inactive
}

enum EmployeeStatus {
  Active
  Inactive
}

enum StaffStatus {
  Active
  Inactive
}

enum PairStatus {
  Active
  Inactive
}

enum ActionType {
  LOGIN
  LOGIN_FAILED
  LOGOUT
  CREATE_MEMBER
  UPDATE_MEMBER
  SUSPEND_MEMBER
  CREATE_EMPLOYEE
  UPDATE_EMPLOYEE
  SUSPEND_EMPLOYEE
  CREATE_STAFF
  UPDATE_STAFF
  SUSPEND_STAFF
  CREATE_CONTRACT
  UPDATE_CONTRACT
  CANCEL_CONTRACT
  CREATE_PURCHASE
  UPDATE_PURCHASE
}

enum ActionStatus {
  SUCCESS
  FAILED
}

enum TargetType {
  MEMBER
  EMPLOYEE
  STAFF
  CONTRACT
  PURCHASE
  USER
}

// ==========================================
// USER (Login Account) — เฉพาะ Member และ Staff เท่านั้น
// ==========================================

model User {
  userId              Int       @id @default(autoincrement()) @map("user_id")
  role                UserRole
  idCard              String    @unique @db.VarChar(13) @map("id_card")
  password            String
  mustChangePassword  Boolean   @default(true) @map("must_change_password")
  failedLoginAttempts Int       @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime? @map("locked_until")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  member       Member?
  staff        Staff?
  activityLogs ActivityLog[]

  @@map("users")
}

// ==========================================
// MEMBER (สมาชิกเจ้าของสวนยาง) — มี User login
// ==========================================

model Member {
  id              String       @id @default(cuid())
  memberCode      String       @unique @map("member_code")
  firstName       String       @map("first_name")
  lastName        String       @map("last_name")
  idCardNumber    String       @unique @map("id_card_number") @db.VarChar(13)
  dateOfBirth     DateTime     @map("date_of_birth")
  phone           String       @db.VarChar(15)
  address         String
  postalCode      String       @map("postal_code")
  photoUrl        String?      @map("photo_url")
  gardenName      String?      @map("garden_name")
  walletBalance   Decimal      @default(0) @db.Decimal(12, 2) @map("wallet_balance")
  dividendBalance Decimal      @default(0) @db.Decimal(12, 2) @map("dividend_balance")
  status          MemberStatus @default(Active)
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  userId Int?  @unique @map("user_id")
  user   User? @relation(fields: [userId], references: [userId])

  mePairs MePair[]

  @@map("members")
}

// ==========================================
// EMPLOYEE (ลูกจ้างรับซื้อยางหน้างาน) — ไม่มี User login
// ==========================================

model Employee {
  id           String         @id @default(cuid())
  employeeCode String         @unique @map("employee_code")
  firstName    String         @map("first_name")
  lastName     String         @map("last_name")
  idCardNumber String         @unique @map("id_card_number") @db.VarChar(13)
  dateOfBirth  DateTime       @map("date_of_birth")
  phone        String         @db.VarChar(15)
  address      String
  postalCode   String         @map("postal_code")
  photoUrl     String?        @map("photo_url")
  status       EmployeeStatus @default(Active)
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  // ไม่มี userId/user — Employee ไม่ login เข้าระบบ

  mePairs MePair[]

  @@map("employees")
}

// ==========================================
// STAFF (พนักงานออฟฟิศ/แอดมิน) — มี User login
// ==========================================

model Staff {
  id           String      @id @default(cuid())
  staffCode    String      @unique @map("staff_code") // เช่น "STF001"
  firstName    String      @map("first_name")
  lastName     String      @map("last_name")
  idCardNumber String      @unique @map("id_card_number") @db.VarChar(13)
  dateOfBirth  DateTime    @map("date_of_birth")
  phone        String      @db.VarChar(15)
  email        String?     @db.VarChar(255)
  address      String?
  postalCode   String?     @map("postal_code")
  status       StaffStatus @default(Active)
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  userId Int?  @unique @map("user_id")
  user   User? @relation(fields: [userId], references: [userId])

  @@map("staff")
}

// ==========================================
// ME_PAIR (สัญญาจับคู่ Member ↔ Employee + สัดส่วนรายได้)
// ==========================================

model MePair {
  id                String     @id @default(cuid())
  memberId          String     @map("member_id")
  employeeId        String     @map("employee_id")
  memberShare       Decimal    @db.Decimal(5, 2) @map("member_share")
  employeeShare     Decimal    @db.Decimal(5, 2) @map("employee_share")
  contractStartDate DateTime   @default(now()) @map("contract_start_date")
  contractEndDate   DateTime?  @map("contract_end_date")
  status            PairStatus @default(Active)
  contractFileUrl   String?    @map("contract_file_url")
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  member   Member   @relation(fields: [memberId], references: [id])
  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([memberId])
  @@index([employeeId])
  @@map("me_pairs")
}

// ==========================================
// ACTIVITY LOG (เฉพาะ Staff/Admin เท่านั้น — บังคับที่ app layer)
// ==========================================

model ActivityLog {
  logId       BigInt       @id @default(autoincrement()) @map("log_id")
  userId      Int          @map("user_id")
  action      ActionType
  targetType  TargetType?  @map("target_type")
  targetId    String?      @map("target_id")
  status      ActionStatus @default(SUCCESS)
  description String?
  ipAddress   String?      @map("ip_address")
  actionTime  DateTime     @default(now()) @map("action_time")

  user User @relation(fields: [userId], references: [userId])

  @@index([userId])
  @@index([actionTime])
  @@index([targetType, targetId])
  @@map("activity_log")
}