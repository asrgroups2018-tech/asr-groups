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
  username?: string; // Login username for non-admin users
  email: string;
  phone?: string;
  tempPassword?: string;
  loginMethod?: 'email' | 'username';
  avatar?: string;
  initials: string;
  assignedRoleIds: RoleId[];
  primaryRoleId: RoleId;
  status: UserStatus;
  department: string;
  designation: string;
  joinedDate: string;
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
  | 'Loan Split'
  | 'Loan Merge'
  | 'Collection Correction'
  | 'Expense Edit'
  | 'Salary Change'
  | 'Customer Update'
  | 'Role Change'
  | 'Historical Correction';

export interface ApprovalRule {
  id: string; // e.g. "RULE-101"
  changeType: ChangeType;
  description: string;
  whoCanRaise: RoleId[];
  whoMustApprove: RoleId;
  amountThreshold: number;
  autoApproveBelow: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Auto-Approved';

export type EntityType = 'loan' | 'customer' | 'company' | 'historical_receipt' | 'user';

export interface ApprovalRequest {
  id: string; // e.g. "REQ-2026-1001"
  ruleId?: string; // e.g. "RULE-101"
  changeType: ChangeType;
  title: string;
  description?: string;
  entityType: EntityType;
  entityId: string;
  requesterId: string;
  requesterName: string;
  requesterRoleId: RoleId;
  approverRoleId: RoleId;
  amount: number;
  status: ApprovalRequestStatus;
  beforePayload?: string; // JSON string of old state
  proposedPayload: string; // JSON string of proposed state
  reviewerId?: string;
  reviewerName?: string;
  reviewerNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export type AuditActionType =
  | 'Created User'
  | 'Updated User'
  | 'Assigned Role'
  | 'Updated Access'
  | 'Edited Permission'
  | 'Approved Request'
  | 'Login'
  | 'Suspended User'
  | 'Activated User'
  | 'Deleted User'
  | 'Reset Password'
  | 'Changed Password'
  | 'Updated Settings'
  | 'Triggered Backup'
  | 'Modified Shareholder Split'
  | 'Updated Approval Rule'
  | 'Created Loan'
  | 'Updated Loan'
  | 'Updated Installment'
  | 'Imported July Dataset'
  | 'Edited Sheet Row'
  | 'Merged Loans'
  | 'Split Loan'
  | 'Spreadsheet Import Committed'
  | 'Logged Cheque'
  | 'Deposited Cheque'
  | 'Deleted Cheque';

export interface AuditLogEntry {
  id: string; // e.g. "AUD-9402"
  timestamp: string;
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
  registrationNumber?: string;
  percentage: number;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  directorName?: string;
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
  financialYearStart: string;
  supportEmail: string;
  supportPhone?: string;
  tradeName?: string;
  website?: string;
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
  maxFailedLogins?: number;
  enforce2FAForRoles?: number[];
  ipWhitelist?: string;
  passwordMinLength?: number;
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
    emailNotifications?: boolean;
    smsGateway?: boolean;
    autoDailyBackups?: boolean;
    strictAuditMode?: boolean;
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
// ASR Normalized Business Domain Models
// ==========================================

// 1. Customer = The Borrower (party in CLIENT NAME)
export interface Customer {
  id: string; // e.g. "CUST-1001"
  name: string; // Client / Borrower name (e.g. "ABI ASSOCIATES")
  place: string; // City / Branch (e.g. "CHENNAI", "CBE")
  codeNo?: string; // Optional code number (e.g. "101", "CUST-1001")
  phone?: string;
  createdAt: string;
  totalBorrowed?: number; // Cumulative ₹ borrowed across all loans
  totalRepaid?: number; // Total ₹ successfully repaid
  outstandingAmount?: number; // Total remaining ₹
  activeLoansCount?: number;
  status?: 'Active' | 'Overdue' | 'Closed' | 'Pending';
}

// 1b. Cheques = Standalone Physical Customer Cheques for Bank Deposit
export type ChequeStatus = 'Pending' | 'Deposited';

export interface Cheque {
  id: string; // e.g. "CHQ-2026-0001"
  chequeNumber: string; // Cheque leaf number (e.g. "000194", "482019")
  customerId?: string | null; // Optional reference to Customer
  customerName: string; // Customer / Drawee Name
  amount: number; // Cheque Amount (₹)
  depositDate: string; // Expected Date to Deposit ("YYYY-MM-DD")
  status: ChequeStatus; // 'Pending' | 'Deposited'
  depositedAt?: string | null; // Actual Timestamp when deposited
  createdAt: string; // Timestamp when logged
}

// 2. Company = Funding Entity (ASR own or Outside-party)
export interface Company {
  id: string; // e.g. "COMP-PASS", "COMP-CS"
  name: string; // Full Company Name
  shortCode: string; // Short ticker code (PASS, ALA, IG, GS, MARS, TG, FIN, MM, CS, MC, TA (SS), TATVA, etc.)
  isOutsideParty: boolean; // false = ASR Group Own, true = Outside-Party
  isActive?: boolean; // true = active for new loans, false = legacy/hidden
  totalFunded?: number; // Total ₹ capital provided across all loans
  totalCollected?: number; // Total ₹ collected back
  outstandingAmount?: number; // Total principal/interest still due to this company
  activeLoansCount?: number;
  createdAt: string;
}

// 3. Loan Overall Contribution Ratio
export interface LoanCompanySplit {
  id: string;
  loanId: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  isOutsideParty?: boolean;
  splitPercent: number; // e.g. 50%
  splitAmount: number; // e.g. ₹5,00,000
}

// 4. Per-Installment Per-Company Share
export interface InstallmentCompanySplit {
  id?: string;
  installmentId?: string;
  companyId: string;
  companyCode: string;
  amount: number; // e.g. ₹1,00,000
}

export type LoanStatus = 'Active' | 'Closed' | 'Overdue' | 'Pending';
export type AppStatus = 'Pending' | 'Cleared' | 'NEFT' | 'RTGS' | 'Cash';
export type RepaymentFrequency = 'Monthly' | 'Weekly' | 'Bi-Weekly' | 'Custom';

export type CollectionStatus =
  | AppStatus
  | 'PASS'
  | 'CLS'
  | 'CS'
  | 'PAID'
  | 'Paid'
  | 'RET'
  | 'RET NEFT'
  | 'RET PASS'
  | 'Active'
  | 'Closed'
  | 'Overdue'
  | 'Rescheduled';

// 5. Installment (Individual scheduled EMI)
export interface Installment {
  id: string; // e.g. "INST-1001"
  loanId: string;
  seqNo: number; // 1, 2, 3...
  dueDate: string; // ISO "YYYY-MM-DD" or formatted date
  amountDue: number; // Total amount customer owes for this installment
  status: CollectionStatus; // Allowed: Pending, Cleared, NEFT, RTGS, Cash
  recdDate?: string | null; // Date payment was actually received
  chqNo?: string; // Cheque number or reference text ("NEFT", "CS", "000194")
  place?: string; // Place (e.g. "CHENNAI", "CBE")
  depName?: string; // Deposit account company name
  bank?: string; // Bank account / name
  remarks?: string;
  companySplits: Record<string, number>; // companyCode -> amount (e.g. { "PASS": 100000, "ALA": 100000 })
  createdAt: string;
  isMismatch?: boolean;
  mismatchDiff?: number;
}

// 6. Loan (Client-level Aggregated Entity)
export interface Loan {
  id: string; // e.g. "LN20260001"
  customerId: string;
  customerName: string;
  place?: string;
  codeNo?: string; // Reference/display code (e.g. "TN0019") - NOT a unique key
  totalAmount: number; // Sum of all installment amounts (Total repayable account)
  disbursedAmount?: number | null; // Net principal amount paid / given to customer (e.g. ₹90,000)
  interestAmount?: number | null; // Upfront interest amount earned by ASR (e.g. ₹10,000)
  startDate: string;
  installmentCount: number; // e.g. 2, 4, 12
  frequency: RepaymentFrequency;
  status: AppStatus | 'Active' | 'On Track' | 'Overdue' | 'Closed' | 'Draft';
  createdAt: string;
  splits: LoanCompanySplit[]; // Company contribution percentages & amounts
  installments: Installment[]; // List of all EMIs for this loan
  nextDueDate?: string;
  totalCollected?: number;
  totalOutstanding?: number;
}

// 7. Historical July 2026 Receipt Row (for Excel Grid & Import)
export interface HistoricalReceiptRow {
  sNo: number;
  date: string; // "YYYY-MM-DD"
  codeNo: string;
  place: string;
  clientName: string;
  depName: string;
  chqNo: string;
  amount: number;
  status: CollectionStatus;
  recdDate?: string | null;
  pass?: number;
  kars?: number;
  infin?: number;
  ine?: number;
  ins?: number;
  ig?: number;
  mars?: number;
  mm?: number;
  tg?: number;
  gs?: number;
  ala?: number;
  fin?: number;
  cs?: number;
  mc?: number;
  tatva?: number;
  bhavna?: number;
  taSS?: number;
  remarks?: string;
  loanId?: string;
  installmentId?: string;
  isMismatch?: boolean;
  mismatchDiff?: number;
}

// Aliases for compatibility
export type CustomerInvestor = Customer;
export type BorrowerCompany = Company;
export type IntermediaryLoan = Loan;
export type RepaymentInstallment = Installment;
