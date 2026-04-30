interface SectionProps {
  children: React.ReactNode;
  className?: string;
}

export default function Section({ children, className = '' }: SectionProps) {
  return <section className={`py-20 xl:py-28 ${className}`}>{children}</section>;
}
