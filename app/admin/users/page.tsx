import { getAdminUsers } from "@/lib/actions/admin";
import { formatDateTime, getStatusBg } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserCog, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const { users, total, pages } = await getAdminUsers(page, 20, search);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total users</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <form>
              <Input name="search" defaultValue={search} placeholder="Search by name or email..." className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-9 text-sm" />
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full premium-table">
            <thead>
              <tr className="border-b border-white/5">
                {["User", "Email", "Status", "Joined", "KYC", "Wallets", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const kyc = user.verifications[0];
                const usdWallet = user.wallets.find((w) => w.currency === "USD");
                return (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400 flex-shrink-0">
                          {user.name?.slice(0, 2).toUpperCase() || "U"}
                        </div>
                        <div className="text-sm font-medium text-white">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(kyc?.status || "NOT_SUBMITTED")}`}>
                        {kyc?.status || "NOT_SUBMITTED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white font-mono">
                      ${Number(usdWallet?.balance || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${user.id}`}>
                        <Button size="sm" variant="outline" className="border-sky-500/20 text-sky-400 hover:bg-sky-500/10 h-7 text-xs px-2">
                          <Eye size={12} className="mr-1" /> Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
    </div>
  );
}
