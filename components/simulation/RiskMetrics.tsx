"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";

interface RiskMetricsProps {
    stats: {
        mean: number;
        median: number;
        min: number;
        max: number;
        var95: number;
        var99: number;
    };
}

export function RiskMetrics({ stats }: RiskMetricsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Expected Value (Mean)" value={stats.mean} format="currency" color="text-primary" />
            <MetricCard label="Median Outcome" value={stats.median} format="currency" />
            <MetricCard label="VaR (95% Confidence)" value={stats.var95} format="currency" color="text-destructive" />
            <MetricCard label="Max Upside" value={stats.max} format="currency" color="text-secondary" />
        </div>
    );
}

function MetricCard({ label, value, format = "number", color = "text-foreground" }: { label: string, value: number, format?: "number" | "currency", color?: string }) {
    return (
        <DashboardCard className="p-4 flex flex-col justify-between gap-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
            <span className={`text-2xl font-mono font-bold ${color}`}>
                {format === "currency" ? `$${value.toFixed(2)}` : value.toFixed(2)}
            </span>
        </DashboardCard>
    );
}
