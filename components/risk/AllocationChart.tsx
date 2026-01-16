"use client";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Asset, PortfolioPoint } from "@/lib/finance/portfolio";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface AllocationChartProps {
    point: PortfolioPoint | null;
    assets: Asset[];
    title: string;
}

export function AllocationChart({ point, assets, title }: AllocationChartProps) {
    if (!point) return null;

    const data = point.weights.map((w, i) => ({
        name: assets[i].symbol,
        value: w * 100,
        color: assets[i].color
    })).filter(d => d.value > 1); // Only show > 1% allocation

    return (
        <DashboardCard className="h-[350px] flex flex-col">
            <h3 className="font-semibold text-foreground mb-4">{title}</h3>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            formatter={(val: number | undefined) => `${val?.toFixed(1) ?? '0.0'}%`}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            iconSize={10}
                            wrapperStyle={{ fontSize: '10px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-secondary/10 p-2 rounded">
                    <span className="block text-muted-foreground">Return</span>
                    <span className="font-bold text-lg">{(point.returns * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-destructive/10 p-2 rounded">
                    <span className="block text-muted-foreground">Risk (Vol)</span>
                    <span className="font-bold text-lg">{(point.volatility * 100).toFixed(1)}%</span>
                </div>
            </div>
        </DashboardCard>
    );
}
