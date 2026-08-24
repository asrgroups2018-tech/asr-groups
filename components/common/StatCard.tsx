'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  icon: React.ReactNode;
  iconBgColor?: string; // e.g. 'bg-rose-50 text-rose-600', 'bg-emerald-50 text-emerald-600', etc.
  className?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconBgColor = 'bg-amber-50 text-amber-600',
  className = '',
  onClick,
  badge,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-[#D6CFBE]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {value}
            </h3>
            {badge}
          </div>
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-black/5 ${iconBgColor}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="truncate">{subtitle || 'Updated in real-time'}</span>
        {trend && (
          <span
            className={`font-semibold flex items-center gap-0.5 tabular-nums ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? '↗' : '↘'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
