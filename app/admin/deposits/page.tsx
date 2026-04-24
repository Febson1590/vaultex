"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { processDepositRequest } from "@/lib/actions/admin";
import { formatCurrency, formatDateTime, getStatusBg } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Clock, Loader2, FileImage, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface DepositWalletInfo {
  asset:   string;
  network: string | null;
  address: string;
  label:   string;
}

interface AdminDeposit {
  id:            string;
  userId:        string;
  currency:      string;
  amount:        string | number;
  method:        string;
  status:        "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING";
  proofUrl:      string | null;
  txHash:        string | null;
  walletId:      string | null;
  cryptoAmount:  string | number | null;
  cryptoSymbol:  string | null;
  cryptoNetwork: string | null;
  exchangeRate:  string | number | null;
  createdAt:     string;
  user:          { id: string; name: string | null; email: string } | null;
  wallet:        DepositWalletInfo | null;
}

function shortAddress(addr: string, head = 10, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  // Reject opens a modal to collect the required reason — the server
  // action rejects an empty/whitespace-only notes field outright.
  const [rejectTarget, setRejectTarget] = useState<AdminDeposit | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchDeposits = () => {
    setLoading(true);
    fetch("/api/admin/deposits")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDeposits(data);
        else setDeposits([]);
      })
      .catch(() => setDeposits([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeposits(); }, []);

  const handle = async (id: string, action: "APPROVE" | "REJECT") => {
    setProcessing(id);
    const result = await processDepositRequest(id, action);
    if (result?.success) {
      toast.success(`Deposit ${action.toLowerCase()}d`);
      fetchDeposits();
    } else {
      toast.error(result?.error || "Failed");
    }
    setProcessing(null);
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) { toast.error("Please enter a rejection reason"); return; }
    setProcessing(rejectTarget.id);
    const result = await processDepositRequest(rejectTarget.id, "REJECT", reason);
    if (result?.success) {
      toast.success("Deposit rejected");
      setRejectTarget(null);
      setRejectReason("");
      fetchDeposits();
    } else {
      toast.error(result?.error || "Failed");
    }
    setProcessing(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Deposit Requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review and approve user deposit requests
        </p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">
            {deposits.filter((d) => d.status === "PENDING").length} Pending
          </span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Loader2 size={14} className="inline animate-spin mr-2" />
            Loading…
          </div>
        ) : deposits.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No deposit requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["User", "Amount", "Coin / Network", "Wallet Address", "Proof", "Date", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deposits.map((dep) => (
                  <tr key={dep.id} className="border-b border-white/5 hover:bg-white/[0.02] align-top">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{dep.user?.name || "—"}</div>
                      <div className="text-xs text-slate-500">{dep.user?.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-white tabular-nums">
                        {formatCurrency(Number(dep.amount))}
                      </div>
                      {dep.cryptoAmount !== null && dep.cryptoSymbol && (
                        <div className="text-[10.5px] text-slate-500 tabular-nums mt-0.5">
                          {Number(dep.cryptoAmount).toLocaleString("en-US", { maximumFractionDigits: 8 })} {dep.cryptoSymbol}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-semibold">{dep.cryptoSymbol || dep.currency}</div>
                      <div className="text-[11px] text-slate-500">
                        {dep.cryptoNetwork || dep.wallet?.network || dep.method || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {dep.wallet?.address ? (
                        <div>
                          <code className="text-[11px] text-slate-200 font-mono">
                            {shortAddress(dep.wallet.address, 12, 5)}
                          </code>
                          {dep.wallet.label && (
                            <div className="text-[10px] text-slate-500 mt-0.5">{dep.wallet.label}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {dep.proofUrl ? (
                        <a
                          href={dep.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                        >
                          <FileImage size={12} />
                          View <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-600">No proof</span>
                      )}
                      {dep.txHash && (
                        <div className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-[120px]" title={dep.txHash}>
                          {dep.txHash}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(dep.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(dep.status)}`}>
                        {dep.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dep.status === "PENDING" && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            disabled={!!processing}
                            onClick={() => handle(dep.id, "APPROVE")}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 h-7 px-2 text-xs"
                          >
                            {processing === dep.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <><CheckCircle2 size={11} className="mr-1" />Approve</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!!processing}
                            onClick={() => { setRejectTarget(dep); setRejectReason(""); }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 h-7 px-2 text-xs"
                          >
                            <XCircle size={11} className="mr-1" />Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Reject reason modal ─────────────────────────────────── */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => processing ? null : setRejectTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(10,18,34,0.98)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-white">Reject deposit</h2>
            <p className="text-xs text-slate-500 mt-1">
              {rejectTarget.user?.email} · {formatCurrency(Number(rejectTarget.amount))}
            </p>
            <p className="text-[12.5px] text-slate-400 mt-3">
              This reason is shown to the user in their notification and email.
            </p>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Could not verify the transaction on-chain."
              rows={4}
              className="mt-2 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/40 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Button
                disabled={!!processing}
                onClick={() => setRejectTarget(null)}
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.07] text-slate-300 border border-white/10 font-semibold text-[13px]"
              >
                Cancel
              </Button>
              <Button
                disabled={!!processing || !rejectReason.trim()}
                onClick={submitReject}
                className="flex-1 h-10 bg-red-500 hover:bg-red-400 text-white font-semibold text-[13px] disabled:opacity-50"
              >
                {processing === rejectTarget.id
                  ? <Loader2 size={13} className="animate-spin" />
                  : "Confirm reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
