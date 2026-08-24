'use client';

import React from 'react';
import { RoleId } from '@/lib/types';
import { Star } from 'lucide-react';

interface RoleBadgeProps {
  roleId: RoleId;
  roleName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showId?: boolean;
  isPrimary?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ROLE_NAMES: Record<RoleId, string> = {
  0: 'Super Admin',
  1: 'Admin',
  2: 'Manager',
  3: 'Accountant',
  4: 'Collection Agent',
  5: 'Employee',
  6: 'Customer',
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  roleId,
  roleName,
  size = 'sm',
  showId = true,
  isPrimary = false,
  className = '',
  onClick,
}) => {
  const displayName = roleName || ROLE_NAMES[roleId] || `Role ${roleId}`;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] font-medium gap-1',
    sm: 'px-2.5 py-0.5 text-xs font-semibold gap-1.5',
    md: 'px-3 py-1 text-xs font-bold gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm font-bold gap-2',
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center rounded-lg border transition-all duration-150 select-none ${
        sizeClasses[size]
      } ${
        isPrimary
          ? 'bg-[#FAF8F5] text-slate-900 border-[#C5A059]/60 shadow-2xs font-bold'
          : 'bg-[#FAF8F5] text-slate-700 border-[#E6E1D6] hover:bg-[#F3EFE6]'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Role Number Tag */}
      {showId && (
        <span className="font-mono text-[10px] text-slate-500 font-bold bg-white px-1 py-0.2 rounded border border-[#E6E1D6]/80">
          R{roleId}
        </span>
      )}

      {/* Role Name */}
      <span className="truncate">{displayName}</span>

      {/* Primary Role Indicator */}
      {isPrimary && (
        <span title="Designated Primary Role" className="inline-flex shrink-0">
          <Star className="w-3 h-3 text-[#C5A059] fill-[#C5A059]" />
        </span>
      )}
    </span>
  );
};
