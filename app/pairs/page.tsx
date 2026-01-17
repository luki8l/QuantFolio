"use client";

import { useState } from "react";
import { getPairsData, PairsDataResponse } from "@/app/actions/pairs";
import { PairsCharts } from "@/components/pairs/PairsCharts";
import { PairsInput } from "@/components/pairs/PairsInput";
import { PairsScanner } from "@/components/pairs/PairsScanner";
import { Search, Compass, BarChart2 } from "lucide-react";

export default function PairsPage() {
    const [symbolA, setSymbolA] = useState("KO");
    const [symbolB, setSymbolB] = useState("PEP");
    const [data, setData] = useState<PairsDataResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'analysis' | 'discovery'>('analysis');

    const handleAnalyze = async (a?: string, b?: string) => {
        const symA = a || symbolA;
        const symB = b || symbolB;

        setLoading(true);
        setError(null);
        setData(null);
        setView('analysis'); // Force analysis view when starting

        try {
            const res = await getPairsData(symA, symB);
            if ('error' in res && res.error) {
                setError(res.error);
            } else if ('analysis' in res) {
                setData(res as PairsDataResponse);
                setSymbolA(symA);
                setSymbolB(symB);
            }
        } catch (e: any) {
            setError(e.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFromScanner = (a: string, b: string) => {
        setSymbolA(a);
        setSymbolB(b);
        handleAnalyze(a, b);
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

            {/* Tab Navigation */}
            <div className="flex border-b border-border mb-6">
                <button
                    onClick={() => setView('analysis')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${view === 'analysis'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <BarChart2 size={16} /> Analysis & Backtest
                </button>
                <button
                    onClick={() => setView('discovery')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${view === 'discovery'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Compass size={16} /> Discovery Scanner
                </button>
            </div>

            {view === 'analysis' ? (
                <div className="space-y-8">
                    <PairsInput
                        symbolA={symbolA}
                        symbolB={symbolB}
                        setSymbolA={setSymbolA}
                        setSymbolB={setSymbolB}
                        onAnalyze={() => handleAnalyze()}
                        isLoading={loading}
                    />

                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                            {error}
                        </div>
                    )}

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
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PairsScanner onSelectPair={handleSelectFromScanner} />
                </div>
            )}
        </div>
    );
}
