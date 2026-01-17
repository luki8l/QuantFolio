"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { BasketBacktestCard } from "@/components/pairs/BasketBacktestCard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { BasketAnalysisResult } from "@/lib/finance/pairs";
import { Info, BarChart2, List } from "lucide-react";

interface BasketResultsProps {
    data: {
        symbols: string[];
        dates: string[];
        prices: Record<string, number[]>;
        analysis: BasketAnalysisResult;
    };
}

export function BasketResults({ data }: BasketResultsProps) {
    const { analysis, dates, symbols } = data;
    const { weights, spread, zScore, stats, dependentSymbol, isCointegrated, halfLife } = analysis;

    // Prepare Spread Data for Chart
    const spreadData = dates.map((date, i) => ({
        date,
        spread: spread[i],
        zScore: zScore[i]
    }));

    // Prepare Weights Data for Bar Chart
    const weightsData = Object.entries(weights).map(([sym, weight]) => ({
        symbol: sym,
        weight: weight,
        role: sym === dependentSymbol ? "Dependent (Long)" : "Independent (Short)"
    }));

    // Prepare Normalized Price Data
    const priceChartData = dates.map((date, i) => {
        const point: any = { date };
        symbols.forEach(sym => {
            const prices = data.prices[sym];
            if (prices && prices[0]) {
                point[sym] = (prices[i] / prices[0]) * 100;
            }
        });
        return point;
    });

    const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316"];

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DashboardCard>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">Basket Status <Info size={12} /></div>
                    <div className={`text-xl font-bold ${isCointegrated ? "text-green-400" : "text-yellow-400"}`}>
                        {isCointegrated ? "Cointegrated" : "Not Cointegrated"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Half-Life: {halfLife < 999 ? halfLife.toFixed(1) + " days" : "> 1 Year"}
                    </div>
                </DashboardCard>
                <DashboardCard>
                    <div className="text-xs text-muted-foreground">Dependent Asset</div>
                    <div className="text-xl font-bold font-mono">{dependentSymbol}</div>
                    <div className="text-xs text-muted-foreground mt-1">Target of the spread</div>
                </DashboardCard>
                <DashboardCard>
                    <div className="text-xs text-muted-foreground">Current Z-Score</div>
                    <div className={`text-xl font-bold font-mono ${Math.abs(analysis.currentZScore) > 2 ? "text-red-400" : "text-foreground"}`}>
                        {analysis.currentZScore.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Signal Threshold: +/- 2.0</div>
                </DashboardCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Weights Table/Chart */}
                <DashboardCard className="lg:col-span-1 flex flex-col">
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><List size={16} /> Portfolio Weights</h3>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="text-left py-2 font-medium">Asset</th>
                                    <th className="text-right py-2 font-medium">Weight</th>
                                    <th className="text-right py-2 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {weightsData.map((item) => (
                                    <tr key={item.symbol}>
                                        <td className="py-2 font-bold">{item.symbol}</td>
                                        <td className="py-2 text-right font-mono">{item.weight.toFixed(4)}</td>
                                        <td className="py-2 text-right text-xs">
                                            {item.weight > 0 ? (
                                                <span className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">LONG</span>
                                            ) : (
                                                <span className="text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">SHORT</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-6 text-xs text-muted-foreground">
                            * Weights are calculated such that the portfolio is stationarity.
                            Positive weight means buying, negative means shorting.
                        </div>
                    </div>
                </DashboardCard>

                {/* 2. Z-Score (Signal) Chart */}
                <DashboardCard className="lg:col-span-2 h-[400px] flex flex-col">
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><BarChart2 size={16} /> Basket Z-Score</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={spreadData}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                                <XAxis dataKey="date" tickFormatter={(val) => val.substring(0, 7)} fontSize={10} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} minTickGap={30} />
                                <YAxis domain={[-4, 4]} fontSize={12} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                    labelStyle={{ color: 'var(--muted-foreground)' }}
                                    formatter={(val: any) => typeof val === 'number' ? val.toFixed(2) : val}
                                />
                                {/* Signal Thresholds */}
                                <ReferenceLine y={2} stroke="var(--destructive)" strokeDasharray="3 3" label={{ position: 'right', value: 'Sell', fill: 'var(--destructive)', fontSize: 10 }} />
                                <ReferenceLine y={-2} stroke="var(--primary)" strokeDasharray="3 3" label={{ position: 'right', value: 'Buy', fill: 'var(--primary)', fontSize: 10 }} />
                                <ReferenceLine y={0} stroke="var(--muted-foreground)" />

                                <Line type="monotone" dataKey="zScore" stroke="#fbbf24" dot={false} strokeWidth={2} name="Z-Score" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardCard>
            </div>

            {/* 3. Normalized Price Chart */}
            <DashboardCard className="h-[400px] flex flex-col">
                <h3 className="font-semibold text-sm mb-4">Normalized Price Performance (Base 100)</h3>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={priceChartData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={['auto', 'auto']} fontSize={12} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                labelStyle={{ color: 'var(--muted-foreground)' }}
                                formatter={(val: any) => typeof val === 'number' ? val.toFixed(2) : val}
                            />
                            <Legend />
                            {symbols.map((sym, i) => (
                                <Line
                                    key={sym}
                                    type="monotone"
                                    dataKey={sym}
                                    stroke={colors[i % colors.length]}
                                    dot={false}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </DashboardCard>

            {/* 4. Backtest Results */}
            <div className="min-h-[450px]">
                <BasketBacktestCard
                    backtest={analysis.backtest}
                    dates={dates}
                />
            </div>
        </div>
    );
}
