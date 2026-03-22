import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Phone, MapPin } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Contact" };

const contactInfo = [
  { icon: Mail, title: "Email Support", value: "support@vaultexmarket.com", sub: "Response within 24 hours" },
  { icon: MessageSquare, title: "Live Chat", value: "Available in Dashboard", sub: "For verified users" },
  { icon: Phone, title: "Phone Support", value: "+1 (888) 000-1234", sub: "Mon–Fri, 9am–6pm EST" },
  { icon: MapPin, title: "Headquarters", value: "New York, NY 10001", sub: "United States" },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 hero-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs tracking-widest uppercase">Contact Us</Badge>
          <h1 className="text-4xl font-bold text-white mb-4">Get In Touch</h1>
          <p className="text-slate-400">Our support team is available 24/7 to assist you.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {contactInfo.map((item) => (
              <div key={item.title} className="glass-card rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">{item.title}</div>
                  <div className="text-sm font-medium text-white">{item.value}</div>
                  <div className="text-xs text-slate-500">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <Card className="lg:col-span-3 glass-card border-0 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Send a Message</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">First Name</Label>
                  <Input placeholder="John" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Last Name</Label>
                  <Input placeholder="Doe" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Email</Label>
                <Input type="email" placeholder="john@example.com" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Subject</Label>
                <Input placeholder="How can we help?" className="bg-white/5 border-white/10 text-white placeholder:text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Message</Label>
                <Textarea rows={5} placeholder="Tell us more about your inquiry..." className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 resize-none" />
              </div>
              <Button className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11">
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
