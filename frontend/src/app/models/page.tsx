'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Blocks, CheckCircle2, Layers3 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';
import { valuationModels } from '@/lib/models-data';

export default function ModelsPage() {
  return (
    <main className="pb-24">
      <section className="mx-auto max-w-[1440px] px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: 'easeOut' }}>
          <Panel className="overflow-hidden p-6 md:p-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <SectionHeader
                eyebrow="VALUATION SUITE"
                title="Institutional Valuation Frameworks."
                description="Professional-grade models built for intrinsic value analysis, market benchmarking, and AI-assisted investment research."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Core models', value: '10', icon: Blocks },
                  { label: 'Scenario layers', value: '30+', icon: Layers3 },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                      <Icon size={18} className="text-[#4F8CFF]" />
                      <p className="mt-5 text-3xl font-semibold text-white">{item.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-5 px-4 sm:px-6 md:grid-cols-2 lg:px-8 xl:grid-cols-3">
        {valuationModels.map((model, index) => (
          <motion.article
            key={model.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.035 }}
          >
            <Panel hover className="flex h-full flex-col p-5">
              <div className="mb-6 flex items-start justify-end gap-4">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#DDE8FF]">{model.shortTitle}</span>
              </div>

              <p className="text-xs uppercase tracking-[0.26em] text-[#A1AAB8]">{model.tagline}</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">{model.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[#A1AAB8]">{model.description}</p>

              <div className="mt-6 grid gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A1AAB8]">Scenarios</p>
                    <div className="space-y-1.5">
                      {model.scenarios.map((item) => (
                        <p key={item} className="flex items-center gap-2 text-xs text-[#DDE8FF]">
                          <CheckCircle2 size={12} style={{ color: model.accent }} />
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A1AAB8]">Use Cases</p>
                    <p className="text-xs leading-5 text-[#DDE8FF]">{model.useCases.join(', ')}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A1AAB8]">Outputs</p>
                    <p className="text-xs leading-5 text-[#DDE8FF]">{model.outputs.join(', ')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-7">
                {model.href ? (
                  <Button href={model.href} className="w-full">
                    Open model
                    <ArrowUpRight size={15} />
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" className="w-full">
                    Preview framework
                    <ArrowUpRight size={15} />
                  </Button>
                )}
              </div>
            </Panel>
          </motion.article>
        ))}
      </section>
    </main>
  );
}
