export type RoleId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Role {
  id: RoleId;
  name: string;
  code: string;
  description: string;
  colorName: 'violet' | 'rose' | 'emerald' | 'blue' | 'amber' | 'slate' | 'ink';
  bgClass: string;
  textClass: string;
  borderClass: string;
  hexColor: string;
  isSystemProtected: boolean;
  userCount: number;
  hierarchyLevel: number; // 0 = highest, 6 = lowest
}

export type UserStatus = 'Active' | 'Pending' | 'Suspended';

export interface UserSession {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface User {
  id: string; // e.g., "USR-1001"
  name: string;
  username?: string; // Login username for non-admin users (e.g., "rubesh.k", "agent.ravi")
  email: string; // Login identifier for Admin users; notification email for others
  phone: string;
  tempPassword?: string; // Initial or reset password provided to user
  loginMethod?: 'email' | 'username'; // 'email' for Admin (Role 0, 1), 'username' for all others
  avatar?: string;
  initials: string;
  assignedRoleIds: RoleId[]; // Multi-role support!
  primaryRoleId: RoleId; // Default landing & primary role
  status: UserStatus;
  department: string;
  designation: string;
  joinedDate: string; // e.g. "2024-01-15"
  createdAt: string;
  lastLogin: string;
  address?: string;
  emergencyContact?: string;
  twoFactorEnabled: boolean;
  suspendReason?: string;
  sessions: UserSession[];
  isCustomer: boolean;
}

export type ModuleAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export interface ModulePermissionConfig {
  id: string;
  name: string;
  category: 'Core' | 'Finance' | 'Operations' | 'System';
  description: string;
  actions: ModuleAction[];
}

export type PermissionMatrixState = {
  [moduleId: string]: {
    [action in ModuleAction]?: {
      [roleId in RoleId]?: boolean;
    };
  };
};

export type ChangeType =
  | 'Loan Update'
  | 'Collection Correction'
  | 'Expense Edit'
  | 'Salary Change'
  | 'Customer Update'
  | 'Role Change';

export interface ApprovalRule {
  id: string; // e.g. "RULE-101"
  changeType: ChangeType;
  description: string;
  whoCanRaise: RoleId[];
  whoMustApprove: RoleId; // Minimum role level needed to approve
  amountThreshold: number; // ₹ amount (0 for no monetary threshold)
  autoApproveBelow: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuditActionType =
  | 'Created User'
  | 'Assigned Role'
  | 'Edited Permission'
  | 'Approved Request'
  | 'Login'
  | 'Suspended User'
  | 'Activated User'
  | 'Deleted User'
  | 'Reset Password'
  | 'Updated Settings'
  | 'Triggered Backup'
  | 'Modified Shareholder Split'
  | 'Updated Approval Rule';

export interface AuditLogEntry {
  id: string; // e.g. "AUD-9402"
  timestamp: string; // e.g. "2026-08-07 09:14"
  actorId: string;
  actorName: string;
  actorRoleId: RoleId;
  action: AuditActionType;
  target: string;
  beforeVal?: string;
  afterVal?: string;
  ipAddress: string;
  device: string;
  isSensitive: boolean;
}

export interface ShareholderCompany {
  id: string;
  name: string;
  registrationNumber: string;
  percentage: number;
  contactPerson: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface CompanyProfile {
  companyName: string;
  legalEntityName: string;
  logoUrl: string;
  gstin: string;
  cin: string;
  pan: string;
  registeredAddress: string;
  baseCurrency: string;
  currencySymbol: string;
  financialYearStart: string; // e.g. "01-April"
  supportEmail: string;
  supportPhone: string;
}

export interface SecurityPolicy {
  minPasswordLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  requireUppercase: boolean;
  sessionTimeoutMinutes: number;
  enforce2FA: boolean;
  ipAllowlist: string[];
  maxLoginAttempts: number;
}

export interface SystemSettingsState {
  companyProfile: CompanyProfile;
  shareholders: ShareholderCompany[];
  securityPolicy: SecurityPolicy;
  featureToggles: {
    customerSelfServicePortal: boolean;
    smsNotifications: boolean;
    autoApproveSmallExpenses: boolean;
    twoFactorEnforcement: boolean;
    darkModePreview: boolean;
    multiBranchSupport: boolean;
    strictIpWhitelist: boolean;
  };
  lastBackupTimestamp: string;
  backupStatus: 'Idle' | 'InProgress' | 'Completed' | 'Failed';
}

export type AdminTab =
  | 'overview'
  | 'users'
  | 'roles'
  | 'audit'
  | 'settings';

export type UserDetailsTab =
  | 'profile'
  | 'roles'
  | 'permissions'
  | 'activity'
  | 'security';

// ==========================================
// ASR Intermediary Business Domain Models
// ==========================================

// 1. Customer = The Investor / Financier
export interface CustomerInvestor {
  id: string; // e.g., "CUST-101"
  companyName?: string; // Optional enterprise name
  fullName: string; // Required investor name
  phone: string;
  email: string;
  address?: string;
  status: 'Active' | 'Pending' | 'Inactive';
  totalInvested: number; // Total ₹ capital provided across all loans
  totalReturns: number; // Total ₹ profit received to date
  activeLoansCount: number;
  createdAt: string;
}

// 2. Company = The Borrowing Business
export interface BorrowerCompany {
  id: string; // e.g., "COMP-101"
  companyName: string; // Required business name
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  area: string; // e.g. "Ambattur Industrial Estate", "Guindy"
  defaultInterestRate?: number; // Optional; interest configured per loan
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
  };
  totalBorrowed: number; // Cumulative ₹ borrowed
  outstandingAmount: number; // Current principal + interest due
  activeLoansCount: number;
  onTimeRepaymentRate: number; // % (e.g. 96%)
  status: 'Active' | 'Under Review' | 'Blacklisted';
  createdAt: string;
}

// 3. Loans & Syndicated Multi-Party Tranches
export interface LoanCustomerShare {
  customerId: string;
  customerName: string;
  sharePercentage: number; // e.g. 100% or 60%
  shareAmount: number; // e.g. ₹1,20,00,000
}

export interface LoanCompanySplit {
  companyId: string;
  companyName: string;
  percentage: number; // e.g. 40%
  amount: number; // e.g. ₹80,00,000 (Full Principal)
  interestRate: number; // e.g. 24% p.a. (2% per month)
  monthlyInterest: number; // Monthly interest cut (e.g. ₹1,60,000)
  totalDuePerMonth: number; // Principal + Monthly Interest (e.g. ₹81,60,000)
  monthlyEmi?: number;
}

export interface RepaymentInstallment {
  sNo: number;
  date: string; // Formatted date e.g. "10-Oct-2026" (editable)
  dueDate?: string; // Standard ISO "YYYY-MM-DD" for date inputs
  particulars: string; // "Month #1 Cycle (Full Principal + Interest)"
  principalAmount: number; // Full principal amount (e.g. ₹2,00,000)
  interestAmount: number; // Month interest amount (e.g. ₹4,000)
  totalAmount: number; // Principal + Month Interest (e.g. ₹2,04,000)
  companyShares: Record<string, number>; // companyId -> total cycle payment (Principal + Interest)
  companyPrincipalShares?: Record<string, number>;
  companyInterestShares?: Record<string, number>;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Rescheduled';
  paidDate?: string;
  rescheduledReason?: string;
}

export interface IntermediaryLoan {
  id: string; // e.g., "LOAN-2026-001"
  totalAmount: number; // e.g. ₹2,00,00,000
  disbursedDate: string;
  tenureMonths: number; // e.g. 12
  frequency: 'Monthly' | 'Weekly';
  defaultInterestRate: number; // e.g. 24%
  asrCommissionRate: number; // e.g. 4% (ASR Income)

  // Multi-party details
  customers: LoanCustomerShare[]; // Investors who provided capital
  companies: LoanCompanySplit[]; // Borrowers who received tranches

  // Live financial calculations
  totalInterestExpected: number;
  asrIncome: number; // ASR platform commission cut
  customerNetProfit: number; // Profit returned to investors

  status: 'Active' | 'Disbursed' | 'Closed' | 'Draft';
  schedule: RepaymentInstallment[];
  createdAt: string;
}
