import RIMValuation from '@/components/RIMValuation';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'Residual Income Model | QuantEdge',
  description: 'Institutional residual income valuation workspace with ROE spreads, economic profit, and scenario analysis.',
};

export default function RIMModelPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="RIM Terminal"
            title="Residual Income Model."
            description="Quantify economic profit above the equity charge with bear / base / bull ROE scenarios, book value compounding, and institutional residual income valuation."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {['Mean Reversion', 'Base ROE', 'Premium ROE'].map((item) => (
              <div key={item} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">Scenario</p>
                <p className="mt-3 text-2xl font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <RIMValuation />
    </main>
  );
}
