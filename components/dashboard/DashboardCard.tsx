import { cn } from "@/lib/utils";

export function DashboardCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-xl border border-border/40 bg-card/30 backdrop-blur-md p-6 shadow-lg transition-all hover:shadow-primary/5 hover:border-primary/20",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
