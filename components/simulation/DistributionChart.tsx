"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface DistributionChartProps {
    finalPrices: number[];
}

export function DistributionChart({ finalPrices }: DistributionChartProps) {
    // Create Histogram Bins
    const binCount = 20;
    const min = Math.min(...finalPrices);
    const max = Math.max(...finalPrices);
    const step = (max - min) / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => ({
        rangeStart: min + i * step,
        rangeEnd: min + (i + 1) * step,
        label: `$${(min + i * step).toFixed(0)}`,
        count: 0
    }));

    finalPrices.forEach(p => {
        const binIndex = Math.min(Math.floor((p - min) / step), binCount - 1);
        if (bins[binIndex]) bins[binIndex].count++;
    });

    return (
        <DashboardCard className="h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Terminal Price Distribution</h3>
            </div>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bins} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                        <XAxis
                            dataKey="label"
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            itemStyle={{ color: 'var(--secondary)' }}
                            labelStyle={{ color: 'var(--muted-foreground)' }}
                            formatter={(val: any) => [val, 'Frequency']}
                        />
                        <Bar dataKey="count" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </DashboardCard>
    );
}
