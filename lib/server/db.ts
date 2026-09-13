export { getTursoClient, turso } from './turso';
export { initializeSchema } from './schema';

import * as customerOps from './customers';
import * as companyOps from './companies';
import * as loanOps from './loans';
import * as adminOps from './administration';

export * from './customers';
export * from './companies';
export * from './loans';
export * from './administration';

/**
 * Unified `db` facade object preserving full backward compatibility.
 */
export const db = {
  // Customers
  getCustomers: customerOps.getCustomers,
  getCustomerById: customerOps.getCustomerById,
  createCustomer: customerOps.createCustomer,
  updateCustomer: customerOps.updateCustomer,
  deleteCustomer: customerOps.deleteCustomer,

  // Companies
  getCompanies: companyOps.getCompanies,
  getCompanyById: companyOps.getCompanyById,
  createCompany: companyOps.createCompany,

  // Loans & Installments
  getLoans: loanOps.getLoans,
  getLoanById: loanOps.getLoanById,
  createLoan: loanOps.createLoan,
  updateLoanInstallment: loanOps.updateLoanInstallment,
  updateFullLoan: loanOps.updateFullLoan,
  deleteLoan: loanOps.deleteLoan,
  getHistoricalReceipts: loanOps.getHistoricalReceipts,
  getDashboardStats: loanOps.getDashboardStats,
  resetAll: loanOps.resetAll,

  // Administration & Users
  getUsers: adminOps.getUsers,
  getUserById: adminOps.getUserById,
  createUser: adminOps.createUser,
  updateUser: adminOps.updateUser,
  deleteUser: adminOps.deleteUser,

  // Roles
  getRoles: adminOps.getRoles,
  createRole: adminOps.createRole,
  updateRole: adminOps.updateRole,

  // Permission Matrix
  getPermissionMatrix: adminOps.getPermissionMatrix,
  updatePermissionMatrix: adminOps.updatePermissionMatrix,

  // Approval Rules
  getApprovalRules: adminOps.getApprovalRules,
  createApprovalRule: adminOps.createApprovalRule,
  updateApprovalRule: adminOps.updateApprovalRule,
  deleteApprovalRule: adminOps.deleteApprovalRule,

  // Audit Logs
  getAuditLogs: adminOps.getAuditLogs,
  logAudit: adminOps.logAudit,

  // System Settings
  getSystemSettings: adminOps.getSystemSettings,
  updateSystemSettings: adminOps.updateSystemSettings,
  triggerBackup: adminOps.triggerBackup,
};
