"use client";

import { useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { getSentimentData } from "@/app/actions/finance";
import { Search, TrendingUp, TrendingDown, Minus, Target, ArrowUp, ArrowDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export default function SentimentPage() {
    const [symbol, setSymbol] = useState("AAPL");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!symbol) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getSentimentData(symbol);
            if (res.error) {
                setError(res.error);
                setData(null);
            } else {
                setData(res);
            }
        } catch (err) {
            setError("Failed to load sentiment data");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Safely get raw value (handles object with .raw or direct value)
    const getRaw = (val: any) => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'object' && 'raw' in val) return val.raw;
        return val;
    };

    // Helper: Safely get formatted value (handles object with .fmt or formats direct number)
    const getFmt = (val: any, decimals = 2, prefix = "") => {
        if (val === null || val === undefined) return "N/A";
        if (typeof val === 'object' && 'fmt' in val) return val.fmt;
        if (typeof val === 'object' && 'raw' in val) return prefix + val.raw.toFixed(decimals);
        if (typeof val === 'number') return prefix + val.toFixed(decimals);
        return "N/A";
    };

    // Helper: Analyst Consensus Color
    const getConsensusColor = (score: number) => {
        // 1 = Strong Buy, 5 = Sell
        if (score <= 1.5) return "text-green-400"; // Strong Buy
        if (score <= 2.5) return "text-emerald-400"; // Buy
        if (score <= 3.5) return "text-yellow-400"; // Hold
        if (score <= 4.5) return "text-orange-400"; // Sell
        return "text-red-400"; // Strong Sell
    };

    const getConsensusText = (score: number) => {
        if (score <= 1.5) return "Strong Buy";
        if (score <= 2.5) return "Buy";
        if (score <= 3.5) return "Hold";
        if (score <= 4.5) return "Sell";
        return "Strong Sell";
    };

    return (
        <div className="space-y-8 pb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Market Sentiment Analysis
                </h1>
                <p className="text-muted-foreground mt-2 max-w-3xl">
                    Analyze institutional sentiment, analyst ratings, and upgrade/downgrade trends to gauge market mood.
                </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-4 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Enter Symbol (e.g. AAPL, TSLA)"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        className="w-full pl-9 h-10 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? "Analyzing..." : "Analyze"}
                </button>
            </form>

            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                    {error}
                </div>
            )}

            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* 1. Consensus Card */}
                    <DashboardCard className="col-span-1">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Target size={18} /> Analyst Consensus
                        </h3>
                        <div className="flex flex-col items-center justify-center py-6 space-y-2">
                            {/* Recommendation Mean */}
                            <div className={`text-4xl font-bold ${getConsensusColor(
                                getRaw(data.financialData?.recommendationMean) || 3
                            )}`}>
                                {getConsensusText(
                                    getRaw(data.financialData?.recommendationMean) || 3
                                )}
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Mean Score: {getFmt(data.financialData?.recommendationMean, 1)}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-8 text-center w-full px-8">
                                <div>
                                    <div className="text-xs text-muted-foreground">Target Price</div>
                                    <div className="text-xl font-mono text-cyan-400">
                                        {getFmt(data.financialData?.targetMeanPrice || data.financialData?.targetMedianPrice, 2, "$")}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Current Price</div>
                                    <div className="text-xl font-mono text-foreground">
                                        {getFmt(data.price?.regularMarketPrice || data.financialData?.currentPrice, 2, "$")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DashboardCard>

                    {/* 2. Recommendation Trend Chart */}
                    {data.recommendationTrend?.trend && data.recommendationTrend.trend.length > 0 && (
                        <DashboardCard className="col-span-1 lg:col-span-2">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <TrendingUp size={18} /> Recommendation Distribution
                            </h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.recommendationTrend.trend.slice(0, 4)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" vertical={false} />
                                        <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                            cursor={{ fill: 'var(--muted-foreground)', opacity: 0.1 }}
                                        />
                                        <Bar dataKey="strongBuy" name="Strong Buy" stackId="a" fill="#4ade80" />
                                        <Bar dataKey="buy" name="Buy" stackId="a" fill="#10b981" />
                                        <Bar dataKey="hold" name="Hold" stackId="a" fill="#facc15" />
                                        <Bar dataKey="sell" name="Sell" stackId="a" fill="#fb923c" />
                                        <Bar dataKey="strongSell" name="Strong Sell" stackId="a" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </DashboardCard>
                    )}

                    {/* 3. Upgrade/Downgrade List */}
                    {data.upgradeDowngradeHistory && data.upgradeDowngradeHistory.history && (
                        <DashboardCard className="col-span-1 lg:col-span-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <TrendingDown size={18} /> Recent Analyst Actions
                                </h3>
                                <div className="flex gap-3 text-xs text-muted-foreground mr-2">
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Upgrade</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>Downgrade</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Neutral</div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground bg-muted/20 uppercase">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Date</th>
                                            <th className="px-4 py-3">Firm</th>
                                            <th className="px-4 py-3">Action</th>
                                            <th className="px-4 py-3">From</th>
                                            <th className="px-4 py-3 rounded-r-lg">To</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {data.upgradeDowngradeHistory.history.slice(0, 10).map((item: any, i: number) => {
                                            // Date Fix: Check if Scale is Seconds or Milliseconds
                                            let dateVal = item.epochGradeDate;
                                            if (dateVal && dateVal < 100000000000) {
                                                dateVal = dateVal * 1000;
                                            }

                                            // Action Formatter
                                            let actionText = item.action;
                                            if (item.action === 'main') actionText = 'Maintained';
                                            else if (item.action === 'reit') actionText = 'Reiterated';
                                            else if (item.action === 'init') actionText = 'Initiated';
                                            else if (item.action === 'up') actionText = 'Upgrade';
                                            else if (item.action === 'down') actionText = 'Downgrade';
                                            // Capitalize others
                                            else if (actionText) actionText = actionText.charAt(0).toUpperCase() + actionText.slice(1);

                                            return (
                                                <tr key={i} className="hover:bg-muted/10 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-muted-foreground">
                                                        {new Date(dateVal).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{item.firm}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                            ${item.action === 'up' ? 'bg-green-500/10 text-green-400' :
                                                                item.action === 'down' ? 'bg-red-500/10 text-red-400' :
                                                                    'bg-blue-500/10 text-blue-400'}`}>
                                                            {item.action === 'up' ? <ArrowUp size={12} className="mr-1" /> : item.action === 'down' ? <ArrowDown size={12} className="mr-1" /> : <Minus size={12} className="mr-1" />}
                                                            {actionText}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">{item.fromGrade || "-"}</td>
                                                    <td className="px-4 py-3 font-semibold">{item.toGrade}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </DashboardCard>
                    )}
                </div>
            )}
        </div>
    );
}
