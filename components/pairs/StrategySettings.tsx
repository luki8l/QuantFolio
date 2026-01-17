"use client";

import { useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ChevronDown, ChevronUp, RotateCcw, Settings2, Target, Shield, DollarSign, Clock } from "lucide-react";
import { BacktestConfig, DEFAULT_BACKTEST_CONFIG, STRATEGY_PRESETS } from "@/lib/finance/pairsConfig";

interface StrategySettingsProps {
    config: BacktestConfig;
    onChange: (config: BacktestConfig) => void;
}

export function StrategySettings({ config, onChange }: StrategySettingsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handlePresetChange = (presetName: string) => {
        const preset = STRATEGY_PRESETS[presetName];
        if (preset) {
            onChange({ ...preset });
        }
    };

    const handleReset = () => {
        onChange({ ...DEFAULT_BACKTEST_CONFIG });
    };

    const updateConfig = (updates: Partial<BacktestConfig>) => {
        onChange({ ...config, ...updates });
    };

    return (
        <DashboardCard className="w-full">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-primary" />
                    <h3 className="font-semibold text-sm">Strategy Settings</h3>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-secondary/50 rounded">
                        {config.stopLossPercent ? `SL: ${config.stopLossPercent}%` : 'No SL'} •
                        Entry: ±{Math.abs(config.entryThresholdUpper).toFixed(1)}σ
                    </span>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isExpanded && (
                <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Presets Row */}
                    <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">Presets:</span>
                        {Object.keys(STRATEGY_PRESETS).map((name) => (
                            <button
                                key={name}
                                onClick={() => handlePresetChange(name)}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors capitalize"
                            >
                                {name}
                            </button>
                        ))}
                        <button
                            onClick={handleReset}
                            className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RotateCcw size={12} /> Reset
                        </button>
                    </div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Entry/Exit Thresholds */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Target size={14} className="text-cyan-400" />
                                Entry / Exit Thresholds
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Upper Entry (Short)</span>
                                        <span className="font-mono">{config.entryThresholdUpper.toFixed(1)}σ</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="4"
                                        step="0.1"
                                        value={config.entryThresholdUpper}
                                        onChange={(e) => updateConfig({ entryThresholdUpper: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Lower Entry (Long)</span>
                                        <span className="font-mono">{config.entryThresholdLower.toFixed(1)}σ</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="-4"
                                        max="-1"
                                        step="0.1"
                                        value={config.entryThresholdLower}
                                        onChange={(e) => updateConfig({ entryThresholdLower: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Exit Threshold</span>
                                        <span className="font-mono">{config.exitThreshold.toFixed(1)}σ</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="-1"
                                        max="1"
                                        step="0.1"
                                        value={config.exitThreshold}
                                        onChange={(e) => updateConfig({ exitThreshold: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Risk Management */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Shield size={14} className="text-red-400" />
                                Risk Management
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Stop Loss</span>
                                        <span className="font-mono">
                                            {config.stopLossPercent !== null ? `${config.stopLossPercent}%` : 'Off'}
                                        </span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={config.stopLossPercent !== null}
                                            onChange={(e) => updateConfig({
                                                stopLossPercent: e.target.checked ? 10 : null
                                            })}
                                            className="rounded"
                                        />
                                        <input
                                            type="range"
                                            min="5"
                                            max="50"
                                            step="1"
                                            value={config.stopLossPercent ?? 10}
                                            disabled={config.stopLossPercent === null}
                                            onChange={(e) => updateConfig({ stopLossPercent: parseInt(e.target.value) })}
                                            className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Trailing Stop</span>
                                        <span className="font-mono">
                                            {config.trailingStopPercent !== null ? `${config.trailingStopPercent}%` : 'Off'}
                                        </span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={config.trailingStopPercent !== null}
                                            onChange={(e) => updateConfig({
                                                trailingStopPercent: e.target.checked ? 5 : null
                                            })}
                                            className="rounded"
                                        />
                                        <input
                                            type="range"
                                            min="5"
                                            max="30"
                                            step="1"
                                            value={config.trailingStopPercent ?? 5}
                                            disabled={config.trailingStopPercent === null}
                                            onChange={(e) => updateConfig({ trailingStopPercent: parseInt(e.target.value) })}
                                            className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-orange-500 disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Position Sizing */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <DollarSign size={14} className="text-green-400" />
                                Position Sizing
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Capital Per Leg</span>
                                        <span className="font-mono">${config.capitalPerLeg.toLocaleString()}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="100"
                                        max="10000"
                                        step="100"
                                        value={config.capitalPerLeg}
                                        onChange={(e) => updateConfig({ capitalPerLeg: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-green-500"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground/70">
                                    Total exposure per trade: ~${(config.capitalPerLeg * 2).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Advanced */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Clock size={14} className="text-purple-400" />
                                Advanced
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Rolling Z-Score Window</span>
                                        <span className="font-mono">
                                            {config.rollingWindow !== null ? `${config.rollingWindow} bars` : 'Full History'}
                                        </span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={config.rollingWindow !== null}
                                            onChange={(e) => updateConfig({
                                                rollingWindow: e.target.checked ? 60 : null
                                            })}
                                            className="rounded"
                                        />
                                        <input
                                            type="range"
                                            min="10"
                                            max="252"
                                            step="5"
                                            value={config.rollingWindow ?? 60}
                                            disabled={config.rollingWindow === null}
                                            onChange={(e) => updateConfig({ rollingWindow: parseInt(e.target.value) })}
                                            className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Max Holding Period</span>
                                        <span className="font-mono">
                                            {config.maxHoldingPeriod !== null ? `${config.maxHoldingPeriod} days` : 'Unlimited'}
                                        </span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={config.maxHoldingPeriod !== null}
                                            onChange={(e) => updateConfig({
                                                maxHoldingPeriod: e.target.checked ? 30 : null
                                            })}
                                            className="rounded"
                                        />
                                        <input
                                            type="range"
                                            min="5"
                                            max="252"
                                            step="5"
                                            value={config.maxHoldingPeriod ?? 30}
                                            disabled={config.maxHoldingPeriod === null}
                                            onChange={(e) => updateConfig({ maxHoldingPeriod: parseInt(e.target.value) })}
                                            className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Footer */}
                    <p className="text-[10px] text-muted-foreground/70 pt-4 border-t border-border/30">
                        💡 Tip: Start with "Conservative" preset for lower risk, or "Aggressive" for more frequent trades with higher exposure.
                    </p>
                </div>
            )}
        </DashboardCard>
    );
}
