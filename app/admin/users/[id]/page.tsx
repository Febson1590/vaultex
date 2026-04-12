"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, ShieldCheck, Wallet, Bell,
  TrendingUp, Users, Receipt, ClipboardList,
  PlusCircle, MinusCircle, RefreshCw, Trash2, AlertTriangle,
} from "lucide-react";
import { adminUpdateWallet, updateUserStatus, adminSendNotification } from "@/lib/actions/admin";

// ── Helpers ───────────────────────────────────────────────────
const CARD = "glass-card rounded-2xl border border-white/[0.07] p-5";
const INPUT = "w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60";
const LABEL = "text-[11px] font-semibold text-slate-400 uppercase tracking-wider";

const CURRENCIES = ["USD", "BTC", "ETH", "USDT"] as const;
const STATUS_OPTS = ["ACTIVE", "FROZEN", "RESTRICTED", "SUSPENDED"] as const;

const STATUS_CLR: Record<string, string> = {
  ACTIVE:     "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  FROZEN:     "bg-blue-500/10 border-blue-500/25 text-blue-400",
  RESTRICTED: "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
  SUSPENDED:  "bg-red-500/10 border-red-500/25 text-red-400",
};

const TX_CLR: Record<string, string> = {
  DEPOSIT:    "bg-emerald-500/10 text-emerald-400",
  WITHDRAWAL: "bg-red-500/10 text-red-400",
  ADJUSTMENT: "bg-sky-500/10 text-sky-400",
  PROFIT:     "bg-purple-500/10 text-purple-400",
};

