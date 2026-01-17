"use strict";
import { Plus, X, Search, Play } from "lucide-react";

interface BasketInputProps {
    symbols: string[];
    setSymbols: (symbols: string[]) => void;
    onAnalyze: () => void;
    isLoading: boolean;
}

export function BasketInput({ symbols, setSymbols, onAnalyze, isLoading }: BasketInputProps) {
    const handleAdd = () => {
        if (symbols.length < 10) {
            setSymbols([...symbols, ""]);
        }
    };

    const handleRemove = (index: number) => {
        if (symbols.length > 2) {
            const newSyms = symbols.filter((_, i) => i !== index);
            setSymbols(newSyms);
        }
    };

    const handleChange = (index: number, val: string) => {
        const newSyms = [...symbols];
        newSyms[index] = val.toUpperCase();
        setSymbols(newSyms);
    };

    return (
        <div className="p-6 bg-card border border-border rounded-xl shadow-sm space-y-6">
            <div>
                <h3 className="text-lg font-bold mb-1">Basket Configuration</h3>
                <p className="text-sm text-muted-foreground">
                    Define the basket. The <strong>first asset</strong> is the dependent variable (Long).
                    The others are shorted against it to form the spread.
                </p>
            </div>

            <div className="space-y-3">
                {symbols.map((sym, i) => (
                    <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="w-8 flex justify-center text-xs font-mono font-bold text-muted-foreground">
                            {i === 0 ? "Y" : `X${i}`}
                        </div>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <input
                                type="text"
                                value={sym}
                                onChange={(e) => handleChange(i, e.target.value)}
                                placeholder={i === 0 ? "Dependent Asset (e.g. KO)" : "Independent Asset (e.g. PEP)"}
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase font-bold"
                            />
                        </div>
                        <button
                            onClick={() => handleRemove(i)}
                            disabled={symbols.length <= 2}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    onClick={handleAdd}
                    className="flex-1 py-2 px-4 border border-dashed border-primary/30 text-primary hover:bg-primary/5 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={16} /> Add Asset
                </button>
                <button
                    onClick={onAnalyze}
                    disabled={isLoading || symbols.some(s => !s)}
                    className="flex-[2] py-2 px-6 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                    {isLoading ? "Calculating..." : <><Play size={16} /> Analyze Basket</>}
                </button>
            </div>
        </div>
    );
}

