import Link from "next/link";

export function PulseSymbol({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="/brand/symbol.svg"
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}

export function PulseLogo() {
  return (
    <Link
      href="/"
      aria-label="PULSE homepage"
      className="inline-flex items-center gap-2.5"
    >
      <PulseSymbol />
      <span className="text-xl font-semibold tracking-[0.16em]">PULSE</span>
    </Link>
  );
}
