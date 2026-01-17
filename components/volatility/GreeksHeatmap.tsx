"use client";

import React, { useMemo, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Activity, Zap, Timer, TrendingUp } from "lucide-react";
import { SurfacePoint } from "@/lib/finance/blackScholes";

interface GreeksHeatmapProps {
    points: SurfacePoint[];
    spotPrice: number;
}

type GreekType = 'delta' | 'gamma' | 'vega';

export function GreeksHeatmap({ points, spotPrice }: GreeksHeatmapProps) {
    const [selectedGreek, setSelectedGreek] = useState<GreekType>('delta');

    // Get first expiry's data for heatmap
    const heatmapData = useMemo(() => {
        if (!points.length) return null;

        // Group by expiry, take first 3
        const byExpiry = new Map<string, SurfacePoint[]>();
        points.forEach(p => {
            const existing = byExpiry.get(p.expiry) || [];
            existing.push(p);
            byExpiry.set(p.expiry, existing);
        });

        const expiries = [...byExpiry.keys()].slice(0, 3);
        const result: { expiry: string; daysToExpiry: number; strikes: { strike: number; value: number | null; moneyness: number }[] }[] = [];

        expiries.forEach(expiry => {
            const expiryPoints = byExpiry.get(expiry)!;
            const sorted = [...expiryPoints].sort((a, b) => a.strike - b.strike);

            // Take ~15 strikes around ATM
            const atmIndex = sorted.findIndex(p => Math.abs(p.moneyness) < 0.02) || Math.floor(sorted.length / 2);
            const start = Math.max(0, atmIndex - 7);
            const end = Math.min(sorted.length, atmIndex + 8);
            const selected = sorted.slice(start, end);

            const strikes = selected.map(p => {
                let value: number | null = null;
                switch (selectedGreek) {
                    case 'delta':
                        value = p.callDelta;
                        break;
                    case 'gamma':
                        value = p.gamma;
                        break;
                    case 'vega':
                        value = p.vega;
                        break;
                }
                return {
                    strike: p.strike,
                    value,
                    moneyness: p.moneyness
                };
            });

            result.push({
                expiry,
                daysToExpiry: expiryPoints[0]?.daysToExpiry || 0,
                strikes
            });
        });

        return result;
    }, [points, spotPrice, selectedGreek]);

    if (!heatmapData || heatmapData.length === 0) return null;

    const getColor = (value: number | null, type: GreekType): string => {
        if (value === null) return 'bg-secondary/20';

        switch (type) {
            case 'delta':
                // -1 to 1 scale
                if (value > 0.7) return 'bg-green-500';
                if (value > 0.5) return 'bg-green-400/80';
                if (value > 0.3) return 'bg-green-400/50';
                if (value > 0) return 'bg-green-400/30';
                if (value > -0.3) return 'bg-red-400/30';
                if (value > -0.5) return 'bg-red-400/50';
                if (value > -0.7) return 'bg-red-400/80';
                return 'bg-red-500';
            case 'gamma':
                // 0 to max scale (always positive)
                if (value > 0.03) return 'bg-purple-500';
                if (value > 0.02) return 'bg-purple-400';
                if (value > 0.01) return 'bg-purple-400/60';
                if (value > 0.005) return 'bg-purple-400/40';
                return 'bg-purple-400/20';
            case 'vega':
                // 0 to max scale
                if (value > 0.5) return 'bg-cyan-500';
                if (value > 0.3) return 'bg-cyan-400';
                if (value > 0.15) return 'bg-cyan-400/60';
                if (value > 0.05) return 'bg-cyan-400/40';
                return 'bg-cyan-400/20';
        }
    };

    const formatValue = (value: number | null, type: GreekType): string => {
        if (value === null) return '—';
        switch (type) {
            case 'delta':
                return value.toFixed(2);
            case 'gamma':
                return value.toFixed(3);
            case 'vega':
                return value.toFixed(2);
        }
    };

    const getIcon = (type: GreekType) => {
        switch (type) {
            case 'delta': return <TrendingUp size={12} />;
            case 'gamma': return <Zap size={12} />;
            case 'vega': return <Activity size={12} />;
        }
    };

    return (
        <DashboardCard className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Activity size={14} className="text-purple-400" />
                    Greeks Heatmap
                </h3>
            </div>

            {/* Greek selector */}
            <div className="flex gap-1">
                {(['delta', 'gamma', 'vega'] as GreekType[]).map(greek => (
                    <button
                        key={greek}
                        onClick={() => setSelectedGreek(greek)}
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-full border transition-colors ${selectedGreek === greek
                                ? greek === 'delta' ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                    : greek === 'gamma' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                        : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {getIcon(greek)}
                        <span className="capitalize">{greek}</span>
                    </button>
                ))}
            </div>

            {/* Heatmap */}
            <div className="space-y-2 overflow-x-auto">
                {heatmapData.map(({ expiry, daysToExpiry, strikes }) => (
                    <div key={expiry}>
                        <div className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1">
                            <Timer size={10} />
                            {daysToExpiry}d ({expiry})
                        </div>
                        <div className="flex gap-0.5">
                            {strikes.map(({ strike, value, moneyness }) => (
                                <div
                                    key={strike}
                                    className={`flex-1 min-w-[28px] h-8 rounded flex flex-col items-center justify-center ${getColor(value, selectedGreek)} ${Math.abs(moneyness) < 0.01 ? 'ring-1 ring-yellow-400' : ''
                                        }`}
                                    title={`Strike: $${strike}\n${selectedGreek}: ${formatValue(value, selectedGreek)}`}
                                >
                                    <span className="text-[8px] font-mono opacity-70">
                                        {strike.toFixed(0)}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold">
                                        {formatValue(value, selectedGreek)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground pt-1 border-t border-border/30">
                {selectedGreek === 'delta' && (
                    <>
                        <span>Delta:</span>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-2 bg-red-500 rounded" />
                            <span>-1</span>
                        </div>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-2 bg-secondary/50 rounded" />
                            <span>0</span>
                        </div>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-2 bg-green-500 rounded" />
                            <span>+1</span>
                        </div>
                    </>
                )}
                {selectedGreek === 'gamma' && (
                    <>
                        <span>Gamma:</span>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-2 bg-purple-400/20 rounded" />
                            <span>Low</span>
                        </div>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-2 bg-purple-500 rounded" />
                            <span>High (ATM)</span>
                        </div>
                    </>
                )}
                {selectedGreek === 'vega' && (
                    <>
                        <span>Vega:</span>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-2 bg-cyan-400/20 rounded" />
                            <span>Low</span>
                        </div>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-2 bg-cyan-500 rounded" />
                            <span>High</span>
                        </div>
                    </>
                )}
                <span className="ml-auto">
                    <span className="w-2 h-2 ring-1 ring-yellow-400 rounded inline-block mr-1" />
                    ATM
                </span>
            </div>
        </DashboardCard>
    );
}
