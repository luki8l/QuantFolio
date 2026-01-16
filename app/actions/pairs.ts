"use server";

import YahooFinance from 'yahoo-finance2';
import { analyzePairs, PairsAnalysisResult } from '@/lib/finance/pairs';

// Shared instance (assuming configured correctly in other files)
const yf = new YahooFinance({
    suppressNotices: ['yahooSurvey']
});

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
        const analysis = analyzePairs(alignedA, alignedB);

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
