"use client";

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { SurfacePoint } from '@/lib/finance/blackScholes';
import { generateSVISurface } from '@/lib/finance/sviFitting';

// Dynamic import for Plotly (it doesn't work well with SSR)
const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-secondary/10 rounded-lg">
            <div className="animate-pulse text-muted-foreground">Loading 3D Surface...</div>
        </div>
    )
});

interface VolatilitySurface3DProps {
    points: SurfacePoint[];
    spotPrice: number;
    showCalls: boolean;
    showPuts: boolean;
    useSVI?: boolean;
    colorScale?: 'Viridis' | 'Plasma' | 'Inferno' | 'Magma' | 'Cividis' | 'RdYlGn';
}

export function VolatilitySurface3D({
    points,
    spotPrice,
    showCalls = true,
    showPuts = false,
    useSVI = false,
    colorScale = 'Viridis'
}: VolatilitySurface3DProps) {
    const surfaceData = useMemo(() => {
        if (!points || points.length === 0) return null;

        // Get unique sorted strikes and expiries from raw data
        const rawStrikes = [...new Set(points.map(p => p.strike))].sort((a, b) => a - b);
        const rawExpiries = [...new Set(points.map(p => p.daysToExpiry))].sort((a, b) => a - b);

        if (useSVI && rawStrikes.length > 0 && rawExpiries.length > 0) {
            // Generate smooth SVI surface
            try {
                const sviResult = generateSVISurface(
                    points,
                    spotPrice,
                    { min: rawStrikes[0], max: rawStrikes[rawStrikes.length - 1] },
                    { min: rawExpiries[0], max: rawExpiries[rawExpiries.length - 1] },
                    40  // Higher resolution grid
                );

                // Filter out NaN values
                const validIvGrid = sviResult.ivGrid.map(row =>
                    row.map(v => (isNaN(v) || v <= 0) ? null : v)
                );

                return {
                    strikes: sviResult.strikes,
                    expiries: sviResult.expiries,
                    z: validIvGrid,
                    customData: [] as (SurfacePoint | null)[][],
                    isSVI: true
                };
            } catch (e) {
                console.warn('SVI fitting failed, falling back to raw data:', e);
            }
        }

        // Standard raw data surface
        // For large datasets (like NVDA with 400+ strikes), sample strikes around ATM
        let strikes = rawStrikes;
        const expiries = rawExpiries;

        if (rawStrikes.length > 80) {
            // Find ATM index
            const atmIndex = rawStrikes.findIndex(s => s >= spotPrice) || Math.floor(rawStrikes.length / 2);

            // Sample 80 strikes centered around ATM with better coverage
            const halfWindow = 40;
            const start = Math.max(0, atmIndex - halfWindow);
            const end = Math.min(rawStrikes.length, atmIndex + halfWindow);

            // Take every Nth strike if still too many
            const selectedStrikes = rawStrikes.slice(start, end);
            if (selectedStrikes.length > 80) {
                const step = Math.ceil(selectedStrikes.length / 80);
                strikes = selectedStrikes.filter((_, i) => i % step === 0);
            } else {
                strikes = selectedStrikes;
            }
        }

        // Create a grid for the surface
        const z: (number | null)[][] = [];
        const customData: (SurfacePoint | null)[][] = [];

        for (let i = 0; i < expiries.length; i++) {
            const row: (number | null)[] = [];
            const dataRow: (SurfacePoint | null)[] = [];

            for (let j = 0; j < strikes.length; j++) {
                const point = points.find(
                    p => p.strike === strikes[j] && p.daysToExpiry === expiries[i]
                );

                if (point) {
                    // Use call IV if showing calls, put IV otherwise
                    let iv: number | null = null;
                    if (showCalls && point.callIV !== null) {
                        iv = point.callIV;
                    } else if (showPuts && point.putIV !== null) {
                        iv = point.putIV;
                    } else if (point.callIV !== null) {
                        iv = point.callIV;
                    } else if (point.putIV !== null) {
                        iv = point.putIV;
                    }

                    row.push(iv !== null ? iv * 100 : null); // Convert to percentage
                    dataRow.push(point);
                } else {
                    row.push(null);
                    dataRow.push(null);
                }
            }
            z.push(row);
            customData.push(dataRow);
        }

        return { strikes, expiries, z, customData, isSVI: false };
    }, [points, showCalls, showPuts, useSVI, spotPrice]);

    if (!surfaceData) {
        return (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No surface data available
            </div>
        );
    }

    const { strikes, expiries, z } = surfaceData;

    // Find ATM strike for reference line
    const atmStrikeIndex = strikes.reduce((closest, strike, index) => {
        return Math.abs(strike - spotPrice) < Math.abs(strikes[closest] - spotPrice)
            ? index
            : closest;
    }, 0);

    return (
        <Plot
            data={[
                {
                    type: 'surface',
                    x: strikes,
                    y: expiries,
                    z: z,
                    colorscale: colorScale,
                    showscale: true,
                    connectgaps: true,  // Interpolate across null values
                    colorbar: {
                        title: {
                            text: 'IV (%)',
                            font: { color: '#94a3b8', size: 12 }
                        },
                        tickfont: { color: '#94a3b8', size: 10 },
                        thickness: 15,
                        len: 0.5,
                        x: 1.02
                    },
                    contours: {
                        z: {
                            show: true,
                            usecolormap: true,
                            highlightcolor: '#fff',
                            project: { z: true }
                        }
                    },
                    lighting: {
                        ambient: 0.8,
                        diffuse: 0.9,
                        specular: 0.2,
                        roughness: 0.5
                    },
                    hovertemplate:
                        '<b>Strike:</b> $%{x:.2f}<br>' +
                        '<b>Days to Exp:</b> %{y}<br>' +
                        '<b>IV:</b> %{z:.1f}%<br>' +
                        '<extra></extra>'
                },
                // ATM reference line
                {
                    type: 'scatter3d',
                    mode: 'lines',
                    x: Array(expiries.length).fill(spotPrice),
                    y: expiries,
                    z: expiries.map((_, i) => {
                        const row = z[i];
                        if (!row) return 20;
                        const validVals = row.filter((v): v is number => v !== null);
                        return validVals.length > 0 ? Math.min(...validVals) - 2 : 20;
                    }),
                    line: {
                        color: '#f59e0b',
                        width: 4
                    },
                    name: `ATM (${spotPrice.toFixed(2)})`,
                    hoverinfo: 'name'
                }
            ] as any}
            layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                margin: { l: 0, r: 0, t: 30, b: 0 },
                scene: {
                    xaxis: {
                        title: { text: 'Strike Price ($)', font: { color: '#94a3b8', size: 11 } },
                        tickfont: { color: '#64748b', size: 9 },
                        gridcolor: '#334155',
                        zerolinecolor: '#475569',
                        backgroundcolor: 'transparent'
                    },
                    yaxis: {
                        title: { text: 'Days to Expiry', font: { color: '#94a3b8', size: 11 } },
                        tickfont: { color: '#64748b', size: 9 },
                        gridcolor: '#334155',
                        zerolinecolor: '#475569',
                        backgroundcolor: 'transparent'
                    },
                    zaxis: {
                        title: { text: 'Implied Vol (%)', font: { color: '#94a3b8', size: 11 } },
                        tickfont: { color: '#64748b', size: 9 },
                        gridcolor: '#334155',
                        zerolinecolor: '#475569',
                        backgroundcolor: 'transparent'
                    },
                    camera: {
                        eye: { x: 1.5, y: -1.5, z: 0.8 },
                        center: { x: 0, y: 0, z: -0.1 }
                    },
                    aspectratio: { x: 1.2, y: 1, z: 0.7 }
                },
                showlegend: false,
                font: {
                    family: 'Inter, system-ui, sans-serif'
                }
            }}
            config={{
                displayModeBar: true,
                modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
                displaylogo: false,
                responsive: true
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
        />
    );
}
