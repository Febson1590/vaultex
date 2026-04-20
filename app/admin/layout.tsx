import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/admin-nav";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") redirect("/login");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — hidden on mobile (AdminNav handles its own visibility) */}
      <AdminNav />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile-aware header with hamburger + Sheet drawer */}
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6 pb-lang-switcher">{children}</main>
      </div>
    </div>
  );
}
