import EVAValuation from '@/components/EVAValuation';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'Economic Value Added | QuantEdge',
  description:
    'Institutional capital efficiency analysis with NOPAT, ROIC spread, EVA trends, and value creation scenarios.',
};

export default function EVAModelPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="Capital Efficiency Terminal"
            title="Economic Value Added."
            description="Measure economic profit after the cost of capital, analyze ROIC versus WACC spreads, and quantify value creation across efficiency, base, and reinvestment scenarios."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {['Efficiency Reset', 'Base NOPAT', 'Reinvestment Case'].map((item) => (
              <div key={item} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">Scenario</p>
                <p className="mt-3 text-lg font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <EVAValuation />
    </main>
  );
}
