import ComparableAnalysis from '@/components/ComparableAnalysis';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'Comparable Company Analysis | QuantEdge',
  description: 'Premium peer multiple valuation workspace for institutional market benchmarking.',
};

export default function CompsModelPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="Comps Terminal"
            title="Comparable Company Analysis."
            description="Benchmark public peers, scenario multiples, implied enterprise value, share price range, and market-relative valuation context."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {['Conservative', 'Base', 'Premium'].map((item) => (
              <div key={item} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">Scenario</p>
                <p className="mt-3 text-2xl font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <ComparableAnalysis />
    </main>
  );
}
