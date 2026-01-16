export interface SimulationInputs {
    initialPrice: number;
    expectedReturn: number; // Drift (mu), annual percent (e.g. 0.08)
    volatility: number;     // Sigma, annual percent (e.g. 0.20)
    timeHorizon: number;    // Years
    timeSteps: number;      // Number of steps (e.g. 252 for daily over 1 year)
    numSimulations: number; // Number of paths (e.g. 1000)
}

export interface SimulationResult {
    paths: { x: number; y: number }[][]; // [SimulationIndex][TimeStep]
    finalPrices: number[];
    stats: {
        mean: number;
        median: number;
        min: number;
        max: number;
        var95: number; // Value at Risk 95%
        var99: number; // Value at Risk 99%
    };
}

// Standard Normal Variate (Box-Muller transform)
function randn_bm(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runMonteCarloSimulation(inputs: SimulationInputs): SimulationResult {
    const { initialPrice, expectedReturn, volatility, timeHorizon, timeSteps, numSimulations } = inputs;

    const dt = timeHorizon / timeSteps;
    const paths: { x: number; y: number }[][] = [];
    const finalPrices: number[] = [];

    // Pre-calculate constants
    const drift = (expectedReturn - 0.5 * volatility * volatility) * dt;
    const volSqDt = volatility * Math.sqrt(dt);

    for (let i = 0; i < numSimulations; i++) {
        const path: { x: number; y: number }[] = [];
        let currentPrice = initialPrice;

        // Initial point
        path.push({ x: 0, y: currentPrice });

        for (let t = 1; t <= timeSteps; t++) {
            const shock = randn_bm();
            // Geometric Brownian Motion: S_t = S_{t-1} * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
            currentPrice = currentPrice * Math.exp(drift + volSqDt * shock);

            // Optimization: Only store points if we need fairly smooth charts, 
            // can reduce resolution for display if steps are huge, but for now we keep all.
            path.push({ x: t, y: currentPrice });
        }

        paths.push(path);
        finalPrices.push(currentPrice);
    }

    // Calculate Statistics
    finalPrices.sort((a, b) => a - b);
    const mean = finalPrices.reduce((a, b) => a + b, 0) / numSimulations;
    const median = finalPrices[Math.floor(numSimulations / 2)];
    const min = finalPrices[0];
    const max = finalPrices[numSimulations - 1];

    // VaR Calculation (Loss relative to expected growth or initial? Usually initial for portfolio, but here illustrative)
    // 5% quantile for VaR 95%
    const index95 = Math.floor(numSimulations * 0.05);
    const price95 = finalPrices[index95];
    const var95 = initialPrice - price95; // Potential loss

    const index99 = Math.floor(numSimulations * 0.01);
    const price99 = finalPrices[index99];
    const var99 = initialPrice - price99;

    return {
        paths,
        finalPrices,
        stats: {
            mean,
            median,
            min,
            max,
            var95: Math.max(0, var95),
            var99: Math.max(0, var99)
        }
    };
}
