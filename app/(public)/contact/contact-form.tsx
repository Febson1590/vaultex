"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName:  "",
    email:     "",
    subject:   "",
    message:   "",
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = form.subject
      ? `[Vaultex Contact] ${form.subject}`
      : "[Vaultex Contact] New message";
    const body =
      `Name: ${form.firstName} ${form.lastName}\n` +
      `Email: ${form.email}\n\n` +
      `${form.message}`;
    window.location.href =
      `mailto:support@vaultexmarket.com` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
  }

  return (
    <Card className="lg:col-span-3 glass-card border-0 rounded-xl p-6">
      <h2 className="text-lg font-bold text-white mb-6">Send a Message</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">First Name</Label>
            <Input required value={form.firstName} onChange={set("firstName")} placeholder="John" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Last Name</Label>
            <Input required value={form.lastName} onChange={set("lastName")} placeholder="Doe" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Email</Label>
          <Input required type="email" value={form.email} onChange={set("email")} placeholder="john@example.com" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Subject</Label>
          <Input required value={form.subject} onChange={set("subject")} placeholder="How can we help?" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Message</Label>
          <Textarea required rows={5} value={form.message} onChange={set("message")} placeholder="Tell us more about your inquiry..." className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 resize-none" />
        </div>
        <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11">
          Send Message
        </Button>
        <p className="text-[11px] text-slate-500 text-center">
          Opens your default email client with the message addressed to our support team.
        </p>
      </form>
    </Card>
  );
}
