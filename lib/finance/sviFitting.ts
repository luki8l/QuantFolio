/**
 * SVI (Stochastic Volatility Inspired) Surface Fitting
 * 
 * The SVI model parametrizes the implied variance (σ²) as a function of log-moneyness:
 * 
 * w(k) = a + b * (ρ * (k - m) + √((k - m)² + σ²))
 * 
 * where:
 *   k = log(K/F) = log-moneyness
 *   a = level parameter (vertical shift)
 *   b = slope parameter (overall slope)
 *   ρ = rotation parameter (-1 < ρ < 1, controls skew)
 *   m = translation parameter (horizontal shift)
 *   σ = curvature/ATM volatility parameter
 * 
 * This model is widely used on Wall Street for equity and FX options.
 */

import { SurfacePoint } from './blackScholes';

export interface SVIParams {
    a: number;  // Level
    b: number;  // Slope
    rho: number;  // Rotation/skew
    m: number;  // Translation
    sigma: number;  // Curvature
}

export interface SVIFitResult {
    params: SVIParams;
    rmse: number;  // Root mean squared error
    r2: number;  // R-squared (goodness of fit)
    fittedPoints: { moneyness: number; iv: number; fittedIV: number }[];
}

/**
 * Calculate implied variance using SVI formula
 */
export function sviImpliedVariance(k: number, params: SVIParams): number {
    const { a, b, rho, m, sigma } = params;
    const diff = k - m;
    return a + b * (rho * diff + Math.sqrt(diff * diff + sigma * sigma));
}

/**
 * Calculate implied volatility from SVI params (for a given expiry T)
 */
export function sviImpliedVolatility(k: number, T: number, params: SVIParams): number {
    const variance = sviImpliedVariance(k, params);
    if (variance <= 0) return 0;
    return Math.sqrt(variance / T);
}

/**
 * Fit SVI parameters to market data using grid search + gradient descent
 * 
 * We fit one SVI curve per expiry date
 */
export function fitSVISlice(
    points: { moneyness: number; iv: number }[],
    T: number  // Time to expiry in years
): SVIFitResult | null {
    if (points.length < 5) return null;  // Need enough points

    // Convert IV to total variance (w = σ² * T)
    const data = points.map(p => ({
        k: p.moneyness,
        w: p.iv * p.iv * T  // Total variance
    }));

    // Initial guess using heuristics
    const avgW = data.reduce((s, d) => s + d.w, 0) / data.length;
    const minK = Math.min(...data.map(d => d.k));
    const maxK = Math.max(...data.map(d => d.k));

    // Grid search for initial parameters
    let bestParams: SVIParams = {
        a: avgW * 0.8,
        b: 0.2,
        rho: -0.3,
        m: 0,
        sigma: 0.1
    };
    let bestError = Infinity;

    // Coarse grid search
    const aValues = [avgW * 0.5, avgW * 0.7, avgW * 0.9, avgW * 1.1];
    const bValues = [0.1, 0.2, 0.3, 0.5];
    const rhoValues = [-0.5, -0.3, -0.1, 0.1];
    const sigmaValues = [0.05, 0.1, 0.2, 0.3];

    for (const a of aValues) {
        for (const b of bValues) {
            for (const rho of rhoValues) {
                for (const sigma of sigmaValues) {
                    const params = { a, b, rho, m: 0, sigma };
                    const error = calculateSSE(data, params);
                    if (error < bestError) {
                        bestError = error;
                        bestParams = params;
                    }
                }
            }
        }
    }

    // Refine with simple gradient descent
    const learningRate = 0.001;
    const iterations = 500;
    let currentParams = { ...bestParams };

    for (let i = 0; i < iterations; i++) {
        const gradient = calculateGradient(data, currentParams);

        // Update with constraints
        currentParams.a = Math.max(0.001, currentParams.a - learningRate * gradient.a);
        currentParams.b = Math.max(0.01, Math.min(1, currentParams.b - learningRate * gradient.b));
        currentParams.rho = Math.max(-0.99, Math.min(0.99, currentParams.rho - learningRate * gradient.rho * 0.1));
        currentParams.sigma = Math.max(0.01, currentParams.sigma - learningRate * gradient.sigma);
        currentParams.m = currentParams.m - learningRate * gradient.m * 0.1;
    }

    // Calculate final fit statistics
    const sse = calculateSSE(data, currentParams);
    const mse = sse / data.length;
    const rmse = Math.sqrt(mse);

    // Calculate R²
    const meanW = data.reduce((s, d) => s + d.w, 0) / data.length;
    const tss = data.reduce((s, d) => s + Math.pow(d.w - meanW, 2), 0);
    const r2 = 1 - (sse / tss);

    // Generate fitted points
    const fittedPoints = points.map(p => ({
        moneyness: p.moneyness,
        iv: p.iv,
        fittedIV: sviImpliedVolatility(p.moneyness, T, currentParams)
    }));

    return {
        params: currentParams,
        rmse,
        r2: Math.max(0, Math.min(1, r2)),
        fittedPoints
    };
}

