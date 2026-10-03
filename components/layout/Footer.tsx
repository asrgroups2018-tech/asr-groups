'use client';

import React from 'react';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#EBE7DF] text-slate-500 text-xs py-2 px-4 sm:px-6 md:px-8 w-full shrink-0 select-none z-30 shadow-xs">
      <div className="flex items-center justify-between gap-2 w-full">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full overflow-hidden relative shrink-0">
            <Image
              src="/groups-finalized.png"
              alt="ASR Groups Logo"
              fill
              sizes="20px"
              className="object-cover"
            />
          </div>
          <span className="font-bold text-slate-800 tracking-tight text-xs font-serif">
            ASR GROUPS
          </span>
        </div>

        {/* Right: Copyright Text */}
        <div className="text-[11px] sm:text-xs text-slate-600 font-normal text-right">
          Copyright {new Date().getFullYear()} ASR Groups. All rights reserved.
        </div>

      </div>
    </footer>
  );
};
