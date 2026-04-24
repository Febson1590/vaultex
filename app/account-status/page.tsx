import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logoutUser } from "@/lib/actions/auth";
import Link from "next/link";
import { ShieldAlert, Lock, Pause, Ban } from "lucide-react";

export const metadata = { title: "Account Status — Vaultex" };

/**
 * Landing page for users whose account is not ACTIVE. The dashboard +
 * admin layouts redirect non-ACTIVE users here on every navigation, so
 * the user can't bounce around the app while their status is in a
 * blocked state.
 *
 * SUSPENDED is handled upstream: they can't log in at all (auth.ts
 * throws AccountSuspended). They only see this page if the status
 * flipped to SUSPENDED mid-session — in which case we sign them out.
 */
export default async function AccountStatusPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { status: true, email: true, name: true },
  });
  if (!user) redirect("/login");

  // If you land here and you're actually ACTIVE, just go home.
  if (user.status === "ACTIVE") redirect("/dashboard");

  const copy = {
    RESTRICTED: {
      Icon:    Pause,
      color:   "text-yellow-400",
      border:  "border-yellow-500/25",
      bg:      "bg-yellow-500/[0.07]",
      title:   "Account Restricted",
      summary: "You can still sign in and view your account, but certain actions are currently limited.",
      allowed: [
        "View your balances and history",
        "Make a new deposit",
      ],
      blocked: [
        "Withdraw funds",
        "Place new trades",
        "Open a new investment or copy trade",
        "Add funds to or upgrade an existing investment",
      ],
    },
    FROZEN: {
      Icon:    Lock,
      color:   "text-blue-400",
      border:  "border-blue-500/25",
      bg:      "bg-blue-500/[0.07]",
      title:   "Account Frozen",
      summary: "Your account is temporarily frozen. All money movement is paused, but your existing investments continue to accrue.",
      allowed: [
        "View your balances and history",
        "Your existing investments keep earning normally",
      ],
      blocked: [
        "Deposits, withdrawals, new trades, new investments, plan upgrades, and add-funds",
      ],
    },
    SUSPENDED: {
      Icon:    Ban,
      color:   "text-red-400",
      border:  "border-red-500/25",
      bg:      "bg-red-500/[0.07]",
      title:   "Account Suspended",
      summary: "Your account has been suspended. All activity, including active investments, is paused.",
      allowed: [],
      blocked: [
        "All account activity is paused until this is resolved.",
      ],
    },
  } as const;

  const s = copy[user.status as keyof typeof copy] ?? copy.RESTRICTED;
  const Icon = s.Icon;

  return (
    <div className="min-h-[100dvh] bg-[#040f1f] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.06] bg-[#071427] shadow-[0_8px_40px_rgba(0,0,0,0.5)] p-6 sm:p-8">
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${s.border} ${s.bg} mb-5`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.bg} ${s.border} border`}>
            <Icon className={`h-5 w-5 ${s.color}`} />
          </div>
          <div>
            <div className={`text-[15px] font-bold ${s.color}`}>{s.title}</div>
            <div className="text-[12px] text-slate-400 mt-0.5">
              Signed in as <span className="text-slate-300">{user.email}</span>
            </div>
          </div>
        </div>

        <p className="text-[14px] text-slate-300 leading-relaxed mb-5">
          {s.summary}
        </p>

        {s.allowed.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-widest text-emerald-300/80 font-semibold mb-2">Still available</div>
            <ul className="space-y-1.5">
              {s.allowed.map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-slate-300">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-widest text-red-300/80 font-semibold mb-2">Currently blocked</div>
          <ul className="space-y-1.5">
            {s.blocked.map((t) => (
              <li key={t} className="flex items-start gap-2 text-[13px] text-slate-300">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 mb-5 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-400 leading-relaxed">
            If you believe this is a mistake, our support team can review your
            account and lift the restriction. Responses typically arrive within
            one business day.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {user.status !== "SUSPENDED" && (
            <Link
              href="/dashboard/support"
              className="flex-1 h-11 inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[13px] transition-colors"
            >
              Contact Support
            </Link>
          )}
          {user.status === "RESTRICTED" && (
            <Link
              href="/dashboard"
              className="flex-1 h-11 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-[13px] transition-colors border border-white/10"
            >
              Go to Dashboard
            </Link>
          )}
          <form action={logoutUser} className="flex-1">
            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-[13px] transition-colors border border-white/10"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
