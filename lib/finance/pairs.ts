
import { matrix, multiply, transpose, inv, type Matrix } from 'mathjs';

// Helper for Mean
function mean(data: number[]): number {
    return data.reduce((a, b) => a + b, 0) / data.length;
}

// Helper for Standard Deviation
function std(data: number[]): number {
    const m = mean(data);
    const variance = data.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / data.length;
    return Math.sqrt(variance);
}

// Import and re-export config types from shared file
import { BacktestConfig, DEFAULT_BACKTEST_CONFIG, STRATEGY_PRESETS } from './pairsConfig';
export type { BacktestConfig };
export { DEFAULT_BACKTEST_CONFIG, STRATEGY_PRESETS };

export interface Trade {
    type: 'Long' | 'Short'; // Refers to the Spread (Long Spread = Buy A, Short B)
    entryDate: string;
    exitDate: string;
    entryZ: number;
    exitZ: number;
    pnl: number;
    pnlA: number;
    pnlB: number;
    // Leg Details
    sideA: 'Long' | 'Short';
    sideB: 'Long' | 'Short';
    entryPriceA: number;
    entryPriceB: number;
    exitPriceA: number;
    exitPriceB: number;
}

export interface BacktestResult {
    equityCurve: number[];
    trades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    history: Trade[];
}

export interface PairsAnalysisResult {
    hedgeRatio: number;
    alpha: number;
    spread: number[];
    zScore: number[];
    currentZScore: number;
    halfLife: number;
    isCointegrated: boolean;
    stats: {
        meanSpread: number;
        stdSpread: number;
        lastPriceA: number;
        lastPriceB: number;
    };
    backtest: BacktestResult;
}

export interface BasketTrade {
    type: 'Long' | 'Short';
    entryDate: string;
    exitDate: string;
    entryZ: number;
    exitZ: number;
    pnl: number;
    pnlBreakdown: { [symbol: string]: number };
    entryPrices: { [symbol: string]: number };
    exitPrices: { [symbol: string]: number };
}

export interface BasketBacktestResult {
    equityCurve: number[];
    trades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    history: BasketTrade[];
}

export interface BasketAnalysisResult {
    weights: { [symbol: string]: number }; // Beta coeff for each asset. Dependent is 1.0 (or -1.0)
    alpha: number;
    spread: number[];
    zScore: number[];
    currentZScore: number;
    halfLife: number;
    isCointegrated: boolean;
    stats: {
        meanSpread: number;
        stdSpread: number;
    };
    dependentSymbol: string;
    backtest: BasketBacktestResult;
}


/**
 * Calculates the Beta (Hedge Ratio) and Alpha using Ordinary Least Squares (OLS)
 */
function calculateOLS(logX: number[], logY: number[]) {
    const n = logX.length;
    const meanX = mean(logX);
    const meanY = mean(logY);

    let num = 0;
    let den = 0;

    for (let i = 0; i < n; i++) {
        num += (logX[i] - meanX) * (logY[i] - meanY);
        den += (logX[i] - meanX) ** 2;
    }

    const beta = num / den;
    const alpha = meanY - beta * meanX;

    return { beta, alpha };
}

/**
 * Calculates the Half-Life of Mean Reversion using an Ornstein-Uhlenbeck process
 */
function calculateHalfLife(spread: number[]) {
    const x_t = spread.slice(1);
    const x_prev = spread.slice(0, spread.length - 1);
    const { beta: slope } = calculateOLS(x_prev, x_t);

    if (slope >= 1 || slope <= 0) return 999;

    const theta = -Math.log(slope);
    const halfLife = Math.log(2) / theta;

    return halfLife;
}

/**
 * Calculates rolling Z-Score using a window for mean and standard deviation
 * For early values where window isn't available, uses expanding window
 */
