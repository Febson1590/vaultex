import { getAdminStats } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { formatCurrency, formatDateTime, getStatusBg } from "@/lib/utils";
import { Users, ArrowDownToLine, ArrowUpFromLine, HeadphonesIcon, ShieldCheck, Activity } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const stats = await getAdminStats();
  const recentUsers = await db.user.findMany({
    where: { role: "USER" },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { profile: true },
  });
  const recentActions = await db.adminActionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { admin: { select: { name: true } } },
  });

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, sub: `${stats.activeUsers} active`, icon: Users, color: "text-sky-400" },
    { label: "Pending Deposits", value: stats.pendingDeposits, sub: "awaiting review", icon: ArrowDownToLine, color: "text-emerald-400" },
    { label: "Pending Withdrawals", value: stats.pendingWithdrawals, sub: "awaiting review", icon: ArrowUpFromLine, color: "text-orange-400" },
    { label: "Open Tickets", value: stats.openTickets, sub: "support requests", icon: HeadphonesIcon, color: "text-violet-400" },
    { label: "Pending KYC", value: stats.pendingKyc, sub: "to review", icon: ShieldCheck, color: "text-yellow-400" },
    { label: "Active Users", value: stats.activeUsers, sub: `of ${stats.totalUsers} total`, icon: Activity, color: "text-sky-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
            <div className="text-xs text-slate-600">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent users */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Recent Registrations</h2>
          </div>
          <div className="divide-y divide-white/5">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400">
                    {user.name?.slice(0, 2).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBg(user.status)}`}>
                    {user.status}
                  </span>
                  <span className="text-[10px] text-slate-600">{formatDateTime(user.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent admin actions */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Recent Admin Actions</h2>
          </div>
          <div className="divide-y divide-white/5">
            {recentActions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No actions yet</div>
            ) : recentActions.map((action) => (
              <div key={action.id} className="px-4 py-3 hover:bg-white/2 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-sky-400">{action.action}</span>
                  <span className="text-[10px] text-slate-600">{formatDateTime(action.createdAt)}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{action.description || "—"}</div>
                <div className="text-[10px] text-slate-600">by {action.admin.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
