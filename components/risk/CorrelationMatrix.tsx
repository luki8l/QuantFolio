"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Asset } from "@/lib/finance/portfolio";

// Re-implement correlation logic locally for display or pass it in.
// We'll duplicate logic briefly or export it better. Let's just mock it here visually 
// or strictly speaking we should pass the computed matrix. 
// For simplicity in this demo, I'll assume we pass just assets and I re-calc the mock correlation.

interface CorrelationMatrixProps {
    assets: Asset[];
    matrix: number[][];
}

export function CorrelationMatrix({ assets, matrix }: CorrelationMatrixProps) {
    if (!matrix || matrix.length < assets.length) return null;

    return (
        <DashboardCard className="h-full flex flex-col overflow-x-auto">
            <h3 className="font-semibold text-foreground mb-4">Correlation Matrix</h3>
            <div className="grid gap-1 flex-1 min-w-[300px]" style={{ gridTemplateColumns: `auto repeat(${assets.length}, 1fr)` }}>
                {/* Header Row */}
                <div className="text-xs"></div>
                {assets.map(a => (
                    <div key={a.symbol} className="text-xs font-bold text-center text-muted-foreground rotate-0">{a.symbol}</div>
                ))}

                {/* Body */}
                {assets.map((rowAsset, i) => (
                    <>
                        <div key={`row-${rowAsset.symbol}`} className="text-xs font-bold text-muted-foreground flex items-center">{rowAsset.symbol}</div>
                        {assets.map((colAsset, j) => {
                            const corr = matrix[i][j];
                            // Heatmap Color Logic
                            // 1.0 = Blue, 0.5 = Green, 0 = Gray, -0.2 = Red
                            let bg = "";
                            if (corr >= 0.99) bg = "bg-primary/20 text-primary";
                            else if (corr > 0.6) bg = "bg-primary/10 text-primary";
                            else if (corr > 0.3) bg = "bg-secondary/10 text-secondary";
                            else if (corr < 0) bg = "bg-destructive/10 text-destructive";
                            else bg = "bg-muted/50 text-muted-foreground";

                            return (
                                <div key={`${i}-${j}`} className={`h-8 flex items-center justify-center text-xs rounded border border-transparent hover:border-border transition-colors ${bg}`}>
                                    {corr.toFixed(2)}
                                </div>
                            );
                        })}
                    </>
                ))}
            </div>
        </DashboardCard>
    );
}
