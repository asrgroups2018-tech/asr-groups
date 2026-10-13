import { NextResponse } from 'next/server';
import { ChangeType, EntityType, User } from '@/lib/types';
import { db } from './db';
import { isSuperAdmin, SUPER_ADMIN_ROLE_ID } from './authorization';

interface QueueMutationInput {
  actor: User;
  changeType: ChangeType;
  title: string;
  description?: string;
  entityType: EntityType;
  entityId: string;
  amount?: number;
  beforePayload?: unknown;
  proposedPayload: unknown;
}

/**
 * Returns a 202 response for non-Super-Admin mutations and null for the
 * unrestricted administrator. The mutation route can therefore keep one
 * clear branch: queue first, otherwise commit.
 */
export async function queueMutationForApproval(
  input: QueueMutationInput,
): Promise<NextResponse | null> {
  if (isSuperAdmin(input.actor)) return null;

  const rules = await db.getApprovalRules();
  const rule = rules.find(
    (candidate) =>
      candidate.isActive &&
      candidate.changeType === input.changeType &&
      candidate.whoCanRaise.some((roleId) => input.actor.assignedRoleIds.includes(roleId)),
  );

  const request = await db.createApprovalRequest({
    ruleId: rule?.id,
    changeType: input.changeType,
    title: input.title,
    description: input.description,
    entityType: input.entityType,
    entityId: input.entityId,
    requesterId: input.actor.id,
    requesterName: input.actor.name,
    requesterRoleId: input.actor.primaryRoleId,
    approverRoleId: rule?.whoMustApprove ?? SUPER_ADMIN_ROLE_ID,
    amount: input.amount || 0,
    status: 'Pending',
    beforePayload: input.beforePayload,
    proposedPayload: input.proposedPayload,
  });

  return NextResponse.json({ success: true, queued: true, data: request }, { status: 202 });
}
