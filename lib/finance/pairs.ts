
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
