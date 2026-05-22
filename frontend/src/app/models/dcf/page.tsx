import DCFCalculator from '@/components/DCFCalculator';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata = {
  title: 'DCF Workspace | QuantEdge',
  description: 'Institutional discounted cash flow valuation workspace with backend-driven formulas.',
};

export default function DCFPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6">
          <SectionHeader
            eyebrow="DCF Valuation Terminal"
            title="Institutional DCF valuation workspace."
            description="A real equity research surface for assumptions, scenario controls, backend valuation formulas, sensitivity heatmaps, and AI analyst commentary."
          />
        </div>
      </Panel>

      <DCFCalculator />
    </main>
  );
}
