"use server";

import YahooFinance from 'yahoo-finance2';
import { Asset } from '@/lib/finance/portfolio';

// Yahoo Finance v3 Migration: Default export is the Class.
const yf = new YahooFinance({
    suppressNotices: ['yahooSurvey']
});

// --- Types ---
interface PortfolioDataResponse {
    assets: Asset[];
    correlations: number[][];
    error?: string;
}

// --- Helper: Calculate Stats ---
function calculateStats(history: any[]) {
    if (!history || history.length < 2) return { meanDaily: 0, stdDaily: 0, returns: [] };

    // Robust Price extraction: adjClose > close > null
    const prices = history.map(h => {
        let p = h.adjclose || h.adjClose || h.close; // Case sensitivity check + fallback
        return typeof p === 'number' ? p : null;
    }).filter((p): p is number => p !== null);

    if (prices.length < 2) return { meanDaily: 0, stdDaily: 0, returns: [] };

    const returns: number[] = [];

    for (let i = 1; i < prices.length; i++) {
        // Log returns are better for aggregation: ln(Pt / Pt-1)
        if (prices[i - 1] <= 0 || prices[i] <= 0) continue; // Prevent log(0) or log(-x)
        const ret = Math.log(prices[i] / prices[i - 1]);
        if (!isNaN(ret) && isFinite(ret)) returns.push(ret);
    }

    // Mean & Std Dev
    const n = returns.length;
    if (n < 2) return { meanDaily: 0, stdDaily: 0, returns: [] };

    const mean = returns.reduce((a, b) => a + b, 0) / n;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);

    return {
        meanDaily: mean,
        stdDaily: Math.sqrt(variance),
        returns // Return expected for covariance calculation
    };
}

// --- Helper: Correlation Matrix ---
function calculateCorrelationMatrix(returnsMap: Record<string, number[]>, symbols: string[]): number[][] {
    const n = symbols.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    // Align series (simple approach: assuming mostly aligned since we fetch same period. 
    // In prod, would need robust date alignment. We'll slice to min length)
    const lengths = symbols.map(s => returnsMap[s]?.length || 0);
    const minLen = Math.min(...lengths);

    if (minLen < 2) return matrix; // Cannot correlate

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 1;
                continue;
            }

            // Calc Correlation(A, B)
            const retsA = returnsMap[symbols[i]].slice(0, minLen);
            const retsB = returnsMap[symbols[j]].slice(0, minLen);

            const meanA = retsA.reduce((a, b) => a + b, 0) / minLen;
            const meanB = retsB.reduce((a, b) => a + b, 0) / minLen;

            let num = 0;
            let denA = 0;
            let denB = 0;

            for (let k = 0; k < minLen; k++) {
                const dA = retsA[k] - meanA;
                const dB = retsB[k] - meanB;
                num += dA * dB;
                denA += dA * dA;
                denB += dB * dB;
            }

            if (denA === 0 || denB === 0) {
                matrix[i][j] = 0; // Flat variance = undef correlation.
            } else {
                const corr = num / Math.sqrt(denA * denB);
                matrix[i][j] = corr;
            }
        }
    }
    return matrix;
}

// --- Actions ---

export async function searchAssets(query: string) {
    if (!query || query.length < 1) return [];
    try {
        const result: any = await (yf as any).search(query);
        // Filter standard quotes 
        if (!result.quotes) return [];

        return result.quotes
            .filter((q: any) => q.isYahooFinance)
            .map((q: any) => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                type: q.quoteType
            }))
            .slice(0, 10);
    } catch (e) {
        console.error("Search error:", e);
        return [];
    }
}

