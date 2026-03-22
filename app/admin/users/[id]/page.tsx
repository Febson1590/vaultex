"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminUpdateWallet, updateUserStatus, adminSendNotification } from "@/lib/actions/admin";
import { formatCurrency, formatDateTime, getStatusBg } from "@/lib/utils";
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Wallet, Bell } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [walletUpdates, setWalletUpdates] = useState<Record<string, string>>({});
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/users/${id}`).then((r) => r.json()).then((d) => { setUser(d); setNewStatus(d.status); }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setSaving(true);
    const result = await updateUserStatus(id as string, newStatus as any);
    if (result?.success) toast.success("Status updated");
    else toast.error("Failed");
    setSaving(false);
  };

  const handleWalletUpdate = async (currency: string, operation: "SET" | "ADD") => {
    const amount = parseFloat(walletUpdates[currency] || "0");
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    const result = await adminUpdateWallet(id as string, currency, amount, operation);
    if (result?.success) { toast.success(`${currency} wallet updated`); setWalletUpdates((p) => ({ ...p, [currency]: "" })); }
    else toast.error("Failed");
    setSaving(false);
  };

  const handleNotification = async () => {
    if (!notifTitle || !notifMsg) return toast.error("Fill in title and message");
    const result = await adminSendNotification(id as string, notifTitle, notifMsg, "INFO");
    if (result?.success) { toast.success("Notification sent"); setNotifTitle(""); setNotifMsg(""); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="text-slate-400 text-center py-12">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/users"><Button variant="ghost" size="sm" className="text-slate-400 hover:text-white"><ArrowLeft size={14} className="mr-1" /> Back</Button></Link>
        <div>
          <h1 className="text-xl font-bold text-white">{user.name}</h1>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusBg(user.status)}`}>{user.status}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Account Status */}
        <Card className="glass-card border-0 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Account Status</h2>
          </div>
          <div className="space-y-3">
            <Select value={newStatus} onValueChange={(v) => v !== null && setNewStatus(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {["ACTIVE", "FROZEN", "RESTRICTED", "SUSPENDED"].map((s) => (
                  <SelectItem key={s} value={s} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleStatusUpdate} disabled={saving} size="sm" className="w-full bg-sky-500 hover:bg-sky-400 text-white h-9 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Update Status"}
            </Button>
          </div>
        </Card>

        {/* Wallet Controls */}
        <Card className="glass-card border-0 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Wallet Adjustment</h2>
          </div>
          <div className="space-y-3">
            {["USD", "BTC", "ETH", "USDT"].map((currency) => {
              const wallet = user.wallets?.find((w: any) => w.currency === currency);
              return (
                <div key={currency} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">{currency}</Label>
                    <span className="text-xs text-slate-500 font-mono">{Number(wallet?.balance || 0).toFixed(6)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      type="number" step="0.000001" placeholder="Amount"
                      value={walletUpdates[currency] || ""}
                      onChange={(e) => setWalletUpdates((p) => ({ ...p, [currency]: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-8 text-xs flex-1"
                    />
                    <Button size="sm" onClick={() => handleWalletUpdate(currency, "ADD")} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 h-8 px-2 text-xs">+</Button>
                    <Button size="sm" onClick={() => handleWalletUpdate(currency, "SET")} className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 h-8 px-2 text-xs">=</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Send Notification */}
        <Card className="glass-card border-0 rounded-xl p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Send Notification</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-9 text-sm" />
            <Input placeholder="Message" value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-9 text-sm" />
            <Button onClick={handleNotification} size="sm" className="bg-sky-500 hover:bg-sky-400 text-white h-9 text-xs">Send</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
