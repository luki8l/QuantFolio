"use client";

import React, { useMemo, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { AlertTriangle, TrendingUp, Calendar, Scale, ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { ArbitrageResult, ArbitrageOpportunity, ArbitrageType, getSeverityColor, getArbitrageLabel } from "@/lib/finance/arbitrage";

interface ArbitrageScannerProps {
    result: ArbitrageResult | null;
    isLoading?: boolean;
}

type SeverityFilter = 'all' | 'high' | 'medium' | 'low';
type TypeFilter = 'all' | ArbitrageType;

export function ArbitrageScanner({ result, isLoading }: ArbitrageScannerProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [showAll, setShowAll] = useState(false);

    // Filter opportunities
    const filteredOpportunities = useMemo(() => {
        if (!result) return [];

        return result.opportunities.filter(opp => {
            if (severityFilter !== 'all' && opp.severity !== severityFilter) return false;
            if (typeFilter !== 'all' && opp.type !== typeFilter) return false;
            return true;
        });
    }, [result, severityFilter, typeFilter]);

    const displayedOpportunities = showAll
        ? filteredOpportunities
        : filteredOpportunities.slice(0, 50);

    if (isLoading) {
        return (
            <DashboardCard className="space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <AlertTriangle size={14} className="text-yellow-500" />
                    Arbitrage Scanner
                </h3>
                <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-secondary/50 rounded" />
                    ))}
                </div>
            </DashboardCard>
        );
    }

    if (!result || result.opportunities.length === 0) {
        return (
            <DashboardCard className="space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <AlertTriangle size={14} className="text-green-500" />
                    Arbitrage Scanner
                </h3>
                <div className="text-center py-6 text-muted-foreground text-sm">
                    <div className="text-2xl mb-2">✓</div>
                    No arbitrage opportunities detected
                </div>
            </DashboardCard>
        );
    }

    const getIcon = (type: string): React.ReactNode => {
        switch (type) {
            case 'butterfly': return <span className="text-sm">🦋</span>;
            case 'calendar': return <Calendar size={14} className="text-purple-400" />;
            case 'put_call': return <Scale size={14} className="text-blue-400" />;
            default: return <TrendingUp size={14} />;
        }
    };

    const hasActiveFilters = severityFilter !== 'all' || typeFilter !== 'all';

    return (
        <DashboardCard className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <AlertTriangle size={14} className="text-yellow-500" />
                    Arbitrage Scanner
                </h3>
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                    {filteredOpportunities.length}/{result.totalCount}
                </span>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex flex-wrap gap-1">
                <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${typeFilter === 'all'
                            ? 'bg-primary/20 border-primary/50 text-primary'
                            : 'bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => setTypeFilter('butterfly')}
                    className={`px-2 py-1 text-[10px] rounded-full border transition-colors flex items-center gap-1 ${typeFilter === 'butterfly'
                            ? 'bg-primary/20 border-primary/50 text-primary'
                            : 'bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    🦋 Butterfly ({result.butterflyCount})
                </button>
                <button
                    onClick={() => setTypeFilter('calendar')}
                    className={`px-2 py-1 text-[10px] rounded-full border transition-colors flex items-center gap-1 ${typeFilter === 'calendar'
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                            : 'bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    📅 Calendar ({result.calendarCount})
                </button>
                <button
                    onClick={() => setTypeFilter('put_call')}
                    className={`px-2 py-1 text-[10px] rounded-full border transition-colors flex items-center gap-1 ${typeFilter === 'put_call'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    ⚖️ Put-Call ({result.putCallCount})
                </button>
            </div>

            {/* Severity Filter */}
            <div className="flex gap-1 items-center">
                <Filter size={10} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mr-1">Severity:</span>
                {(['all', 'high', 'medium', 'low'] as SeverityFilter[]).map(sev => (
                    <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={`px-2 py-0.5 text-[10px] rounded transition-colors ${severityFilter === sev
                                ? sev === 'all' ? 'bg-primary/20 text-primary'
                                    : sev === 'high' ? 'bg-red-500/20 text-red-400'
                                        : sev === 'medium' ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </button>
                ))}
                {hasActiveFilters && (
                    <button
                        onClick={() => { setSeverityFilter('all'); setTypeFilter('all'); }}
                        className="ml-1 p-0.5 text-muted-foreground hover:text-foreground"
                        title="Clear filters"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Opportunities List */}
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
                {displayedOpportunities.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                        No opportunities match current filters
                    </div>
                ) : (
                    displayedOpportunities.map((opp, index) => (
                        <div
                            key={index}
                            className="border border-border/50 rounded-lg overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-2 hover:bg-secondary/30 transition-colors text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${opp.severity === 'high' ? 'bg-red-500' :
                                            opp.severity === 'medium' ? 'bg-yellow-500' : 'bg-cyan-500'
                                        }`} />
                                    {getIcon(opp.type)}
                                    <span className="text-[10px] font-medium">
                                        {getArbitrageLabel(opp.type).label}
                                    </span>
                                    {opp.details.strikes && (
                                        <span className="text-[9px] text-muted-foreground font-mono">
                                            ${opp.details.strikes[0]}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {opp.details.ivDiff && (
                                        <span className={`text-[9px] font-mono ${getSeverityColor(opp.severity)}`}>
                                            {(opp.details.ivDiff * 100).toFixed(1)}%
                                        </span>
                                    )}
                                    {expandedIndex === index ? (
                                        <ChevronUp size={12} className="text-muted-foreground" />
                                    ) : (
                                        <ChevronDown size={12} className="text-muted-foreground" />
                                    )}
                                </div>
                            </button>

                            {expandedIndex === index && (
                                <div className="px-3 pb-3 pt-1 bg-secondary/10 border-t border-border/30">
                                    <p className="text-[10px] text-muted-foreground mb-2">
                                        {opp.description}
                                    </p>

                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        {opp.details.strikes && (
                                            <div>
                                                <span className="text-muted-foreground">Strikes: </span>
                                                <span className="font-mono">
                                                    {opp.details.strikes.map(s => `$${s}`).join(', ')}
                                                </span>
                                            </div>
                                        )}

                                        {opp.details.expiries && (
                                            <div>
                                                <span className="text-muted-foreground">Expiry: </span>
                                                <span className="font-mono">
                                                    {opp.details.expiries[0]}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Trade Legs */}
                                    <div className="mt-2 pt-2 border-t border-border/30">
                                        <div className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wider">
                                            Trade Structure:
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                            {opp.legs.map((leg, li) => (
                                                <div key={li} className="text-[10px] flex items-center gap-1">
                                                    <span className={`font-mono font-bold ${leg.action === 'buy' ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                        {leg.action === 'buy' ? '+1' : '-1'}
                                                    </span>
                                                    <span className="uppercase text-muted-foreground">{leg.optionType[0]}</span>
                                                    <span className="font-mono">${leg.strike}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Show More / Less */}
            {filteredOpportunities.length > 50 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full text-center text-xs text-primary hover:text-primary/80 py-1"
                >
                    {showAll
                        ? `Show less (viewing ${filteredOpportunities.length})`
                        : `Show all ${filteredOpportunities.length} opportunities`
                    }
                </button>
            )}

            <p className="text-[9px] text-muted-foreground/50 text-center">
                ⚠️ Educational purposes only
            </p>
        </DashboardCard>
    );
}
