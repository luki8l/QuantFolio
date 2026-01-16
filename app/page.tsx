import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { TrendingUp, Activity, PieChart, ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Real-time market overview and portfolio analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[500px]">
        {/* Main large widget - Market Sentiment */}
        <DashboardCard className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="text-primary" size={20} />
              Market Sentiment
            </h3>
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">LIVE</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-lg bg-background/20 relative z-10 backdrop-blur-sm">
            <Activity className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <span className="text-muted-foreground text-sm">Sentiment Analysis Module</span>
            <span className="text-xs text-muted-foreground/50 mt-1">Connecting to data stream...</span>
          </div>
        </DashboardCard>

        {/* Small widget - Beta */}
        <DashboardCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Portfolio Beta
            </h3>
            <Activity className="text-secondary h-4 w-4" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-mono font-bold text-foreground">1.24</span>
            <span className="text-xs text-secondary mb-1">+0.05</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
            vs S&P 500 (SPY)
          </div>
        </DashboardCard>

        {/* Small widget - VaR */}
        <DashboardCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              VaR (95%)
            </h3>
            <ShieldAlert className="text-destructive h-4 w-4" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-mono font-bold text-foreground">$4.2k</span>
            <span className="text-xs text-destructive mb-1">-12%</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
            Daily Risk Exposure
          </div>
        </DashboardCard>

        {/* Wide widget bottom right - Allocation */}
        <DashboardCard className="col-span-1 md:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <PieChart className="text-blue-400" size={20} />
              Sector Allocation
            </h3>
          </div>
          <div className="flex-1 h-32 flex items-center justify-center border border-dashed border-border/50 rounded-lg bg-background/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-shine opacity-30" />
            <span className="text-muted-foreground text-sm z-10">Allocation Chart Placeholder</span>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
