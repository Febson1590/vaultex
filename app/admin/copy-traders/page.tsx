"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Users, Plus, StopCircle, ChevronDown,
  UserPlus, Edit2, Trash2, AlertTriangle,
} from "lucide-react";
import {
  adminCreateCopyTrader, adminUpdateCopyTrader, adminDeleteCopyTrader,
  adminAssignCopyTrade, adminStopCopyTrade,
  adminGetAllCopyTraders, adminGetAllCopyTrades, adminGetAllUsers,
} from "@/lib/actions/investment";

interface CopyTrader {
  id: string; name: string; avatarUrl: string | null;
  country: string | null; specialty: string | null; description: string | null;
  winRate: number; totalROI: number; performance30d: number;
  riskLevel: string; followers: number;
  totalTrades: number; successfulTrades: number; failedTrades: number; maxDrawdown: number;
  minCopyAmount: number; maxCopyAmount: number | null;
  profitInterval: number; maxInterval: number;
  minProfit: number; maxProfit: number;
  isActive: boolean; userCopyTrades: { id: string }[];
}
interface CopyTrade {
  id: string; traderName: string; amount: number; totalEarned: number;
  status: string; startedAt: string; user: { name: string | null; email: string };
}
interface UserOption { id: string; name: string | null; email: string }

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
const STATUS_COLORS: Record<string, string> = {
  ACTIVE:  "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  PAUSED:  "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
  STOPPED: "bg-red-500/10 border-red-500/25 text-red-400",
};
const inputCls = "w-full bg-white/[0.06] border border-white/[0.15] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60";
const labelCls = "text-xs font-medium text-slate-400 uppercase tracking-wider";

