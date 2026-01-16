"use client";

import { useState } from "react";
import { runMonteCarloSimulation, SimulationInputs, SimulationResult } from "@/lib/finance/monteCarlo";
import { SimulationControls, ControlValues } from "@/components/simulation/SimulationControls";
import { SimulationChart } from "@/components/simulation/SimulationChart";
import { RiskMetrics } from "@/components/simulation/RiskMetrics";
import { DistributionChart } from "@/components/simulation/DistributionChart";

const DEFAULT_INPUTS: ControlValues = {
    initialPrice: 100,
    expectedReturn: 0.08,
    volatility: 0.20,
    timeHorizon: 1,
    numSimulations: 500 // Start with 500 for good performance
};

export default function MonteCarloPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);

    const handleRun = async (values: ControlValues) => {
        setIsRunning(true);

        // Validate inputs
        const inputs: SimulationInputs = {
            ...values,
            timeSteps: Math.floor(values.timeHorizon * 252) // Daily steps approx
        };

        // Small timeout to allow UI to render "Running..." state before heavy calc
        setTimeout(() => {
            const res = runMonteCarloSimulation(inputs);
            setResult(res);
            setIsRunning(false);
        }, 100);
    };

    return (
        <div className="space-y-8 pb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Monte Carlo Simulation (GBM)
                </h1>
                <p className="text-muted-foreground mt-2 max-w-3xl">
                    Simulate thousands of potential future asset price paths using Geometric Brownian Motion.
                    Analyze the distribution of outcomes and calculate Value at Risk (VaR).
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Controls */}
                <div className="col-span-1 lg:col-span-3">
                    <SimulationControls
                        defaultValues={DEFAULT_INPUTS}
                        onRun={handleRun}
                        isRunning={isRunning}
                    />
                </div>

                {/* Right Column: Visuals */}
                <div className="col-span-1 lg:col-span-9 space-y-6">
                    {!result ? (
                        <div className="h-[400px] flex items-center justify-center border border-dashed border-border/50 rounded-xl bg-card/20 text-muted-foreground">
                            Click "Run Simulation" to generate data.
                        </div>
                    ) : (
                        <>
                            <RiskMetrics stats={result.stats} />
                            <SimulationChart paths={result.paths} />
                            <DistributionChart finalPrices={result.finalPrices} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
