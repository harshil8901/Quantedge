import PrecedentTransactions from '@/components/PrecedentTransactions';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'Precedent Transactions | QuantEdge',
  description:
    'Institutional M&A transaction analysis with control premium benchmarking, strategic buyer cases, and acquisition valuation ranges.',
};

export default function PrecedentModelPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="M&A Terminal"
            title="Precedent Transactions."
            description="Screen historical acquisitions, benchmark transaction multiples, and quantify control-premium takeover valuation across strategic, sponsor, and scarcity premium cases."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {['Strategic Buyer', 'Financial Sponsor', 'Scarcity Premium'].map((item) => (
              <div key={item} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">Scenario</p>
                <p className="mt-3 text-lg font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <PrecedentTransactions />
    </main>
  );
}
