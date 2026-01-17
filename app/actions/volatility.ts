"use server";

import YahooFinance from 'yahoo-finance2';
import {
    calculateImpliedVolatility,
    calculateBlackScholes,
    calculateMoneyness,
    daysToYears,
    SurfacePoint,
    VolatilitySurfaceData
} from '@/lib/finance/blackScholes';

const yf = new YahooFinance({
    suppressNotices: ['yahooSurvey']
});

// Current risk-free rate approximation (10-year Treasury)
const RISK_FREE_RATE = 0.045; // 4.5%

export interface VolatilitySurfaceResponse {
    symbol: string;
    spotPrice: number;
    riskFreeRate: number;
    timestamp: string;
    points: SurfacePoint[];
    expiryDates: string[];
    strikes: number[];
    stats: {
        atmIV: number | null;
        ivRange: { min: number; max: number };
        skewIndex: number | null;
        termSlope: number | null;
    };
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((date2.getTime() - date1.getTime()) / oneDay);
}

/**
 * Fetch options chain and calculate volatility surface
 */
export async function getVolatilitySurface(
    symbol: string
): Promise<VolatilitySurfaceResponse | { error: string }> {
    try {
        // Fetch quote for spot price
        const quote = await yf.quote(symbol);
        if (!quote || !quote.regularMarketPrice) {
            return { error: `Could not fetch quote for ${symbol}` };
        }

        const spotPrice = quote.regularMarketPrice;
        const now = new Date();

        // Fetch options chain
        const options = await yf.options(symbol);
        if (!options || !options.expirationDates || options.expirationDates.length === 0) {
            return { error: `No options data available for ${symbol}` };
        }

        const points: SurfacePoint[] = [];
        const allStrikes = new Set<number>();
        const allExpiries: string[] = [];

        // Process up to 12 expiration dates for better surface coverage
        const expirationsToProcess = options.expirationDates.slice(0, 12);

        for (const expiryDate of expirationsToProcess) {
            try {
                const chain = await yf.options(symbol, { date: expiryDate });
                if (!chain.options || chain.options.length === 0) continue;

                const optionsData = chain.options[0];
                const calls = optionsData.calls || [];
                const puts = optionsData.puts || [];

                const expiry = new Date(expiryDate);
                const expiryStr = expiry.toISOString().split('T')[0];
                const daysExp = daysBetween(now, expiry);

                if (daysExp <= 0) continue; // Skip expired

                allExpiries.push(expiryStr);
                const T = daysToYears(daysExp);

                // Create a map of puts by strike for matching
                const putMap = new Map<number, typeof puts[0]>();
                puts.forEach(p => {
                    if (p.strike) putMap.set(p.strike, p);
                });

                // Process each call and match with put
                for (const call of calls) {
                    if (!call.strike || !call.lastPrice) continue;

                    const K = call.strike;
                    allStrikes.add(K);

                    const put = putMap.get(K);
                    const callPrice = call.lastPrice || 0;
                    const putPrice = put?.lastPrice || 0;

                    // Calculate IV for call
                    let callIV: number | null = null;
                    let callDelta: number | null = null;
                    let gamma: number | null = null;
                    let vega: number | null = null;

                    if (callPrice > 0) {
                        const ivResult = calculateImpliedVolatility({
                            optionPrice: callPrice,
                            S: spotPrice,
                            K,
                            T,
                            r: RISK_FREE_RATE,
                            type: 'call'
                        });

                        if (ivResult.converged && ivResult.iv > 0.01 && ivResult.iv < 3.0) {
                            callIV = ivResult.iv;

                            // Calculate Greeks at this IV
                            const greeksResult = calculateBlackScholes(
                                { S: spotPrice, K, T, r: RISK_FREE_RATE, sigma: callIV },
                                'call'
                            );
                            callDelta = greeksResult.greeks.delta;
                            gamma = greeksResult.greeks.gamma;
                            vega = greeksResult.greeks.vega;
                        }
                    }

                    // Calculate IV for put
                    let putIV: number | null = null;
                    let putDelta: number | null = null;

                    if (putPrice > 0) {
                        const ivResult = calculateImpliedVolatility({
                            optionPrice: putPrice,
                            S: spotPrice,
                            K,
                            T,
                            r: RISK_FREE_RATE,
                            type: 'put'
                        });

                        if (ivResult.converged && ivResult.iv > 0.01 && ivResult.iv < 3.0) {
                            putIV = ivResult.iv;

                            const greeksResult = calculateBlackScholes(
                                { S: spotPrice, K, T, r: RISK_FREE_RATE, sigma: putIV },
                                'put'
                            );
                            putDelta = greeksResult.greeks.delta;

                            // Use put Greeks if call Greeks not available
                            if (gamma === null) gamma = greeksResult.greeks.gamma;
                            if (vega === null) vega = greeksResult.greeks.vega;
                        }
                    }

                    // Only add if we have at least one valid IV
                    if (callIV !== null || putIV !== null) {
                        points.push({
                            strike: K,
                            expiry: expiryStr,
                            daysToExpiry: daysExp,
                            moneyness: calculateMoneyness(spotPrice, K),
                            callIV,
                            putIV,
                            callPrice,
                            putPrice,
                            callBid: call.bid || 0,
                            callAsk: call.ask || 0,
                            putBid: put?.bid || 0,
                            putAsk: put?.ask || 0,
                            callVolume: call.volume || 0,
                            putVolume: put?.volume || 0,
                            callOI: call.openInterest || 0,
                            putOI: put?.openInterest || 0,
                            callDelta,
                            putDelta,
                            gamma,
                            vega
                        });
                    }
                }
            } catch (e) {
                console.error(`Error processing expiry ${expiryDate}:`, e);
                continue;
            }
        }

        if (points.length === 0) {
            return { error: 'No valid IV data could be calculated' };
        }

        // Calculate surface statistics
        const validIVs = points
            .flatMap(p => [p.callIV, p.putIV])
            .filter((iv): iv is number => iv !== null);

        const ivRange = {
            min: Math.min(...validIVs),
            max: Math.max(...validIVs)
        };

        // ATM IV - closest to spot price with shortest expiry
        const sortedByExpiry = [...points].sort((a, b) => a.daysToExpiry - b.daysToExpiry);
        const shortestExpiry = sortedByExpiry.filter(p => p.daysToExpiry === sortedByExpiry[0]?.daysToExpiry);
        const atmPoint = shortestExpiry
            .sort((a, b) => Math.abs(a.moneyness) - Math.abs(b.moneyness))[0];
        const atmIV = atmPoint?.callIV ?? atmPoint?.putIV ?? null;

        // Skew index (25 delta put IV - 25 delta call IV) for shortest expiry
        // Simplified: compare OTM put IV vs OTM call IV
        let skewIndex: number | null = null;
        if (shortestExpiry.length >= 3) {
            const otmPuts = shortestExpiry.filter(p => p.moneyness < -0.05 && p.putIV);
            const otmCalls = shortestExpiry.filter(p => p.moneyness > 0.05 && p.callIV);
            if (otmPuts.length > 0 && otmCalls.length > 0) {
                const avgPutIV = otmPuts.reduce((s, p) => s + (p.putIV || 0), 0) / otmPuts.length;
                const avgCallIV = otmCalls.reduce((s, p) => s + (p.callIV || 0), 0) / otmCalls.length;
                skewIndex = (avgPutIV - avgCallIV) * 100; // In percentage points
            }
        }

        // Term structure slope (long-dated ATM IV vs short-dated ATM IV)
        let termSlope: number | null = null;
        if (allExpiries.length >= 2) {
            const longExpiry = sortedByExpiry.filter(
                p => p.daysToExpiry === sortedByExpiry[sortedByExpiry.length - 1]?.daysToExpiry
            );
            const longAtm = longExpiry
                .sort((a, b) => Math.abs(a.moneyness) - Math.abs(b.moneyness))[0];
            const longAtmIV = longAtm?.callIV ?? longAtm?.putIV ?? null;

            if (atmIV !== null && longAtmIV !== null) {
                termSlope = (longAtmIV - atmIV) * 100; // In percentage points
            }
        }

        return {
            symbol: symbol.toUpperCase(),
            spotPrice,
            riskFreeRate: RISK_FREE_RATE,
            timestamp: now.toISOString(),
            points,
            expiryDates: [...new Set(allExpiries)].sort(),
            strikes: [...allStrikes].sort((a, b) => a - b),
            stats: {
                atmIV,
                ivRange,
                skewIndex,
                termSlope
            }
        };

    } catch (e: any) {
        console.error('Volatility Surface Error:', e);
        return { error: e.message || 'Failed to fetch volatility surface' };
    }
}

/**
 * Get list of popular symbols for options trading
 */
export async function getPopularOptionsSymbols(): Promise<string[]> {
    return [
        'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOG', 'AMD',
        'IWM', 'VIX', 'GLD', 'TLT', 'XLF', 'XLE', 'XLK', 'NFLX', 'BA', 'DIS'
    ];
}
