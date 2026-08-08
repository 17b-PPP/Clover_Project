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
  role: UserRole;
  password?: string;
}

export type SellerType = "MEMBER" | "EMPLOYEE";

export interface SellerLookup {
  sellerCode: string;
  sellerType: SellerType;
  memberId: string;
  employeeId: string | null;
  ownerName: string;
  deliveredByName: string;
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
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  role: UserRole;
  action: string;
  details: string;
}
