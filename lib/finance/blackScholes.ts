import { erf } from 'mathjs';

// Cumulative Distribution Function of Standard Normal Distribution
function cdf(x: number): number {
    // erf from mathjs might return different types, cast to number if needed or trust it returns number for number input
    // The type definition for mathjs erf says it returns number | BigNumber | Complex.
    // We should cast it.
    return (1.0 + Number(erf(x / Math.sqrt(2.0)))) / 2.0;
}

// Probability Density Function
function pdf(x: number): number {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

export type OptionType = 'call' | 'put';

export interface BlackScholesInputs {
    S: number;      // Spot Price
    K: number;      // Strike Price
    T: number;      // Time to Maturity (years)
    r: number;      // Risk-free Rate (decimal, e.g., 0.05 for 5%)
    sigma: number;  // Volatility (decimal, e.g., 0.2 for 20%)
}

export interface OptionGreeks {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
}

export interface BlackScholesOutput {
    price: number;
    greeks: OptionGreeks;
}

export function calculateBlackScholes(inputs: BlackScholesInputs, type: OptionType): BlackScholesOutput {
    const { S, K, T, r, sigma } = inputs;

    // Boundary conditions
    if (T <= 0) {
        return {
            price: Math.max(0, type === 'call' ? S - K : K - S),
            greeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
        };
    }
    if (sigma <= 0) {
        return {
            price: Math.max(0, type === 'call' ? S - K : K - S),
            greeks: { delta: type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0, rho: 0 }
        };
    }

    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    let price = 0;
    let delta = 0;
    const gamma = pdf(d1) / (S * sigma * Math.sqrt(T));
    const vega = S * Math.sqrt(T) * pdf(d1) / 100; // Scaled for 1% vol change

    let theta = 0;
    let rho = 0;

    if (type === 'call') {
        const cdfD1 = cdf(d1);
        const cdfD2 = cdf(d2);

        price = S * cdfD1 - K * Math.exp(-r * T) * cdfD2;
        delta = cdfD1;

        // Theta calculation (annual)
        const term1 = -(S * pdf(d1) * sigma) / (2 * Math.sqrt(T));
        const term2 = r * K * Math.exp(-r * T) * cdfD2;
        theta = (term1 - term2);

        rho = K * T * Math.exp(-r * T) * cdfD2 / 100; // Scaled for 1% rate change
    } else {
        const cdfNegD1 = cdf(-d1);
        const cdfNegD2 = cdf(-d2);

        price = K * Math.exp(-r * T) * cdfNegD2 - S * cdfNegD1;
        delta = cdfNegD1 - 1; // Put delta is negative

        // Theta calculation (annual)
        const term1 = -(S * pdf(d1) * sigma) / (2 * Math.sqrt(T));
        const term2 = r * K * Math.exp(-r * T) * cdfNegD2;
        theta = (term1 + term2);

        rho = -K * T * Math.exp(-r * T) * cdfNegD2 / 100;
    }

    return {
        price,
        greeks: {
            delta,
            gamma,
            theta: theta / 365, // Convert annual theta to daily
            vega,
            rho
        }
    };
}

// ============================================================================
// IMPLIED VOLATILITY CALCULATION
// ============================================================================

export interface ImpliedVolatilityInputs {
    optionPrice: number;  // Market price of the option
    S: number;            // Spot price
    K: number;            // Strike price
    T: number;            // Time to expiration (in years)
    r: number;            // Risk-free rate
    type: OptionType;     // 'call' or 'put'
}

export interface ImpliedVolatilityResult {
    iv: number;           // Implied volatility (decimal)
    converged: boolean;   // Whether calculation converged
    iterations: number;   // Number of iterations used
}

/**
 * Calculate Implied Volatility using Newton-Raphson method
 * 
 * This is the industry-standard approach for solving:
 * BS(S, K, T, r, σ) = MarketPrice for σ
 */
export function calculateImpliedVolatility(inputs: ImpliedVolatilityInputs): ImpliedVolatilityResult {
    const { optionPrice, S, K, T, r, type } = inputs;

    // Edge cases
    if (T <= 0 || optionPrice <= 0) {
        return { iv: 0, converged: false, iterations: 0 };
    }

    // Intrinsic value check
    const intrinsicValue = type === 'call'
        ? Math.max(0, S - K * Math.exp(-r * T))
        : Math.max(0, K * Math.exp(-r * T) - S);

    if (optionPrice < intrinsicValue * 0.99) {
        // Price below intrinsic - no valid IV
        return { iv: 0, converged: false, iterations: 0 };
    }

    // Initial guess using Brenner-Subrahmanyam approximation
    let sigma = Math.sqrt(2 * Math.PI / T) * optionPrice / S;
    sigma = Math.max(0.01, Math.min(sigma, 5.0)); // Clamp to reasonable range

    const MAX_ITERATIONS = 100;
    const PRECISION = 1e-7;
    const MIN_VEGA = 1e-10;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const result = calculateBlackScholes({ S, K, T, r, sigma }, type);
        const diff = result.price - optionPrice;

        // Check convergence
        if (Math.abs(diff) < PRECISION) {
            return { iv: sigma, converged: true, iterations: i + 1 };
        }

        // Vega (unscaled) for Newton-Raphson
        const sqrtT = Math.sqrt(T);
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
        const vega = S * sqrtT * pdf(d1);

        // Avoid division by very small vega
        if (Math.abs(vega) < MIN_VEGA) {
            return bisectionIV(inputs);
        }

        // Newton-Raphson update
        sigma = sigma - diff / vega;

        // Keep sigma in reasonable bounds
        sigma = Math.max(0.001, Math.min(sigma, 10.0));
    }

    // Didn't converge - try bisection as fallback
    return bisectionIV(inputs);
}

