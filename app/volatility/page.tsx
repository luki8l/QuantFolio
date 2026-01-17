"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { VolatilitySurface3D } from "@/components/volatility/VolatilitySurface3D";
import { RegimeIndicator } from "@/components/volatility/RegimeIndicator";
import { SurfaceControls } from "@/components/volatility/SurfaceControls";
import { ArbitrageScanner } from "@/components/volatility/ArbitrageScanner";
import { TermStructureChart } from "@/components/volatility/TermStructureChart";
import { GreeksHeatmap } from "@/components/volatility/GreeksHeatmap";
import { VolatilitySmile } from "@/components/volatility/VolatilitySmile";
import { getVolatilitySurface, getPopularOptionsSymbols, VolatilitySurfaceResponse } from "@/app/actions/volatility";
import { scanForArbitrage, ArbitrageResult } from "@/lib/finance/arbitrage";
import { Activity, TrendingUp, Clock, DollarSign, BarChart3 } from "lucide-react";

export default function VolatilityPage() {
    const [symbol, setSymbol] = useState("SPY");
    const [data, setData] = useState<VolatilitySurfaceResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [popularSymbols, setPopularSymbols] = useState<string[]>([]);

    // Display options
    const [showCalls, setShowCalls] = useState(true);
    const [showPuts, setShowPuts] = useState(false);
    const [useSVI, setUseSVI] = useState(false);
    const [colorScale, setColorScale] = useState<string>('Viridis');

    // Calculate arbitrage opportunities
    const arbitrageResult = useMemo<ArbitrageResult | null>(() => {
        if (!data) return null;
        return scanForArbitrage(data.points, data.spotPrice);
    }, [data]);

    // Load popular symbols on mount
    useEffect(() => {
        getPopularOptionsSymbols().then(setPopularSymbols);
    }, []);

    const loadSurface = useCallback(async (sym: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await getVolatilitySurface(sym);
            if ('error' in result) {
                setError(result.error);
                setData(null);
            } else {
                setData(result);
                setSymbol(sym);
            }
        } catch (e: any) {
            setError(e.message || "Failed to load volatility surface");
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load initial data
    useEffect(() => {
        loadSurface(symbol);
    }, []);

    const handleSymbolChange = (newSymbol: string) => {
        loadSurface(newSymbol);
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Volatility Surface
                </h1>
                <p className="text-muted-foreground mt-2">
                    Interactive 3D implied volatility surface with regime analysis
                </p>
            </div>

            {/* Controls */}
            <SurfaceControls
                symbol={symbol}
                onSymbolChange={handleSymbolChange}
                onRefresh={() => loadSurface(symbol)}
                isLoading={loading}
                showCalls={showCalls}
                showPuts={showPuts}
                onShowCallsChange={setShowCalls}
                onShowPutsChange={setShowPuts}
                useSVI={useSVI}
                onUseSVIChange={setUseSVI}
                colorScale={colorScale}
                onColorScaleChange={setColorScale}
                popularSymbols={popularSymbols}
            />

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Main Content */}
            {data && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                    {/* 3D Surface - Main Area */}
                    <DashboardCard className="xl:col-span-3 p-0 overflow-hidden">
                        <div className="p-4 border-b border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <BarChart3 className="text-primary" size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg">{data.symbol}</h2>
                                    <p className="text-xs text-muted-foreground">
                                        3D Implied Volatility Surface
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <DollarSign size={12} />
                                    <span>Spot: <span className="font-mono text-foreground">${data.spotPrice.toFixed(2)}</span></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={12} />
                                    <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[500px] w-full bg-gradient-to-br from-background to-secondary/10">
                            <VolatilitySurface3D
                                points={data.points}
                                spotPrice={data.spotPrice}
                                showCalls={showCalls}
                                showPuts={showPuts}
                                useSVI={useSVI}
                                colorScale={colorScale as any}
                            />
                        </div>

                        <div className="p-3 border-t border-border/30 bg-secondary/5 text-[10px] text-muted-foreground flex justify-between">
                            <span>
                                {data.points.length} data points • {data.expiryDates.length} expirations • {data.strikes.length} strikes
                            </span>
                            <span>
                                Drag to rotate • Scroll to zoom • Double-click to reset
                            </span>
                        </div>
                    </DashboardCard>

                    {/* Side Panel */}
                    <div className="space-y-4">
                        {/* Regime Indicator */}
                        <RegimeIndicator
                            atmIV={data.stats.atmIV}
                            skewIndex={data.stats.skewIndex}
                            termSlope={data.stats.termSlope}
                            ivRange={data.stats.ivRange}
                        />

                        {/* Quick Stats */}
                        <DashboardCard className="space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <TrendingUp size={14} className="text-cyan-400" />
                                Surface Stats
                            </h3>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Expirations</span>
                                    <span className="font-mono">{data.expiryDates.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Strike Range</span>
                                    <span className="font-mono">
                                        ${data.strikes[0]?.toFixed(0)} – ${data.strikes[data.strikes.length - 1]?.toFixed(0)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Data Points</span>
                                    <span className="font-mono">{data.points.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Risk-Free Rate</span>
                                    <span className="font-mono">{(data.riskFreeRate * 100).toFixed(2)}%</span>
                                </div>
                            </div>
                        </DashboardCard>

                        {/* Arbitrage Scanner */}
                        <ArbitrageScanner
                            result={arbitrageResult}
                            isLoading={loading}
                        />
                    </div>
                </div>
            )}

            {/* Second Row - Analytics */}
            {data && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Volatility Smile */}
                    <VolatilitySmile
                        points={data.points}
                        spotPrice={data.spotPrice}
                    />

                    {/* Greeks Heatmap */}
                    <GreeksHeatmap
                        points={data.points}
                        spotPrice={data.spotPrice}
                    />

                    {/* Term Structure */}
                    <TermStructureChart
                        points={data.points}
                        spotPrice={data.spotPrice}
                    />
                </div>
            )}

            {/* Loading State */}
            {loading && !data && (
                <DashboardCard className="h-[500px] flex items-center justify-center">
                    <div className="text-center space-y-3">
                        <Activity size={40} className="mx-auto text-primary animate-pulse" />
                        <p className="text-muted-foreground">Loading volatility surface for {symbol}...</p>
                        <p className="text-xs text-muted-foreground/50">Fetching options chain and calculating IVs</p>
                    </div>
                </DashboardCard>
            )}
        </div>
    );
}
