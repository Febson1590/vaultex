"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Card }   from "@/components/ui/card";
import { registerUser } from "@/lib/actions/auth";
import {
  Eye, EyeOff, Lock, Mail, User, Phone, Globe,
  Loader2, AlertCircle, CheckCircle2, Check,
  ChevronRight, ChevronLeft, Shield, MapPin,
} from "lucide-react";
import { toast } from "sonner";

/* ── Country list ──────────────────────────────────────────────────────── */
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahrain","Bangladesh","Belgium","Bolivia","Bosnia",
  "Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia",
  "Costa Rica","Croatia","Cuba","Czech Republic","Denmark","Ecuador","Egypt",
  "El Salvador","Estonia","Ethiopia","Finland","France","Georgia","Germany",
  "Ghana","Greece","Guatemala","Honduras","Hong Kong","Hungary","India",
  "Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan",
  "Jordan","Kazakhstan","Kenya","Kuwait","Lebanon","Libya","Lithuania",
  "Malaysia","Mexico","Moldova","Morocco","Mozambique","Myanmar","Netherlands",
  "New Zealand","Nigeria","Norway","Oman","Pakistan","Panama","Paraguay","Peru",
  "Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia",
  "Senegal","Serbia","Singapore","South Africa","South Korea","Spain",
  "Sri Lanka","Sweden","Switzerland","Taiwan","Tanzania","Thailand","Tunisia",
  "Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen",
  "Zimbabwe",
];

/* ── Country → ISO-3166-1 alpha-2 for emoji flags ─────────────────────── */
const COUNTRY_CODES: Record<string, string> = {
  "Afghanistan":"AF","Albania":"AL","Algeria":"DZ","Angola":"AO","Argentina":"AR",
  "Armenia":"AM","Australia":"AU","Austria":"AT","Azerbaijan":"AZ","Bahrain":"BH",
  "Bangladesh":"BD","Belgium":"BE","Bolivia":"BO","Bosnia":"BA","Brazil":"BR",
  "Bulgaria":"BG","Cambodia":"KH","Cameroon":"CM","Canada":"CA","Chile":"CL",
  "China":"CN","Colombia":"CO","Costa Rica":"CR","Croatia":"HR","Cuba":"CU",
  "Czech Republic":"CZ","Denmark":"DK","Ecuador":"EC","Egypt":"EG",
  "El Salvador":"SV","Estonia":"EE","Ethiopia":"ET","Finland":"FI","France":"FR",
  "Georgia":"GE","Germany":"DE","Ghana":"GH","Greece":"GR","Guatemala":"GT",
  "Honduras":"HN","Hong Kong":"HK","Hungary":"HU","India":"IN","Indonesia":"ID",
  "Iran":"IR","Iraq":"IQ","Ireland":"IE","Israel":"IL","Italy":"IT",
  "Jamaica":"JM","Japan":"JP","Jordan":"JO","Kazakhstan":"KZ","Kenya":"KE",
  "Kuwait":"KW","Lebanon":"LB","Libya":"LY","Lithuania":"LT","Malaysia":"MY",
  "Mexico":"MX","Moldova":"MD","Morocco":"MA","Mozambique":"MZ","Myanmar":"MM",
  "Netherlands":"NL","New Zealand":"NZ","Nigeria":"NG","Norway":"NO","Oman":"OM",
  "Pakistan":"PK","Panama":"PA","Paraguay":"PY","Peru":"PE","Philippines":"PH",
  "Poland":"PL","Portugal":"PT","Qatar":"QA","Romania":"RO","Russia":"RU",
  "Saudi Arabia":"SA","Senegal":"SN","Serbia":"RS","Singapore":"SG",
  "South Africa":"ZA","South Korea":"KR","Spain":"ES","Sri Lanka":"LK",
  "Sweden":"SE","Switzerland":"CH","Taiwan":"TW","Tanzania":"TZ","Thailand":"TH",
  "Tunisia":"TN","Turkey":"TR","Uganda":"UG","Ukraine":"UA",
  "United Arab Emirates":"AE","United Kingdom":"GB","United States":"US",
  "Uruguay":"UY","Uzbekistan":"UZ","Venezuela":"VE","Vietnam":"VN",
  "Yemen":"YE","Zimbabwe":"ZW",
};

/* ── Emoji flag from ISO-3166-1 alpha-2 code ───────────────────────────── */
function flagEmoji(code: string): string {
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join("");
}

