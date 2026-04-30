'use client';

import { useEffect, useState } from 'react';
import type React from 'react';
import { cn } from '@/lib/utils';

interface ClientChartProps {
  children: React.ReactNode;
  className?: string;
}

export default function ClientChart({ children, className }: ClientChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn('min-h-0 min-w-0', className)}>
      {mounted ? children : <div className="h-full rounded-lg border border-white/[0.08] bg-[#070B14]" />}
    </div>
  );
}
