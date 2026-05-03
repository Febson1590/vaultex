import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]
                   bg-[radial-gradient(circle_at_50%_30%,#0ea5e9,transparent_60%)]"
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md text-center">
        <Logo size="lg" href="/" />

        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400">
            Error 404
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
            Check the URL, or head back to the markets.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 h-11 rounded-md
                       bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold
                       transition-colors text-sm"
          >
            Back to home
          </Link>
          <Link
            href="/markets"
            className="inline-flex items-center justify-center px-6 h-11 rounded-md
                       border border-sky-500/30 hover:border-sky-400 hover:bg-sky-500/5
                       text-sky-400 font-semibold transition-colors text-sm"
          >
            View markets
          </Link>
        </div>
      </div>
    </main>
  );
}