function calculateRollingZScore(spread: number[], window: number): number[] {
    const zScores: number[] = [];

    for (let i = 0; i < spread.length; i++) {
        // Use expanding window for early values, rolling window otherwise
        const startIdx = Math.max(0, i - window + 1);
        const windowData = spread.slice(startIdx, i + 1);

        if (windowData.length < 2) {
            // Not enough data, use 0
            zScores.push(0);
            continue;
        }

        const windowMean = mean(windowData);
        const windowStd = std(windowData);

        if (windowStd === 0) {
            zScores.push(0);
        } else {
            zScores.push((spread[i] - windowMean) / windowStd);
        }
    }

    return zScores;
}

/**
 * Simulates a trading strategy based on Z-Score with configurable parameters
 */
function calculateBacktest(
    zScores: number[],
    pricesA: number[],
    pricesB: number[],
    hedgeRatio: number,
    dates: string[],
    config: BacktestConfig = DEFAULT_BACKTEST_CONFIG
): BacktestResult {
    let equity = 10000;
    const equityCurve = [equity];
    let position = 0;

    let entryPriceA = 0;
    let entryPriceB = 0;
    let entryDate = "";
    let entryZ = 0;
    let entryIndex = 0;

    let wins = 0;
    let totalTrades = 0;
    let peakEquity = equity;
    let maxDrawdown = 0;
    const history: Trade[] = [];

    // Position Sizing from config
    const exposurePerLeg = config.capitalPerLeg;

    // Track shares for active position
    let entrySharesA = 0;
    let entrySharesB = 0;

    // Track peak P&L for trailing stop
    let peakTradePnl = 0;

    // Use configurable thresholds
    const { entryThresholdUpper, entryThresholdLower, exitThreshold } = config;

    for (let i = 1; i < zScores.length; i++) {
        const z = zScores[i];
        const pA = pricesA[i];
        const pB = pricesB[i];
        const date = dates[i];

        if (position !== 0) {
            // Calculate current trade P&L
            const dirA = position === 1 ? 1 : -1;
            const dirB = position === 1 ? (hedgeRatio > 0 ? -1 : 1) : (hedgeRatio > 0 ? 1 : -1);

            const currentPnlA = entrySharesA * dirA * (pA - entryPriceA);
            const currentPnlB = entrySharesB * dirB * (pB - entryPriceB);
            const currentPnl = currentPnlA + currentPnlB;

            // Track peak P&L for trailing stop
            if (currentPnl > peakTradePnl) {
                peakTradePnl = currentPnl;
            }

            // Calculate investment basis for % calculations
            const investmentBasis = exposurePerLeg * (1 + Math.abs(hedgeRatio));
            const pnlPercent = (currentPnl / investmentBasis) * 100;
            const peakPnlPercent = (peakTradePnl / investmentBasis) * 100;

            // Calculate days held
            const daysHeld = i - entryIndex;

            // Check exit conditions
            const crossedMean = position === 1
                ? z >= exitThreshold
                : z <= exitThreshold;

            const stopLossHit = config.stopLossPercent !== null &&
                pnlPercent <= -config.stopLossPercent;

            const trailingStopHit = config.trailingStopPercent !== null &&
                peakPnlPercent > 0 &&
                pnlPercent <= peakPnlPercent - config.trailingStopPercent;

            const maxHoldingHit = config.maxHoldingPeriod !== null &&
                daysHeld >= config.maxHoldingPeriod;

            const shouldExit = crossedMean || stopLossHit || trailingStopHit || maxHoldingHit;

            if (shouldExit) {
                const pnl = currentPnl;
                equity += pnl;
                totalTrades++;
                if (pnl > 0) wins++;

                history.push({
                    type: position === 1 ? 'Long' : 'Short',
                    entryDate,
                    exitDate: date,
                    entryZ,
                    exitZ: z,
                    pnl,
                    pnlA: currentPnlA,
                    pnlB: currentPnlB,
                    sideA: dirA === 1 ? 'Long' : 'Short',
                    sideB: dirB === 1 ? 'Long' : 'Short',
                    entryPriceA,
                    entryPriceB,
                    exitPriceA: pA,
                    exitPriceB: pB
                });

                position = 0;
                entrySharesA = 0;
                entrySharesB = 0;
                peakTradePnl = 0;
            }
        }

        if (position === 0) {
            if (z > entryThresholdUpper) {
                position = -1;
                entryPriceA = pA;
                entryPriceB = pB;
                entrySharesA = exposurePerLeg / pA;
                entrySharesB = (exposurePerLeg * Math.abs(hedgeRatio)) / pB;
                entryDate = date;
                entryZ = z;
                entryIndex = i;
                peakTradePnl = 0;
            } else if (z < entryThresholdLower) {
                position = 1;
                entryPriceA = pA;
                entryPriceB = pB;
                entrySharesA = exposurePerLeg / pA;
                entrySharesB = (exposurePerLeg * Math.abs(hedgeRatio)) / pB;
                entryDate = date;
                entryZ = z;
                entryIndex = i;
                peakTradePnl = 0;
            }
        }

        equityCurve.push(equity);

        if (equity > peakEquity) peakEquity = equity;
        const dd = (peakEquity - equity) / peakEquity;
        if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const totalReturn = (equity - 10000) / 10000;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
        returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }
    const meanRet = returns.length > 0 ? mean(returns) : 0;
    const stdRet = returns.length > 0 ? std(returns) : 0;
    const sharpe = stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(252) : 0;

    return {
        equityCurve,
        trades: totalTrades,
        winRate,
        totalReturn,
        maxDrawdown,
        sharpeRatio: sharpe,
        history
    };
}

