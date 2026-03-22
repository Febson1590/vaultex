import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutUser } from "@/lib/actions/auth";
import AdminNav from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") redirect("/login");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminNav />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 bg-[#040f1f]/95 backdrop-blur-sm border-b border-sky-500/10 flex items-center px-6 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-sky-400 uppercase tracking-widest">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-slate-400 hover:text-sky-400 transition-colors">← User View</Link>
            <form action={logoutUser}>
              <button type="submit" className="text-xs text-red-400 hover:text-red-300 transition-colors">Sign Out</button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
