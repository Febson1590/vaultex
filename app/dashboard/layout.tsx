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

  const unreadCount = user.notifications.length;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar unreadCount={unreadCount} />
      <div className="flex flex-col flex-1 min-w-0">
        <DashboardHeader
          user={{ name: user.name, email: user.email, role: user.role, status: user.status }}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-lang-switcher">
          {children}
        </main>
      </div>
    </div>
  );
}
