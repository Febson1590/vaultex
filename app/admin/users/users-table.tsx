"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { formatDateTime, getStatusBg } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  status: string;
  createdAt: string | Date;
  verifications: { status: string }[];
  wallets: { currency: string; balance: any }[];
}

interface Props {
  initialUsers: UserRow[];
  total: number;
  page: number;
  pages: number;
  search: string;
}

// ── Confirmation Modal ────────────────────────────────────────
function DeleteModal({
  user,
  onCancel,
  onConfirm,
  busy,
}: {
  user: UserRow;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="glass-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Delete User Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action is permanent and irreversible</p>
          </div>
        </div>

        <div className="mb-5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <div className="text-sm font-semibold text-white">{user.name || "Unnamed User"}</div>
          <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
        </div>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Are you sure you want to permanently delete this user? All wallets, balances,
          transactions, investments, copy trading data, and KYC records will be
          removed. <span className="text-red-400 font-semibold">This cannot be undone.</span>
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

// ── Main Table ────────────────────────────────────────────────
export default function UsersTable({ initialUsers, total, page, pages, search }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${pendingDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Deletion failed");
      } else {
        toast.success(`${pendingDelete.name || pendingDelete.email} has been deleted`);
        setUsers(prev => prev.filter(u => u.id !== pendingDelete.id));
        setPendingDelete(null);
      }
    } catch {
      toast.error("Network error — deletion failed");
    }
    setDeleteBusy(false);
  }

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-3 border-b border-white/5">
          <span className="text-xs text-slate-500">{users.length} of {total} users shown</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full premium-table">
            <thead>
              <tr className="border-b border-white/5">
                {["User", "Email", "Status", "Joined", "KYC", "USD Balance", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const kyc = user.verifications[0];
                const usdWallet = user.wallets.find(w => w.currency === "USD");
                return (
                  <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400 flex-shrink-0">
                          {user.name?.slice(0, 2).toUpperCase() || "U"}
                        </div>
                        <span className="text-sm font-medium text-white">{user.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(kyc?.status || "NOT_SUBMITTED")}`}>
                        {kyc?.status || "NONE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white font-mono">
                      ${Number(usdWallet?.balance || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-sky-500/20 text-sky-400 hover:bg-sky-500/10 h-7 text-xs px-2"
                          >
                            <Eye size={11} className="mr-1" /> Manage
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/20 text-red-400 hover:bg-red-500/10 h-7 text-xs px-2"
                          onClick={() => setPendingDelete(user)}
                        >
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-500">Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/users?page=${page - 1}&search=${search}`}>
                  <Button size="sm" variant="outline" className="border-white/10 text-slate-400 h-7 text-xs">Previous</Button>
                </Link>
              )}
              {page < pages && (
                <Link href={`/admin/users?page=${page + 1}&search=${search}`}>
                  <Button size="sm" variant="outline" className="border-white/10 text-slate-400 h-7 text-xs">Next</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {pendingDelete && (
        <DeleteModal
          user={pendingDelete}
          onCancel={() => !deleteBusy && setPendingDelete(null)}
          onConfirm={confirmDelete}
          busy={deleteBusy}
        />
      )}
    </>
  );
}
