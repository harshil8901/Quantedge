import FactorEngine from '@/components/FactorEngine';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'Quantitative Factor Engine | QuantEdge',
  description:
    'Multi-factor screening across value, quality, momentum, growth, volatility, and balance sheet strength with institutional rankings.',
};

export default function FactorsModelPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="Quant Research Terminal"
            title="Quantitative Factor Engine."
            description="Screen universes with z-score normalized factor metrics, composite rankings, and quality, value, or momentum tilt frameworks for institutional security selection."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {['Quality Tilt', 'Value Tilt', 'Momentum Tilt'].map((item) => (
              <div key={item} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">Tilt</p>
                <p className="mt-3 text-lg font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <FactorEngine />
    </main>
  );
}
