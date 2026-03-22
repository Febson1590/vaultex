"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminRespondToTicket } from "@/lib/actions/admin";
import { formatDateTime, getStatusBg } from "@/lib/utils";
import { MessageSquare, Send, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const fetchTickets = () => {
    fetch("/api/admin/support")
      .then((r) => r.json())
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleReply = async (ticketId: string, close = false) => {
    const msg = replies[ticketId]?.trim();
    if (!msg) return toast.error("Enter a reply message");
    setSending(ticketId);
    const result = await adminRespondToTicket(ticketId, msg, close);
    if (result?.success) {
      toast.success(close ? "Ticket resolved" : "Reply sent");
      setReplies((p) => ({ ...p, [ticketId]: "" }));
      fetchTickets();
    } else toast.error("Failed to send reply");
    setSending(null);
  };

  const PRIORITY_COLORS: Record<string, string> = {
    LOW: "text-slate-400 border-slate-500/20 bg-slate-500/10",
    MEDIUM: "text-sky-400 border-sky-500/20 bg-sky-500/10",
    HIGH: "text-orange-400 border-orange-500/20 bg-orange-500/10",
    URGENT: "text-red-400 border-red-500/20 bg-red-500/10",
  };

  const openTickets = tickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED");
  const closedTickets = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Inbox</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage and respond to user support tickets</p>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-slate-400">{openTickets.length} Open</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">{closedTickets.length} Resolved</span>
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center text-slate-500 text-sm">Loading...</div>
      ) : tickets.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-slate-500 text-sm">No support tickets yet</div>
      ) : (
        <div className="space-y-3">
          {[...openTickets, ...closedTickets].map((ticket) => (
            <div key={ticket.id} className="glass-card rounded-xl overflow-hidden">
              {/* Header */}
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-white/2 transition-colors"
                onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400 flex-shrink-0">
                    {ticket.user?.name?.slice(0, 2).toUpperCase() || "U"}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">{ticket.subject}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-500">{ticket.user?.name} • {ticket.category}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(ticket.status)}`}>{ticket.status}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[ticket.priority] || ""}`}>{ticket.priority}</span>
                      <span className="text-xs text-slate-600">{formatDateTime(ticket.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MessageSquare size={12} />
                    {ticket.messages?.length || 0}
                  </div>
                  {expanded === ticket.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded conversation */}
              {expanded === ticket.id && (
                <div className="border-t border-white/5">
                  {/* Messages */}
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {ticket.messages?.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No messages yet</div>
                    ) : (
                      ticket.messages?.map((msg: any) => (
                        <div key={msg.id} className={`flex ${msg.senderRole === "ADMIN" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${msg.senderRole === "ADMIN"
                            ? "bg-sky-500/15 border border-sky-500/20 text-white"
                            : "bg-white/5 border border-white/5 text-slate-300"}`}>
                            <div className="text-xs font-medium mb-1 opacity-60">
                              {msg.senderRole === "ADMIN" ? "Support Agent" : ticket.user?.name}
                            </div>
                            <div className="text-sm leading-relaxed">{msg.content}</div>
                            <div className="text-xs text-slate-500 mt-1.5">{formatDateTime(msg.createdAt)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply box */}
                  {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                    <div className="p-4 border-t border-white/5 space-y-3">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replies[ticket.id] || ""}
                        onChange={(e) => setReplies((p) => ({ ...p, [ticket.id]: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm resize-none h-20"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={!!sending} onClick={() => handleReply(ticket.id, false)}
                          className="bg-sky-500 hover:bg-sky-400 text-white h-8 px-4 text-xs">
                          {sending === ticket.id ? <Loader2 size={11} className="animate-spin mr-1" /> : <Send size={11} className="mr-1" />}
                          Send Reply
                        </Button>
                        <Button size="sm" disabled={!!sending} onClick={() => handleReply(ticket.id, true)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 h-8 px-4 text-xs">
                          <CheckCircle2 size={11} className="mr-1" />Reply & Resolve
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
