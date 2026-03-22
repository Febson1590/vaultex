import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen hero-bg flex flex-col">
      <div className="p-6">
        <Logo size="md" href="/" />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
      <div className="p-6 text-center">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} Vaultex Market · All rights reserved · AES-256 Encrypted · KYC/AML Compliant
        </p>
      </div>
    </div>
  );
}