// ── Image compression — resize to max 300×300, JPEG 75% (~30–80 KB) ──────────
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = ev => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const MAX = 300;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round((h * MAX) / w); w = MAX; }
          else { w = Math.round((w * MAX) / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Trader Create / Edit Modal ────────────────────────────────────────────────
function TraderModal({ trader, onClose, onSuccess }: {
  trader?: CopyTrader; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name:             trader?.name ?? "",
    country:          trader?.country ?? "",
    specialty:        trader?.specialty ?? "",
    description:      trader?.description ?? "",
    winRate:          String(trader?.winRate ?? 85),
    totalROI:         String(trader?.totalROI ?? 120),
    performance30d:   String(trader?.performance30d ?? 12),
    riskLevel:        trader?.riskLevel ?? "MEDIUM",
    followers:        String(trader?.followers ?? 1200),
    totalTrades:      String(trader?.totalTrades ?? 120),
    successfulTrades: String(trader?.successfulTrades ?? 95),
    failedTrades:     String(trader?.failedTrades ?? 25),
    maxDrawdown:      String(trader?.maxDrawdown ?? -8),
    minCopyAmount:    String(trader?.minCopyAmount ?? 100),
    maxCopyAmount:    trader?.maxCopyAmount !== null && trader?.maxCopyAmount !== undefined ? String(trader.maxCopyAmount) : "",
    profitInterval:   String(trader?.profitInterval ?? 60),
    maxInterval:      String(trader?.maxInterval ?? 60),
    minProfit:        String(trader?.minProfit ?? 0.3),
    maxProfit:        String(trader?.maxProfit ?? 1.2),
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(trader?.avatarUrl ?? null);
  const [imgLoading, setImgLoading] = useState(false);
  const [loading, setLoading]       = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { toast.error("Only JPG, PNG, WEBP allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max file size is 5MB"); return; }
    setImgLoading(true);
    try {
      const compressed = await compressImage(file);
      setAvatarUrl(compressed);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to process image");
    } finally {
      setImgLoading(false);
    }
  }

  async function submit() {
    if (!form.name.trim()) { toast.error("Trader name is required"); return; }
    setLoading(true);
    try {
      const maxCopyParsed = form.maxCopyAmount.trim() ? parseFloat(form.maxCopyAmount) : null;
      const payload = {
        name:             form.name.trim(),
        avatarUrl:        avatarUrl ?? undefined,
        country:          form.country.trim().toUpperCase() || undefined,
        specialty:        form.specialty || undefined,
        description:      form.description || undefined,
        winRate:          parseFloat(form.winRate)         || 0,
        totalROI:         parseFloat(form.totalROI)        || 0,
        performance30d:  parseFloat(form.performance30d)   || 0,
        riskLevel:        form.riskLevel || "MEDIUM",
        followers:        parseInt(form.followers)         || 0,
        totalTrades:      parseInt(form.totalTrades)       || 0,
        successfulTrades: parseInt(form.successfulTrades)  || 0,
        failedTrades:     parseInt(form.failedTrades)      || 0,
        maxDrawdown:      parseFloat(form.maxDrawdown)     || 0,
        minCopyAmount:    parseFloat(form.minCopyAmount)   || 0,
        maxCopyAmount:    maxCopyParsed,
        profitInterval:   parseInt(form.profitInterval)    || 60,
        maxInterval:      parseInt(form.maxInterval)       || 60,
        minProfit:        parseFloat(form.minProfit)       || 0,
        maxProfit:        parseFloat(form.maxProfit)       || 0,
      };
      const r = trader
        ? await adminUpdateCopyTrader(trader.id, payload)
        : await adminCreateCopyTrader(payload);

      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(trader ? "Trader updated!" : "Trader created!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white mb-5">
          {trader ? "Edit Trader" : "Create Copy Trader"}
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Trader Name *</label>
            <input
              className={inputCls + " mt-1"}
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Alex Rivers"
            />
          </div>

          {/* Photo */}
          <div>
            <label className={labelCls}>Trader Photo (optional)</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/10 bg-white/[0.06] flex items-center justify-center">
                {imgLoading
                  ? <Loader2 size={18} className="animate-spin text-sky-400" />
                  : avatarUrl
                    ? <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    : <span className="text-[10px] text-slate-500 text-center leading-tight px-1">No photo</span>
                }
              </div>
              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.15] text-xs text-slate-300 hover:bg-white/[0.10] hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {avatarUrl ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={imgLoading}
                  />
                </label>
                <p className="text-[10px] text-slate-500 mt-1.5">JPG, PNG, WEBP · Max 5MB · Auto-compressed</p>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="text-[10px] text-red-400 hover:text-red-300 mt-1 transition-colors"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Country + Specialty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Country code</label>
              <input
                className={inputCls + " mt-1 uppercase"}
                value={form.country}
                onChange={e => set("country", e.target.value.slice(0, 2).toUpperCase())}
                placeholder="US, GB, DE…"
                maxLength={2}
              />
            </div>
            <div>
              <label className={labelCls}>Specialty</label>
              <input
                className={inputCls + " mt-1"}
                value={form.specialty}
                onChange={e => set("specialty", e.target.value)}
                placeholder="e.g. BTC/ETH Scalping"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <input
              className={inputCls + " mt-1"}
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Short bio shown on trader page"
            />
          </div>

          {/* 30d performance / Win Rate / Risk level */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>30-day %</label>
              <input type="number" step="0.1" className={inputCls + " mt-1"} value={form.performance30d} onChange={e => set("performance30d", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Win rate (%)</label>
              <input type="number" className={inputCls + " mt-1"} value={form.winRate} onChange={e => set("winRate", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Risk</label>
              <select value={form.riskLevel} onChange={e => set("riskLevel", e.target.value)}
                className={inputCls + " mt-1"}>
                <option value="LOW" className="bg-[#0d1e3a]">Low</option>
                <option value="MEDIUM" className="bg-[#0d1e3a]">Medium</option>
                <option value="HIGH" className="bg-[#0d1e3a]">High</option>
              </select>
            </div>
          </div>

          {/* Followers + Total ROI */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Followers</label>
              <input type="number" className={inputCls + " mt-1"} value={form.followers} onChange={e => set("followers", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Total ROI (%)</label>
              <input type="number" step="0.1" className={inputCls + " mt-1"} value={form.totalROI} onChange={e => set("totalROI", e.target.value)} />
            </div>
          </div>

          {/* Trading stats: total / successful / failed / drawdown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Total trades</label>
              <input type="number" className={inputCls + " mt-1"} value={form.totalTrades} onChange={e => set("totalTrades", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Successful</label>
              <input type="number" className={inputCls + " mt-1"} value={form.successfulTrades} onChange={e => set("successfulTrades", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Failed</label>
              <input type="number" className={inputCls + " mt-1"} value={form.failedTrades} onChange={e => set("failedTrades", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Max drawdown (%)</label>
              <input type="number" step="0.1" className={inputCls + " mt-1"} value={form.maxDrawdown} onChange={e => set("maxDrawdown", e.target.value)} />
            </div>
          </div>

          {/* Copy limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min copy (USD)</label>
              <input type="number" className={inputCls + " mt-1"} value={form.minCopyAmount} onChange={e => set("minCopyAmount", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Max copy (USD) <span className="text-slate-600">— optional</span></label>
              <input type="number" className={inputCls + " mt-1"} value={form.maxCopyAmount} onChange={e => set("maxCopyAmount", e.target.value)} placeholder="Leave empty for no cap" />
            </div>
          </div>

          {/* Profit Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Profit (%)</label>
              <input type="number" step="0.01" className={inputCls + " mt-1"} value={form.minProfit} onChange={e => set("minProfit", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Max Profit (%)</label>
              <input type="number" step="0.01" className={inputCls + " mt-1"} value={form.maxProfit} onChange={e => set("maxProfit", e.target.value)} />
            </div>
          </div>

          {/* Intervals */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Interval (s)</label>
              <input type="number" className={inputCls + " mt-1"} value={form.profitInterval} onChange={e => set("profitInterval", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Max Interval (s)</label>
              <input type="number" className={inputCls + " mt-1"} value={form.maxInterval} onChange={e => set("maxInterval", e.target.value)} />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">Profit fires at a random time between Min and Max interval.</p>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            className="flex-1 border-white/10 text-slate-300 hover:text-white"
            onClick={() => !loading && onClose()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold"
            onClick={submit}
            disabled={loading || imgLoading}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin mr-1" />Saving…</>
              : trader ? "Save Changes" : "Create Trader"
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteTraderModal({
  trader,
  onCancel,
  onConfirm,
  busy,
}: {
  trader: CopyTrader;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const hue = [...trader.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const ini = trader.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="glass-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Delete Copy Trader</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action is permanent and irreversible</p>
          </div>
        </div>

        <div className="mb-5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
          {trader.avatarUrl ? (
            <img src={trader.avatarUrl} alt={trader.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/10" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: `hsl(${hue} 55% 22%)`, border: `1px solid hsl(${hue} 55% 32%)` }}>
              {ini}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-white">{trader.name}</div>
            <div className="text-xs text-slate-500">{trader.userCopyTrades.length} active {trader.userCopyTrades.length === 1 ? "copy" : "copies"} will be stopped</div>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          Are you sure you want to delete <span className="font-semibold text-white">{trader.name}</span>?
          All active copy trades referencing this trader will be removed.{" "}
          <span className="text-red-400 font-semibold">This cannot be undone.</span>
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-white/10 text-slate-300 hover:text-white h-10"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold h-10"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy
              ? <Loader2 size={14} className="animate-spin mr-1.5" />
              : <Trash2 size={14} className="mr-1.5" />}
            Delete Permanently
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Trade Modal ────────────────────────────────────────────────────────
function AssignTradeModal({ traders, users, onClose, onSuccess }: {
  traders: CopyTrader[]; users: UserOption[]; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ userId: "", traderId: "", amount: "" });
  const [loading, setLoading] = useState(false);
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.userId)  { toast.error("Select a user"); return; }
    if (!form.traderId){ toast.error("Select a trader"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      const r = await adminAssignCopyTrade({
        userId: form.userId,
        traderId: form.traderId,
        amount: parseFloat(form.amount),
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success("Copy trade assigned!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Assignment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-5">Assign Copy Trade</h3>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>User</label>
            <div className="relative mt-1">
              <select value={form.userId} onChange={e => set("userId", e.target.value)} className={inputCls + " appearance-none pr-8"}>
                <option value="" className="bg-[#0d1e3a]">Select user…</option>
                {users.map(u => <option key={u.id} value={u.id} className="bg-[#0d1e3a]">{u.name || "—"} ({u.email})</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Trader</label>
            <div className="relative mt-1">
              <select value={form.traderId} onChange={e => set("traderId", e.target.value)} className={inputCls + " appearance-none pr-8"}>
                <option value="" className="bg-[#0d1e3a]">Select trader…</option>
                {traders.filter(t => t.isActive).map(t => (
                  <option key={t.id} value={t.id} className="bg-[#0d1e3a]">{t.name} ({t.winRate}% win)</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Copy Amount (USD)</label>
            <input type="number" className={inputCls + " mt-1"} value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="e.g. 2000" />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1 border-white/10 text-slate-300 hover:text-white" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminCopyTradersPage() {
  const [traders,    setTraders]    = useState<CopyTrader[]>([]);
  const [trades,     setTrades]     = useState<CopyTrade[]>([]);
  const [users,      setUsers]      = useState<UserOption[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTrader, setEditTrader] = useState<CopyTrader | null>(null);
  const [deleteTrader, setDeleteTrader] = useState<CopyTrader | null>(null);
  const [deleteBusy,   setDeleteBusy]   = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [tab, setTab] = useState<"traders" | "assignments">("traders");

  async function load() {
    setLoading(true);
    try {
      const [trs, tds, usrs] = await Promise.all([
        adminGetAllCopyTraders(), adminGetAllCopyTrades(), adminGetAllUsers(),
      ]);
      setTraders(trs.map((t: any) => ({
        ...t,
        winRate:       Number(t.winRate),
        totalROI:      Number(t.totalROI),
        minCopyAmount: Number(t.minCopyAmount),
        minProfit:     Number(t.minProfit),
        maxProfit:     Number(t.maxProfit),
        maxInterval:   t.maxInterval ?? t.profitInterval,
      })));
      setTrades(tds.map((t: any) => ({
        ...t,
        amount:      Number(t.amount),
        totalEarned: Number(t.totalEarned),
        startedAt:   new Date(t.startedAt).toISOString(),
      })));
      setUsers(usrs);
    } catch (err: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleStop(tradeId: string) {
    if (!confirm("Stop this copy trade?")) return;
    setProcessing(tradeId);
    try {
      const r = await adminStopCopyTrade(tradeId);
      if (r.error) toast.error(r.error);
      else { toast.success("Stopped"); load(); }
    } catch { toast.error("Failed to stop trade"); }
    setProcessing(null);
  }

  async function confirmDeleteTrader() {
    if (!deleteTrader) return;
    setDeleteBusy(true);
    try {
      const r = await adminDeleteCopyTrader(deleteTrader.id);
      if (r.error) {
        toast.error(r.error);
      } else {
        toast.success(`${deleteTrader.name} deleted`);
        setTraders(prev => prev.filter(t => t.id !== deleteTrader.id));
        setDeleteTrader(null);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-sky-400" /> Copy Traders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage traders and user copy assignments</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAssign(true)}
            variant="outline"
            className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-sm h-9 px-4"
          >
            <UserPlus size={14} className="mr-1.5" /> Assign Trade
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm h-9 px-4"
          >
            <Plus size={14} className="mr-1.5" /> New Trader
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Traders",        value: traders.length,                                    color: "text-white" },
          { label: "Active Traders", value: traders.filter(t => t.isActive).length,            color: "text-emerald-400" },
          { label: "Active Copies",  value: trades.filter(t => t.status === "ACTIVE").length,  color: "text-sky-400" },
          { label: "Total Earned",   value: fmt(trades.reduce((s, t) => s + t.totalEarned, 0)), color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {(["traders", "assignments"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "text-sky-400 border-b-2 border-sky-400" : "text-slate-500 hover:text-white"
            }`}
          >
            {t === "traders" ? `Traders (${traders.length})` : `Assignments (${trades.length})`}
          </button>
        ))}
      </div>

      {/* ── Traders Table ── */}
      {tab === "traders" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="text-sm font-semibold text-white">{traders.length} Trader{traders.length !== 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : traders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No traders yet. Create one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full premium-table">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Trader","Specialty","Win Rate","ROI","Followers","Profit Range","Interval","Copies","Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {traders.map(tr => {
                    const hue      = [...tr.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
                    const initials = tr.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={tr.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {tr.avatarUrl ? (
                              <img
                                src={tr.avatarUrl} alt={tr.name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ background: `hsl(${hue} 60% 25%)`, border: `1px solid hsl(${hue} 60% 35%)` }}
                              >
                                {initials}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-semibold text-white">{tr.name}</div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                tr.isActive
                                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                  : "bg-slate-500/10 border-slate-500/25 text-slate-400"
                              }`}>
                                {tr.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{tr.specialty || "—"}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-400">{tr.winRate}%</td>
                        <td className="px-4 py-3 text-sm font-semibold text-sky-400">+{tr.totalROI}%</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{tr.followers.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{tr.minProfit}%–{tr.maxProfit}%</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{tr.profitInterval}s–{tr.maxInterval}s</td>
                        <td className="px-4 py-3 text-xs text-white font-semibold">{tr.userCopyTrades.length}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => setEditTrader(tr)}
                              className="h-7 px-2 text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20"
                            >
                              <Edit2 size={11} className="mr-1" />Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setDeleteTrader(tr)}
                              className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                            >
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Assignments Table ── */}
      {tab === "assignments" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="text-sm font-semibold text-white">{trades.length} Assignment{trades.length !== 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : trades.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No assignments yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full premium-table">
                <thead>
                  <tr className="border-b border-white/5">
                    {["User","Trader","Amount","Earned","Status","Started","Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map(trade => (
                    <tr key={trade.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="text-sm text-white font-medium">{trade.user.name || "—"}</div>
                        <div className="text-xs text-slate-500">{trade.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-medium">{trade.traderName}</td>
                      <td className="px-4 py-3 text-sm font-bold text-white">{fmt(trade.amount)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-400">{fmt(trade.totalEarned)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[trade.status] || ""}`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(trade.startedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {trade.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            disabled={processing === trade.id}
                            onClick={() => handleStop(trade.id)}
                            className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                          >
                            {processing === trade.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <><StopCircle size={11} className="mr-1" />Stop</>
                            }
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate  && <TraderModal onClose={() => setShowCreate(false)} onSuccess={load} />}
      {editTrader  && <TraderModal trader={editTrader} onClose={() => setEditTrader(null)} onSuccess={load} />}
      {showAssign  && <AssignTradeModal traders={traders} users={users} onClose={() => setShowAssign(false)} onSuccess={load} />}
      {deleteTrader && (
        <DeleteTraderModal
          trader={deleteTrader}
          onCancel={() => !deleteBusy && setDeleteTrader(null)}
          onConfirm={confirmDeleteTrader}
          busy={deleteBusy}
        />
      )}
    </div>
  );
}
