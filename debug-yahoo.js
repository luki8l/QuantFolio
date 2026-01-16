const pkg = require('yahoo-finance2');
const yahooFinance = pkg.default || pkg;
console.log("YahooFinance Export type:", typeof yahooFinance);
console.log("YahooFinance keys:", Object.keys(yahooFinance));

// Suppress
try {
    yahooFinance.suppressNotices(['yahooSurvey']);
} catch (e) { console.log("Suppress failed (types?)", e); }

async function test() {
    try {
        console.log("Testing Search 'AAPL'...");
        const searchRes = await yahooFinance.search('AAPL');
        console.log("Search Result Count:", searchRes.quotes.length);
        if (searchRes.quotes.length > 0) console.log("First Result Type:", searchRes.quotes[0].quoteType);

        console.log("\nTesting Chart 'AAPL'...");
        const chartRes = await yahooFinance.chart('AAPL', { period1: '2024-01-01', interval: '1d' });

        // Log structure
        console.log("Keys in Chart Res:", Object.keys(chartRes));
        if (chartRes.meta) console.log("Meta Symbol:", chartRes.meta.symbol);
        if (chartRes.quotes && chartRes.quotes.length > 0) {
            console.log("First Quote:", chartRes.quotes[0]);
        } else {
            console.log("No quotes found in chart response!");
        }

    } catch (e) {
        console.error("FATAL ERROR IN SCRIPT:", e);
        if (e.errors) console.error("Validation Errors:", JSON.stringify(e.errors, null, 2));
    }
}

test();