function StatusChip({ s }: { s: string }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_CLR[s] ?? "bg-slate-500/10 border-slate-500/25 text-slate-400"}`}>
      {s}
    </span>
  );
}

function fmtBalance(currency: string, val: number) {
  if (currency === "USD" || currency === "USDT")
    return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (currency === "BTC") return `${val.toFixed(8)}`;
  if (currency === "ETH") return `${val.toFixed(6)}`;
  return val.toString();
}

function initials(name: string, email: string) {
  const src = name || email || "?";
  return src.slice(0, 2).toUpperCase();
}

function avatarHue(name: string, email: string) {
  return [...(name || email || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

// ── Page ──────────────────────────────────────────────────────
export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBusy, setDeleteBusy]           = useState(false);

  // Status
  const [newStatus, setNewStatus] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  // Wallet
  const [selCurrency, setSelCurrency] = useState("USD");
  const [wAmount, setWAmount]   = useState("");
  const [wReason, setWReason]   = useState("");
  const [wOp, setWOp] = useState<"ADD" | "SUBTRACT" | "SET" | null>(null);

  // Notification
  const [nTitle, setNTitle] = useState("");
  const [nMsg,   setNMsg]   = useState("");
  const [nType,  setNType]  = useState("INFO");
  const [nBusy,  setNBusy]  = useState(false);

  async function loadUser() {
    try {
      const r = await fetch(`/api/admin/users/${id}`);
      const d = await r.json();
      if (!r.ok || d.error) {
        const msg = d.error ?? `Failed to load user (HTTP ${r.status})`;
        console.error("[AdminUserDetail] API error:", d);
        toast.error(msg);
        setLoadError(msg);
        setUser(null);
      } else {
        setUser(d);
        setNewStatus(d.status);
      }
    } catch (err) {
      console.error("[AdminUserDetail] fetch error:", err);
      toast.error("Failed to load user — check console for details");
    }
    setLoading(false);
  }

  useEffect(() => { loadUser(); }, [id]);

  async function handleStatus() {
    setStatusBusy(true);
    const r = await updateUserStatus(id, newStatus as any);
    if (r?.success) { toast.success("Status updated"); await loadUser(); }
    else toast.error("Failed to update status");
    setStatusBusy(false);
  }

  async function applyWallet(op: "ADD" | "SUBTRACT" | "SET") {
    const amt = parseFloat(wAmount);
    if (!wAmount || isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!wReason.trim()) { toast.error("Reason / Note is required"); return; }
    setWOp(op);
    const r = await adminUpdateWallet(id, selCurrency, amt, op, wReason.trim());
    setWOp(null);
    if (r?.success) {
      toast.success(`${selCurrency} balance ${op === "ADD" ? "increased" : op === "SUBTRACT" ? "decreased" : "set"} successfully`);
      setWAmount(""); setWReason("");
      await loadUser();
    } else toast.error("Wallet update failed");
  }

  async function handleNotif() {
    if (!nTitle.trim() || !nMsg.trim()) { toast.error("Fill in title and message"); return; }
    setNBusy(true);
    const r = await adminSendNotification(id, nTitle.trim(), nMsg.trim(), nType);
    setNBusy(false);
    if (r?.success) { toast.success("Notification sent"); setNTitle(""); setNMsg(""); }
    else toast.error("Failed to send");
  }

  async function handleDelete() {
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Deletion failed");
        setDeleteBusy(false);
      } else {
        toast.success("User account permanently deleted");
        router.push("/admin/users");
      }
    } catch {
      toast.error("Network error — deletion failed");
      setDeleteBusy(false);
    }
  }

  // ── Loading / Not found ───────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-sky-400" />
    </div>
  );
  if (!user) return (
    <div className="text-center py-16 space-y-3">
      <div className="text-slate-400 text-sm">User not found.</div>
      {loadError && (
        <div className="max-w-lg mx-auto text-xs text-red-400/80 bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3 text-left break-words">
          <span className="font-semibold text-red-400">Error: </span>{loadError}
        </div>
      )}
      <Link href="/admin/users">
        <Button variant="outline" size="sm" className="border-white/10 text-slate-300 mt-2">
          <ArrowLeft size={13} className="mr-1" /> Back to Users
        </Button>
      </Link>
    </div>
  );

  // ── Derived data ──────────────────────────────────────────
  const wallets: Record<string, number> = {};
  for (const w of (user.wallets ?? [])) wallets[w.currency] = Number(w.balance ?? 0);

  const kyc        = user.verifications?.[0];
  const investment = user.investment;
  const activeCopies = (user.copyTrades ?? []).filter((t: any) => t.status === "ACTIVE");
  const transactions = (user.transactions ?? []).slice(0, 8);
  const adminLog   = (user.targetActions ?? []).slice(0, 8);
  const totalUsd   = wallets["USD"] ?? 0;
  const joined     = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

      {/* ─── HEADER ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white -ml-2 h-8 px-2">
            <ArrowLeft size={14} className="mr-1" /> Users
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-extrabold text-white shadow-lg"
            style={{ background: `hsl(${avatarHue(user.name ?? "", user.email)} 55% 22%)`, border: `1.5px solid hsl(${avatarHue(user.name ?? "", user.email)} 55% 32%)` }}
          >
            {initials(user.name ?? "", user.email)}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-white leading-tight truncate">
              {user.name || "Unnamed User"}
            </h1>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusChip s={user.status} />
          <span className="text-xs text-slate-500 hidden sm:block">Joined {joined}</span>
        </div>
      </div>

      {/* ─── STAT CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "USD Balance",
            value: `$${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            color: "text-white",
          },
          {
            label: "Transactions",
            value: user.transactions?.length ?? 0,
            color: "text-sky-400",
          },
          {
            label: "KYC Status",
            value: kyc?.status ?? "None",
            color: kyc?.status === "APPROVED" ? "text-emerald-400" : kyc?.status === "PENDING" ? "text-yellow-400" : "text-slate-500",
          },
          {
            label: "Active Copies",
            value: activeCopies.length,
            color: activeCopies.length > 0 ? "text-purple-400" : "text-slate-500",
          },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-3.5 border border-white/[0.06]">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{s.label}</div>
            <div className={`text-base font-extrabold truncate ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ─── ACCOUNT STATUS + SEND NOTIFICATION ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Account Status */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={15} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white">Account Status</h2>
          </div>
          <div className="space-y-4">
            <div>
              <span className={LABEL}>Current</span>
              <div className="mt-2"><StatusChip s={user.status} /></div>
            </div>
            <div>
              <label className={LABEL} htmlFor="status-sel">Change To</label>
              <div className="relative mt-1.5">
                <select
                  id="status-sel"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className={INPUT + " appearance-none pr-8"}
                >
                  {STATUS_OPTS.map(s => (
                    <option key={s} value={s} className="bg-[#0d1e3a]">{s}</option>
                  ))}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
            <Button
              onClick={handleStatus}
              disabled={statusBusy || newStatus === user.status}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold h-9 text-sm"
            >
              {statusBusy
                ? <Loader2 size={13} className="animate-spin mr-1.5" />
                : <ShieldCheck size={13} className="mr-1.5" />}
              Update Status
            </Button>
          </div>
        </div>

        {/* Send Notification */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-5">
            <Bell size={15} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white">Send Notification</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Title</label>
              <input className={INPUT + " mt-1.5"} placeholder="e.g. Account Update" value={nTitle} onChange={e => setNTitle(e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Message</label>
              <textarea
                rows={3}
                className={INPUT + " mt-1.5 resize-none"}
                placeholder="Write your message to the user…"
                value={nMsg}
                onChange={e => setNMsg(e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL}>Type</label>
              <div className="relative mt-1.5">
                <select value={nType} onChange={e => setNType(e.target.value)} className={INPUT + " appearance-none pr-8"}>
                  {["INFO", "SUCCESS", "WARNING", "ERROR"].map(t => (
                    <option key={t} value={t} className="bg-[#0d1e3a]">{t}</option>
                  ))}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
            <Button
              onClick={handleNotif}
              disabled={nBusy}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold h-9 text-sm"
            >
              {nBusy
                ? <Loader2 size={13} className="animate-spin mr-1.5" />
                : <Bell size={13} className="mr-1.5" />}
              Send Notification
            </Button>
          </div>
        </div>
      </div>

      {/* ─── WALLET MANAGER ──────────────────────────────── */}
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-5">
          <Wallet size={15} className="text-sky-400" />
          <h2 className="text-sm font-bold text-white">Wallet Manager</h2>
        </div>

        {/* Balance overview — clickable to select */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {CURRENCIES.map(c => (
            <button
              key={c}
              onClick={() => setSelCurrency(c)}
              className={`rounded-xl p-3.5 border text-left transition-all ${selCurrency === c ? "border-sky-500/60 bg-sky-500/10 shadow-[0_0_0_1px_rgba(14,165,233,0.2)]" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${selCurrency === c ? "text-sky-400" : "text-slate-500"}`}>{c}</span>
                {selCurrency === c && <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
              </div>
              <div className="text-sm font-extrabold text-white leading-tight">{fmtBalance(c, wallets[c] ?? 0)}</div>
            </button>
          ))}
        </div>

        {/* Adjustment form */}
        <div className="border-t border-white/[0.06] pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Adjust <span className="text-sky-400">{selCurrency}</span> Balance
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className={LABEL}>Amount <span className="text-red-400">*</span></label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                  {selCurrency === "USD" || selCurrency === "USDT" ? "$" : selCurrency === "BTC" ? "₿" : "Ξ"}
                </span>
                <input
                  type="number" step="any" min="0"
                  className={INPUT + " pl-7"}
                  placeholder="0.00"
                  value={wAmount}
                  onChange={e => setWAmount(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Reason / Note <span className="text-red-400">*</span></label>
              <input
                className={INPUT + " mt-1.5"}
                placeholder="e.g. Deposit correction, bonus credit…"
                value={wReason}
                onChange={e => setWReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              size="sm"
              disabled={wOp !== null}
              onClick={() => applyWallet("ADD")}
              className="h-9 px-5 text-sm font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25"
            >
              {wOp === "ADD"
                ? <Loader2 size={13} className="animate-spin mr-1.5" />
                : <PlusCircle size={13} className="mr-1.5" />}
              Add Funds
            </Button>
            <Button
              size="sm"
              disabled={wOp !== null}
              onClick={() => applyWallet("SUBTRACT")}
              className="h-9 px-5 text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25"
            >
              {wOp === "SUBTRACT"
                ? <Loader2 size={13} className="animate-spin mr-1.5" />
                : <MinusCircle size={13} className="mr-1.5" />}
              Subtract Funds
            </Button>
            <Button
              size="sm"
              disabled={wOp !== null}
              onClick={() => applyWallet("SET")}
              className="h-9 px-5 text-sm font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25"
            >
              {wOp === "SET"
                ? <Loader2 size={13} className="animate-spin mr-1.5" />
                : <RefreshCw size={13} className="mr-1.5" />}
              Set Balance
            </Button>
          </div>
        </div>
      </div>

      {/* ─── INVESTMENT + COPY TRADERS ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Active Investment Plan */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white">Active Investment Plan</h2>
          </div>
          {investment ? (
            <div className="space-y-0 divide-y divide-white/[0.05]">
              {[
                { label: "Plan",         value: investment.planName,                         cls: "text-white font-semibold" },
                { label: "Invested",     value: `$${Number(investment.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, cls: "text-sky-400 font-bold" },
                { label: "Total Earned", value: `$${Number(investment.totalEarned).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, cls: "text-emerald-400 font-bold" },
                { label: "Profit Range", value: `${Number(investment.minProfit)}% – ${Number(investment.maxProfit)}%`, cls: "text-slate-300" },
                { label: "Interval",     value: `${investment.profitInterval}s – ${investment.maxInterval}s`, cls: "text-slate-400" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-slate-500">{r.label}</span>
                  <span className={`text-xs ${r.cls}`}>{r.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-slate-500">Status</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${investment.status === "ACTIVE" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"}`}>
                  {investment.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp size={24} className="text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No active investment plan</p>
            </div>
          )}
        </div>

        {/* Active Copy Traders */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white">Selected Copy Traders</h2>
            {activeCopies.length > 0 && (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
                {activeCopies.length} active
              </span>
            )}
          </div>
          {activeCopies.length > 0 ? (
            <div className="space-y-0 divide-y divide-white/[0.05]">
              {activeCopies.map((t: any) => {
                const hue = [...t.traderName].reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
                const ini = t.traderName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                const roi = Number(t.amount) > 0 ? ((Number(t.totalEarned) / Number(t.amount)) * 100).toFixed(1) : "0.0";
                return (
                  <div key={t.id} className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-white/10">
                      {t.trader?.avatarUrl
                        ? <img src={t.trader.avatarUrl} alt={t.traderName} className="w-full h-full object-cover" />
                        : <span style={{ background: `hsl(${hue} 55% 22%)` }} className="w-full h-full flex items-center justify-center">{ini}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{t.traderName}</div>
                      <div className="text-[10px] text-slate-500">${Number(t.amount).toLocaleString()} copied</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-emerald-400">${Number(t.totalEarned).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-slate-500">+{roi}% ROI</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users size={24} className="text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No active copy traders</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── RECENT TRANSACTIONS + ADMIN LOG ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Recent Transactions */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={15} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white">Recent Transactions</h2>
          </div>
          {transactions.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 py-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 ${TX_CLR[tx.type] ?? "bg-slate-500/10 text-slate-400"}`}>
                    {tx.type.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">{tx.type.replace(/_/g, " ")}</div>
                    <div className="text-[10px] text-slate-500 truncate">{tx.description || "—"}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold text-white">
                      {Number(tx.amount).toFixed(tx.currency === "BTC" ? 8 : tx.currency === "ETH" ? 6 : 2)} {tx.currency}
                    </div>
                    <div className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Receipt size={24} className="text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No transactions yet</p>
            </div>
          )}
        </div>

        {/* Admin Action Log */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={15} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white">Admin Action Log</h2>
          </div>
          {adminLog.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {adminLog.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500/50 flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">{a.action.replace(/_/g, " ")}</div>
                    {a.description && (
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{a.description}</div>
                    )}
                    {a.admin && (
                      <div className="text-[10px] text-slate-600 mt-0.5">by {a.admin.name || a.admin.email}</div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList size={24} className="text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No admin actions on record</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── DANGER ZONE ─────────────────────────────────── */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-red-400" />
              <h2 className="text-sm font-bold text-red-400">Danger Zone</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Permanently delete this user account and all associated data including wallets,
              transactions, investments, copy trading history, and KYC records.
              This action <span className="text-red-400 font-medium">cannot be undone</span>.
            </p>
          </div>
          <Button
            onClick={() => setShowDeleteModal(true)}
            className="flex-shrink-0 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 font-bold h-9 px-5 text-sm"
          >
            <Trash2 size={13} className="mr-1.5" /> Delete User
          </Button>
        </div>
      </div>

      {/* ─── DELETE CONFIRMATION MODAL ───────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => !deleteBusy && setShowDeleteModal(false)}
        >
          <div
            className="glass-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete User Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">Permanent — cannot be undone</p>
              </div>
            </div>

            <div className="mb-5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-sm font-semibold text-white">{user.name || "Unnamed User"}</div>
              <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Are you sure you want to permanently delete this user? All wallets, balances,
              transactions, investments, copy trading data, and KYC records will be removed.{" "}
              <span className="text-red-400 font-semibold">This cannot be undone.</span>
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-slate-300 hover:text-white h-10"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold h-10"
                onClick={handleDelete}
                disabled={deleteBusy}
              >
                {deleteBusy
                  ? <Loader2 size={14} className="animate-spin mr-1.5" />
                  : <Trash2 size={14} className="mr-1.5" />}
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
