import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeader({ eyebrow, title, description, className }: SectionHeaderProps) {
  return (
    <div className={cn('max-w-3xl space-y-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#4F8CFF]">{eyebrow}</p>
      <h2 className="text-3xl font-semibold leading-tight text-white md:text-4xl">{title}</h2>
      {description ? <p className="text-sm leading-7 text-[#A1AAB8] md:text-base">{description}</p> : null}
    </div>
  );
}
