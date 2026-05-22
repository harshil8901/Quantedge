import SOTPValuation from '@/components/SOTPValuation';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'Sum-of-the-Parts | QuantEdge',
  description:
    'Institutional conglomerate valuation with segment-level EV, holdco discount, NAV bridge, and breakup scenario analysis.',
};

export default function SOTPModelPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="Conglomerate Terminal"
            title="Sum-of-the-Parts."
            description="Decompose diversified businesses into independently valued segments, aggregate enterprise value, and quantify holdco discount and NAV per share across discounted, base, and unlock scenarios."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {['Discounted Holdco', 'Base Segments', 'Unlock Value'].map((item) => (
              <div key={item} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">Scenario</p>
                <p className="mt-3 text-lg font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <SOTPValuation />
    </main>
  );
}
