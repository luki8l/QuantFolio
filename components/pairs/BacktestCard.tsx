"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { BacktestResult } from "@/lib/finance/pairs";

interface BacktestCardProps {
    backtest: BacktestResult;
    dates: string[]; // Use dates from main data to align chart
}

export function BacktestCard({ backtest, dates }: BacktestCardProps) {
    const chartData = backtest.equityCurve.map((val, i) => ({
        date: dates[i] || i, // fallback if dates mismatch
        equity: val
    })).filter(d => d.date);

    return (
        <DashboardCard className="h-full flex flex-col">
            <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
                <span>Mean Reversion Backtest</span>
                <span className={`text-xs px-2 py-1 rounded font-mono ${backtest.totalReturn >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {(backtest.totalReturn * 100).toFixed(1)}% Return
                </span>
            </h3>

            <div className="grid grid-cols-4 gap-2 mb-6 text-sm">
                <div className="flex flex-col items-center bg-secondary/5 rounded p-2">
                    <span className="text-muted-foreground text-xs">Total Trades</span>
                    <span className="font-mono font-bold text-lg">{backtest.trades}</span>
                </div>
                <div className="flex flex-col items-center bg-secondary/5 rounded p-2">
                    <span className="text-muted-foreground text-xs">Win Rate</span>
                    <span className="font-mono font-bold text-lg">{(backtest.winRate * 100).toFixed(0)}%</span>
                </div>
                <div className="flex flex-col items-center bg-secondary/5 rounded p-2">
                    <span className="text-muted-foreground text-xs">Max Drawdown</span>
                    <span className="font-mono font-bold text-lg text-destructive">
                        -{(backtest.maxDrawdown * 100).toFixed(1)}%
                    </span>
                </div>
                <div className="flex flex-col items-center bg-secondary/5 rounded p-2">
                    <span className="text-muted-foreground text-xs">Sharpe</span>
                    <span className="font-mono font-bold text-lg">{backtest.sharpeRatio.toFixed(2)}</span>
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
                            fontSize={12}
                            stroke="var(--muted-foreground)"
                            tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            labelStyle={{ color: 'var(--muted-foreground)' }}
                            formatter={(val: any) => typeof val === 'number' ? [`$${val.toFixed(2)}`, "Equity"] : [val, "Equity"]}
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

            <p className="text-xs text-muted-foreground mt-4 italic">
                *Simulated returns starting with $10k capital. Trades standard mean reversion (Z &gt; 2.0 Short, Z &lt; -2.0 Long, Exit at 0.0), allocating approx $1000 leveraged exposure per trade.
            </p>
        </DashboardCard>
    );
}
