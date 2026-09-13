export type MemberStatus = "Active" | "Inactive";

export interface Member {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  idCardNumber: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  postalCode: string;
  photoUrl: string | null;
  gardenName: string | null;
  walletBalance: number;
  dividendBalance: number;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MemberInput {
  firstName: string;
  lastName: string;
  idCardNumber: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  postalCode: string;
  photoUrl: string | null;
  gardenName: string | null;
}

export type EmployeeStatus = "Active" | "Inactive";

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  idCardNumber: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  postalCode: string;
  photoUrl: string | null;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  idCardNumber: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  postalCode: string;
  photoUrl: string | null;
}

export interface MemberOption {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  status: MemberStatus;
}

export interface EmployeeOption {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  status: EmployeeStatus;
}

export type ContractStatus = "Active" | "Inactive";

export interface ContractPartySummary {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  status: MemberStatus | EmployeeStatus;
}

export interface Contract {
  id: string;
  pairCode: string;
  memberShare: number;
  employeeShare: number;
  contractStartDate: string;
  contractEndDate: string | null;
  status: ContractStatus;
  contractFileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  member: ContractPartySummary;
  employee: ContractPartySummary;
}

export interface ContractInput {
  memberId: string;
  employeeId: string;
  memberShare: number;
  employeeShare: number;
}

export type UserRole = "STAFF" | "ADMIN";

export type UserStatus = "Active" | "Inactive";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  username: string;
  dateOfBirth: string;
  role: UserRole;
  password?: string;
}

export type SellerType = "MEMBER" | "EMPLOYEE";

export interface SellerOwnerOption {
  memberId: string;
  ownerName: string;
  memberShare: number;
  employeeShare: number;
}

// One pickable seller for the purchase form's member/employee combobox.
export interface SellerOption {
  code: string;
  name: string;
  kind: "member" | "employee";
}

export interface SellerLookup {
  sellerCode: string;
  sellerType: SellerType;
  memberId: string;
  employeeId: string | null;
  ownerName: string;
  deliveredByName: string;
  memberShare: number;
  employeeShare: number;
  ownerOptions: SellerOwnerOption[];
}

export interface Purchase {
  id: string;
  purchaseCode: string;
  recordDate: string;
  marketPrice: number;
  sellerCode: string;
  sellerType: SellerType;
  ownerName: string;
  deliveredByName: string;
  rawWeightKg: number;
  dryPercentage: number;
  dryWeightKg: number;
  totalAmount: number;
  employeePayout: number;
  ownerPayout: number;
  createdAt: string;
  memberId: string;
  employeeId: string | null;
}

export interface PurchaseInput {
  recordDate: string;
  marketPrice: number;
  sellerCode: string;
  rawWeightKg: number;
  dryPercentage: number;
  memberId?: string;
}

export interface MemberLookup {
  memberId: string;
  memberCode: string;
  fullName: string;
  walletBalance: number;
}

export interface Withdrawal {
  id: string;
  withdrawalCode: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface WithdrawalInput {
  memberCode: string;
  amount: number;
}

export interface MemberProfile {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  gardenName: string | null;
  walletBalance: number;
  dividendBalance: number;
}

export interface DailyMarketPrice {
  price: number;
  recordDate: string;
}

export interface MemberSalesSummary {
  monthlySalesAmount: number;
  yearlyRawWeightKg: number;
}

export type FinanceEntryType = "PURCHASE" | "WITHDRAWAL";

export interface FinanceEntry {
  id: string;
  // Thai calendar day the money moved, as YYYY-MM-DD.
  date: string;
  type: FinanceEntryType;
  code: string;
  // Signed against the member's wallet: positive credits it, negative debits it.
  amount: number;
  // Set only on PURCHASE rows an employee delivered and was paid a share on.
  // `amount` above is still just the member's own wallet credit; these record
  // what the employee received on the spot, for the member's visibility.
  deliveredByName?: string;
  employeePayout?: number;
}

// One purchase row, flattened with the seller member's name/code, for the
// fresh-latex purchase performance report.
export interface PurchaseSummaryRow {
  id: string;
  purchaseCode: string;
  // Business day the purchase was recorded for, ISO (UTC midnight).
  recordDate: string;
  // Wall-clock moment the bill was entered, ISO.
  createdAt: string;
  memberCode: string;
  memberName: string;
  rawWeightKg: number;
  dryPercentage: number;
  dryWeightKg: number;
  marketPrice: number;
  totalAmount: number;
}

export interface DividendMemberRow {
  memberId: string;
  memberCode: string;
  memberName: string;
}

// Everything the dividend calculator needs: the member roster plus every
// purchase's dry weight tagged with its Buddhist-calendar year, so the client
// can re-total per member for whichever year the user picks.
export interface DividendData {
  members: DividendMemberRow[];
  purchases: { memberId: string; dryWeightKg: number; buddhistYear: number }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  role: UserRole;
  action: string;
  details: string;
}

export interface ReferencePriceEntry {
  id: string;
  // Business day this price applies to, ISO (UTC midnight) — same convention
  // as Purchase.recordDate.
  date: string;
  price: number;
  updatedAt: string;
}
