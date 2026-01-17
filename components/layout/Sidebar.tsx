"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Calculator, ChevronLeft, ChevronRight, PieChart, TrendingUp, Settings, Activity, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
    label: string;
    icon: any;
    href: string;
    disabled?: boolean;
}

const items: SidebarItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Option Pricing", icon: Calculator, href: "/pricing" },
    { label: "Volatility Surface", icon: BarChart3, href: "/volatility" },
    { label: "Monte Carlo", icon: TrendingUp, href: "/monte-carlo" },
    { label: "Market Sentiment", icon: TrendingUp, href: "/sentiment" },
    { label: "Pairs Trading", icon: Activity, href: "/pairs" },
    { label: "Portfolio Risk", icon: PieChart, href: "/risk" },
];

export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <motion.aside
            initial={{ width: 240 }}
            animate={{ width: isCollapsed ? 80 : 240 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
                "relative h-screen border-r border-sidebar-border bg-sidebar z-40 hidden md:flex flex-col",
                "backdrop-blur-xl bg-opacity-90 shadow-2xl shadow-black/20"
            )}
        >
            <div className="flex items-center justify-between p-4 h-16 border-b border-sidebar-border/50">
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="font-mono font-bold text-xl tracking-tighter text-primary"
                        >
                            QUANT<span className="text-foreground">FOLIO</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors ml-auto"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <nav className="flex-1 p-2 space-y-2 mt-4">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.disabled ? "#" : item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                                item.disabled && "opacity-50 cursor-not-allowed",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-primary-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-sidebar-primary/10 border-r-2 border-sidebar-primary"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <item.icon
                                size={22}
                                className={cn(
                                    "relative z-10 transition-colors",
                                    isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                                )}
                            />
                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="relative z-10 font-medium whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-sidebar-border/50">
                <button className="flex items-center gap-3 w-full p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                    <Settings size={22} className="text-muted-foreground" />
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                Settings
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </motion.aside>
    );
}
