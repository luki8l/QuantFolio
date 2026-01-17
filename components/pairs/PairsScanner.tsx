"use client";

import { useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { getScannerResults, ScannerResult } from "@/app/actions/pairs";
import { Search, Loader2, CheckCircle2, XCircle, ArrowRight, Zap, Activity } from "lucide-react";

interface ScannerGroup {
    name: string;
    symbols: string[];
    description: string;
}

const SECTOR_GROUPS: ScannerGroup[] = [
    {
        name: "Tech Giants",
        symbols: ["MSFT", "AAPL", "GOOG", "GOOGL", "META", "AMZN"],
        description: "Large-cap technology and platform companies."
    },
    {
        name: "Consumer Staples",
        symbols: ["KO", "PEP", "PG", "WMT", "COST"],
        description: "Companies with stable demand and strong historical correlations."
    },
    {
        name: "Finance & Banks",
        symbols: ["JPM", "BAC", "WFC", "C", "GS", "MS"],
        description: "Major US banking institutions often tied to interest rate cycles."
    },
    {
        name: "Energy",
        symbols: ["XOM", "CVX", "SHEL", "BP", "TTE"],
        description: "Oil and gas companies deeply affected by commodity prices."
    }
];

interface PairsScannerProps {
    onSelectPair: (symA: string, symB: string) => void;
}

export function PairsScanner({ onSelectPair }: PairsScannerProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [results, setResults] = useState<{ [key: string]: ScannerResult[] }>({});
    const [activeGroup, setActiveGroup] = useState<string | null>(null);

    const handleScan = async (group: ScannerGroup) => {
        setLoading(group.name);
        try {
            const res = await getScannerResults([group]);
            if ('error' in res) {
                console.error(res.error);
            } else {
                setResults(prev => ({ ...prev, ...res }));
                setActiveGroup(group.name);
            }
        } catch (err) {
            console.error("Scan failed", err);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SECTOR_GROUPS.map((group) => (
                    <DashboardCard key={group.name} className="relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-1">{group.name}</h3>
                            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{group.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono bg-secondary/20 px-1.5 py-0.5 rounded">
                                    {group.symbols.length} Symbols
                                </span>
                                <button
                                    onClick={() => handleScan(group)}
                                    disabled={!!loading}
                                    className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                                >
                                    {loading === group.name ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <><Zap size={14} /> Scan</>
                                    )}
                                </button>
                            </div>
                        </div>
                        {/* Decorative background icon */}
                        <Search size={64} className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform" />
                    </DashboardCard>
                ))}
            </div>

            {activeGroup && results[activeGroup] && (
                <DashboardCard className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl">Scanner Results: {activeGroup}</h3>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-400" /> Cointegrated</div>
                            <div className="flex items-center gap-1"><XCircle size={14} className="text-muted-foreground" /> No Link</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Pair</th>
                                    <th className="px-4 py-3 font-medium text-center">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Half-Life</th>
                                    <th className="px-4 py-3 font-medium text-right">Z-Score</th>
                                    <th className="px-4 py-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {results[activeGroup]
                                    .sort((a, b) => (a.isCointegrated === b.isCointegrated ? 0 : a.isCointegrated ? -1 : 1))
                                    .map((res, i) => (
                                        <tr key={i} className={`hover:bg-secondary/5 transition-colors ${res.isCointegrated ? "bg-green-500/[0.02]" : ""}`}>
                                            <td className="px-4 py-4 font-bold">
                                                {res.symbolA} / {res.symbolB}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {res.isCointegrated ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase">
                                                        <CheckCircle2 size={12} /> Cointegrated
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/20 text-muted-foreground text-[10px] font-bold uppercase">
                                                        <XCircle size={12} /> Divergent
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono text-xs">
                                                {res.halfLife < 999 ? res.halfLife.toFixed(1) + "d" : "-"}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className={`font-mono text-sm font-bold ${Math.abs(res.currentZScore) > 2 ? "text-red-400" : "text-foreground"}`}>
                                                    {res.currentZScore.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    onClick={() => onSelectPair(res.symbolA, res.symbolB)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                                                >
                                                    Analyze <ArrowRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </DashboardCard>
            )}
        </div>
    );
}