function calculateBasketBacktest(
    zScores: number[],
    pricesMap: Record<string, number[]>,
    weights: Record<string, number>,
    dates: string[],
    config: BacktestConfig = DEFAULT_BACKTEST_CONFIG
): BasketBacktestResult {
    let equity = 10000;
    const equityCurve = [equity];
    let position = 0; // 0, 1 (Long Spread), -1 (Short Spread)

    let entryPrices: Record<string, number> = {};
    let entryDate = "";
    let entryZ = 0;
    let entryIndex = 0;

    let wins = 0;
    let totalTrades = 0;
    let peakEquity = equity;
    let maxDrawdown = 0;
    const history: BasketTrade[] = [];

    // Capital Allocation from config - use 2x capitalPerLeg for basket
    const baseAllocation = config.capitalPerLeg * 2;

    // Track shares and peak P&L for trailing stop
    let entryShares: Record<string, number> = {};
    let peakTradePnl = 0;

    const symbols = Object.keys(pricesMap);

    // Use configurable thresholds
    const { entryThresholdUpper, entryThresholdLower, exitThreshold } = config;

    for (let i = 1; i < zScores.length; i++) {
        const z = zScores[i];
        const date = dates[i];

        // Check Exit
        if (position !== 0) {
            // Calculate current P&L
            let currentPnl = 0;
            const pnlBreakdown: Record<string, number> = {};
            const exitPrices: Record<string, number> = {};

            for (const sym of symbols) {
                const currentPrice = pricesMap[sym][i];
                exitPrices[sym] = currentPrice;
                const shares = entryShares[sym];
                const weight = weights[sym];
                const direction = position * (weight >= 0 ? 1 : -1);
                const legPnl = shares * direction * (currentPrice - entryPrices[sym]);
                pnlBreakdown[sym] = legPnl;
                currentPnl += legPnl;
            }

            // Track peak P&L for trailing stop
            if (currentPnl > peakTradePnl) {
                peakTradePnl = currentPnl;
            }

            // Calculate investment basis for % calculations
            const investmentBasis = baseAllocation;
            const pnlPercent = (currentPnl / investmentBasis) * 100;
            const peakPnlPercent = (peakTradePnl / investmentBasis) * 100;

            // Calculate days held
            const daysHeld = i - entryIndex;

            // Check exit conditions
            const crossedMean = position === 1
                ? z >= exitThreshold
                : z <= exitThreshold;

            const stopLossHit = config.stopLossPercent !== null &&
                pnlPercent <= -config.stopLossPercent;

            const trailingStopHit = config.trailingStopPercent !== null &&
                peakPnlPercent > 0 &&
                pnlPercent <= peakPnlPercent - config.trailingStopPercent;

            const maxHoldingHit = config.maxHoldingPeriod !== null &&
                daysHeld >= config.maxHoldingPeriod;

            const shouldExit = crossedMean || stopLossHit || trailingStopHit || maxHoldingHit;

            if (shouldExit) {
                equity += currentPnl;
                totalTrades++;
                if (currentPnl > 0) wins++;

                history.push({
                    type: position === 1 ? 'Long' : 'Short',
                    entryDate,
                    exitDate: date,
                    entryZ,
                    exitZ: z,
                    pnl: currentPnl,
                    pnlBreakdown,
                    entryPrices: { ...entryPrices },
                    exitPrices
                });

                position = 0;
                entryShares = {};
                entryPrices = {};
                peakTradePnl = 0;
            }
        }

        // Check Entry
        if (position === 0) {
            if (z > entryThresholdUpper) {
                // Short Spread
                position = -1;
                entryDate = date;
                entryZ = z;
                entryIndex = i;
                peakTradePnl = 0;

                for (const sym of symbols) {
                    const price = pricesMap[sym][i];
                    entryPrices[sym] = price;
                    const weight = weights[sym];
                    entryShares[sym] = (baseAllocation * Math.abs(weight)) / price;
                }

            } else if (z < entryThresholdLower) {
                // Long Spread
                position = 1;
                entryDate = date;
                entryZ = z;
                entryIndex = i;
                peakTradePnl = 0;

                for (const sym of symbols) {
                    const price = pricesMap[sym][i];
                    entryPrices[sym] = price;
                    const weight = weights[sym];
                    entryShares[sym] = (baseAllocation * Math.abs(weight)) / price;
                }
            }
        }

        equityCurve.push(equity);
        if (equity > peakEquity) peakEquity = equity;
        const dd = (peakEquity - equity) / peakEquity;
        if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const totalReturn = (equity - 10000) / 10000;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
        returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }
    const meanRet = returns.length > 0 ? mean(returns) : 0;
    const stdRet = returns.length > 0 ? std(returns) : 0;
    const sharpe = stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(252) : 0;

    return {
        equityCurve,
        trades: totalTrades,
        winRate,
        totalReturn,
        maxDrawdown,
        sharpeRatio: sharpe,
        history
    };
}