/**
 * Bisection method fallback for IV calculation
 * Slower but more robust than Newton-Raphson
 */
function bisectionIV(inputs: ImpliedVolatilityInputs): ImpliedVolatilityResult {
    const { optionPrice, S, K, T, r, type } = inputs;

    let sigmaLow = 0.001;
    let sigmaHigh = 5.0;
    const MAX_ITERATIONS = 100;
    const PRECISION = 1e-6;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const sigmaMid = (sigmaLow + sigmaHigh) / 2;
        const result = calculateBlackScholes({ S, K, T, r, sigma: sigmaMid }, type);
        const diff = result.price - optionPrice;

        if (Math.abs(diff) < PRECISION || (sigmaHigh - sigmaLow) < PRECISION) {
            return { iv: sigmaMid, converged: true, iterations: i + 1 };
        }

        if (diff > 0) {
            sigmaHigh = sigmaMid;
        } else {
            sigmaLow = sigmaMid;
        }
    }

    return { iv: (sigmaLow + sigmaHigh) / 2, converged: false, iterations: MAX_ITERATIONS };
}

// ============================================================================
// VOLATILITY SURFACE TYPES
// ============================================================================

export interface SurfacePoint {
    strike: number;
    expiry: string;
    daysToExpiry: number;
    moneyness: number;      // ln(K/S)
    callIV: number | null;
    putIV: number | null;
    callPrice: number;
    putPrice: number;
    callBid: number;
    callAsk: number;
    putBid: number;
    putAsk: number;
    callVolume: number;
    putVolume: number;
    callOI: number;
    putOI: number;
    callDelta: number | null;
    putDelta: number | null;
    gamma: number | null;
    vega: number | null;
}

export interface VolatilitySurfaceData {
    symbol: string;
    spotPrice: number;
    riskFreeRate: number;
    timestamp: string;
    points: SurfacePoint[];
    expiryDates: string[];
    strikes: number[];
}

/**
 * Calculate moneyness (log-moneyness)
 */
export function calculateMoneyness(S: number, K: number): number {
    return Math.log(K / S);
}

/**
 * Convert days to years
 */
export function daysToYears(days: number): number {
    return days / 365;
}

/**
 * Get unique sorted values from surface
 */
export function getSurfaceExpiries(surface: SurfacePoint[]): string[] {
    return [...new Set(surface.map(p => p.expiry))].sort();
}

export function getSurfaceStrikes(surface: SurfacePoint[]): number[] {
    return [...new Set(surface.map(p => p.strike))].sort((a, b) => a - b);
}