/**
 * Calculate sum of squared errors
 */
function calculateSSE(data: { k: number; w: number }[], params: SVIParams): number {
    return data.reduce((sum, point) => {
        const fitted = sviImpliedVariance(point.k, params);
        return sum + Math.pow(point.w - fitted, 2);
    }, 0);
}

/**
 * Calculate gradient for optimization
 */
function calculateGradient(data: { k: number; w: number }[], params: SVIParams): SVIParams {
    const h = 0.0001;
    const gradient: SVIParams = { a: 0, b: 0, rho: 0, m: 0, sigma: 0 };
    const baseError = calculateSSE(data, params);

    // Numerical gradient for each parameter
    for (const key of ['a', 'b', 'rho', 'm', 'sigma'] as (keyof SVIParams)[]) {
        const perturbedParams = { ...params };
        perturbedParams[key] += h;
        const perturbedError = calculateSSE(data, perturbedParams);
        gradient[key] = (perturbedError - baseError) / h;
    }

    return gradient;
}

/**
 * Generate a smooth SVI surface for visualization
 */
export function generateSVISurface(
    surfacePoints: SurfacePoint[],
    spotPrice: number,
    strikeRange: { min: number; max: number },
    expiryRange: { min: number; max: number },
    resolution: number = 30
): {
    strikes: number[];
    expiries: number[];
    ivGrid: number[][];
    sviFits: Map<number, SVIFitResult>;
} {
    // Group points by expiry
    const byExpiry = new Map<number, SurfacePoint[]>();
    surfacePoints.forEach(p => {
        const existing = byExpiry.get(p.daysToExpiry) || [];
        existing.push(p);
        byExpiry.set(p.daysToExpiry, existing);
    });

    // Fit SVI to each expiry
    const sviFits = new Map<number, SVIFitResult>();
    const rawIVByExpiry = new Map<number, Map<number, number>>();  // For fallback

    byExpiry.forEach((points, days) => {
        const T = days / 365;
        const fitData = points
            .filter(p => p.callIV !== null || p.putIV !== null)
            .map(p => ({
                moneyness: p.moneyness,
                iv: (p.callIV ?? p.putIV) as number
            }));

        // Store raw IVs for fallback interpolation
        const strikeIVMap = new Map<number, number>();
        points.forEach(p => {
            const iv = p.callIV ?? p.putIV;
            if (iv !== null) strikeIVMap.set(p.strike, iv);
        });
        rawIVByExpiry.set(days, strikeIVMap);

        // Try SVI fit - lowered threshold for more coverage
        if (fitData.length >= 4) {
            const fit = fitSVISlice(fitData, T);
            if (fit && fit.r2 > 0.3) {  // Lowered from 0.5 for more coverage
                sviFits.set(days, fit);
            }
        }
    });

    // Generate smooth grid
    const strikes: number[] = [];
    const expiries: number[] = [];

    for (let i = 0; i <= resolution; i++) {
        strikes.push(strikeRange.min + (strikeRange.max - strikeRange.min) * (i / resolution));
    }

    const expiryDays = [...byExpiry.keys()].sort((a, b) => a - b);
    for (let i = 0; i <= resolution; i++) {
        expiries.push(expiryRange.min + (expiryRange.max - expiryRange.min) * (i / resolution));
    }

    // Interpolate IV for each grid point
    const ivGrid: number[][] = [];

    for (let ei = 0; ei <= resolution; ei++) {
        const days = expiries[ei];
        const T = days / 365;
        const row: number[] = [];

        // Find surrounding expiries for interpolation
        const lowerExpiry = expiryDays.filter(d => d <= days).pop();
        const upperExpiry = expiryDays.find(d => d >= days);

        for (let si = 0; si <= resolution; si++) {
            const K = strikes[si];
            const k = Math.log(K / spotPrice);  // Log-moneyness

            let iv = 0;

            // Try SVI first
            if (lowerExpiry && sviFits.has(lowerExpiry)) {
                const lowerT = lowerExpiry / 365;
                const lowerIV = sviImpliedVolatility(k, lowerT, sviFits.get(lowerExpiry)!.params);

                if (upperExpiry && upperExpiry !== lowerExpiry && sviFits.has(upperExpiry)) {
                    const upperT = upperExpiry / 365;
                    const upperIV = sviImpliedVolatility(k, upperT, sviFits.get(upperExpiry)!.params);
                    const weight = (days - lowerExpiry) / (upperExpiry - lowerExpiry);
                    iv = lowerIV * (1 - weight) + upperIV * weight;
                } else {
                    iv = lowerIV;
                }
            } else if (upperExpiry && sviFits.has(upperExpiry)) {
                const upperT = upperExpiry / 365;
                iv = sviImpliedVolatility(k, upperT, sviFits.get(upperExpiry)!.params);
            }

            // Fallback to linear interpolation from raw data if SVI fails
            if (iv <= 0 || isNaN(iv)) {
                iv = interpolateRawIV(K, days, rawIVByExpiry, expiryDays);
            }

            row.push(iv > 0 ? iv * 100 : NaN);  // Convert to percentage
        }

        ivGrid.push(row);
    }

    return { strikes, expiries, ivGrid, sviFits };
}

