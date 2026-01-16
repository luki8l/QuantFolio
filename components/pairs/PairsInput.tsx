"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";

interface PairsInputProps {
    symbolA: string;
    symbolB: string;
    setSymbolA: (s: string) => void;
    setSymbolB: (s: string) => void;
    onAnalyze: () => void;
    isLoading: boolean;
}

export function PairsInput({ symbolA, symbolB, setSymbolA, setSymbolB, onAnalyze, isLoading }: PairsInputProps) {
    return (
        <DashboardCard className="w-full">
            <h3 className="font-semibold text-sm mb-4">Select Pairs</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs text-muted-foreground mb-1 block">Asset A (Long)</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={symbolA}
                            onChange={(e) => setSymbolA(e.target.value.toUpperCase())}
                            className="w-full pl-9 h-10 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="e.g. KO"
                        />
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs text-muted-foreground mb-1 block">Asset B (Short)</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={symbolB}
                            onChange={(e) => setSymbolB(e.target.value.toUpperCase())}
                            className="w-full pl-9 h-10 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="e.g. PEP"
                        />
                    </div>
                </div>
                <button
                    onClick={onAnalyze}
                    disabled={isLoading || !symbolA || !symbolB}
                    className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50 min-w-[120px]"
                >
                    {isLoading ? "Analyzing..." : "Analyze Pair"}
                </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
                Tip: Choose assets in the same sector (e.g., KO & PEP, GOOG & GOOGL, XOM & CVX).
            </p>
        </DashboardCard>
    );
}
