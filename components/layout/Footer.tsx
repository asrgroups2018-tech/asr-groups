'use client';

import React from 'react';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer w-full shrink-0 select-none border-t border-[#EBE7DF] bg-white px-4 py-2.5 text-slate-500 shadow-xs sm:px-6 md:px-8">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full">
            <Image
              src="/groups-finalized.png"
              alt="ASR GROUP Logo"
              fill
              sizes="20px"
              className="object-cover"
            />
          </div>
          <span className="app-footer-brand font-serif text-xs font-bold tracking-tight text-slate-800">
            ASR GROUP
          </span>
        </div>
        <p className="text-right text-[10px] text-slate-500 sm:text-[11px]">
          © {new Date().getFullYear()} ASR GROUP · All rights reserved
        </p>
      </div>
    </footer>
  );
};
