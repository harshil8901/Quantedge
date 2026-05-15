import DDMValuation from '@/components/DDMValuation';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'Dividend Discount Model | QuantEdge',
  description: 'Premium dividend discount model workspace for income valuation and sensitivity analysis.',
};

export default function DDMModelPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="DDM Terminal"
            title="Dividend Discount Model."
            description="Price durable payout streams with growth scenarios, dividend forecasts, cost of equity sensitivity, and institutional AI commentary."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {['Bear', 'Base', 'Bull'].map((item) => (
              <div key={item} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">Scenario</p>
                <p className="mt-3 text-2xl font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <DDMValuation />
    </main>
  );
}