export function analyzePairs(
    pricesA: number[],
    pricesB: number[],
    dates: string[],
    config: BacktestConfig = DEFAULT_BACKTEST_CONFIG
): PairsAnalysisResult {
    const logA = pricesA.map(p => Math.log(p));
    const logB = pricesB.map(p => Math.log(p));

    const { beta, alpha } = calculateOLS(logB, logA);
    // If beta is extremely small or zero, it might lead to strange results, but OLS is valid.

    const spread = logA.map((valA, i) => valA - beta * logB[i] - alpha);

    // Full history stats (always calculated for display)
    const meanSpread: number = mean(spread);
    const stdSpread: number = std(spread);

    // Calculate Z-Score (with optional rolling window)
    let zScore: number[];

    if (config.rollingWindow !== null && config.rollingWindow > 0) {
        // Rolling Z-Score calculation
        zScore = calculateRollingZScore(spread, config.rollingWindow);
    } else {
        // Full history Z-Score (original behavior)
        zScore = spread.map(s => (s - meanSpread) / stdSpread);
    }

    const halfLife = calculateHalfLife(spread);

    const isCointegrated = halfLife < 60 && halfLife > 0;

    const backtest = calculateBacktest(zScore, pricesA, pricesB, beta, dates, config);

    return {
        hedgeRatio: beta,
        alpha,
        spread,
        zScore,
        currentZScore: zScore[zScore.length - 1],
        halfLife,
        isCointegrated,
        stats: {
            meanSpread,
            stdSpread,
            lastPriceA: pricesA[pricesA.length - 1],
            lastPriceB: pricesB[pricesB.length - 1]
        },
        backtest
    };
}

