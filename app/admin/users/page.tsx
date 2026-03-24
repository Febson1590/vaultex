import { getAdminUsers } from "@/lib/actions/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Metadata } from "next";
import UsersTable from "./users-table";

export const metadata: Metadata = { title: "Admin — Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page   = parseInt(params.page || "1");
  const search = params.search || "";

  const { users, total, pages } = await getAdminUsers(page, 20, search);

  // Serialize Dates to strings so they can be passed to the client component
  const serialized = users.map((u: any) => ({
    id:            u.id,
    name:          u.name,
    email:         u.email,
    status:        u.status,
    createdAt:     u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    verifications: (u.verifications ?? []).map((v: any) => ({ status: v.status })),
    wallets:       (u.wallets ?? []).map((w: any) => ({ currency: w.currency, balance: Number(w.balance) })),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total users</p>
        </div>
      </div>

      {/* Search form (server-side navigation) */}
      <form className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search by name or email…"
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-9 text-sm"
          />
        </div>
        <Button type="submit" size="sm" className="bg-sky-500 hover:bg-sky-400 text-white h-9 px-4 text-sm font-semibold">
          Search
        </Button>
      </form>

      <UsersTable
        initialUsers={serialized}
        total={total}
        page={page}
        pages={pages}
        search={search}
      />
    </div>
  );
}
