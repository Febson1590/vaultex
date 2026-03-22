import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/lib/actions/user";
import { Bell, CheckCheck, Info, TrendingUp, ArrowDownToLine, ArrowUpFromLine, ShieldCheck, HeadphonesIcon, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications" };

const NOTIF_ICONS: Record<string, any> = {
  INFO: Info, TRADE: TrendingUp, DEPOSIT: ArrowDownToLine, WITHDRAWAL: ArrowUpFromLine,
  VERIFICATION: ShieldCheck, SUPPORT: HeadphonesIcon, WARNING: AlertTriangle,
  SUCCESS: CheckCircle2, ERROR: XCircle,
};

const NOTIF_COLORS: Record<string, string> = {
  INFO: "text-sky-400 bg-sky-500/10", TRADE: "text-violet-400 bg-violet-500/10",
  DEPOSIT: "text-emerald-400 bg-emerald-500/10", WITHDRAWAL: "text-orange-400 bg-orange-500/10",
  VERIFICATION: "text-yellow-400 bg-yellow-500/10", SUPPORT: "text-sky-400 bg-sky-500/10",
  WARNING: "text-yellow-400 bg-yellow-500/10", SUCCESS: "text-emerald-400 bg-emerald-500/10",
  ERROR: "text-red-400 bg-red-500/10",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm" className="border-white/10 text-slate-400 hover:bg-white/5 text-xs">
              <CheckCheck size={13} className="mr-1" /> Mark all read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center">
          <Bell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden divide-y divide-white/5">
          {notifications.map((notif) => {
            const Icon = NOTIF_ICONS[notif.type] || Info;
            const colors = NOTIF_COLORS[notif.type] || "text-sky-400 bg-sky-500/10";
            return (
              <div key={notif.id} className={`flex items-start gap-4 px-5 py-4 transition-colors ${!notif.isRead ? "bg-sky-500/3" : "hover:bg-white/2"}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-white truncate">{notif.title}</div>
                    {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</div>
                  <div className="text-xs text-slate-600 mt-1">{formatDateTime(notif.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
