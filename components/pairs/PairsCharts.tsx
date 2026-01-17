"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { BacktestCard } from "@/components/pairs/BacktestCard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { PairsAnalysisResult } from "@/lib/finance/pairs";
import { Info, BookOpen, Activity } from "lucide-react";

interface PairsChartsProps {
    symbolA: string;
    symbolB: string;
    dates: string[];
    pricesA: number[];
    pricesB: number[];
    analysis: PairsAnalysisResult;
}

export function PairsCharts({ symbolA, symbolB, dates, pricesA, pricesB, analysis }: PairsChartsProps) {
    const data = dates.map((date, i) => {
        const normA = (pricesA[i] / pricesA[0]) * 100;
        const normB = (pricesB[i] / pricesB[0]) * 100;

        return {
            date,
            [symbolA]: normA,
            [symbolB]: normB,
            spread: analysis.spread[i],
            zScore: analysis.zScore[i]
        };
    });

    const isCointegrated = analysis.isCointegrated;
    const halfLife = analysis.halfLife;

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <DashboardCard>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">Correlation Status <Info size={12} /></div>
                    <div className={`text-xl font-bold ${isCointegrated ? "text-green-400" : "text-yellow-400"}`}>
                        {isCointegrated ? "Cointegrated" : "Not Cointegrated"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Half-Life: {halfLife < 999 ? halfLife.toFixed(1) + " days" : "> 1 Year"}
                    </div>
                </DashboardCard>
                <DashboardCard>
                    <div className="text-xs text-muted-foreground">Hedge Ratio (Beta)</div>
                    <div className="text-xl font-bold font-mono">{analysis.hedgeRatio.toFixed(3)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Long 1 {symbolA} / Short {analysis.hedgeRatio.toFixed(2)} {symbolB}</div>
                </DashboardCard>
                <DashboardCard>
                    <div className="text-xs text-muted-foreground">Current Z-Score</div>
                    <div className={`text-xl font-bold font-mono ${Math.abs(analysis.currentZScore) > 2 ? "text-red-400" : "text-foreground"}`}>
                        {analysis.currentZScore.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Signal Threshold: +/- 2.0</div>
                </DashboardCard>
                <DashboardCard>
                    <div className="text-xs text-muted-foreground">Model Alpha</div>
                    <div className="text-xl font-bold font-mono">{analysis.alpha.toFixed(4)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Spread Offset</div>
                </DashboardCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Normalized Price Chart */}
                <DashboardCard className="h-[350px] flex flex-col">
                    <h3 className="font-semibold text-sm mb-4">Normalized Price Performance (Base 100)</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                                <XAxis dataKey="date" hide />
                                <YAxis domain={['auto', 'auto']} fontSize={12} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                    labelStyle={{ color: 'var(--muted-foreground)' }}
                                    formatter={(val: any) => typeof val === 'number' ? val.toFixed(2) : val}
                                />
                                <Legend />
                                <Line type="monotone" dataKey={symbolA} stroke="var(--primary)" dot={false} strokeWidth={2} />
                                <Line type="monotone" dataKey={symbolB} stroke="var(--secondary)" dot={false} strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardCard>

                {/* 2. Z-Score (Signal) Chart */}
                <DashboardCard className="h-[350px] flex flex-col">
                    <h3 className="font-semibold text-sm mb-4">Spread Z-Score (Mean Reversion Signal)</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                                <XAxis dataKey="date" tickFormatter={(val) => val.substring(0, 7)} fontSize={10} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} minTickGap={30} />
                                <YAxis domain={[-4, 4]} fontSize={12} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                    labelStyle={{ color: 'var(--muted-foreground)' }}
                                    formatter={(val: any) => typeof val === 'number' ? val.toFixed(2) : val}
                                />
                                {/* Signal Thresholds */}
                                <ReferenceLine y={2} stroke="var(--destructive)" strokeDasharray="3 3" label={{ position: 'right', value: 'Sell Spread', fill: 'var(--destructive)', fontSize: 10 }} />
                                <ReferenceLine y={-2} stroke="var(--primary)" strokeDasharray="3 3" label={{ position: 'right', value: 'Buy Spread', fill: 'var(--primary)', fontSize: 10 }} />
                                <ReferenceLine y={0} stroke="var(--muted-foreground)" />

                                <Line type="monotone" dataKey="zScore" stroke="#fbbf24" dot={false} strokeWidth={2} name="Z-Score" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardCard>
            </div>

            {/* 3. Backtest Results */}
            <div className="min-h-[450px]">
                <BacktestCard
                    backtest={analysis.backtest}
                    dates={dates}
                    symbolA={symbolA}
                    symbolB={symbolB}
                />
            </div>

            {/* 4. Educational Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DashboardCard className="bg-secondary/5 border-dashed">
                    <h4 className="font-bold flex items-center gap-2 mb-2 text-foreground"><BookOpen size={16} /> What is Statistical Arbitrage?</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Unlike simple correlation, <strong>Cointegration</strong> implies that two assets share a long-term equilibrium. Even if they wander apart (the "Spread" widens), market forces usually bring them back together.
                        We measure this using the <strong>Spread Z-Score</strong>. A Z-Score of 2.0 means the spread is 2 standard deviations away from the mean—statistically likely to revert.
                    </p>
                </DashboardCard>
                <DashboardCard className="bg-secondary/5 border-dashed">
                    <h4 className="font-bold flex items-center gap-2 mb-2 text-foreground"><Activity size={16} /> The Strategy</h4>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                        <li><strong>Short Spread (Z &gt; 2):</strong> The spread is too high. We Short Asset A and Buy Asset B (weighted by Hedge Ratio).</li>
                        <li><strong>Long Spread (Z &lt; -2):</strong> The spread is too low. We Buy Asset A and Short Asset B.</li>
                        <li><strong>Exit (Z = 0):</strong> When the spread returns to mean, we close positions for a profit.</li>
                    </ul>
                </DashboardCard>
            </div>
        </div>
    );
}
