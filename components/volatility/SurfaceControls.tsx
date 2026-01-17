"use client";

import { useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Search, RefreshCw, Loader2 } from "lucide-react";

interface SurfaceControlsProps {
    symbol: string;
    onSymbolChange: (symbol: string) => void;
    onRefresh: () => void;
    isLoading: boolean;
    showCalls: boolean;
    showPuts: boolean;
    onShowCallsChange: (show: boolean) => void;
    onShowPutsChange: (show: boolean) => void;
    useSVI: boolean;
    onUseSVIChange: (use: boolean) => void;
    colorScale: string;
    onColorScaleChange: (scale: string) => void;
    popularSymbols: string[];
}

export function SurfaceControls({
    symbol,
    onSymbolChange,
    onRefresh,
    isLoading,
    showCalls,
    showPuts,
    onShowCallsChange,
    onShowPutsChange,
    useSVI,
    onUseSVIChange,
    colorScale,
    onColorScaleChange,
    popularSymbols
}: SurfaceControlsProps) {
    const [inputValue, setInputValue] = useState(symbol);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSymbolChange(inputValue.trim().toUpperCase());
        }
    };

    const colorScales = ['Viridis', 'Plasma', 'Inferno', 'Magma', 'Cividis', 'RdYlGn'];

    return (
        <DashboardCard className="space-y-4">
            {/* Symbol Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                        placeholder="Enter symbol..."
                        className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary/50 font-mono"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <RefreshCw size={14} />
                    )}
                    {isLoading ? 'Loading...' : 'Analyze'}
                </button>
            </form>

            {/* Quick Symbols */}
            <div className="flex flex-wrap gap-1.5">
                {popularSymbols.slice(0, 10).map((sym) => (
                    <button
                        key={sym}
                        onClick={() => {
                            setInputValue(sym);
                            onSymbolChange(sym);
                        }}
                        className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${symbol === sym
                            ? 'bg-primary/20 border-primary/50 text-primary'
                            : 'bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                            }`}
                    >
                        {sym}
                    </button>
                ))}
            </div>

            {/* Display Options */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Display:</span>

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showCalls}
                        onChange={(e) => onShowCallsChange(e.target.checked)}
                        className="rounded border-border"
                    />
                    <span className={showCalls ? 'text-foreground' : 'text-muted-foreground'}>
                        Call IV
                    </span>
                </label>

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showPuts}
                        onChange={(e) => onShowPutsChange(e.target.checked)}
                        className="rounded border-border"
                    />
                    <span className={showPuts ? 'text-foreground' : 'text-muted-foreground'}>
                        Put IV
                    </span>
                </label>

                <div className="h-4 w-px bg-border/50" />

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                        type="checkbox"
                        checked={useSVI}
                        onChange={(e) => onUseSVIChange(e.target.checked)}
                        className="rounded border-border"
                    />
                    <span className={useSVI ? 'text-primary font-medium' : 'text-muted-foreground'}>
                        SVI Smooth
                    </span>
                </label>

                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">Colors:</span>
                    <select
                        value={colorScale}
                        onChange={(e) => onColorScaleChange(e.target.value)}
                        className="text-xs bg-secondary/50 border border-border/50 rounded px-2 py-1 focus:outline-none focus:border-primary/50"
                    >
                        {colorScales.map((scale) => (
                            <option key={scale} value={scale}>{scale}</option>
                        ))}
                    </select>
                </div>
            </div>
        </DashboardCard>
    );
}
