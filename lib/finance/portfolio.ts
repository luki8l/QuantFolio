export interface Asset {
    symbol: string;
    name: string;
    meanReturn: number; // Annualized
    volatility: number; // Annualized
    color: string;
}

export interface PortfolioPoint {
    returns: number;
    volatility: number;
    sharpeRatio: number;
    weights: number[]; // Corresponds to input assets order
}

export interface OptimizationResult {
    simulations: PortfolioPoint[];
    maxSharpe: PortfolioPoint;
    minVol: PortfolioPoint;
}

// Mock Data
export const AVAILABLE_ASSETS: Asset[] = [
    { symbol: "AAPL", name: "Apple Inc.", meanReturn: 0.25, volatility: 0.28, color: "#A3AAAE" },
    { symbol: "GOOGL", name: "Alphabet", meanReturn: 0.22, volatility: 0.26, color: "#EA4335" },
    { symbol: "MSFT", name: "Microsoft", meanReturn: 0.24, volatility: 0.24, color: "#00A4EF" },
    { symbol: "TSLA", name: "Tesla", meanReturn: 0.45, volatility: 0.55, color: "#CC0000" },
    { symbol: "BTC", name: "Bitcoin", meanReturn: 0.60, volatility: 0.75, color: "#F7931A" },
    { symbol: "ETH", name: "Ethereum", meanReturn: 0.65, volatility: 0.85, color: "#627EEA" },
    { symbol: "GLD", name: "Gold Trust", meanReturn: 0.08, volatility: 0.15, color: "#FFD700" },
    { symbol: "USOT", name: "US Treasuries", meanReturn: 0.04, volatility: 0.05, color: "#85bb65" },
];

// Simplified Correlation Matrix (Mock)
// In a real app, this would be computed from historical prices.
// We'll use a hardcoded simplified matrix function for demo.
function getCorrelation(a: Asset, b: Asset): number {
    if (a.symbol === b.symbol) return 1.0;

    // Tech / Tech: High
    const tech = ["AAPL", "GOOGL", "MSFT", "TSLA"];
    if (tech.includes(a.symbol) && tech.includes(b.symbol)) return 0.65;

    // Crypto / Crypto: Very High
    const crypto = ["BTC", "ETH"];
    if (crypto.includes(a.symbol) && crypto.includes(b.symbol)) return 0.85;

    // Tech / Crypto: Moderate
    if ((tech.includes(a.symbol) && crypto.includes(b.symbol)) || (crypto.includes(a.symbol) && tech.includes(b.symbol))) return 0.40;

    // Treasury / Anything: Low/Negative
    if (a.symbol === "USOT" || b.symbol === "USOT") return -0.2;

    // Gold / Anything: Low
    if (a.symbol === "GLD" || b.symbol === "GLD") return 0.1;

    return 0.3; // Default
}

export function runPortfolioSimulation(assets: Asset[], numSimulations: number = 5000, correlationMatrix?: number[][]): OptimizationResult {
    const sims: PortfolioPoint[] = [];

    // Use provided matrix or Mock
    const correlations: number[][] = correlationMatrix || [];

    // Helper to calculate stats for weights
    const calculatePoint = (weights: number[]) => {
        // Calculate Portfolio Return: Sum(wi * mui)
        const pReturn = weights.reduce((acc, w, i) => acc + w * assets[i].meanReturn, 0);

        // Calculate Portfolio Volatility
        let variance = 0;
        for (let i = 0; i < assets.length; i++) {
            for (let j = 0; j < assets.length; j++) {
                const rho = correlations.length > 0 ? correlations[i][j] : (i === j ? 1 : 0);
                const cov = rho * assets[i].volatility * assets[j].volatility;
                variance += weights[i] * weights[j] * cov;
            }
        }
        const pVol = Math.sqrt(variance);

        // Sharpe Ratio (Assuming Risk Free 3M T-Bill ~ 4.5% = 0.045)
        const sharpe = (pReturn - 0.045) / pVol;

        return {
            returns: pReturn,
            volatility: pVol,
            sharpeRatio: sharpe,
            weights
        };
    };

    // 1. Edge Cases: 100% in each asset (Corners)
    // This ensures the frontier extends to the visual limits of the assets
    for (let i = 0; i < assets.length; i++) {
        const weights = new Array(assets.length).fill(0);
        weights[i] = 1.0;
        sims.push(calculatePoint(weights));
    }

    // 2. Pairwise Combinations: 50/50 pairs and stepped combinations
    // This fills the edges between assets
    for (let i = 0; i < assets.length; i++) {
        for (let j = i + 1; j < assets.length; j++) {
            // 50/50
            const w50 = new Array(assets.length).fill(0);
            w50[i] = 0.5; w50[j] = 0.5;
            sims.push(calculatePoint(w50));

            // 75/25
            const w75 = new Array(assets.length).fill(0);
            w75[i] = 0.75; w75[j] = 0.25;
            sims.push(calculatePoint(w75));

            // 25/75
            const w25 = new Array(assets.length).fill(0);
            w25[i] = 0.25; w25[j] = 0.75;
            sims.push(calculatePoint(w25));
        }
    }

    // 3. Random Simulations
    // Subtract already generated points from budget
    const remainingSims = Math.max(0, numSimulations - sims.length);

    for (let s = 0; s < remainingSims; s++) {
        // Generate random weights
        let rawWeights = assets.map(() => Math.random());
        const sumRaw = rawWeights.reduce((a, b) => a + b, 0);
        const weights = rawWeights.map(w => w / sumRaw);

        sims.push(calculatePoint(weights));
    }

    // Find Optimal Points
    let maxSharpe = sims[0];
    let minVol = sims[0];

    for (const p of sims) {
        if (p.sharpeRatio > maxSharpe.sharpeRatio) maxSharpe = p;
        if (p.volatility < minVol.volatility) minVol = p;
    }

    return {
        simulations: sims,
        maxSharpe,
        minVol
    };
}
