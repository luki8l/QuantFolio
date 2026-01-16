"use client";

import { useState, useRef, useEffect } from "react";
import { Asset } from "@/lib/finance/portfolio";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Search, X, Plus, AlertCircle } from "lucide-react";
import { searchAssets } from "@/app/actions/finance";

interface AssetSelectorProps {
    selectedSymbols: string[];
    onAdd: (symbol: string) => void;
    onRemove: (symbol: string) => void;
    isLoadingData: boolean;
}

export function AssetSelector({ selectedSymbols, onAdd, onRemove, isLoadingData }: AssetSelectorProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            const res = await searchAssets(query);
            setResults(res);
            setIsSearching(false);
        }, 400); // Debounce

        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) };
    }, [query]);

    return (
        <DashboardCard className="h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-4">
                <h3 className="font-semibold text-lg text-foreground">Assets</h3>
                <span className="text-xs text-muted-foreground">{selectedSymbols.length}/10</span>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search (e.g. NVDA, SPY)"
                    className="w-full bg-secondary/10 border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {isSearching && (
                    <div className="absolute right-3 top-2.5">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* Search Results Dropdown (Simulated inline for now or absolute) */}
            {results.length > 0 && (
                <div className="mb-4 max-h-[150px] overflow-y-auto rounded-lg border border-border bg-card/80 backdrop-blur-sm p-1 z-10">
                    {results.map((r) => (
                        <button
                            key={r.symbol}
                            onClick={() => { onAdd(r.symbol); setQuery(""); setResults([]); }}
                            disabled={selectedSymbols.includes(r.symbol)}
                            className="w-full flex items-center justify-between p-2 hover:bg-primary/10 rounded-md text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div>
                                <div className="font-bold text-sm text-foreground">{r.symbol}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.name}</div>
                            </div>
                            {!selectedSymbols.includes(r.symbol) && <Plus size={14} className="text-primary" />}
                        </button>
                    ))}
                </div>
            )}

            {/* Selected List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {selectedSymbols.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-4">
                        No assets selected. <br /> Search to build your portfolio.
                    </div>
                )}

                {selectedSymbols.map((sym) => (
                    <div key={sym} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {sym.substring(0, 1)}
                            </div>
                            <span className="font-bold text-sm text-foreground">{sym}</span>
                        </div>
                        <button
                            onClick={() => onRemove(sym)}
                            className="p-1 hover:bg-destructive/20 hover:text-destructive rounded-full text-muted-foreground transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}

                {isLoadingData && (
                    <div className="flex items-center justify-center gap-2 p-2 text-primary font-mono text-xs animate-pulse">
                        Calculating Returns & Std Dev...
                    </div>
                )}
            </div>
        </DashboardCard>
    );
}
