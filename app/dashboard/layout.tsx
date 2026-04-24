import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      notifications: { where: { isRead: false } },
    },
  });

  if (!user) redirect("/login");

  // Admins always land on /admin, never the user dashboard. Catches the
  // case where an admin bookmarks /dashboard, opens a stale tab, or
  // follows a link that points there — the login flow already routes
  // fresh logins correctly.
  if (user.role === "ADMIN") redirect("/admin");

  // Re-check status on every navigation. If the admin flipped the user
  // to FROZEN or SUSPENDED mid-session, the JWT is still valid but we
  // bounce them to the status page so their old session can't keep
  // using the dashboard. RESTRICTED users can still browse — the
  // individual actions reject them with a clear reason.
  if (user.status === "FROZEN" || user.status === "SUSPENDED") {
    redirect("/account-status");
  }

  const unreadCount = user.notifications.length;

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      <DashboardSidebar unreadCount={unreadCount} />
      <div className="flex flex-col flex-1 min-w-0">
        <DashboardHeader
          user={{ name: user.name, email: user.email, role: user.role, status: user.status }}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
