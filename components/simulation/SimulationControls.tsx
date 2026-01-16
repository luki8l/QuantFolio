"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Play } from "lucide-react";
import { useState } from "react";

export interface ControlValues {
    initialPrice: number;
    expectedReturn: number;
    volatility: number;
    timeHorizon: number;
    numSimulations: number;
}

interface SimulationControlsProps {
    defaultValues: ControlValues;
    onRun: (values: ControlValues) => void;
    isRunning: boolean;
}

export function SimulationControls({ defaultValues, onRun, isRunning }: SimulationControlsProps) {
    const [values, setValues] = useState(defaultValues);

    const handleChange = (key: keyof ControlValues, val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setValues((prev) => ({ ...prev, [key]: num }));
        }
    };

    return (
        <DashboardCard className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                <h3 className="font-semibold text-lg text-foreground">Configuration</h3>
            </div>

            <div className="space-y-5">
                <InputGroup
                    label="Initial Price ($)"
                    value={values.initialPrice}
                    onChange={(v) => handleChange('initialPrice', v)}
                />
                <InputGroup
                    label="Expected Annual Return (%)"
                    value={values.expectedReturn * 100}
                    onChange={(v) => handleChange('expectedReturn', (parseFloat(v) / 100).toString())}
                    step="1"
                />
                <InputGroup
                    label="Annual Volatility (%)"
                    value={values.volatility * 100}
                    onChange={(v) => handleChange('volatility', (parseFloat(v) / 100).toString())}
                    step="1"
                />
                <InputGroup
                    label="Time Horizon (Years)"
                    value={values.timeHorizon}
                    onChange={(v) => handleChange('timeHorizon', v)}
                    step="0.5"
                    max="10"
                />
                <InputGroup
                    label="Simulations (Count)"
                    value={values.numSimulations}
                    onChange={(v) => handleChange('numSimulations', v)}
                    step="100"
                    max="5000"
                />
            </div>

            <div className="mt-6">
                <button
                    onClick={() => onRun(values)}
                    disabled={isRunning}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                    <Play size={18} className={isRunning ? "animate-spin" : "fill-current"} />
                    {isRunning ? "Running..." : "Run Simulation"}
                </button>
            </div>
        </DashboardCard>
    );
}

function InputGroup({ label, value, onChange, step = "any", max }: { label: string, value: number, onChange: (v: string) => void, step?: string, max?: string }) {
    return (
        <div className="flex flex-col gap-1.5 focus-within:text-primary transition-colors">
            <label className="text-sm text-muted-foreground font-medium">{label}</label>
            <input
                type="number"
                value={value}
                onChange={e => onChange(e.target.value)}
                step={step}
                max={max}
                className="bg-secondary/10 border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-secondary/20 transition-all font-mono"
            />
        </div>
    );
}
