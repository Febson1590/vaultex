"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { processVerification } from "@/lib/actions/admin";
import { formatDateTime, getStatusBg } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, FileText } from "lucide-react";
import { toast } from "sonner";

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
}

export default function AdminVerificationPage() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = () => {
    fetch("/api/admin/verification")
      .then((r) => r.json())
      .then(setVerifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handle = async (id: string, action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && (!notes[id] || notes[id].trim().length === 0)) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setProcessing(id);
    const result = await processVerification(id, action, notes[id]);
    if (result?.success) { toast.success(`Verification ${action.toLowerCase()}d`); fetchData(); setExpanded(null); }
    else toast.error(result?.error || "Failed");
    setProcessing(null);
  };

  const pending = verifications.filter((v) => v.status === "PENDING");
  const others = verifications.filter((v) => v.status !== "PENDING");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">KYC Verification</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and approve identity verification submissions</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">{pending.length} Pending Review</span>
          <span className="text-xs text-slate-500 ml-2">— {verifications.length} total submissions</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading...</div>
        ) : verifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No verification submissions yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {[...pending, ...others].map((v) => (
              <div key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400 flex-shrink-0">
                      {v.user?.name?.slice(0, 2).toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{v.user?.name}</div>
                      <div className="text-xs text-slate-500">{v.user?.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBg(v.status)}`}>{v.status}</span>
                        <span className="text-xs text-slate-500">{v.type}</span>
                        {v.documentType && <span className="text-xs text-slate-500">• {v.documentType}</span>}
                        <span className="text-xs text-slate-600">{formatDateTime(v.submittedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.status === "PENDING" && (
                      <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                        className="border-sky-500/20 text-sky-400 hover:bg-sky-500/10 h-7 text-xs px-3">
                        <FileText size={11} className="mr-1" /> Review
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded review panel */}
                {expanded === v.id && (
                  <div className="mt-4 pl-14 space-y-4">
                    {/* Only show documents that were actually uploaded */}
                    {(() => {
                      const docs = [
                        v.frontUrl && { label: "Document Front", url: v.frontUrl },
                        v.backUrl && { label: "Document Back", url: v.backUrl },
                        v.selfieUrl && { label: "Selfie", url: v.selfieUrl },
                      ].filter(Boolean) as { label: string; url: string }[];

                      if (docs.length === 0) {
                        return (
                          <div className="text-xs text-slate-600">No documents uploaded</div>
                        );
                      }

                      return (
                        <div className={`grid grid-cols-1 ${docs.length >= 2 ? "md:grid-cols-2" : ""} ${docs.length >= 3 ? "lg:grid-cols-3" : ""} gap-3`}>
                          {docs.map((doc) => (
                            <div key={doc.label} className="glass-card rounded-lg p-3 border border-white/5">
                              <div className="text-xs text-slate-500 mb-2">{doc.label}</div>
                              {isImageUrl(doc.url) ? (
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block">
                                  <img
                                    src={doc.url}
                                    alt={doc.label}
                                    className="w-full h-32 object-cover rounded border border-white/10 hover:border-sky-500/40 transition-colors"
                                  />
                                </a>
                              ) : (
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block">
                                  <div className="h-24 bg-white/5 rounded flex items-center justify-center text-xs text-sky-400 hover:bg-white/10 transition-colors">
                                    View Document &rarr;
                                  </div>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      <div className="text-xs text-slate-400">Review Notes (optional — required for rejection)</div>
                      <Textarea
                        placeholder="Add notes for the user..."
                        value={notes[v.id] || ""}
                        onChange={(e) => setNotes((p) => ({ ...p, [v.id]: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm resize-none h-20"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" disabled={!!processing} onClick={() => handle(v.id, "APPROVE")}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 h-8 px-4 text-xs">
                        {processing === v.id ? <Loader2 size={11} className="animate-spin mr-1" /> : <CheckCircle2 size={11} className="mr-1" />}
                        Approve
                      </Button>
                      <Button size="sm" disabled={!!processing} onClick={() => handle(v.id, "REJECT")}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 h-8 px-4 text-xs">
                        <XCircle size={11} className="mr-1" />Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}
                        className="text-slate-500 hover:text-white h-8 px-3 text-xs">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
