import type React from 'react';
import Panel from '@/components/ui/Panel';

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ChartFrame({ title, subtitle, children }: ChartFrameProps) {
  return (
    <Panel className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-[#A1AAB8]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </Panel>
  );
}
