"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { BacktestResult } from "@/lib/finance/pairs";
import { History, TrendingUp, TrendingDown, ArrowRight, Activity } from "lucide-react";

interface BacktestCardProps {
    backtest: BacktestResult;
    dates: string[];
    symbolA: string;
    symbolB: string;
}

export function BacktestCard({ backtest, dates, symbolA, symbolB }: BacktestCardProps) {
    const chartData = backtest.equityCurve.map((val, i) => ({
        date: dates[i] || i,
        equity: val
    })).filter(d => d.date);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            <DashboardCard className="xl:col-span-2 flex flex-col h-full">
                <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
                    <span>Mean Reversion Equity Curve</span>
                    <span className={`text-xs px-2 py-1 rounded font-mono ${backtest.totalReturn >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {(backtest.totalReturn * 100).toFixed(1)}% Total Return
                    </span>
                </h3>

                <div className="grid grid-cols-4 gap-2 mb-6 text-sm">
                    <div className="flex flex-col items-center bg-secondary/5 rounded p-2 border border-border/50">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Trades</span>
                        <span className="font-mono font-bold text-lg">{backtest.trades}</span>
                    </div>
                    <div className="flex flex-col items-center bg-secondary/5 rounded p-2 border border-border/50">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Win Rate</span>
                        <span className="font-mono font-bold text-lg">{(backtest.winRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex flex-col items-center bg-secondary/5 rounded p-2 border border-border/50">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Max Drawdown</span>
                        <span className="font-mono font-bold text-lg text-red-400">
                            -{(backtest.maxDrawdown * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex flex-col items-center bg-secondary/5 rounded p-2 border border-border/50">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Sharpe</span>
                        <span className="font-mono font-bold text-lg text-cyan-400">{backtest.sharpeRatio.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                            <XAxis
                                dataKey="date"
                                hide
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                fontSize={10}
                                stroke="var(--muted-foreground)"
                                tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                labelStyle={{ color: 'var(--muted-foreground)' }}
                                formatter={(val: any) => typeof val === 'number' ? [`$${val.toLocaleString()}`, "Equity"] : [val, "Equity"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="equity"
                                stroke="var(--primary)"
                                fillOpacity={1}
                                fill="url(#colorEquity)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground mt-4 italic">
                    *Strategy: Entry Z &gt; 2.0 or &lt; -2.0. Exit at Z=0. Position size approx $1,000 per leg.
                </p>
            </DashboardCard>

            <DashboardCard className="flex flex-col h-full overflow-hidden">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <History size={16} className="text-primary" /> Detailed Trade History
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {backtest.history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <Activity size={32} className="mb-2" />
                            <p className="text-xs">No trades triggered</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {backtest.history.slice().reverse().map((trade, i) => (
                                <div key={i} className="p-3 rounded-lg bg-secondary/5 border border-border/50 flex flex-col gap-3 transition-colors hover:border-border">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            {trade.type === 'Long' ?
                                                <TrendingUp size={14} className="text-green-400" /> :
                                                <TrendingDown size={14} className="text-red-400" />
                                            }
                                            <span className="text-xs font-bold">{trade.type} Spread Signal</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xs font-mono font-bold ${trade.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">Combined P&L</span>
                                        </div>
                                    </div>

                                    {/* Asset Leg Details */}
                                    <div className="grid grid-cols-1 gap-2 border-l-2 border-primary/20 pl-3">
                                        {/* Leg A */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center text-[11px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-1 h-1 rounded-full ${trade.sideA === 'Long' ? 'bg-primary shadow-[0_0_4px_var(--primary)]' : 'bg-red-400 shadow-[0_0_4px_var(--destructive)]'}`} />
                                                    <span className="font-bold">{symbolA}</span>
                                                    <span className="text-muted-foreground opacity-70">({trade.sideA})</span>
                                                </div>
                                                <span className={`font-mono font-bold text-[10px] ${trade.pnlA >= 0 ? "text-green-500/80" : "text-red-500/80"}`}>
                                                    {trade.pnlA >= 0 ? "+" : ""}${trade.pnlA.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="font-mono text-[9px] text-muted-foreground flex items-center gap-1">
                                                <span>Price: ${trade.entryPriceA.toFixed(2)}</span>
                                                <ArrowRight size={8} />
                                                <span>${trade.exitPriceA.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Leg B */}
                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="flex justify-between items-center text-[11px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-1 h-1 rounded-full ${trade.sideB === 'Long' ? 'bg-primary shadow-[0_0_4px_var(--primary)]' : 'bg-red-400 shadow-[0_0_4px_var(--destructive)]'}`} />
                                                    <span className="font-bold">{symbolB}</span>
                                                    <span className="text-muted-foreground opacity-70">({trade.sideB})</span>
                                                </div>
                                                <span className={`font-mono font-bold text-[10px] ${trade.pnlB >= 0 ? "text-green-500/80" : "text-red-500/80"}`}>
                                                    {trade.pnlB >= 0 ? "+" : ""}${trade.pnlB.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="font-mono text-[9px] text-muted-foreground flex items-center gap-1">
                                                <span>Price: ${trade.entryPriceB.toFixed(2)}</span>
                                                <ArrowRight size={8} />
                                                <span>${trade.exitPriceB.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                        <span>{trade.entryDate} &rarr; {trade.exitDate}</span>
                                        <span className="font-mono">Z: {trade.entryZ.toFixed(1)} &rarr; {trade.exitZ.toFixed(1)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardCard>
        </div>
    );
}
