"use client";

import React from "react";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle } from "lucide-react";

interface RegimeIndicatorProps {
    atmIV: number | null;
    skewIndex: number | null;
    termSlope: number | null;
    ivRange: { min: number; max: number };
}

export function RegimeIndicator({ atmIV, skewIndex, termSlope, ivRange }: RegimeIndicatorProps) {
    // Determine volatility regime based on ATM IV
    const getVolRegime = (iv: number): { label: string; color: string; bg: string } => {
        if (iv < 0.15) return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/20' };
        if (iv < 0.25) return { label: 'Normal', color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
        if (iv < 0.40) return { label: 'Elevated', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
        return { label: 'High', color: 'text-red-400', bg: 'bg-red-500/20' };
    };

    // Determine term structure regime
    const getTermRegime = (slope: number): { label: string; icon: React.ReactNode } => {
        if (slope > 1) return { label: 'Contango', icon: <TrendingUp size={14} className="text-green-400" /> };
        if (slope < -1) return { label: 'Backwardation', icon: <TrendingDown size={14} className="text-red-400" /> };
        return { label: 'Flat', icon: <Minus size={14} className="text-gray-400" /> };
    };

    // Determine skew regime
    const getSkewRegime = (skew: number): { label: string; desc: string } => {
        if (skew > 3) return { label: 'Strong Put Skew', desc: 'Downside protection demand high' };
        if (skew > 0) return { label: 'Normal Skew', desc: 'Typical market structure' };
        if (skew > -2) return { label: 'Flat Skew', desc: 'Balanced positioning' };
        return { label: 'Call Skew', desc: 'Upside speculation elevated' };
    };

    const volRegime = atmIV !== null ? getVolRegime(atmIV) : null;
    const termRegime = termSlope !== null ? getTermRegime(termSlope) : null;
    const skewRegime = skewIndex !== null ? getSkewRegime(skewIndex) : null;

    return (
        <DashboardCard className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                Volatility Regime
            </h3>

            {/* ATM IV Gauge */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">ATM Implied Vol</span>
                    {atmIV !== null ? (
                        <span className={`font-mono font-bold ${volRegime?.color}`}>
                            {(atmIV * 100).toFixed(1)}%
                        </span>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </div>
                {atmIV !== null && volRegime && (
                    <>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className={`h-full ${volRegime.bg} transition-all duration-500`}
                                style={{ width: `${Math.min(100, atmIV * 200)}%` }}
                            />
                        </div>
                        <div className={`text-[10px] ${volRegime.color} text-center font-medium`}>
                            {volRegime.label} Volatility Environment
                        </div>
                    </>
                )}
            </div>

            {/* IV Range */}
            <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border/30 pt-3">
                <span>IV Range:</span>
                <span className="font-mono">
                    {(ivRange.min * 100).toFixed(0)}% – {(ivRange.max * 100).toFixed(0)}%
                </span>
            </div>

            {/* Term Structure */}
            {termSlope !== null && termRegime && (
                <div className="flex justify-between items-center text-xs border-t border-border/30 pt-3">
                    <span className="text-muted-foreground">Term Structure</span>
                    <div className="flex items-center gap-1.5">
                        {termRegime.icon}
                        <span className="font-medium">{termRegime.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                            ({termSlope > 0 ? '+' : ''}{termSlope.toFixed(1)}bp)
                        </span>
                    </div>
                </div>
            )}

            {/* Skew */}
            {skewIndex !== null && skewRegime && (
                <div className="border-t border-border/30 pt-3 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Skew Index</span>
                        <span className="font-mono font-medium">
                            {skewIndex > 0 ? '+' : ''}{skewIndex.toFixed(1)}
                        </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        {skewRegime.label}: {skewRegime.desc}
                    </div>
                </div>
            )}

            {/* Warning for extreme conditions */}
            {atmIV !== null && atmIV > 0.35 && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mt-2">
                    <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-yellow-200">
                        Elevated volatility regime. Options premiums are expensive. Consider selling strategies.
                    </span>
                </div>
            )}
        </DashboardCard>
    );
}
