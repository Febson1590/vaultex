"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { CONTACT } from "@/lib/company";

const CATEGORIES = [
  { value: "account",    label: "Account access",          routeTo: CONTACT.supportEmail    },
  { value: "deposit",    label: "Deposit question",        routeTo: CONTACT.supportEmail    },
  { value: "withdrawal", label: "Withdrawal question",     routeTo: CONTACT.supportEmail    },
  { value: "kyc",        label: "Identity verification",   routeTo: CONTACT.complianceEmail },
  { value: "security",   label: "Security disclosure",     routeTo: CONTACT.securityEmail   },
  { value: "compliance", label: "Compliance / escalation", routeTo: CONTACT.complianceEmail },
  { value: "other",      label: "Other",                   routeTo: CONTACT.supportEmail    },
] as const;

type CategoryValue = typeof CATEGORIES[number]["value"];

export function ContactForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName:  "",
    email:     "",
    category:  "account" as CategoryValue,
    subject:   "",
    message:   "",
  });

  const set =
    <K extends keyof typeof form>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value as never }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cat   = CATEGORIES.find((c) => c.value === form.category) ?? CATEGORIES[0];
    const subject = form.subject
      ? `[${cat.label}] ${form.subject}`
      : `[${cat.label}] New message`;
    const body =
      `Name:     ${form.firstName} ${form.lastName}\n` +
      `Email:    ${form.email}\n` +
      `Category: ${cat.label}\n\n` +
      `${form.message}`;
    window.location.href =
      `mailto:${cat.routeTo}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
  }

  return (
    <Card className="glass-card border-0 rounded-xl p-6">
      <h2 className="text-base font-bold text-white mb-1">Open a support ticket</h2>
      <p className="text-[11px] text-slate-500 mb-5">
        Routed automatically to the right team based on the category you choose below.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-400 uppercase tracking-wider">First Name</Label>
            <Input required value={form.firstName} onChange={set("firstName")}
              placeholder="First name"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-400 uppercase tracking-wider">Last Name</Label>
            <Input required value={form.lastName} onChange={set("lastName")}
              placeholder="Last name"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-slate-400 uppercase tracking-wider">Email</Label>
          <Input required type="email" value={form.email} onChange={set("email")}
            placeholder="you@example.com"
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-slate-400 uppercase tracking-wider">Category</Label>
          <select
            value={form.category}
            onChange={set("category")}
            className="w-full h-10 bg-white/5 border border-white/10 rounded-md px-3 text-sm text-white focus:outline-none focus:border-sky-500/50 [&>option]:bg-[#0a1628]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-slate-400 uppercase tracking-wider">Subject</Label>
          <Input required value={form.subject} onChange={set("subject")}
            placeholder="Short one-line summary"
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-slate-400 uppercase tracking-wider">Message</Label>
          <Textarea required rows={5} value={form.message} onChange={set("message")}
            placeholder="Include any dates, amounts, transaction references, or error messages that will help our team investigate."
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 resize-none" />
        </div>

        <Button type="submit"
          className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11 inline-flex items-center justify-center gap-2">
          <Send size={14} /> Send to Support
        </Button>
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          This form opens your email client with the message pre-filled and addressed to the right
          team. You can also email us directly at{" "}
          <a href={`mailto:${CONTACT.supportEmail}`} className="text-sky-400 hover:text-sky-300">
            {CONTACT.supportEmail}
          </a>.
        </p>
      </form>
    </Card>
  );
}
