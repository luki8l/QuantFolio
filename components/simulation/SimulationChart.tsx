"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface SimulationChartProps {
    paths: { x: number; y: number }[][];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Extract values from payload which contains all path values at this step
        const values = payload.map((p: any) => p.value).filter((v: any) => typeof v === 'number');

        if (values.length === 0) return null;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        return (
            <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
                <p className="mb-2 font-mono text-xs text-muted-foreground">Step {label}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-secondary">Max:</span>
                    <span className="font-mono text-foreground font-bold text-right">${max.toFixed(2)}</span>

                    <span className="text-primary">Median:</span>
                    <span className="font-mono text-foreground font-bold text-right">${median.toFixed(2)}</span>

                    <span className="text-destructive">Min:</span>
                    <span className="font-mono text-foreground font-bold text-right">${min.toFixed(2)}</span>
                </div>
            </div>
        );
    }
    return null;
};

export function SimulationChart({ paths }: SimulationChartProps) {
    // To avoid rendering too many lines and crashing the browser, we limit the visible paths
    // but the calculations behind stats use all of them.
    const MAX_VISIBLE_PATHS = 50;
    const visiblePaths = paths.slice(0, MAX_VISIBLE_PATHS);

    const dataLength = visiblePaths[0]?.length || 0;
    const chartData = [];

    // Downsample X-axis for rendering performance
    // Use step size of at least 1, but larger for long datasets
    const stepSize = Math.max(1, Math.ceil(dataLength / 100));

    for (let i = 0; i < dataLength; i += stepSize) {
        const point: any = { step: visiblePaths[0][i].x };
        visiblePaths.forEach((path, idx) => {
            if (path[i]) {
                point[`path${idx}`] = path[i].y;
            }
        });
        chartData.push(point);
    }

    return (
        <DashboardCard className="h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Price Paths (First {MAX_VISIBLE_PATHS})</h3>
            </div>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                        <XAxis
                            dataKey="step"
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickFormatter={(val) => `T${val}`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickFormatter={(val) => `$${Math.round(val)}`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {visiblePaths.map((_, idx) => (
                            <Line
                                key={idx}
                                type="monotone"
                                dataKey={`path${idx}`}
                                stroke="var(--primary)"
                                strokeWidth={1}
                                strokeOpacity={0.3} // Semi-transparent for overlapping effect
                                dot={false}
                                isAnimationActive={false} // Disable animation for performance with many lines
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </DashboardCard>
    );
}