export async function getPortfolioData(symbols: string[]): Promise<PortfolioDataResponse> {
    if (!symbols || symbols.length === 0) return { assets: [], correlations: [] };

    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 10); // 10 Year History

        const lastError = { message: "Unknown" };
        const promises = symbols.map(async (sym) => {
            try {
                // validate: false helps with minor schema mismatches
                const history: any = await (yf as any).chart(sym, {
                    period1: startDate.toISOString().split('T')[0],
                    period2: endDate.toISOString().split('T')[0],
                    interval: '1mo'
                }, { validate: false });

                // Get Quote for Name/Color (Optional or use minimal)
                // We'll trust the chart meta or just use symbol if needed.
                // Using quoteSummary for nicer names if chart doesn't have it?
                // Chart response usually contains meta.

                if (!history.quotes || history.quotes.length < 2) {
                    lastError.message = `No quotes for ${sym}`;
                    return null;
                }

                const meta = history.meta;
                const stats = calculateStats(history.quotes);

                return {
                    symbol: sym,
                    name: meta.symbol,
                    stats,
                    history: history.quotes
                };
            } catch (err: any) {
                console.error(`Failed to fetch ${sym}`, err);
                lastError.message = err.message || JSON.stringify(err);
                return null;
            }
        });

        const results = (await Promise.all(promises)).filter(r => r !== null) as any[];

        if (results.length === 0) throw new Error(`No data found. Details: ${lastError.message}`);

        // Build Asset Objects
        const assets: Asset[] = results.map((r, idx) => {
            // Random-ish vivid color based on string hash or index
            const colors = ["#F7931A", "#627EEA", "#00A4EF", "#EA4335", "#A3AAAE", "#FFD700", "#FF00FF", "#00FF00", "#00FFFF", "#FFFF00"];

            return {
                symbol: r.symbol,
                name: r.symbol, // Simplify name 
                meanReturn: r.stats.meanDaily * 12, // Annualize Monthly -> Yearly (* 12)
                volatility: r.stats.stdDaily * Math.sqrt(12), // Annualize Monthly Std -> Yearly (* sqrt(12))
                color: colors[idx % colors.length]
            };
        });

        // Build Correlation Matrix
        const returnsMap: Record<string, number[]> = {};
        results.forEach(r => {
            returnsMap[r.symbol] = r.stats.returns;
        });

        const correlations = calculateCorrelationMatrix(returnsMap, results.map(r => r.symbol));

        return { assets, correlations };

    } catch (e: any) {
        console.error("Portfolio Data Error:", e);
        return { assets: [], correlations: [], error: e.message };
    }
}

export async function getSentimentData(symbol: string) {
    if (!symbol) return null;
    try {
        const [summary, quote] = await Promise.all([
            (yf as any).quoteSummary(symbol, {
                modules: ["recommendationTrend", "indexTrend", "upgradeDowngradeHistory", "financialData", "defaultKeyStatistics", "price", "summaryDetail"]
            }).catch((e: any) => {
                console.error(`QuoteSummary Error for ${symbol}:`, e.message);
                return {};
            }),
            (yf as any).quote(symbol).catch((e: any) => {
                console.error(`Quote Error for ${symbol}:`, e.message);
                return {};
            })
        ]);

        // Merge Quote into Summary if missing
        const result = { ...summary };

        // 1. Fallback for Price
        if (!result.price) result.price = {};
        if (!result.price.regularMarketPrice && quote.regularMarketPrice) {
            result.price.regularMarketPrice = { raw: quote.regularMarketPrice, fmt: quote.regularMarketPrice.toFixed(2) };
        }
        if (!result.financialData) result.financialData = {};
        if (!result.financialData.currentPrice && quote.regularMarketPrice) {
            result.financialData.currentPrice = { raw: quote.regularMarketPrice, fmt: quote.regularMarketPrice.toFixed(2) };
        }

        // 2. Fallback for Mean Score (Synthetic Calculation)
        if (!result.financialData.recommendationMean && result.recommendationTrend?.trend?.[0]) {
            const t = result.recommendationTrend.trend[0];
            const total = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell;
            if (total > 0) {
                const score = ((t.strongBuy * 1) + (t.buy * 2) + (t.hold * 3) + (t.sell * 4) + (t.strongSell * 5)) / total;
                result.financialData.recommendationMean = { raw: score, fmt: score.toFixed(1) };
            }
        }

        // 3. Fallback for Target Price
        if (!result.financialData.targetMeanPrice && quote.targetMeanPrice) {
            result.financialData.targetMeanPrice = { raw: quote.targetMeanPrice, fmt: quote.targetMeanPrice.toFixed(2) };
        }

        return result;
    } catch (e: any) {
        console.error(`Sentiment Fetch Error for ${symbol}:`, e);
        return { error: e.message || "Failed to fetch sentiment data" };
    }
}
