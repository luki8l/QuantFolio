import { BlackScholesCalculator } from "@/components/pricing/BlackScholesCalculator";

export default function PricingPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Option Pricing Model
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                    Interactive Black-Scholes-Merton calculator. Analyze option prices and Greeks sensitivities across different market conditions.
                </p>
            </div>
            <BlackScholesCalculator />
        </div>
    );
}
