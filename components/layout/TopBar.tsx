"use client";

import { Bell, Search } from "lucide-react";

export function TopBar() {
    return (
        <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative w-full max-w-md hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search markets, tickers, or strategies..."
                        className="w-full bg-secondary/20 border border-input/50 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground transition-all hover:bg-secondary/30"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                </button>
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-background font-bold cursor-pointer hover:opacity-90 transition-opacity">
                    Q
                </div>
            </div>
        </header>
    );
}
