"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { registerUser } from "@/lib/actions/auth";
import { Eye, EyeOff, Lock, Mail, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains number", test: (p: string) => /[0-9]/.test(p) },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const password = watch("password", "");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      const result = await registerUser({ name: data.name, email: data.email, password: data.password });
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success("Account created! Please sign in.");
        router.push("/login");
      }
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Create Your Account</h1>
        <p className="text-sm text-slate-400">Join Vaultex Market and start trading today</p>
      </div>

      <Card className="glass-card border-0 rounded-2xl p-8">
        {error && (
          <div className="mb-5 flex items-center gap-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                {...register("name")}
                placeholder="John Doe"
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-sky-500/50 h-11"
              />
            </div>
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-sky-500/50 h-11"
              />
            </div>
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-sky-500/50 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div className="space-y-1 pt-1">
                {passwordRules.map((rule) => (
                  <div key={rule.label} className={`flex items-center gap-2 text-xs ${rule.test(password) ? "text-emerald-400" : "text-slate-500"}`}>
                    <CheckCircle2 size={11} />
                    {rule.label}
                  </div>
                ))}
              </div>
            )}
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                {...register("confirmPassword")}
                type="password"
                placeholder="Repeat your password"
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-sky-500/50 h-11"
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>

          <p className="text-xs text-slate-500">
            By creating an account, you agree to our{" "}
            <Link href="#" className="text-sky-400 hover:text-sky-300">Terms of Service</Link>{" "}
            and{" "}
            <Link href="#" className="text-sky-400 hover:text-sky-300">Privacy Policy</Link>.
          </p>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
