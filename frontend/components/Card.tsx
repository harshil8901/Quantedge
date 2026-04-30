interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-white/10 bg-[#101725] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}
