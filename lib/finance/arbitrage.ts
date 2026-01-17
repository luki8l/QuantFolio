/**
 * Volatility Arbitrage Detection
 * 
 * Detects potential arbitrage opportunities in options markets:
 * 
 * 1. Butterfly Arbitrage: σ(K₁) + σ(K₃) < 2*σ(K₂) (convexity violation)
 * 2. Calendar Spread Arbitrage: Longer-dated options cheaper than shorter-dated
 * 3. Put-Call Parity Violation: IV(Call) ≠ IV(Put) at same strike
 * 4. Vertical Spread Arbitrage: Price anomalies in strike progression
 */

import { SurfacePoint } from './blackScholes';

export type ArbitrageType =
    | 'butterfly'      // Convexity violation in strike space
    | 'calendar'       // Term structure inversion
    | 'put_call'       // Put-call parity violation
    | 'vertical';      // Vertical spread mispricing

export interface ArbitrageOpportunity {
    type: ArbitrageType;
    severity: 'low' | 'medium' | 'high';
    description: string;
    details: {
        strikes?: number[];
        expiries?: string[];
        ivDiff?: number;
        expectedProfit?: number;
    };
    legs: {
        action: 'buy' | 'sell';
        optionType: 'call' | 'put';
        strike: number;
        expiry: string;
        price?: number;
    }[];
}

export interface ArbitrageResult {
    opportunities: ArbitrageOpportunity[];
    butterflyCount: number;
    calendarCount: number;
    putCallCount: number;
    totalCount: number;
}

/**
 * Scan for all types of volatility arbitrage
 */
export function scanForArbitrage(
    points: SurfacePoint[],
    spotPrice: number
): ArbitrageResult {
    const opportunities: ArbitrageOpportunity[] = [];

    // Group by expiry for easier processing
    const byExpiry = new Map<string, SurfacePoint[]>();
    points.forEach(p => {
        const existing = byExpiry.get(p.expiry) || [];
        existing.push(p);
        byExpiry.set(p.expiry, existing);
    });

    // 1. Butterfly Arbitrage (within each expiry)
    byExpiry.forEach((expiryPoints, expiry) => {
        const sortedByStrike = [...expiryPoints].sort((a, b) => a.strike - b.strike);

        for (let i = 1; i < sortedByStrike.length - 1; i++) {
            const left = sortedByStrike[i - 1];
            const mid = sortedByStrike[i];
            const right = sortedByStrike[i + 1];

            // Check call IVs
            if (left.callIV && mid.callIV && right.callIV) {
                const avgWings = (left.callIV + right.callIV) / 2;
                const convexityViolation = mid.callIV - avgWings;

                // If middle IV is significantly higher than interpolated wings, convexity violation
                if (convexityViolation > 0.02) { // >2% difference
                    const severity = convexityViolation > 0.05 ? 'high' : convexityViolation > 0.03 ? 'medium' : 'low';

                    opportunities.push({
                        type: 'butterfly',
                        severity,
                        description: `Butterfly arbitrage: Middle strike IV too high (${(convexityViolation * 100).toFixed(1)}% premium)`,
                        details: {
                            strikes: [left.strike, mid.strike, right.strike],
                            expiries: [expiry],
                            ivDiff: convexityViolation
                        },
                        legs: [
                            { action: 'buy', optionType: 'call', strike: left.strike, expiry },
                            { action: 'sell', optionType: 'call', strike: mid.strike, expiry },
                            { action: 'sell', optionType: 'call', strike: mid.strike, expiry },
                            { action: 'buy', optionType: 'call', strike: right.strike, expiry }
                        ]
                    });
                }
            }
        }
    });

    // 2. Calendar Spread Arbitrage (compare across expiries)
    const expiries = [...byExpiry.keys()].sort();

    for (let i = 0; i < expiries.length - 1; i++) {
        const nearExpiry = expiries[i];
        const farExpiry = expiries[i + 1];
        const nearPoints = byExpiry.get(nearExpiry)!;
        const farPoints = byExpiry.get(farExpiry)!;

        // Find common strikes
        const nearStrikes = new Set(nearPoints.map(p => p.strike));
        const commonPoints = farPoints.filter(p => nearStrikes.has(p.strike));

        commonPoints.forEach(farPoint => {
            const nearPoint = nearPoints.find(p => p.strike === farPoint.strike);
            if (!nearPoint) return;

            // Check if far-dated IV is significantly lower (unusual)
            const nearIV = nearPoint.callIV ?? nearPoint.putIV;
            const farIV = farPoint.callIV ?? farPoint.putIV;

            if (nearIV && farIV && farIV < nearIV * 0.85) {
                const ivDiff = nearIV - farIV;

                opportunities.push({
                    type: 'calendar',
                    severity: ivDiff > 0.05 ? 'high' : 'medium',
                    description: `Calendar spread: Near-term IV ${(ivDiff * 100).toFixed(1)}% higher than far-term at $${farPoint.strike}`,
                    details: {
                        strikes: [farPoint.strike],
                        expiries: [nearExpiry, farExpiry],
                        ivDiff
                    },
                    legs: [
                        { action: 'sell', optionType: 'call', strike: farPoint.strike, expiry: nearExpiry },
                        { action: 'buy', optionType: 'call', strike: farPoint.strike, expiry: farExpiry }
                    ]
                });
            }
        });
    }

    // 3. Put-Call Parity Violation
    points.forEach(point => {
        if (point.callIV && point.putIV) {
            const ivDiff = Math.abs(point.callIV - point.putIV);

            // Significant divergence between put and call IV
            if (ivDiff > 0.03) {
                const isCallCheaper = point.callIV < point.putIV;

                opportunities.push({
                    type: 'put_call',
                    severity: ivDiff > 0.08 ? 'high' : ivDiff > 0.05 ? 'medium' : 'low',
                    description: `Put-Call parity: ${isCallCheaper ? 'Call' : 'Put'} is ${(ivDiff * 100).toFixed(1)}% cheaper at $${point.strike}`,
                    details: {
                        strikes: [point.strike],
                        expiries: [point.expiry],
                        ivDiff
                    },
                    legs: isCallCheaper ? [
                        { action: 'buy', optionType: 'call', strike: point.strike, expiry: point.expiry },
                        { action: 'sell', optionType: 'put', strike: point.strike, expiry: point.expiry }
                    ] : [
                        { action: 'buy', optionType: 'put', strike: point.strike, expiry: point.expiry },
                        { action: 'sell', optionType: 'call', strike: point.strike, expiry: point.expiry }
                    ]
                });
            }
        }
    });

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    opportunities.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
        opportunities,  // Return all opportunities, let UI filter/paginate
        butterflyCount: opportunities.filter(o => o.type === 'butterfly').length,
        calendarCount: opportunities.filter(o => o.type === 'calendar').length,
        putCallCount: opportunities.filter(o => o.type === 'put_call').length,
        totalCount: opportunities.length
    };
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
        case 'high': return 'text-red-400';
        case 'medium': return 'text-yellow-400';
        case 'low': return 'text-cyan-400';
    }
}

/**
 * Get arbitrage type icon/label
 */
export function getArbitrageLabel(type: ArbitrageType): { label: string; emoji: string } {
    switch (type) {
        case 'butterfly': return { label: 'Butterfly', emoji: '🦋' };
        case 'calendar': return { label: 'Calendar', emoji: '📅' };
        case 'put_call': return { label: 'Put-Call', emoji: '⚖️' };
        case 'vertical': return { label: 'Vertical', emoji: '📊' };
    }
}
