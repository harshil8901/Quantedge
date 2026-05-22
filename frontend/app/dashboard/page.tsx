'use client';

import { BrainCircuit } from 'lucide-react';
import Panel from '@/components/ui/Panel';

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <Panel className="max-w-lg p-10 text-center">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-[#4F8CFF]/25 bg-[#4F8CFF]/10">
          <BrainCircuit size={28} className="text-[#4F8CFF]" />
        </div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#8EA0BA]">Dashboard</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Under development</h1>
        <p className="mt-4 text-sm leading-7 text-[#A1AAB8]">
          This workspace will ship with AI insights, watchlist monitoring, and portfolio context. Check back soon.
        </p>
      </Panel>
    </main>
  );
}
