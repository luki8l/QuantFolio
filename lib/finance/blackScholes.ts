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
