"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { motion } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden font-sans">
            <Sidebar />
            <div className="flex flex-col flex-1 h-screen overflow-hidden relative">
                <TopBar />
                <main className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="max-w-7xl mx-auto w-full space-y-8"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
