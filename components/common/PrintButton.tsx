"use client";

export default function PrintButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
