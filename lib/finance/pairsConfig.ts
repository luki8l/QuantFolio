// Shared types for pairs trading configuration
// This file can be imported by both client and server components

export interface BacktestConfig {
    // Entry/Exit Thresholds
    entryThresholdUpper: number;  // Z-Score to trigger short spread (default: 2.0)
    entryThresholdLower: number;  // Z-Score to trigger long spread (default: -2.0)
    exitThreshold: number;        // Z-Score to close position (default: 0)

    // Risk Management
    stopLossPercent: number | null;      // Max loss % before exit (null = disabled)
    trailingStopPercent: number | null;  // Trailing stop from peak % (null = disabled)

    // Position Sizing
    capitalPerLeg: number;        // $ allocated per leg (default: 1000)

    // Advanced
    rollingWindow: number | null; // Bars for rolling Z-Score (null = full history)
    maxHoldingPeriod: number | null; // Max days to hold (null = unlimited)
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
    entryThresholdUpper: 2.0,
    entryThresholdLower: -2.0,
    exitThreshold: 0,
    stopLossPercent: null,
    trailingStopPercent: null,
    capitalPerLeg: 1000,
    rollingWindow: null,
    maxHoldingPeriod: null,
};

// Strategy Presets
export const STRATEGY_PRESETS: Record<string, BacktestConfig> = {
    default: { ...DEFAULT_BACKTEST_CONFIG },
    conservative: {
        entryThresholdUpper: 2.5,
        entryThresholdLower: -2.5,
        exitThreshold: 0,
        stopLossPercent: 8,
        trailingStopPercent: 5,
        capitalPerLeg: 500,
        rollingWindow: 60,
        maxHoldingPeriod: 30,
    },
    moderate: {
        entryThresholdUpper: 2.0,
        entryThresholdLower: -2.0,
        exitThreshold: 0,
        stopLossPercent: 12,
        trailingStopPercent: null,
        capitalPerLeg: 1000,
        rollingWindow: 40,
        maxHoldingPeriod: 60,
    },
    aggressive: {
        entryThresholdUpper: 1.5,
        entryThresholdLower: -1.5,
        exitThreshold: 0.2,
        stopLossPercent: 20,
        trailingStopPercent: null,
        capitalPerLeg: 2000,
        rollingWindow: 20,
        maxHoldingPeriod: null,
    },
};
