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
  email: string;
  phone: string;
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
  | 'matrix'
  | 'rules'
  | 'audit'
  | 'settings';

export type UserDetailsTab =
  | 'profile'
  | 'roles'
  | 'permissions'
  | 'activity'
  | 'security';
