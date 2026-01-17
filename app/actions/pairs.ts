"use server";

import YahooFinance from 'yahoo-finance2';

import { analyzePairs, analyzeBasket, PairsAnalysisResult, BasketAnalysisResult } from '@/lib/finance/pairs';

// Shared instance (assuming configured correctly in other files)
const yf = new YahooFinance({
    suppressNotices: ['yahooSurvey']
});

export interface ScannerResult {
    symbolA: string;
    symbolB: string;
    isCointegrated: boolean;
    halfLife: number;
    currentZScore: number;
    hedgeRatio: number;
}

export interface PairsDataResponse {
    symbolA: string;
    symbolB: string;
    dates: string[];
    pricesA: number[];
    pricesB: number[];
    analysis: PairsAnalysisResult;
    error?: string;
}

export interface BasketDataResponse {
    symbols: string[];
    dates: string[];
    prices: Record<string, number[]>;
    analysis: BasketAnalysisResult;
    error?: string;
}

export async function getPairsData(symbolA: string, symbolB: string): Promise<PairsDataResponse | { error: string }> {
    if (!symbolA || !symbolB) return { error: "Missing symbols" };

    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2); // 2 Years History

        // Parallel Fetch
        const [histA, histB] = await Promise.all([
            yf.chart(symbolA, { period1: startDate.toISOString().split('T')[0], interval: '1d' }),
            yf.chart(symbolB, { period1: startDate.toISOString().split('T')[0], interval: '1d' })
        ]);

        if (!histA?.quotes || !histB?.quotes) return { error: "Failed to fetch history" };

        // Data Alignment (Inner Join on Date)
        // Create Map for B
        const mapB = new Map<string, number>();
        histB.quotes.forEach((q: any) => {
            if (q.date && (q.adjclose || q.close)) {
                // Formatting date to YYYY-MM-DD for key
                const dateKeys = new Date(q.date).toISOString().split('T')[0];
                mapB.set(dateKeys, q.adjclose || q.close);
            }
        });

        const alignedDates: string[] = [];
        const alignedA: number[] = [];
        const alignedB: number[] = [];

        histA.quotes.forEach((q: any) => {
            if (q.date && (q.adjclose || q.close)) {
                const dateKey = new Date(q.date).toISOString().split('T')[0];
                const priceB = mapB.get(dateKey);

                if (priceB !== undefined) {
                    alignedDates.push(dateKey);
                    alignedA.push(q.adjclose || q.close);
                    alignedB.push(priceB);
                }
            }
        });

        if (alignedA.length < 100) return { error: "Insufficient overlapping data (need > 100 days)" };

        // Analyze
        const analysis = analyzePairs(alignedA, alignedB, alignedDates);

        return {
            symbolA: symbolA.toUpperCase(),
            symbolB: symbolB.toUpperCase(),
            dates: alignedDates,
            pricesA: alignedA,
            pricesB: alignedB,
            analysis
        };

    } catch (e: any) {
        console.error("Pairs Data Error:", e);
        return { error: e.message || "Failed to analyze pairs" };
    }
}

