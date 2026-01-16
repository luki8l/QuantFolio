"use client";

import { useState, useEffect, useRef } from "react";
import { Asset, OptimizationResult, runPortfolioSimulation } from "@/lib/finance/portfolio";
import { AssetSelector } from "@/components/risk/AssetSelector";
import { EfficientFrontierChart } from "@/components/risk/EfficientFrontierChart";
import { AllocationChart } from "@/components/risk/AllocationChart";
import { CorrelationMatrix } from "@/components/risk/CorrelationMatrix";
import { OptimalAllocationTable } from "@/components/risk/OptimalAllocationTable"; // New component
import { getPortfolioData } from "@/app/actions/finance";

export default function RiskPage() {
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["AAPL", "TSLA", "MSFT"]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [correlations, setCorrelations] = useState<number[][]>([]);

    const [result, setResult] = useState<OptimizationResult | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);

    // Fetch Data when symbols change
    useEffect(() => {
        if (selectedSymbols.length < 2) {
            setResult(null);
            setAssets([]);
            return;
        }

        // Simple debounce to avoid spamming API while typing/clicking fast
        const timer = setTimeout(async () => {
            setIsLoadingData(true);
            setDataError(null);

            try {
                const data = await getPortfolioData(selectedSymbols);
                if (data.error) {
                    setDataError(data.error);
                    setAssets([]);
                } else {
                    setAssets(data.assets);
                    setCorrelations(data.correlations);

                    // Run Simulation immediately with new Data
                    // Note: In a real app we might want to separate Data Fetch vs Simulation Run 
                    // but for seamless UX we do it here.
                    if (data.assets.length >= 2) {
                        const res = runPortfolioSimulation(data.assets, 5000, data.correlations);
                        setResult(res);
                    }
                }
            } catch (err) {
                console.error(err);
                setDataError("Failed to load market data.");
            } finally {
                setIsLoadingData(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [selectedSymbols]);

    const handleAddSymbol = (symbol: string) => {
        if (selectedSymbols.includes(symbol)) return;
        if (selectedSymbols.length >= 10) return;
        setSelectedSymbols([...selectedSymbols, symbol]);
    };

    const handleRemoveSymbol = (symbol: string) => {
        setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    };

    return (
        <div className="space-y-8 pb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Portfolio Optimization
                </h1>
                <p className="text-muted-foreground mt-2 max-w-3xl">
                    Construct an optimal portfolio using real market data. Search assets to visualize the Efficient Frontier and discover optimal allocations.
                </p>
                <div className="mt-4 p-3 bg-muted/40 rounded-lg text-xs leading-relaxed text-muted-foreground max-w-3xl border border-border/40">
                    <p>
                        <span className="font-medium text-foreground">Methodology:</span> Results based on historical returns over the last 10 years.
                        Expected return is the annualized monthly arithmetic mean return.
                        Ex-ante Sharpe Ratio calculated using U.S. 3-Month Treasury Bill Rate returns as the risk-free rate.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[850px]">
                {/* Left: Asset Selection & Correlation */}
                <div className="col-span-1 lg:col-span-3 flex flex-col gap-6 h-full">
                    <div className="flex-1 min-h-0">
                        <AssetSelector
                            selectedSymbols={selectedSymbols}
                            onAdd={handleAddSymbol}
                            onRemove={handleRemoveSymbol}
                            isLoadingData={isLoadingData}
                        />
                    </div>
                    <div className="h-1/3 min-h-[250px]">
                        {/* Need to pass assets AND matrix now */}
                        <CorrelationMatrix assets={assets} matrix={correlations} />
                    </div>
                </div>

                {/* Right: Charts */}
                <div className="col-span-1 lg:col-span-9 flex flex-col gap-6 h-full overflow-y-auto pr-2">
                    {dataError && (
                        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                            {dataError}
                        </div>
                    )}

                    {!result || assets.length < 2 ? (
                        <div className="h-full flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl bg-card/20 text-muted-foreground">
                            {isLoadingData ? "Fetching Market Data & Running Simulation..." : "Select at least 2 assets."}
                        </div>
                    ) : (
                        <>
                            <EfficientFrontierChart
                                points={result.simulations}
                                maxSharpe={result.maxSharpe}
                                minVol={result.minVol}
                                assets={assets}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-8">
                                    <OptimalAllocationTable
                                        maxSharpe={result.maxSharpe}
                                        minVol={result.minVol}
                                        assets={assets}
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    {/* Simplified View: Only show Max Sharpe Pie for space or let user toggle. 
                                Let's show Max Sharpe Pie small. */}
                                    <AllocationChart
                                        point={result.maxSharpe}
                                        assets={assets}
                                        title="Allocation (Max Sharpe)"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