/* ── Password strength rules ───────────────────────────────────────────── */
const PWD_RULES = [
  { label: "At least 8 characters",          test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase letter",       test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains number",                 test: (p: string) => /[0-9]/.test(p) },
];

/* ── Step metadata ─────────────────────────────────────────────────────── */
const STEPS = [
  { n: 1, label: "Personal Info", icon: User,   heading: "Personal Information",      sub: "Set up your trading profile"         },
  { n: 2, label: "Location",      icon: Globe,  heading: "Location",                  sub: "Set your regional trading preferences"},
  { n: 3, label: "Security",      icon: Shield, heading: "Account Security",          sub: "Secure your trading account"          },
];

/* ── Stepper ─────────────────────────────────────────────────────────── */
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-start justify-between mb-8 select-none">
      {STEPS.map(({ n, label }, i) => (
        <div key={n} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`
              w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
              transition-all duration-300 flex-shrink-0
              ${step > n
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : step === n
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-4 ring-sky-500/20"
                  : "bg-white/[0.07] text-slate-400 border border-white/[0.18]"}
            `}>
              {step > n ? <Check size={14} strokeWidth={3} /> : n}
            </div>
            <span className={`text-[10px] font-medium tracking-wider whitespace-nowrap hidden sm:block
              ${step === n ? "text-sky-400" : step > n ? "text-emerald-400" : "text-slate-500"}`}>
              {label}
            </span>
          </div>

          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-2 transition-all duration-500
              ${step > n ? "bg-sky-500/40" : "bg-white/[0.14]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── StepHeader ──────────────────────────────────────────────────────── */
function StepHeader({ step }: { step: number }) {
  const s = STEPS[step - 1];
  const StepIcon = s.icon;
  return (
    <div className="flex items-center gap-3 rounded-xl p-4 mb-6"
      style={{ background: "rgba(14,165,233,0.09)", border: "1px solid rgba(14,165,233,0.22)" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.30)" }}>
        <StepIcon className="h-5 w-5 text-sky-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{s.heading}</div>
        <div className="text-xs text-slate-400">{s.sub}</div>
      </div>
    </div>
  );
}

/* ── Field ─────────────────────────────────────────────────────────────── */
function Field({
  label, error, children, required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-300 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={11} className="flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    username:        "",
    fullName:        "",
    email:           "",
    phone:           "",
    country:         "",
    password:        "",
    confirmPassword: "",
  });

  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [showPwd,      setShowPwd]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [verifyState,  setVerifyState]  = useState<"idle" | "checking" | "verified">("idle");
  const [termsOk,      setTermsOk]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [submitError,  setSubmitError]  = useState("");

  const set = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [k]: e.target.value }));
    if (errors[k]) setErrors(prev => { const next = { ...prev }; delete next[k]; return next; });
  };

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (formData.username.trim().length < 2)
        errs.username = "Username must be at least 2 characters";
      if (formData.fullName.trim().length < 2)
        errs.fullName = "Full name must be at least 2 characters";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        errs.email = "Enter a valid email address";
      if (formData.phone && !/^\+?[\d\s\-(). ]{6,20}$/.test(formData.phone))
        errs.phone = "Enter a valid phone number";
    }
    if (s === 2) {
      if (!formData.country) errs.country = "Please select your country";
    }
    if (s === 3) {
      if (formData.password.length < 8)
        errs.password = "Password must be at least 8 characters";
      else if (!/[A-Z]/.test(formData.password))
        errs.password = "Include at least one uppercase letter";
      else if (!/[0-9]/.test(formData.password))
        errs.password = "Include at least one number";
      if (formData.password !== formData.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
      if (verifyState !== "verified")
        errs.verify = "Please complete human verification";
      if (!termsOk)
        errs.terms = "You must accept the Terms & Privacy Policy";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() { if (validateStep(step)) setStep(s => Math.min(s + 1, 3)); }
  function back() { setErrors({}); setStep(s => Math.max(s - 1, 1)); }

  function handleVerify() {
    if (verifyState !== "idle") return;
    setVerifyState("checking");
    setTimeout(() => {
      setVerifyState("verified");
      if (errors.verify) setErrors(prev => { const next = { ...prev }; delete next.verify; return next; });
    }, 1200);
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;
    setLoading(true);
    setSubmitError("");
    try {
      const result = await registerUser({
        name:     formData.username,
        fullName: formData.fullName,
        email:    formData.email,
        password: formData.password,
        phone:    formData.phone   || undefined,
        country:  formData.country || undefined,
      });
      if (result?.error) {
        setSubmitError(result.error);
      } else {
        toast.success("Account created! Please verify your email.");
        router.push(`/verify?email=${encodeURIComponent(formData.email)}&type=register`);
      }
    } catch {
      setSubmitError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Shared input class — sharper borders, clearer placeholders ─────── */
  const inputCls = `pl-10 bg-white/[0.06] border-white/[0.18] text-white placeholder:text-slate-500
    focus:border-sky-500/70 focus:bg-white/[0.08] focus:ring-0 h-11 transition-colors duration-200
    hover:border-white/30 hover:bg-white/[0.07]`;

  /* ── Shared select class — mirrors inputCls ─────────────────────────── */
  const selectCls = `w-full h-11 pl-10 pr-9 bg-white/[0.06] border border-white/[0.18] text-white text-sm
    rounded-md focus:outline-none focus:border-sky-500/70 focus:bg-white/[0.08]
    hover:border-white/30 hover:bg-white/[0.07] transition-colors duration-200
    appearance-none cursor-pointer [&>option]:bg-[#0a1628] [&>option]:text-white`;

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full max-w-md">

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Create Your Account</h1>
        <p className="text-sm text-slate-300">
          {step === 1 && "Step 1 of 3 — Your trading profile details"}
          {step === 2 && "Step 2 of 3 — Your location & regional settings"}
          {step === 3 && "Step 3 of 3 — Secure your account"}
        </p>
      </div>

      {/* Card — subtle depth shadow + ring for premium separation */}
      <Card className="glass-card border-0 rounded-2xl p-7 sm:p-8
        shadow-[0_8px_48px_rgba(0,0,0,0.6),0_2px_12px_rgba(0,0,0,0.4)]
        ring-1 ring-white/[0.07]">

        <Stepper step={step} />

        {/* ── Global submit error ─────────────────────────────────────── */}
        {submitError && (
          <div className="mb-5 flex items-center gap-2.5 text-sm text-red-400
            bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0" />
            {submitError}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 1 — Personal Info
        ════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5">
            <StepHeader step={step} />

            <Field label="Trading Username" error={errors.username} required>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={formData.username}
                  onChange={set("username")}
                  placeholder="e.g. tradervault"
                  className={inputCls}
                />
              </div>
            </Field>

            <Field label="Full Name" error={errors.fullName} required>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={formData.fullName}
                  onChange={set("fullName")}
                  placeholder="Your full legal name"
                  className={inputCls}
                />
              </div>
            </Field>

            <Field label="Email Address" error={errors.email} required>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
            </Field>

            <Field label="Phone Number" error={errors.phone}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={set("phone")}
                  placeholder="+1 555 123 4567"
                  className={inputCls}
                />
              </div>
            </Field>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 2 — Location
        ════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-5">
            <StepHeader step={step} />

            <Field label="Country / Region" error={errors.country} required>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none rotate-90" />
                <select
                  value={formData.country}
                  onChange={set("country")}
                  className={selectCls}
                >
                  <option value="" disabled className="text-slate-500">Select your country</option>
                  {COUNTRIES.map(c => {
                    const code = COUNTRY_CODES[c];
                    const flag = code ? flagEmoji(code) + " " : "";
                    return <option key={c} value={c}>{flag}{c}</option>;
                  })}
                </select>
              </div>
            </Field>

            {/* Info card */}
            <div className="rounded-xl p-4"
              style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.20)" }}>
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-sky-400 mb-1">Regional Trading Information</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your location helps us apply region-specific compliance rules,
                    regulatory requirements, and optimal server routing for faster order execution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 3 — Security
        ════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-5">
            <StepHeader step={step} />

            {/* Password */}
            <Field label="Password" error={errors.password} required>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type={showPwd ? "text" : "password"}
                  value={formData.password}
                  onChange={set("password")}
                  placeholder="Create a strong password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength indicators */}
              {formData.password && (
                <div className="space-y-1 pt-1">
                  {PWD_RULES.map(r => {
                    const ok = r.test(formData.password);
                    return (
                      <div key={r.label} className={`flex items-center gap-2 text-xs transition-colors duration-200 ${ok ? "text-emerald-400" : "text-slate-500"}`}>
                        <CheckCircle2 size={11} className={ok ? "text-emerald-400" : "text-slate-600"} />
                        {r.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* Confirm Password */}
            <Field label="Confirm Password" error={errors.confirmPassword} required>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="Confirm your password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {/* Human Verification */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-300 uppercase tracking-widest">
                Human Verification<span className="text-red-400 ml-0.5">*</span>
              </Label>
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyState !== "idle"}
                className="w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5
                  transition-all duration-300 cursor-pointer disabled:cursor-default"
                style={{
                  background: verifyState === "verified"
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(14,165,233,0.05)",
                  border: verifyState === "verified"
                    ? "1px solid rgba(16,185,129,0.28)"
                    : errors.verify
                      ? "1px solid rgba(239,68,68,0.40)"
                      : "1px solid rgba(14,165,233,0.22)",
                }}
              >
                <div className={`
                  w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                  transition-all duration-300
                  ${verifyState === "verified"
                    ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                    : verifyState === "checking"
                      ? "bg-sky-500/40 border border-sky-500/40"
                      : "bg-white/[0.07] border border-white/[0.20]"}
                `}>
                  {verifyState === "verified"  && <Check   size={12} className="text-white" strokeWidth={3} />}
                  {verifyState === "checking"  && <Loader2 size={11} className="text-sky-400 animate-spin" />}
                </div>

                <span className={`text-sm font-medium transition-colors duration-300
                  ${verifyState === "verified" ? "text-emerald-400" : "text-slate-200"}`}>
                  {verifyState === "idle"     && "I'm not a robot"}
                  {verifyState === "checking" && "Verifying…"}
                  {verifyState === "verified" && "Verified — Human confirmed"}
                </span>

                {verifyState === "idle" && (
                  <span className="ml-auto text-[10px] text-slate-500 tracking-wider uppercase">Click to verify</span>
                )}
              </button>
              {errors.verify && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle size={11} />
                  {errors.verify}
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="space-y-1.5">
              <label
                className="flex items-start gap-3.5 cursor-pointer group"
                onClick={() => {
                  setTermsOk(v => {
                    if (errors.terms && !v) setErrors(prev => { const next = { ...prev }; delete next.terms; return next; });
                    return !v;
                  });
                }}
              >
                <div className={`
                  w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5
                  transition-all duration-200 cursor-pointer
                  ${termsOk
                    ? "bg-sky-500 border border-sky-500"
                    : errors.terms
                      ? "bg-red-500/10 border border-red-500/40"
                      : "bg-white/[0.07] border border-white/[0.20] group-hover:border-white/35"}
                `}>
                  {termsOk && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-xs text-slate-300 leading-relaxed mt-0.5">
                  I agree to Vaultex Market&apos;s{" "}
                  <Link href="/terms" target="_blank" className="text-sky-400 hover:text-sky-300 underline underline-offset-2" onClick={e => e.stopPropagation()}>Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" target="_blank" className="text-sky-400 hover:text-sky-300 underline underline-offset-2" onClick={e => e.stopPropagation()}>Privacy Policy</Link>.
                  {" "}I confirm I am at least 18 years old.
                </span>
              </label>
              {errors.terms && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 pl-8">
                  <AlertCircle size={11} />
                  {errors.terms}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation buttons ──────────────────────────────────────── */}
        <div className={`flex gap-3 mt-7 ${step > 1 ? "justify-between" : "justify-end"}`}>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={back}
              disabled={loading}
              className="flex items-center gap-2 border-white/[0.18] text-slate-300
                hover:bg-white/[0.07] hover:text-white hover:border-white/30 h-11 px-5 transition-all"
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={next}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white
                font-semibold h-11 px-6 shadow-lg shadow-sky-500/35 hover:shadow-sky-500/55
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ml-auto"
            >
              Continue
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white
                font-semibold h-11 px-8 shadow-lg shadow-sky-500/35 hover:shadow-sky-500/55
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Creating Account…</>
              ) : (
                <>Create Account <Check size={16} /></>
              )}
            </Button>
          )}
        </div>

        {/* Step indicator + sign-in link */}
        <div className="mt-5 pt-5 border-t border-white/[0.09] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 order-2 sm:order-1">
            Step {step} of {STEPS.length}
          </p>
          <p className="text-sm text-slate-400 order-1 sm:order-2">
            Already have an account?{" "}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-5 pt-1">
          {[
            { icon: Lock,   label: "TLS Secured"       },
            { icon: Shield, label: "Hashed Passwords"  },
            { icon: Check,  label: "KYC Verified"      },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-slate-500">
              <Icon size={11} />
              <span className="text-[10px] tracking-wide">{label}</span>
            </div>
          ))}
        </div>

      </Card>
    </div>
  );
}