export async function getScannerResults(groups: { name: string, symbols: string[] }[]): Promise<{ [key: string]: ScannerResult[] } | { error: string }> {
    try {
        const results: { [key: string]: ScannerResult[] } = {};

        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // 1 Year for scan (faster)

        for (const group of groups) {
            results[group.name] = [];

            // Fetch all unique symbols in group
            const uniqueSymbols = Array.from(new Set(group.symbols));
            const historyMap = new Map<string, { dates: string[], prices: number[] }>();

            // Parallel fetch all symbols in this group
            await Promise.all(uniqueSymbols.map(async (sym) => {
                try {
                    const res = await yf.chart(sym, { period1: startDate.toISOString().split('T')[0], interval: '1d' });
                    if (res?.quotes) {
                        const dates: string[] = [];
                        const prices: number[] = [];
                        res.quotes.forEach((q: any) => {
                            if (q.date && (q.adjclose || q.close)) {
                                dates.push(new Date(q.date).toISOString().split('T')[0]);
                                prices.push(q.adjclose || q.close);
                            }
                        });
                        historyMap.set(sym, { dates, prices });
                    }
                } catch (err) {
                    console.error(`Scanner fetch error for ${sym}:`, err);
                }
            }));

            // Compare all pairs (combination)
            for (let i = 0; i < uniqueSymbols.length; i++) {
                for (let j = i + 1; j < uniqueSymbols.length; j++) {
                    const symA = uniqueSymbols[i];
                    const symB = uniqueSymbols[j];
                    const dataA = historyMap.get(symA);
                    const dataB = historyMap.get(symB);

                    if (!dataA || !dataB) continue;

                    // Align
                    const mapB = new Map<string, number>();
                    dataB.dates.forEach((d, idx) => mapB.set(d, dataB.prices[idx]));

                    const alignedA: number[] = [];
                    const alignedB: number[] = [];
                    const alignedDates: string[] = [];

                    dataA.dates.forEach((d, idx) => {
                        const pB = mapB.get(d);
                        if (pB !== undefined) {
                            alignedA.push(dataA.prices[idx]);
                            alignedB.push(pB);
                            alignedDates.push(d);
                        }
                    });

                    if (alignedA.length < 100) continue;

                    const analysis = analyzePairs(alignedA, alignedB, alignedDates);
                    results[group.name].push({
                        symbolA: symA,
                        symbolB: symB,
                        isCointegrated: analysis.isCointegrated,
                        halfLife: analysis.halfLife,
                        currentZScore: analysis.currentZScore,
                        hedgeRatio: analysis.hedgeRatio
                    });
                }
            }
        }

        return results;
    } catch (e: any) {
        console.error("Scanner Error:", e);
        return { error: e.message || "Failed to scan pairs" };
    }
}

export async function getBasketData(symbols: string[]): Promise<BasketDataResponse | { error: string }> {
    if (!symbols || symbols.length < 2) return { error: "Need at least 2 symbols" };

    try {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2); // 2 Years

        // 1. Parallel Fetch
        const responses = await Promise.all(symbols.map(sym =>
            yf.chart(sym, { period1: startDate.toISOString().split('T')[0], interval: '1d' })
                .catch(e => ({ error: e, symbol: sym }))
        ));

        const historyMap = new Map<string, Map<string, number>>();
        let commonDates: Set<string> | null = null;
        let validSymbols: string[] = [];

        // 2. Process Responses & Find Intersection
        for (let i = 0; i < symbols.length; i++) {
            const res = responses[i] as any;
            if (res.error || !res.quotes) {
                console.error(`Failed to fetch ${symbols[i]}`);
                continue;
            }

            const sym = symbols[i];
            const priceMap = new Map<string, number>();
            const currentDates = new Set<string>();

            res.quotes.forEach((q: any) => {
                if (q.date && (q.adjclose || q.close)) {
                    const dateStr = new Date(q.date).toISOString().split('T')[0];
                    priceMap.set(dateStr, q.adjclose || q.close);
                    currentDates.add(dateStr);
                }
            });

            if (priceMap.size < 100) continue; // Skip if insufficient data

            historyMap.set(sym, priceMap);
            validSymbols.push(sym);


            if (commonDates === null) {
                commonDates = currentDates;
            } else {
                // Intersect
                const current = currentDates; // Capture for closure
                commonDates = new Set([...commonDates].filter((d: string) => current.has(d)));
            }

        }

        if (validSymbols.length < 2) return { error: "Not enough valid symbols with data" };
        if (!commonDates || commonDates.size < 100) return { error: "Insufficient overlapping data (< 100 days common)" };

        // 3. Align Data
        const sortedDates = Array.from(commonDates).sort();
        const alignedPrices: Record<string, number[]> = {};

        for (const sym of validSymbols) {
            alignedPrices[sym] = [];
            const map = historyMap.get(sym)!;
            for (const date of sortedDates) {
                alignedPrices[sym].push(map.get(date)!);
            }
        }

        // 4. Analyze
        const analysis = analyzeBasket(alignedPrices, sortedDates);

        return {
            symbols: validSymbols,
            dates: sortedDates,
            prices: alignedPrices,
            analysis
        };

    } catch (e: any) {
        console.error("Basket Data Error:", e);
        return { error: e.message || "Failed to analyze basket" };
    }
}

