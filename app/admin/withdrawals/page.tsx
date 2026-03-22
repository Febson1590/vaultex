"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { processWithdrawalRequest } from "@/lib/actions/admin";
import { formatCurrency, formatDateTime, getStatusBg } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchWithdrawals = () => {
    fetch("/api/admin/withdrawals")
      .then((r) => r.json())
      .then(setWithdrawals)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWithdrawals(); }, []);

  const handle = async (id: string, action: "APPROVE" | "REJECT") => {
    setProcessing(id);
    const result = await processWithdrawalRequest(id, action);
    if (result?.success) { toast.success(`Withdrawal ${action.toLowerCase()}d`); fetchWithdrawals(); }
    else toast.error(result?.error || "Failed");
    setProcessing(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdrawal Requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and process user withdrawal requests</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">
            {withdrawals.filter((w) => w.status === "PENDING").length} Pending
          </span>
          <span className="text-xs text-slate-500 ml-2">— {withdrawals.length} total</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading...</div>
        ) : withdrawals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No withdrawal requests yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["User", "Amount", "Currency", "Method", "Destination", "Date", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{w.user?.name}</div>
                      <div className="text-xs text-slate-500">{w.user?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-white">{formatCurrency(Number(w.amount))}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{w.currency}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{w.method}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate font-mono">
                      {w.destination || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(w.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(w.status)}`}>{w.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {w.status === "PENDING" && (
                        <div className="flex gap-1.5">
                          <Button size="sm" disabled={!!processing} onClick={() => handle(w.id, "APPROVE")}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 h-7 px-2 text-xs">
                            {processing === w.id ? <Loader2 size={11} className="animate-spin" /> : <><CheckCircle2 size={11} className="mr-1" />Approve</>}
                          </Button>
                          <Button size="sm" disabled={!!processing} onClick={() => handle(w.id, "REJECT")}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 h-7 px-2 text-xs">
                            <XCircle size={11} className="mr-1" />Reject
                          </Button>
                        </div>
                      )}
                      {w.status !== "PENDING" && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <ArrowUpRight size={12} />
                          <span>{w.processedAt ? formatDateTime(w.processedAt) : "—"}</span>
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
    </div>
  );
}
