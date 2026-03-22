"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestWithdrawal } from "@/lib/actions/deposits";
import { Loader2, CheckCircle2, ArrowUpFromLine, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  currency: z.string().min(1),
  amount: z.number().positive("Must be positive").min(1),
  method: z.string().min(1),
  destination: z.string().min(3, "Enter a destination address or account"),
});

type FormData = z.infer<typeof schema>;

export default function WithdrawPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "USD", method: "Bank Transfer" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await requestWithdrawal(data);
      if (result?.error) toast.error(result.error);
      else { setSubmitted(true); toast.success("Withdrawal request submitted!"); reset(); }
    } catch { toast.error("Failed. Try again."); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="glass-card rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Request Submitted</h2>
          <p className="text-slate-400 text-sm mb-6">Your withdrawal request has been submitted and is pending admin review.</p>
          <Button onClick={() => setSubmitted(false)} className="bg-sky-500 hover:bg-sky-400 text-white">Submit Another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdraw Funds</h1>
        <p className="text-sm text-slate-500 mt-0.5">Request a withdrawal from your account</p>
      </div>

      <div className="glass-card rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-yellow-400">Withdrawal Notice:</strong> Withdrawal requests are subject to compliance review and identity verification.
          Approved withdrawals are processed within 1–3 business days to your registered account.
        </div>
      </div>

      <Card className="glass-card border-0 rounded-xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Currency</Label>
            <Select defaultValue="USD" onValueChange={(v) => { if (v !== null) { setCurrency(v); setValue("currency", v); } }}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {["USD", "USDT", "BTC", "ETH"].map((c) => (
                  <SelectItem key={c} value={c} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Amount</Label>
            <Input
              {...register("amount", { valueAsNumber: true })}
              type="number" step="0.01" placeholder="500.00"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11"
            />
            {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Withdrawal Method</Label>
            <Select defaultValue="Bank Transfer" onValueChange={(v) => v !== null && setValue("method", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-11"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {["Bank Transfer", "Wire Transfer", "Crypto Wallet"].map((m) => (
                  <SelectItem key={m} value={m} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Destination (Account / Address)</Label>
            <Input
              {...register("destination")}
              placeholder="Bank account number or wallet address"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11"
            />
            {errors.destination && <p className="text-xs text-red-400">{errors.destination.message}</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><ArrowUpFromLine className="mr-2 h-4 w-4" /> Submit Withdrawal</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}
