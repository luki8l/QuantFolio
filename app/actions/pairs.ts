"use server";

import YahooFinance from 'yahoo-finance2';
import { analyzePairs, PairsAnalysisResult } from '@/lib/finance/pairs';

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
