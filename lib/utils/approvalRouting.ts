import { ApprovalRule, ChangeType, RoleId } from '@/lib/types';

export interface ApprovalEvaluationResult {
  action: 'DIRECT_COMMIT' | 'AUTO_APPROVE_QUEUE' | 'REQUIRE_APPROVAL';
  rule?: ApprovalRule;
  approverRoleId: RoleId;
  reason: string;
}

/**
 * Evaluates whether an action should commit directly, auto-approve through queue, or require manual approval.
 */
export function evaluateApprovalAction(
  changeType: ChangeType,
  amount: number,
  actorRoleId: RoleId,
  approvalRules: ApprovalRule[]
): ApprovalEvaluationResult {
  // Super Admin (Role 0) can bypass rules unless it's a security-protected workflow
  if (actorRoleId === 0 && changeType !== 'Role Change') {
    return {
      action: 'DIRECT_COMMIT',
      approverRoleId: 0,
      reason: 'Super Admin bypass: Direct commit authorized',
    };
  }

  // Find active matching rule
  const matchingRule = approvalRules.find(
    (r) => r.isActive && (r.changeType === changeType || (changeType.startsWith('Loan') && r.changeType === 'Loan Update'))
  );

  // If no active rule exists, allow direct commit for managers/admins (Role <= 2)
  if (!matchingRule) {
    if (actorRoleId <= 2) {
      return {
        action: 'DIRECT_COMMIT',
        approverRoleId: 1,
        reason: 'No active approval rule configured for this change type',
      };
    }
    return {
      action: 'REQUIRE_APPROVAL',
      approverRoleId: 1,
      reason: 'Standard authorization required',
    };
  }

  const threshold = matchingRule.amountThreshold || 0;
  const isAutoApprove = matchingRule.autoApproveBelow;

  // Check if amount is below or equal to threshold
  if (threshold > 0 && amount <= threshold && isAutoApprove) {
    return {
      action: 'AUTO_APPROVE_QUEUE',
      rule: matchingRule,
      approverRoleId: matchingRule.whoMustApprove,
      reason: `Amount ₹${amount.toLocaleString('en-IN')} is within ₹${threshold.toLocaleString('en-IN')} auto-approval threshold`,
    };
  }

  // If threshold is 0 and autoApproveBelow is true (rare), auto approve
  if (threshold === 0 && isAutoApprove) {
    return {
      action: 'AUTO_APPROVE_QUEUE',
      rule: matchingRule,
      approverRoleId: matchingRule.whoMustApprove,
      reason: 'Auto-approval enabled by policy',
    };
  }

  // Otherwise, requires approval
  return {
    action: 'REQUIRE_APPROVAL',
    rule: matchingRule,
    approverRoleId: matchingRule.whoMustApprove,
    reason: threshold > 0 && amount > threshold
      ? `Amount ₹${amount.toLocaleString('en-IN')} exceeds threshold of ₹${threshold.toLocaleString('en-IN')}`
      : 'Policy requires multi-signature authorization',
  };
}
