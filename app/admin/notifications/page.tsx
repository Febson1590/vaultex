"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminSendNotification } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/utils";
import { Bell, Send, Loader2, Info, CheckCircle2, AlertTriangle, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";

const NOTIF_ICONS: Record<string, any> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  TRADE: Bell,
  DEPOSIT: Bell,
  WITHDRAWAL: Bell,
  VERIFICATION: Bell,
  SUPPORT: Bell,
};

const NOTIF_COLORS: Record<string, string> = {
  INFO: "text-sky-400",
  SUCCESS: "text-emerald-400",
  WARNING: "text-yellow-400",
  ERROR: "text-red-400",
};

export default function AdminNotificationsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("INFO");
  const [sent, setSent] = useState<any[]>([]);
  const [loadingSent, setLoadingSent] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then(setUsers).catch(() => {});
    fetch("/api/admin/notifications").then((r) => r.json()).then(setSent).catch(() => {}).finally(() => setLoadingSent(false));
  }, []);

  const handleSend = async () => {
    if (!title || !message) return toast.error("Fill in title and message");
    setLoading(true);

    if (userId === "all") {
      // Send to all users
      let count = 0;
      for (const user of users) {
        const result = await adminSendNotification(user.id, title, message, type);
        if (result?.success) count++;
      }
      toast.success(`Notification sent to ${count} users`);
    } else {
      const result = await adminSendNotification(userId, title, message, type);
      if (result?.success) toast.success("Notification sent");
      else toast.error("Failed to send");
    }

    setTitle("");
    setMessage("");
    // Refresh sent list
    fetch("/api/admin/notifications").then((r) => r.json()).then(setSent).catch(() => {});
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">Send platform-wide or user-specific notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Compose */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Compose Notification</h2>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Recipient</Label>
            <Select value={userId} onValueChange={(v) => v !== null && setUserId(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white max-h-60 overflow-y-auto">
                <SelectItem value="all" className="hover:bg-sky-500/10 focus:bg-sky-500/10">
                  <div className="flex items-center gap-2">
                    <Users size={12} />
                    <span>All Users ({users.length})</span>
                  </div>
                </SelectItem>
                {users.map((u: any) => (
                  <SelectItem key={u.id} value={u.id} className="hover:bg-sky-500/10 focus:bg-sky-500/10">
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Type</Label>
            <Select value={type} onValueChange={(v) => v !== null && setType(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {["INFO", "SUCCESS", "WARNING", "ERROR"].map((t) => (
                  <SelectItem key={t} value={t} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message..."
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 resize-none h-24 text-sm"
            />
          </div>

          <Button onClick={handleSend} disabled={loading || !title || !message} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-10 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {userId === "all" ? `Send to All Users` : "Send Notification"}
          </Button>
        </div>

        {/* Recent sent */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Recent Notifications</h2>
          </div>
          {loadingSent ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
          ) : sent.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No notifications sent yet</div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {sent.slice(0, 50).map((n: any) => {
                const Icon = NOTIF_ICONS[n.type] || Bell;
                const color = NOTIF_COLORS[n.type] || "text-slate-400";
                return (
                  <div key={n.id} className="p-3 hover:bg-white/2 transition-colors">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white truncate">{n.title}</span>
                          <span className="text-xs text-slate-600 whitespace-nowrap">{formatDateTime(n.createdAt)}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-xs text-slate-600 mt-1">→ {n.user?.name || n.userId}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
