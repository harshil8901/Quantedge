import type React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Panel({ children, className, hover = false }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.08] bg-[#101725]/90 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl',
        hover && 'transition duration-300 ease-out hover:-translate-y-1 hover:border-[#4F8CFF]/35 hover:shadow-[0_26px_90px_rgba(79,140,255,0.16)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
