"use client";

import React, { useMemo } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SurfacePoint } from "@/lib/finance/blackScholes";

interface TermStructureChartProps {
    points: SurfacePoint[];
    spotPrice: number;
}

interface ExpiryData {
    expiry: string;
    daysToExpiry: number;
    atmIV: number;
    otmPutIV: number | null;  // 5% OTM
    otmCallIV: number | null;  // 5% OTM
    skew: number | null;
}

export function TermStructureChart({ points, spotPrice }: TermStructureChartProps) {
    const termStructure = useMemo<ExpiryData[]>(() => {
        // Group by expiry
        const byExpiry = new Map<string, SurfacePoint[]>();
        points.forEach(p => {
            const existing = byExpiry.get(p.expiry) || [];
            existing.push(p);
            byExpiry.set(p.expiry, existing);
        });

        const results: ExpiryData[] = [];

        byExpiry.forEach((expiryPoints, expiry) => {
            // Sort by moneyness
            const sorted = [...expiryPoints].sort((a, b) => Math.abs(a.moneyness) - Math.abs(b.moneyness));

            // ATM IV (closest to money)
            const atmPoint = sorted[0];
            if (!atmPoint) return;
            const atmIV = atmPoint.callIV ?? atmPoint.putIV;
            if (atmIV === null) return;

            // Find OTM puts (moneyness < -0.03) and calls (moneyness > 0.03)
            const otmPuts = expiryPoints.filter(p => p.moneyness < -0.03 && p.putIV !== null);
            const otmCalls = expiryPoints.filter(p => p.moneyness > 0.03 && p.callIV !== null);

            const otmPutIV = otmPuts.length > 0
                ? otmPuts.reduce((s, p) => s + (p.putIV || 0), 0) / otmPuts.length
                : null;
            const otmCallIV = otmCalls.length > 0
                ? otmCalls.reduce((s, p) => s + (p.callIV || 0), 0) / otmCalls.length
                : null;

            const skew = otmPutIV !== null && otmCallIV !== null
                ? (otmPutIV - otmCallIV) * 100
                : null;

            results.push({
                expiry,
                daysToExpiry: atmPoint.daysToExpiry,
                atmIV,
                otmPutIV,
                otmCallIV,
                skew
            });
        });

        return results.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    }, [points, spotPrice]);

    if (termStructure.length === 0) return null;

    // Find max IV for scaling
    const maxIV = Math.max(...termStructure.map(t =>
        Math.max(t.atmIV, t.otmPutIV || 0, t.otmCallIV || 0)
    ));

    // Determine term structure direction
    const firstATM = termStructure[0]?.atmIV || 0;
    const lastATM = termStructure[termStructure.length - 1]?.atmIV || 0;
    const termDirection = lastATM > firstATM * 1.02 ? 'contango'
        : lastATM < firstATM * 0.98 ? 'backwardation'
            : 'flat';

    return (
        <DashboardCard className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    {termDirection === 'contango' ? (
                        <TrendingUp size={14} className="text-green-400" />
                    ) : termDirection === 'backwardation' ? (
                        <TrendingDown size={14} className="text-red-400" />
                    ) : (
                        <Minus size={14} className="text-gray-400" />
                    )}
                    Term Structure
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${termDirection === 'contango' ? 'bg-green-500/20 text-green-400'
                        : termDirection === 'backwardation' ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                    }`}>
                    {termDirection.charAt(0).toUpperCase() + termDirection.slice(1)}
                </span>
            </div>

            {/* Visual Bar Chart */}
            <div className="space-y-1.5">
                {termStructure.slice(0, 8).map((data, i) => (
                    <div key={data.expiry} className="space-y-0.5">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-mono w-16">
                                {data.daysToExpiry}d
                            </span>
                            <div className="flex-1 mx-2 relative h-4">
                                {/* ATM IV bar */}
                                <div
                                    className="absolute top-0 h-4 bg-cyan-500/40 rounded-r"
                                    style={{ width: `${(data.atmIV / maxIV) * 100}%` }}
                                />
                                {/* OTM Put IV marker */}
                                {data.otmPutIV && (
                                    <div
                                        className="absolute top-1 h-2 w-1 bg-red-400 rounded"
                                        style={{ left: `${(data.otmPutIV / maxIV) * 100}%` }}
                                        title={`Put IV: ${(data.otmPutIV * 100).toFixed(1)}%`}
                                    />
                                )}
                                {/* OTM Call IV marker */}
                                {data.otmCallIV && (
                                    <div
                                        className="absolute top-1 h-2 w-1 bg-green-400 rounded"
                                        style={{ left: `${(data.otmCallIV / maxIV) * 100}%` }}
                                        title={`Call IV: ${(data.otmCallIV * 100).toFixed(1)}%`}
                                    />
                                )}
                            </div>
                            <span className="font-mono text-foreground w-12 text-right">
                                {(data.atmIV * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-[9px] text-muted-foreground pt-1 border-t border-border/30">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-cyan-500/40 rounded" />
                    <span>ATM IV</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-2 bg-red-400 rounded" />
                    <span>OTM Put</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-2 bg-green-400 rounded" />
                    <span>OTM Call</span>
                </div>
            </div>

            {/* Skew Table */}
            <div className="text-[9px] mt-2">
                <div className="text-muted-foreground mb-1">Skew Index (Put IV - Call IV):</div>
                <div className="flex flex-wrap gap-1">
                    {termStructure.slice(0, 5).map(data => (
                        <div
                            key={data.expiry}
                            className={`px-1.5 py-0.5 rounded font-mono ${data.skew === null ? 'bg-secondary/30 text-muted-foreground'
                                    : data.skew > 2 ? 'bg-red-500/20 text-red-400'
                                        : data.skew < -1 ? 'bg-green-500/20 text-green-400'
                                            : 'bg-secondary/30 text-foreground'
                                }`}
                        >
                            {data.daysToExpiry}d: {data.skew !== null ? `${data.skew > 0 ? '+' : ''}${data.skew.toFixed(1)}` : '—'}
                        </div>
                    ))}
                </div>
            </div>
        </DashboardCard>
    );
}
