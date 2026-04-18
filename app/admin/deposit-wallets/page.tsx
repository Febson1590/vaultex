"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Plus, Wallet, Pencil, Trash2, Copy, Check,
  ToggleLeft, ToggleRight, AlertTriangle, X,
} from "lucide-react";
import {
  adminGetAllDepositWallets,
  adminCreateDepositWallet,
  adminUpdateDepositWallet,
  adminToggleDepositWallet,
  adminDeleteDepositWallet,
} from "@/lib/actions/deposit-wallets";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface DepositWallet {
  id:           string;
  asset:        string;
  network:      string | null;
  address:      string;
  label:        string;
  minDeposit:   number | null;
  instructions: string | null;
  isActive:     boolean;
  createdAt:    string;
  updatedAt:    string;
}

/* ─── Styling helpers (matches other admin pages) ────────────────────── */

const inputCls  = "w-full bg-white/[0.06] border border-white/[0.15] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60";
const labelCls  = "text-xs font-medium text-slate-400 uppercase tracking-wider";

/* A short selection list so admins don't make typos. Free-form input is
   still allowed by typing into the field. */
const ASSET_SUGGESTIONS   = ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "XRP", "ADA", "DOGE", "TRX"];
const NETWORK_SUGGESTIONS = ["Bitcoin", "ERC20", "TRC20", "BEP20", "Solana", "Polygon", "Arbitrum"];

function shortAddress(addr: string, head = 14, tail = 6): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/* ═══════════════════════════════════════════════════════════════════════
   Create / Edit modal
═══════════════════════════════════════════════════════════════════════ */

