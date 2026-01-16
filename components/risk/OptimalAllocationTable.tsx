"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Asset, PortfolioPoint } from "@/lib/finance/portfolio";

interface OptimalAllocationTableProps {
    maxSharpe: PortfolioPoint;
    minVol: PortfolioPoint;
    assets: Asset[];
}

export function OptimalAllocationTable({ maxSharpe, minVol, assets }: OptimalAllocationTableProps) {
    if (!maxSharpe || !minVol) return null;

    return (
        <DashboardCard className="h-full flex flex-col">
            <h3 className="font-semibold text-foreground mb-4">Optimal Portfolios</h3>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/10">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Asset</th>
                            <th className="px-4 py-3 text-right text-primary font-bold">Max Sharpe Ratio</th>
                            <th className="px-4 py-3 text-right text-secondary font-bold rounded-tr-lg">Min Volatility</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {assets.map((asset, i) => {
                            const wSharpe = maxSharpe.weights[i];
                            const wMinVol = minVol.weights[i];

                            // Only show if relevant in at least one portfolio (>1%)
                            if (wSharpe < 0.01 && wMinVol < 0.01) return null;

                            return (
                                <tr key={asset.symbol} className="bg-card hover:bg-muted/10 transition-colors">
                                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.color }} />
                                        {asset.symbol}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {(wSharpe * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {(wMinVol * 100).toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Summary Stats Row */}
                        <tr className="bg-muted/20 font-bold border-t-2 border-border">
                            <td className="px-4 py-3">Performance</td>
                            <td className="px-4 py-3 text-right font-mono text-xs">
                                <div className="text-primary">Exp. Return: {(maxSharpe.returns * 100).toFixed(1)}%</div>
                                <div className="text-muted-foreground">Std Dev: {(maxSharpe.volatility * 100).toFixed(1)}%</div>
                                <div className="text-muted-foreground">Sharpe: {maxSharpe.sharpeRatio.toFixed(2)}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs">
                                <div className="text-secondary">Exp. Return: {(minVol.returns * 100).toFixed(1)}%</div>
                                <div className="text-muted-foreground">Std Dev: {(minVol.volatility * 100).toFixed(1)}%</div>
                                <div className="text-muted-foreground">Sharpe: {minVol.sharpeRatio.toFixed(2)}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </DashboardCard>
    );
}
