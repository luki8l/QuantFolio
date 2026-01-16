"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { PortfolioPoint, Asset } from "@/lib/finance/portfolio";
import { ResponsiveContainer, ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';

interface EfficientFrontierChartProps {
    points: PortfolioPoint[];
    maxSharpe: PortfolioPoint;
    minVol: PortfolioPoint;
    assets?: Asset[];
}

export function EfficientFrontierChart({ points, maxSharpe, minVol, assets }: EfficientFrontierChartProps) {
    if (!points || points.length === 0) return null;

    // 1. Transform points for Scatter
    const scatterData = points.map(p => ({
        x: p.volatility * 100,
        y: p.returns * 100,
        sharpe: p.sharpeRatio,
        weights: p.weights // Keep weights for tooltip
    }));

    // 2. Calculate Frontier Line (Upper boundary) - Smoothed & Monotonic
    // Sort by Volatility
    const sorted = [...scatterData].sort((a, b) => a.x - b.x);

    // Dynamic Bin Size to ensure ~100 points
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x;
    const range = maxX - minX;
    // We want roughly 100-150 bins.
    const binSize = Math.max(0.01, range / 150);

    const frontierMap = new Map<number, { x: number, y: number, weights: number[] }>();
    sorted.forEach(p => {
        if (p.x < minVol.volatility * 100) return; // Start from Min Vol
        const bin = Math.floor(p.x / binSize);
        const existing = frontierMap.get(bin);
        if (!existing || p.y > existing.y) {
            frontierMap.set(bin, { x: p.x, y: p.y, weights: p.weights });
        }
    });

    let rawFrontier = Array.from(frontierMap.values()).sort((a, b) => a.x - b.x);

    // 3. Smooth Frontier: Ensure strictly increasing Return (Monotonicity)
    const frontierLine: { x: number, y: number, weights: number[] }[] = [];
    let maxY = -Infinity;

    // Iterate and only keep points that establish a new high for Return
    for (const p of rawFrontier) {
        if (p.y > maxY) {
            frontierLine.push(p);
            maxY = p.y;
        }
    }

    const maxSharpeData = [{ x: maxSharpe.volatility * 100, y: maxSharpe.returns * 100, weights: maxSharpe.weights }];
    const minVolData = [{ x: minVol.volatility * 100, y: minVol.returns * 100, weights: minVol.weights }];

    // Asset Data
    const assetData = assets?.map(a => ({
        x: a.volatility * 100,
        y: a.meanReturn * 100,
        name: a.symbol,
        color: a.color
    })) || [];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;

            // Check if it's an asset (has name, usually no weights unless we added them, but assetData doesn't have weights)
            const isAsset = data.name && !data.weights;
            const isFrontierOrPort = !!data.weights;

            return (
                <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-lg text-xs text-slate-50 min-w-[150px]">
                    <div className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">
                        {isAsset ? data.name : "Portfolio Info"}
                    </div>
                    <div className="space-y-1 mb-2">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Return:</span>
                            <span className="font-mono">{data.y?.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Std Dev:</span>
                            <span className="font-mono">{data.x?.toFixed(2)}%</span>
                        </div>
                        {!isAsset && (
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-400">Sharpe:</span>
                                <span className="font-mono text-cyan-400">
                                    {((data.y - 4.5) / data.x).toFixed(2)} {/* approx cal or pass sharpe */}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Show Weights if available */}
                    {isFrontierOrPort && data.weights && assets && (
                        <div className="mt-2 pt-2 border-t border-slate-600/50">
                            <div className="font-semibold mb-1 text-slate-300">Allocation</div>
                            <div className="grid grid-cols-1 gap-0.5">
                                {data.weights.map((w: number, i: number) => {
                                    if (w < 0.01) return null; // Hide < 1%
                                    return (
                                        <div key={assets[i].symbol} className="flex justify-between items-center text-[10px] sm:text-xs">
                                            <span style={{ color: assets[i].color }}>{assets[i].symbol}</span>
                                            <span className="font-mono text-slate-300">{(w * 100).toFixed(1)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <DashboardCard className="h-[500px] flex flex-col select-none">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-semibold text-foreground">Efficient Frontier</h3>
                <div className="flex gap-4 text-xs items-center">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-foreground" /> Frontier</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Tangency</span>
                </div>
            </div>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Volatility"
                            unit="%"
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val.toFixed(2)}
                            domain={['dataMin - 2', 'dataMax + 2']}
                            label={{ value: 'Annualized Standard Deviation (%)', position: 'insideBottom', offset: -10, fill: 'var(--muted-foreground)', fontSize: 10 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Return"
                            unit="%"
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val.toFixed(2)}
                            domain={['auto', 'auto']}
                            label={{ value: 'Annualized Return (%)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--muted-foreground)', fontSize: 10 }}
                        />

                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                        {/* Main Cloud */}
                        <Scatter name="Portfolios" data={scatterData} fill="var(--muted-foreground)" opacity={0.15} shape="circle" r={1.5} />

                        {/* Frontier Line (Visual) */}
                        <Line type="monotone" data={frontierLine} dataKey="y" stroke="var(--foreground)" dot={false} strokeWidth={2} activeDot={false} name="Frontier Line" />

                        {/* Frontier Points (Hoverable) */}
                        <Scatter name="Frontier" data={frontierLine} fill="var(--foreground)" shape="circle" r={0.9} />

                        {/* Individual Assets */}
                        <Scatter name="Assets" data={assetData} shape="square">
                            {assetData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || 'var(--foreground)'} />
                            ))}
                            <LabelList dataKey="name" position="top" style={{ fill: 'var(--foreground)', fontSize: '10px', fontWeight: 'bold' }} />
                        </Scatter>

                        {/* Optimal Points */}
                        <Scatter name="Tangency Portfolio" data={maxSharpeData} fill="var(--primary)" shape="star">
                            <Cell fill="var(--primary)" stroke="#fff" strokeWidth={2} />
                        </Scatter>

                        <Scatter name="Min Volatility" data={minVolData} fill="var(--secondary)" shape="diamond">
                            <Cell fill="var(--secondary)" stroke="#fff" strokeWidth={2} />
                        </Scatter>

                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </DashboardCard>
    );
}
