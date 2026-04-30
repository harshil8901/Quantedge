interface SectionHeadingProps {
  eyebrow: string;
  title: string;
}

export default function SectionHeading({ eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm uppercase tracking-[0.32em] text-[#4F8CFF]/90">{eyebrow}</p>
      <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{title}</h2>
    </div>
  );
}