/**
 * Multi-Asset Basket Analysis using Matrix OLS
 * Y = \beta_1 X_1 + \beta_2 X_2 + ... + \alpha + \epsilon
 * Spread = \epsilon (Residuals)
 */
export function analyzeBasket(
    pricesMap: Record<string, number[]>,
    dates: string[],
    config: BacktestConfig = DEFAULT_BACKTEST_CONFIG
): BasketAnalysisResult {
    const symbols = Object.keys(pricesMap);
    if (symbols.length < 2) throw new Error("Need at least 2 assets for basket analysis");

    // Treat first symbol as Dependent (Y)
    const ySymbol = symbols[0];
    const xSymbols = symbols.slice(1);

    const n = pricesMap[ySymbol].length;
    const yData = pricesMap[ySymbol].map(p => Math.log(p));

    // Construct X Matrix: [1, log(x1), log(x2), ...]
    const xData: number[][] = [];

    for (let i = 0; i < n; i++) {
        const row = [1]; // Intercept term
        for (const sym of xSymbols) {
            row.push(Math.log(pricesMap[sym][i]));
        }
        xData.push(row);
    }

    // Convert to MathJS matrices
    const Y: Matrix = matrix(yData.map(v => [v])); // Column vector
    const X: Matrix = matrix(xData);

    // Beta = (X'X)^-1 X'Y
    const Xt = transpose(X);
    const XtX = multiply(Xt, X);
    const XtX_inv = inv(XtX);
    const XtY = multiply(Xt, Y);
    const BetaMat: Matrix = multiply(XtX_inv, XtY);

    // Extract coefficients
    // @ts-ignore - mathjs types can be tricky with raw values
    const betaValues = BetaMat.toArray().flat() as number[];
    const alpha = betaValues[0];
    const coefficients = betaValues.slice(1);

    // Calculate Weights Map
    const weights: Record<string, number> = {};
    weights[ySymbol] = 1.0;
    xSymbols.forEach((sym, i) => {
        weights[sym] = -coefficients[i]; // We move them to LHS: Y - beta*X = Spread, so weight is -beta
    });

    // Calculate Spread (Residuals)
    // Spread = Y - (alpha + beta1*X1 + beta2*X2...)
    const spread: number[] = [];
    for (let i = 0; i < n; i++) {
        let predicted = alpha;
        for (let j = 0; j < xSymbols.length; j++) {
            predicted += coefficients[j] * Math.log(pricesMap[xSymbols[j]][i]);
        }
        spread.push(yData[i] - predicted);
    }

    const meanSpread = mean(spread);
    const stdSpread = std(spread);

    // Calculate Z-Score (with optional rolling window)
    let zScore: number[];
    if (config.rollingWindow !== null && config.rollingWindow > 0) {
        zScore = calculateRollingZScore(spread, config.rollingWindow);
    } else {
        zScore = spread.map(s => (s - meanSpread) / stdSpread);
    }

    const halfLife = calculateHalfLife(spread);
    const isCointegrated = halfLife < 60 && halfLife > 0;

    const backtest = calculateBasketBacktest(zScore, pricesMap, weights, dates, config);

    return {
        weights,
        alpha,
        spread,
        zScore,
        currentZScore: zScore[zScore.length - 1],
        halfLife,
        isCointegrated,
        stats: {
            meanSpread,
            stdSpread
        },
        dependentSymbol: ySymbol,
        backtest
    };
}

