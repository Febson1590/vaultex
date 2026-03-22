"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestDeposit } from "@/lib/actions/deposits";
import { Loader2, CheckCircle2, ArrowDownToLine, Info, Clock } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  currency: z.string().min(1, "Select a currency"),
  amount: z.number().positive("Must be positive").min(10, "Minimum $10"),
  method: z.string().min(1, "Select a method"),
});

type FormData = z.infer<typeof schema>;

const methods = ["Bank Transfer", "Wire Transfer", "SEPA Transfer", "Crypto Transfer"];

export default function DepositPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "USD", method: "Bank Transfer" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await requestDeposit(data);
      if (result?.error) toast.error(result.error);
      else {
        setSubmitted(true);
        toast.success("Deposit request submitted successfully!");
        reset();
      }
    } catch {
      toast.error("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="glass-card rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Request Submitted</h2>
          <p className="text-slate-400 text-sm mb-6">Your deposit request has been submitted and is pending review by our team. You'll be notified when it's processed.</p>
          <Button onClick={() => setSubmitted(false)} className="bg-sky-500 hover:bg-sky-400 text-white">Submit Another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Deposit Funds</h1>
        <p className="text-sm text-slate-500 mt-0.5">Submit a deposit request to fund your account</p>
      </div>

      <div className="glass-card rounded-xl p-4 border border-sky-500/20 bg-sky-500/5 flex items-start gap-3">
        <Info className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-sky-400">Deposit Notice:</strong> All deposit requests are reviewed by our finance team within 1 business day.
          Once approved, funds will be credited directly to your account wallet and available for trading.
        </div>
      </div>

      <Card className="glass-card border-0 rounded-xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Currency</Label>
            <Select defaultValue="USD" onValueChange={(v) => { if (v !== null) { setCurrency(v); setValue("currency", v); } }}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {["USD", "USDT", "BTC", "ETH"].map((c) => (
                  <SelectItem key={c} value={c} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && <p className="text-xs text-red-400">{errors.currency.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{currency === "USD" || currency === "USDT" ? "$" : ""}</span>
              <Input
                {...register("amount", { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="1,000.00"
                className={`bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 ${currency === "USD" || currency === "USDT" ? "pl-7" : ""}`}
              />
            </div>
            {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 uppercase tracking-widest">Deposit Method</Label>
            <Select defaultValue="Bank Transfer" onValueChange={(v) => v !== null && setValue("method", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1e3a] border-sky-500/20 text-white">
                {methods.map((m) => (
                  <SelectItem key={m} value={m} className="hover:bg-sky-500/10 focus:bg-sky-500/10">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info box */}
          <div className="p-3 bg-white/3 rounded-lg space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2"><Clock size={12} className="text-sky-400" /><span>Processing time: 1–24 hours</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400" /><span>No deposit fees</span></div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><ArrowDownToLine className="mr-2 h-4 w-4" /> Submit Deposit Request</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}
