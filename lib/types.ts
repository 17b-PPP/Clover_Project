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
}

// One calendar (Buddhist) year's worth of weight totals, used to populate the
// dashboard's year selector without a round trip per year switch.
// One employee's share of a member's sales for the year — a member may have
// had more than one employee deliver on their behalf over time.
export interface MemberEmployeeSale {
  name: string;
  amount: number;
}

export interface MemberYearlySummary {
  year: number;
  rawWeightKg: number;
  dryWeightKg: number;
  totalAmount: number;
  employeeSales: MemberEmployeeSale[];
  withdrawnAmount: number;
}

// The employee currently contracted to deliver this member's latex, per an
// active MePair — a member may have none (sells their own latex) or more
// than one over time, so the portal gets the full list.
export interface MemberEmployeeInfo {
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  memberShare: number;
  employeeShare: number;
}

export type FinanceEntryType = "PURCHASE" | "WITHDRAWAL" | "DIVIDEND";

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
  // The full sale value before the employee's cut was split out — shown
  // alongside employeePayout so the split is unambiguous.
  totalAmount?: number;
  // PURCHASE rows: what was weighed and the price it was bought at.
  rawWeightKg?: number;
  dryPercentage?: number;
  marketPrice?: number;
  // WITHDRAWAL rows: the wallet balance left after the withdrawal.
  balanceAfter?: number;
  // DIVIDEND rows: which payout this was and how it was computed.
  buddhistYear?: number;
  periodLabel?: string | null;
  rate?: number;
  dryWeightKg?: number;
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
  // Carried along so the table can render the same receipt as /member/sales.
  sellerCode: string;
  deliveredByName: string;
  ownerName: string;
  employeePayout: number;
  ownerPayout: number;
}

export interface DividendMemberRow {
  memberId: string;
  memberCode: string;
  memberName: string;
}

// Everything the dividend calculator needs: the member roster, every
// purchase's dry weight tagged with its Buddhist-calendar year (so the client
// can re-total per member for whichever year the user picks), and which years
// have already been paid out (so the UI can lock them before the user tries).
export interface DividendData {
  members: DividendMemberRow[];
  purchases: {
    memberId: string;
    dryWeightKg: number;
    buddhistYear: number;
  }[];
  paidYears: number[];
  // Every payment row ever made, newest first — the page groups them by year
  // into the payout history.
  payments: DividendPayment[];
}

export interface DividendPaymentInput {
  buddhistYear: number;
  // Free-text description of the period this payout covers, e.g.
  // "พฤษภาคม 2568 - มีนาคม 2569" — the co-op's dividend year doesn't always
  // line up with the calendar year the purchases are grouped by.
  periodLabel: string;
  rate: number;
}

export interface DividendPayment {
  id: string;
  dividendCode: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  buddhistYear: number;
  periodLabel: string | null;
  rate: number;
  dryWeightKg: number;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
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

// One save action against a business day's reference price — insert-only, so
// re-saving the same day keeps the prior entries instead of overwriting them.
export interface ReferencePriceLogEntry {
  id: string;
  date: string;
  price: number;
  recordedAt: string;
}
