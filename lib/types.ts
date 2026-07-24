export type MemberStatus = "ACTIVE" | "SUSPENDED";

export interface Member {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  idCardNumber: string;
  phone: string;
  address: string;
  postalCode: string;
  photoUrl: string | null;
  balance: number;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MemberInput {
  firstName: string;
  lastName: string;
  idCardNumber: string;
  phone: string;
  address: string;
  postalCode: string;
  photoUrl: string | null;
}

export type EmployeeStatus = "ACTIVE" | "SUSPENDED";

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  idCardNumber: string;
  phone: string;
  address: string;
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
  phone: string;
  address: string;
  postalCode: string;
  photoUrl: string | null;
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
