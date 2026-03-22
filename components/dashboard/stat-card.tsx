import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function StatCard({ title, value, subtitle, change, icon: Icon, iconColor = "text-sky-400", className }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className={cn("glass-card glass-card-hover rounded-xl p-5", className)}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{title}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {(subtitle || change !== undefined) && (
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <span className={cn("flex items-center gap-0.5 text-xs font-medium", isPositive ? "text-emerald-400" : "text-red-400")}>
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isPositive ? "+" : ""}{change.toFixed(2)}%
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
