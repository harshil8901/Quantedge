import LBOValuation from '@/components/LBOValuation';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'Leveraged Buyout | QuantEdge',
  description:
    'Institutional sponsor underwriting with debt schedules, IRR/MOIC analysis, and downside / base / upside exit scenarios.',
};

export default function LBOModelPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="Sponsor Terminal"
            title="Leveraged Buyout."
            description="Underwrite acquisition financing, model debt paydown and exit economics, and quantify sponsor IRR and MOIC across downside, base, and upside exit paths."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {['Downside Exit', 'Base Exit', 'Upside Exit'].map((item) => (
              <div key={item} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">Scenario</p>
                <p className="mt-3 text-lg font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <LBOValuation />
    </main>
  );
}
