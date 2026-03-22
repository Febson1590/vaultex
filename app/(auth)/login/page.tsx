"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { loginUser } from "@/lib/actions/auth";
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      const result = await loginUser(data);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect happens here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
        <p className="text-sm text-slate-400">Sign in to your Vaultex Market account</p>
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
            <Label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-sky-500/50 focus:ring-sky-500/20 h-11"
              />
            </div>
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Password</Label>
              <Link href="#" className="text-xs text-sky-400 hover:text-sky-300">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-sky-500/50 focus:ring-sky-500/20 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold h-11 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-200"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-sky-400 hover:text-sky-300 font-medium">
              Create account
            </Link>
          </p>
        </div>

        {/* Test credentials */}
        <div className="mt-4 p-3 rounded-lg bg-white/3 border border-white/5">
          <p className="text-xs text-slate-500 text-center mb-2 font-medium">Test Access</p>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex justify-between"><span>User:</span><span className="text-slate-400">james.carter@example.com / Demo@123456</span></div>
            <div className="flex justify-between"><span>Admin:</span><span className="text-slate-400">admin@vaultexmarket.com / Admin@123456</span></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
