
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
 * Simulates a trading strategy based on Z-Score
 */
function calculateBacktest(
    zScores: number[],
    pricesA: number[],
    pricesB: number[],
    hedgeRatio: number,
    dates: string[]
): BacktestResult {
    let equity = 10000;
    const equityCurve = [equity];
    let position = 0;

    let entryPriceA = 0;
    let entryPriceB = 0;
    let entryDate = "";
    let entryZ = 0;

    let wins = 0;
    let totalTrades = 0;
    let peakEquity = equity;
    let maxDrawdown = 0;
    const history: Trade[] = [];

    // Position Sizing: Fixed Exposure
    // We allocate $1000 per leg (not all-in)
    const exposurePerLeg = 1000;

    // Track shares for active position
    let entrySharesA = 0;
    let entrySharesB = 0;

    for (let i = 1; i < zScores.length; i++) {
        const z = zScores[i];
        const pA = pricesA[i];
        const pB = pricesB[i];
        const date = dates[i];

        if (position !== 0) {
            const crossedMean = (position === 1 && z >= 0) || (position === -1 && z <= 0);

            if (crossedMean) {
                // Direction multipliers: 1 for Long, -1 for Short
                const dirA = position === 1 ? 1 : -1;
                // If position=1 (Long Spread), we are Short B if Beta > 0.
                // If Beta is negative, we are actually Long B.
                const dirB = position === 1 ? (hedgeRatio > 0 ? -1 : 1) : (hedgeRatio > 0 ? 1 : -1);

                const pnlA = entrySharesA * dirA * (pA - entryPriceA);
                const pnlB = entrySharesB * dirB * (pB - entryPriceB);

                const pnl = pnlA + pnlB;
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
                    pnlA,
                    pnlB,
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
            }
        }

        if (position === 0) {
            if (z > 2.0) {
                position = -1;
                entryPriceA = pA;
                entryPriceB = pB;
                // Calculate shares dynamically at entry
                entrySharesA = exposurePerLeg / pA;
                entrySharesB = (exposurePerLeg * Math.abs(hedgeRatio)) / pB;

                entryDate = date;
                entryZ = z;
            } else if (z < -2.0) {
                position = 1;
                entryPriceA = pA;
                entryPriceB = pB;
                // Calculate shares dynamically at entry
                entrySharesA = exposurePerLeg / pA;
                entrySharesB = (exposurePerLeg * Math.abs(hedgeRatio)) / pB;

                entryDate = date;
                entryZ = z;
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
    dates: string[]
): BasketBacktestResult {
    let equity = 10000;
    const equityCurve = [equity];
    let position = 0; // 0, 1 (Long Spread), -1 (Short Spread)

    let entryPrices: Record<string, number> = {};
    let entryDate = "";
    let entryZ = 0;

    let wins = 0;
    let totalTrades = 0;
    let peakEquity = equity;
    let maxDrawdown = 0;
    const history: BasketTrade[] = [];

    // Capital Allocation per "Unit" of Spread
    // Or we can allocate fixed capital to the Dependent asset, and scale others by weight
    const baseAllocation = 2000; // $2000 for dependent asset

    // Track shares
    let entryShares: Record<string, number> = {};

    const symbols = Object.keys(pricesMap);

    for (let i = 1; i < zScores.length; i++) {
        const z = zScores[i];
        const date = dates[i];

        // Check Exit
        if (position !== 0) {
            const crossedMean = (position === 1 && z >= 0) || (position === -1 && z <= 0);

            if (crossedMean) {
                // Close Position
                let totalPnl = 0;
                const pnlBreakdown: Record<string, number> = {};
                const exitPrices: Record<string, number> = {};

                for (const sym of symbols) {
                    const currentPrice = pricesMap[sym][i];
                    exitPrices[sym] = currentPrice;
                    const shares = entryShares[sym];

                    // Logic:
                    // If Position=1 (Long Spread): We bought where weight > 0, Sold where weight < 0
                    // Actually, weight sign ALREADY indicates relationship.
                    // Spread = w1*ln(P1) + w2*ln(P2)...
                    // If Spread is LOW (<-2), we expect it to rise. So we Buy the Spread.
                    // Buying Spread means: Buy assets with +Weight, Sell assets with -Weight.
                    // So Direction for Asset = Position * Sign(Weight)

                    const weight = weights[sym];
                    const direction = position * (weight >= 0 ? 1 : -1);

                    // PnL = Shares * Direction * (Exit - Entry)
                    // Note: Shares are always positive here

                    const legPnl = shares * direction * (currentPrice - entryPrices[sym]);
                    pnlBreakdown[sym] = legPnl;
                    totalPnl += legPnl;
                }

                equity += totalPnl;
                totalTrades++;
                if (totalPnl > 0) wins++;

                history.push({
                    type: position === 1 ? 'Long' : 'Short',
                    entryDate,
                    exitDate: date,
                    entryZ,
                    exitZ: z,
                    pnl: totalPnl,
                    pnlBreakdown,
                    entryPrices: { ...entryPrices },
                    exitPrices
                });

                position = 0;
                entryShares = {};
                entryPrices = {};
            }
        }

        // Check Entry
        if (position === 0) {
            if (z > 2.0) {
                // Short Spread
                position = -1;
                entryDate = date;
                entryZ = z;

                // Calculate Shares
                const depSym = symbols[0]; // Assuming first is dependent? Or just iterate all
                // Actually weights defines everything.
                // Base allocation is for the asset with weight 1.0 (Dependent)
                // Others are scaled.
                // Shares = (BaseAllocation * |Weight|) / Price

                for (const sym of symbols) {
                    const price = pricesMap[sym][i];
                    entryPrices[sym] = price;
                    const weight = weights[sym];
                    entryShares[sym] = (baseAllocation * Math.abs(weight)) / price;
                }

            } else if (z < -2.0) {
                // Long Spread
                position = 1;
                entryDate = date;
                entryZ = z;

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


export function analyzePairs(pricesA: number[], pricesB: number[], dates: string[]): PairsAnalysisResult {
    const logA = pricesA.map(p => Math.log(p));
    const logB = pricesB.map(p => Math.log(p));

    const { beta, alpha } = calculateOLS(logB, logA);
    // If beta is extremely small or zero, it might lead to strange results, but OLS is valid.

    const spread = logA.map((valA, i) => valA - beta * logB[i] - alpha);

    const meanSpread: number = mean(spread);
    const stdSpread: number = std(spread);

    const zScore = spread.map(s => (s - meanSpread) / stdSpread);

    const halfLife = calculateHalfLife(spread);

    const isCointegrated = halfLife < 60 && halfLife > 0;

    const backtest = calculateBacktest(zScore, pricesA, pricesB, beta, dates);

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
export function analyzeBasket(pricesMap: Record<string, number[]>, dates: string[]): BasketAnalysisResult {
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
    const zScore = spread.map(s => (s - meanSpread) / stdSpread);
    const halfLife = calculateHalfLife(spread);
    const isCointegrated = halfLife < 60 && halfLife > 0;

    const backtest = calculateBasketBacktest(zScore, pricesMap, weights, dates);

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