function WalletModal({
  wallet, onClose, onSuccess,
}: {
  wallet?: DepositWallet;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    asset:        wallet?.asset ?? "",
    network:      wallet?.network ?? "",
    address:      wallet?.address ?? "",
    label:        wallet?.label ?? "",
    minDeposit:   wallet?.minDeposit != null ? String(wallet.minDeposit) : "",
    instructions: wallet?.instructions ?? "",
    isActive:     wallet?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.asset.trim())   { toast.error("Coin / symbol is required"); return; }
    if (!form.address.trim()) { toast.error("Wallet address is required"); return; }

    const minDepositParsed = form.minDeposit.trim() ? parseFloat(form.minDeposit) : null;
    if (minDepositParsed !== null && (isNaN(minDepositParsed) || minDepositParsed < 0)) {
      toast.error("Minimum deposit must be a valid number");
      return;
    }

    setLoading(true);
    const payload = {
      asset:        form.asset.trim().toUpperCase(),
      network:      form.network.trim() || null,
      address:      form.address.trim(),
      label:        form.label.trim() || `${form.asset.trim().toUpperCase()} ${form.network.trim()}`.trim(),
      minDeposit:   minDepositParsed,
      instructions: form.instructions.trim() || null,
      isActive:     form.isActive,
    };

    const r = wallet
      ? await adminUpdateDepositWallet(wallet.id, payload)
      : await adminCreateDepositWallet(payload);

    setLoading(false);

    if ("error" in r && r.error) { toast.error(r.error); return; }
    toast.success(wallet ? "Wallet updated" : "Wallet created");
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card border border-sky-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">
              {wallet ? "Edit Deposit Wallet" : "Add Deposit Wallet"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Users deposit to this address when the coin is selected.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0 ml-2"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Coin / Symbol</label>
              <input
                list="asset-suggestions"
                className={inputCls + " mt-1 uppercase"}
                value={form.asset}
                onChange={(e) => set("asset", e.target.value.toUpperCase())}
                placeholder="BTC"
              />
              <datalist id="asset-suggestions">
                {ASSET_SUGGESTIONS.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Network</label>
              <input
                list="network-suggestions"
                className={inputCls + " mt-1"}
                value={form.network}
                onChange={(e) => set("network", e.target.value)}
                placeholder="ERC20"
              />
              <datalist id="network-suggestions">
                {NETWORK_SUGGESTIONS.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className={labelCls}>Wallet Address</label>
            <input
              className={inputCls + " mt-1 font-mono text-[12px]"}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="bc1q… / 0x… / T…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Label</label>
              <input
                className={inputCls + " mt-1"}
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                placeholder="BTC Hot Wallet"
              />
            </div>
            <div>
              <label className={labelCls}>Min Deposit (USD)</label>
              <input
                type="number"
                step="0.01"
                className={inputCls + " mt-1"}
                value={form.minDeposit}
                onChange={(e) => set("minDeposit", e.target.value)}
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Instructions <span className="text-slate-600">— optional</span>
            </label>
            <textarea
              rows={3}
              className={inputCls + " mt-1 resize-none"}
              value={form.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              placeholder="Include a memo, confirmations required, etc."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-300">
              Active <span className="text-slate-500">(users can deposit to this wallet)</span>
            </span>
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            className="flex-1 border-white/10 text-slate-300 hover:text-white"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold"
            onClick={submit}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {wallet ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Delete confirm
═══════════════════════════════════════════════════════════════════════ */

function DeleteDialog({
  wallet, onClose, onSuccess,
}: {
  wallet: DepositWallet;
  onClose:  () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function confirmDelete() {
    setLoading(true);
    const r = await adminDeleteDepositWallet(wallet.id);
    setLoading(false);
    if ("error" in r && r.error) { toast.error(r.error); return; }
    toast.success("Wallet deleted");
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Delete Wallet?</h3>
            <p className="text-[11.5px] text-slate-400 mt-1 leading-relaxed">
              Users will no longer be able to deposit {wallet.asset}
              {wallet.network ? ` on ${wallet.network}` : ""}.
              Existing deposit records are kept.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button
            variant="outline"
            className="flex-1 border-white/10 text-slate-300 hover:text-white"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold"
            onClick={confirmDelete}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════════════ */

export default function AdminDepositWalletsPage() {
  const [wallets, setWallets] = useState<DepositWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DepositWallet | null>(null);
  const [deleting, setDeleting] = useState<DepositWallet | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  async function fetchWallets() {
    setLoading(true);
    const r = await adminGetAllDepositWallets();
    if ("error" in r && r.error) {
      toast.error(r.error);
      setWallets([]);
    } else if ("wallets" in r && r.wallets) {
      setWallets(r.wallets);
    } else {
      setWallets([]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchWallets(); }, []);

  async function copyAddress(w: DepositWallet) {
    try {
      await navigator.clipboard.writeText(w.address);
      setCopiedId(w.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast.error("Could not copy");
    }
  }

  async function toggleActive(w: DepositWallet) {
    setToggling(w.id);
    const r = await adminToggleDepositWallet(w.id);
    setToggling(null);
    if ("error" in r && r.error) { toast.error(r.error); return; }
    toast.success(`Wallet ${w.isActive ? "deactivated" : "activated"}`);
    fetchWallets();
  }

  const activeCount = wallets.filter((w) => w.isActive).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Deposit Wallets</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage the cryptocurrency wallets users deposit to.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold"
        >
          <Plus size={14} className="mr-1.5" />
          Add Wallet
        </Button>
      </div>

      {/* Summary bar */}
      <div className="glass-card rounded-xl p-4 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-sky-400" />
        <span className="text-sm font-semibold text-white">
          {wallets.length} total · {activeCount} active
        </span>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            Loading wallets…
          </div>
        ) : wallets.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <div className="text-sm text-white font-semibold mb-1">No deposit wallets yet</div>
            <div className="text-xs text-slate-500 mb-4">
              Add a wallet so users can start depositing.
            </div>
            <Button
              onClick={() => setCreating(true)}
              className="bg-sky-500 hover:bg-sky-400 text-white font-semibold"
            >
              <Plus size={14} className="mr-1.5" />
              Add Your First Wallet
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr className="border-b border-white/5">
                  {["Coin", "Network", "Address", "Min Deposit", "Status", "Actions"].map((h) => (
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
                {wallets.map((w) => (
                  <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{w.asset}</div>
                      <div className="text-[11px] text-slate-500">{w.label}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {w.network || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-[11.5px] text-slate-200 font-mono">
                          {shortAddress(w.address, 14, 5)}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyAddress(w)}
                          className="text-slate-500 hover:text-sky-400 transition-colors flex-shrink-0"
                          aria-label="Copy address"
                        >
                          {copiedId === w.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 tabular-nums">
                      {w.minDeposit != null
                        ? `$${w.minDeposit.toLocaleString("en-US")}`
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          w.isActive
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                            : "bg-slate-500/10 border-slate-500/25 text-slate-400"
                        }`}
                      >
                        {w.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleActive(w)}
                          disabled={toggling === w.id}
                          className="h-7 w-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-slate-300 transition-colors"
                          title={w.isActive ? "Deactivate" : "Activate"}
                        >
                          {toggling === w.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : w.isActive ? (
                            <ToggleRight size={14} className="text-emerald-400" />
                          ) : (
                            <ToggleLeft size={14} className="text-slate-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(w)}
                          className="h-7 w-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-slate-300 transition-colors"
                          title="Edit wallet"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(w)}
                          className="h-7 w-7 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                          title="Delete wallet"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {creating && (
        <WalletModal
          onClose={() => setCreating(false)}
          onSuccess={fetchWallets}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <WalletModal
          wallet={editing}
          onClose={() => setEditing(null)}
          onSuccess={fetchWallets}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <DeleteDialog
          wallet={deleting}
          onClose={() => setDeleting(null)}
          onSuccess={fetchWallets}
        />
      )}
    </div>
  );
}
