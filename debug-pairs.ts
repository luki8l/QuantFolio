
import { analyzePairs } from './lib/finance/pairs';

// Mock data generation
const dates = Array.from({ length: 200 }, (_, i) => new Date(2023, 0, i + 1).toISOString().split('T')[0]);
// Create a perfect mean reverting pair
// PriceA = 100 + noise
// PriceB = 50 + noise
// Beta approx 2? Log prices..
// LogA = ln(100) = 4.605
// LogB = ln(50) = 3.912
// Let's just generate prices.
const pricesA = dates.map((_, i) => 100 + Math.sin(i / 10) * 5 + (Math.random() - 0.5));
const pricesB = dates.map((_, i) => 50 + Math.sin(i / 10) * 2.5 + (Math.random() - 0.5));
// They move together perfectly roughly.

// To show the bug, we need prices to drift significantly in level, while maintaining correlation.
const trend = dates.map((_, i) => i * 0.5); // Prices go up by 100 over 200 days
const pricesA_trending = pricesA.map((p, i) => p + trend[i]);
const pricesB_trending = pricesB.map((p, i) => p + trend[i] * 0.5); // B moves half as fast? No, spread rel.

const result = analyzePairs(pricesA_trending, pricesB_trending, dates);
console.log("Trades:", result.backtest.trades);
console.log("Total Return:", result.backtest.totalReturn);
console.log("First Trade PnL:", result.backtest.history[0]);
console.log("Last Trade PnL:", result.backtest.history[result.backtest.history.length - 1]);
// We expect share sizes to be weird if calculated at t=0 but trade is at t=190 where price is double.
