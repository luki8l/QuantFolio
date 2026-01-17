"use client";

import React, { useMemo, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { LineChart, ChevronLeft, ChevronRight } from "lucide-react";
import { SurfacePoint } from "@/lib/finance/blackScholes";

interface VolatilitySmileProps {
    points: SurfacePoint[];
    spotPrice: number;
}

export function VolatilitySmile({ points, spotPrice }: VolatilitySmileProps) {
    const [selectedExpiryIndex, setSelectedExpiryIndex] = useState(0);

    const { expiries, smileData, spotStrike } = useMemo(() => {
        // Group by expiry
        const byExpiry = new Map<string, SurfacePoint[]>();
        points.forEach(p => {
            const existing = byExpiry.get(p.expiry) || [];
            existing.push(p);
            byExpiry.set(p.expiry, existing);
        });

        const sortedExpiries = [...byExpiry.keys()];

        // Get smile data for each expiry
        const smileData = new Map<string, { strike: number; moneyness: number; callIV: number | null; putIV: number | null }[]>();

        byExpiry.forEach((expiryPoints, expiry) => {
            const sorted = [...expiryPoints]
                .sort((a, b) => a.strike - b.strike)
                .map(p => ({
                    strike: p.strike,
                    moneyness: p.moneyness,
                    callIV: p.callIV,
                    putIV: p.putIV
                }));
            smileData.set(expiry, sorted);
        });

        // Find nearest strike to spot
        const spotStrike = points.reduce((closest, p) =>
            Math.abs(p.strike - spotPrice) < Math.abs(closest - spotPrice) ? p.strike : closest
            , points[0]?.strike || spotPrice);

        return { expiries: sortedExpiries, smileData, spotStrike };
    }, [points, spotPrice]);

    if (expiries.length === 0) return null;

    const currentExpiry = expiries[selectedExpiryIndex] || expiries[0];
    const currentSmile = smileData.get(currentExpiry) || [];
    const currentDays = points.find(p => p.expiry === currentExpiry)?.daysToExpiry || 0;

    // Filter to only points with valid IVs
    const validPoints = currentSmile.filter(s => s.callIV !== null || s.putIV !== null);

    if (validPoints.length < 2) {
        return (
            <DashboardCard className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <LineChart size={14} className="text-orange-400" />
                    Volatility Smile
                </h3>
                <div className="text-center py-4 text-muted-foreground text-xs">
                    Not enough data points
                </div>
            </DashboardCard>
        );
    }

    // Find max IV for scaling
    const allIVs = validPoints.flatMap(s => [s.callIV, s.putIV]).filter((v): v is number => v !== null && v > 0);
    const maxIV = Math.max(...allIVs);
    const minIV = Math.min(...allIVs);
    const ivRange = maxIV - minIV;

    // Take strikes around ATM
    const atmIndex = validPoints.findIndex(s => Math.abs(s.moneyness) < 0.05);
    const centerIndex = atmIndex >= 0 ? atmIndex : Math.floor(validPoints.length / 2);
    const start = Math.max(0, centerIndex - 8);
    const end = Math.min(validPoints.length, centerIndex + 9);
    const displaySmile = validPoints.slice(start, end);

    // Calculate pixel positions (not percentages for SVG)
    const chartWidth = 280;
    const chartHeight = 80;

    const callPoints: string[] = [];
    const putPoints: string[] = [];
    let atmX = chartWidth / 2;

    displaySmile.forEach((s, i) => {
        const x = (i / Math.max(1, displaySmile.length - 1)) * chartWidth;

        if (s.callIV !== null && ivRange > 0) {
            const y = chartHeight - ((s.callIV - minIV) / ivRange) * chartHeight;
            callPoints.push(`${x},${y}`);
        }

        if (s.putIV !== null && ivRange > 0) {
            const y = chartHeight - ((s.putIV - minIV) / ivRange) * chartHeight;
            putPoints.push(`${x},${y}`);
        }

        if (Math.abs(s.moneyness) < 0.02) {
            atmX = x;
        }
    });

    return (
        <DashboardCard className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <LineChart size={14} className="text-orange-400" />
                    Volatility Smile
                </h3>

                {/* Expiry selector */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setSelectedExpiryIndex(Math.max(0, selectedExpiryIndex - 1))}
                        disabled={selectedExpiryIndex === 0}
                        className="p-0.5 hover:bg-secondary/50 rounded disabled:opacity-30"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-[10px] font-mono min-w-[60px] text-center">
                        {currentDays}d
                    </span>
                    <button
                        onClick={() => setSelectedExpiryIndex(Math.min(expiries.length - 1, selectedExpiryIndex + 1))}
                        disabled={selectedExpiryIndex === expiries.length - 1}
                        className="p-0.5 hover:bg-secondary/50 rounded disabled:opacity-30"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Chart */}
            <div className="relative bg-secondary/10 rounded p-2">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-2 bottom-6 w-8 flex flex-col justify-between text-[8px] text-muted-foreground font-mono">
                    <span>{(maxIV * 100).toFixed(0)}%</span>
                    <span>{(minIV * 100).toFixed(0)}%</span>
                </div>

                {/* SVG Chart */}
                <div className="ml-8">
                    <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="rgba(255,255,255,0.1)" />
                        <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="rgba(255,255,255,0.1)" />
                        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="rgba(255,255,255,0.1)" />

                        {/* Call IV line */}
                        {callPoints.length > 1 && (
                            <polyline
                                points={callPoints.join(' ')}
                                fill="none"
                                stroke="rgb(34, 197, 94)"
                                strokeWidth="2"
                            />
                        )}

                        {/* Put IV line */}
                        {putPoints.length > 1 && (
                            <polyline
                                points={putPoints.join(' ')}
                                fill="none"
                                stroke="rgb(239, 68, 68)"
                                strokeWidth="2"
                                strokeDasharray="4,2"
                            />
                        )}

                        {/* ATM vertical line */}
                        <line
                            x1={atmX}
                            y1="0"
                            x2={atmX}
                            y2={chartHeight}
                            stroke="rgb(250, 204, 21)"
                            strokeWidth="1"
                            strokeDasharray="3,3"
                        />

                        {/* Data points for calls */}
                        {displaySmile.map((s, i) => {
                            if (s.callIV === null || ivRange <= 0) return null;
                            const x = (i / Math.max(1, displaySmile.length - 1)) * chartWidth;
                            const y = chartHeight - ((s.callIV - minIV) / ivRange) * chartHeight;
                            return (
                                <circle
                                    key={`call-${i}`}
                                    cx={x}
                                    cy={y}
                                    r="2"
                                    fill="rgb(34, 197, 94)"
                                />
                            );
                        })}
                    </svg>
                </div>

                {/* X-axis labels */}
                <div className="ml-8 flex justify-between text-[8px] text-muted-foreground font-mono mt-1">
                    <span>${displaySmile[0]?.strike.toFixed(0)}</span>
                    <span className="text-yellow-400">${spotStrike.toFixed(0)}</span>
                    <span>${displaySmile[displaySmile.length - 1]?.strike.toFixed(0)}</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 text-[9px]">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-green-500" />
                    <span className="text-muted-foreground">Call IV</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-red-500" style={{ borderTop: '2px dashed' }} />
                    <span className="text-muted-foreground">Put IV</span>
                </div>
            </div>

            {/* Smile Stats */}
            <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-border/30">
                <div className="text-center">
                    <div className="text-muted-foreground">ATM IV</div>
                    <div className="font-mono font-bold">
                        {(() => {
                            const atm = validPoints.find(s => Math.abs(s.moneyness) < 0.05);
                            return atm ? `${((atm.callIV || atm.putIV || 0) * 100).toFixed(1)}%` : '—';
                        })()}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-muted-foreground">25Δ Skew</div>
                    <div className="font-mono font-bold">
                        {(() => {
                            const otmPut = validPoints.find(s => s.moneyness < -0.1 && s.putIV);
                            const otmCall = validPoints.find(s => s.moneyness > 0.1 && s.callIV);
                            if (!otmPut?.putIV || !otmCall?.callIV) return '—';
                            const skew = (otmPut.putIV - otmCall.callIV) * 100;
                            return `${skew > 0 ? '+' : ''}${skew.toFixed(1)}`;
                        })()}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-muted-foreground">Wings</div>
                    <div className="font-mono font-bold text-cyan-400">
                        {(() => {
                            const atm = validPoints.find(s => Math.abs(s.moneyness) < 0.05);
                            const otm = validPoints.filter(s => Math.abs(s.moneyness) > 0.1);
                            if (!atm || otm.length === 0) return '—';
                            const atmIV = atm.callIV || atm.putIV || 0;
                            const avgOtmIV = otm.reduce((sum, o) => sum + (o.callIV || o.putIV || 0), 0) / otm.length;
                            const wingPremium = (avgOtmIV - atmIV) * 100;
                            return `${wingPremium > 0 ? '+' : ''}${wingPremium.toFixed(1)}`;
                        })()}
                    </div>
                </div>
            </div>
        </DashboardCard>
    );
}
