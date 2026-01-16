"use client";

import { useState, useEffect } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { calculateBlackScholes, BlackScholesInputs } from "@/lib/finance/blackScholes";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from "@/lib/utils";

export function BlackScholesCalculator() {
    const [inputs, setInputs] = useState<BlackScholesInputs>({
        S: 100,
        K: 100,
        T: 1,
        r: 0.05,
        sigma: 0.2
    });

    const [callOutput, setCallOutput] = useState(calculateBlackScholes(inputs, 'call'));
    const [putOutput, setPutOutput] = useState(calculateBlackScholes(inputs, 'put'));

    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        const c = calculateBlackScholes(inputs, 'call');
        const p = calculateBlackScholes(inputs, 'put');
        setCallOutput(c);
        setPutOutput(p);

        // Generate Chart Data: Price vs Spot Price (Range +/- 50%)
        const data = [];
        const minS = Math.max(1, inputs.S * 0.5);
        const maxS = inputs.S * 1.5;
        const steps = 40;
        const stepSize = (maxS - minS) / steps;

        for (let i = 0; i <= steps; i++) {
            const spot = minS + i * stepSize;
            // Keep other inputs constant
            const cVal = calculateBlackScholes({ ...inputs, S: spot }, 'call').price;
            const pVal = calculateBlackScholes({ ...inputs, S: spot }, 'put').price;
            data.push({
                spot: parseFloat(spot.toFixed(2)), // Ensure number for recharts axis domain if needed
                Call: parseFloat(cVal.toFixed(2)),
                Put: parseFloat(pVal.toFixed(2))
            });
        }
        setChartData(data);
    }, [inputs]);

    const handleInputChange = (key: keyof BlackScholesInputs, value: string) => {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            setInputs(prev => ({ ...prev, [key]: num }));
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
            {/* Controls */}
            <DashboardCard className="col-span-1 lg:col-span-4 space-y-6 h-fit">
                <h3 className="font-semibold text-lg border-b border-border/50 pb-2 text-foreground">Model Parameters</h3>
                <div className="space-y-4">
                    <InputGroup label="Spot Price ($)" value={inputs.S} onChange={v => handleInputChange('S', v)} />
                    <InputGroup label="Strike Price ($)" value={inputs.K} onChange={v => handleInputChange('K', v)} />
                    <InputGroup label="Time to Maturity (Years)" value={inputs.T} onChange={v => handleInputChange('T', v)} step="0.1" />
                    <InputGroup label="Volatility (%)" value={parseFloat((inputs.sigma * 100).toFixed(2))} onChange={v => handleInputChange('sigma', (parseFloat(v) / 100).toString())} step="1" />
                    <InputGroup label="Risk-Free Rate (%)" value={parseFloat((inputs.r * 100).toFixed(2))} onChange={v => handleInputChange('r', (parseFloat(v) / 100).toString())} step="0.5" />
                </div>
                <div className="pt-4 text-xs text-muted-foreground">
                    <p>Adjust parameters to see real-time pricing and Greek sensitivity updates.</p>
                </div>
            </DashboardCard>

            {/* Results & Chart */}
            <div className="col-span-1 lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PriceCard type="Call" price={callOutput.price} greeks={callOutput.greeks} color="text-primary" />
                    <PriceCard type="Put" price={putOutput.price} greeks={putOutput.greeks} color="text-secondary" />
                </div>

                <DashboardCard className="h-[450px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm text-foreground">Option Price vs Spot Price</h3>
                        <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Call</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary" /> Put</span>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="var(--border)" />
                                <XAxis
                                    dataKey="spot"
                                    stroke="var(--muted-foreground)"
                                    fontSize={12}
                                    tickFormatter={(val) => `$${val}`}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="var(--muted-foreground)"
                                    fontSize={12}
                                    tickFormatter={(val) => `$${val}`}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                    labelStyle={{ color: 'var(--muted-foreground)' }}
                                    formatter={(value: any) => [`$${value}`, 'Price']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Call"
                                    stroke="var(--primary)"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, fill: "var(--primary)" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Put"
                                    stroke="var(--secondary)"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, fill: "var(--secondary)" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
}

function InputGroup({ label, value, onChange, step = "any" }: { label: string, value: number, onChange: (v: string) => void, step?: string }) {
    return (
        <div className="flex flex-col gap-1.5 group">
            <label className="text-sm text-muted-foreground font-medium group-focus-within:text-primary transition-colors">{label}</label>
            <input
                type="number"
                value={value}
                onChange={e => onChange(e.target.value)}
                step={step}
                className="bg-secondary/10 border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-secondary/20 transition-all font-mono"
            />
        </div>
    );
}

function PriceCard({ type, price, greeks, color }: { type: string, price: number, greeks: any, color: string }) {
    return (
        <DashboardCard className="relative overflow-hidden group border-t-4 border-t-transparent hover:border-t-current" style={{ color: type === 'Call' ? 'var(--primary)' : 'var(--secondary)' }}>
            <div className="relative z-10 text-foreground">
                <div className="flex justify-between items-start mb-4">
                    <h4 className={cn("text-lg font-bold flex items-center gap-2", color)}>
                        {type} Option
                    </h4>
                    <span className="text-3xl font-mono font-bold tracking-tight">${price.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 text-sm">
                    <GreekRow label="Delta" value={greeks.delta} />
                    <GreekRow label="Gamma" value={greeks.gamma} />
                    <GreekRow label="Theta" value={greeks.theta} />
                    <GreekRow label="Vega" value={greeks.vega} />
                    <GreekRow label="Rho" value={greeks.rho} />
                </div>
            </div>
            <div className={cn("absolute -right-10 -bottom-10 w-40 h-40 rounded-full opacity-5 blur-3xl transition-opacity group-hover:opacity-10", type === 'Call' ? 'bg-primary' : 'bg-secondary')} />
        </DashboardCard>
    );
}

function GreekRow({ label, value }: { label: string, value: number }) {
    return (
        <div className="flex justify-between items-center border-b border-dashed border-border/50 pb-1">
            <span className="text-muted-foreground font-medium">{label}</span>
            <span className={cn("font-mono", value > 0.0001 ? "text-green-400" : value < -0.0001 ? "text-red-400" : "text-gray-500")}>
                {value.toFixed(4)}
            </span>
        </div>
    );
}