/**
 * Fallback linear interpolation from raw IV data
 */
function interpolateRawIV(
    strike: number,
    days: number,
    rawIVByExpiry: Map<number, Map<number, number>>,
    expiryDays: number[]
): number {
    // Find closest expiries
    const lowerExpiry = expiryDays.filter(d => d <= days).pop();
    const upperExpiry = expiryDays.find(d => d >= days);

    const interpolateAtExpiry = (expDays: number): number | null => {
        const strikeMap = rawIVByExpiry.get(expDays);
        if (!strikeMap) return null;

        const sortedStrikes = [...strikeMap.keys()].sort((a, b) => a - b);
        const lowerStrike = sortedStrikes.filter(s => s <= strike).pop();
        const upperStrike = sortedStrikes.find(s => s >= strike);

        if (lowerStrike === undefined && upperStrike === undefined) return null;
        if (lowerStrike === undefined) return strikeMap.get(upperStrike!)!;
        if (upperStrike === undefined) return strikeMap.get(lowerStrike)!;
        if (lowerStrike === upperStrike) return strikeMap.get(lowerStrike)!;

        const lowerIV = strikeMap.get(lowerStrike)!;
        const upperIV = strikeMap.get(upperStrike)!;
        const weight = (strike - lowerStrike) / (upperStrike - lowerStrike);
        return lowerIV * (1 - weight) + upperIV * weight;
    };

    if (lowerExpiry === undefined && upperExpiry === undefined) return 0;

    const lowerIV = lowerExpiry ? interpolateAtExpiry(lowerExpiry) : null;
    const upperIV = upperExpiry ? interpolateAtExpiry(upperExpiry) : null;

    if (lowerIV === null && upperIV === null) return 0;
    if (lowerIV === null) return upperIV!;
    if (upperIV === null) return lowerIV;
    if (lowerExpiry === upperExpiry) return lowerIV;

    const weight = (days - lowerExpiry!) / (upperExpiry! - lowerExpiry!);
    return lowerIV * (1 - weight) + upperIV * weight;
}
