"use client";

import { useState } from "react";
import { getPairsData, PairsDataResponse } from "@/app/actions/pairs";
import { PairsCharts } from "@/components/pairs/PairsCharts";
import { PairsInput } from "@/components/pairs/PairsInput";

export default function PairsPage() {
    const [symbolA, setSymbolA] = useState("KO");
    const [symbolB, setSymbolB] = useState("PEP");
    const [data, setData] = useState<PairsDataResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const res = await getPairsData(symbolA, symbolB);
            if ('error' in res && res.error) {
                setError(res.error);
            } else if ('analysis' in res) {
                setData(res as PairsDataResponse);
            }
        } catch (e: any) {
            setError(e.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Statistical Arbitrage (Pairs Trading)
                </h1>
                <p className="text-muted-foreground mt-2 max-w-3xl">
                    Identify pairs of assets that are "cointegrated" (statistically bound together).
                    When the spread deviates significantly from the mean (Z-Score &gt; 2), it often triggers a mean-reversion trading signal.
                </p>
            </div>

            {/* Input Section */}
            <PairsInput
                symbolA={symbolA}
                symbolB={symbolB}
                setSymbolA={setSymbolA}
                setSymbolB={setSymbolB}
                onAnalyze={handleAnalyze}
                isLoading={loading}
            />

            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Charts Section */}
            {data && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PairsCharts
                        symbolA={data.symbolA}
                        symbolB={data.symbolB}
                        dates={data.dates}
                        pricesA={data.pricesA}
                        pricesB={data.pricesB}
                        analysis={data.analysis}
                    />
                </div>
            )}
        </div>
    );
}
