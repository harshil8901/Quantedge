interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className = '' }: ContainerProps) {
  return <div className={`mx-auto w-full max-w-[1320px] px-6 md:px-10 ${className}`}>{children}</div>;
}
