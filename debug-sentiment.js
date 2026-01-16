const yahooFinance = require('yahoo-finance2').default;

// Suppress Notices
yahooFinance.suppressNotices(['yahooSurvey']);

async function run() {
    try {
        const symbol = "AAPL";
        console.log(`Fetching Sentiment Data for ${symbol}...`);

        const result = await yahooFinance.quoteSummary(symbol, {
            modules: ["recommendationTrend", "upgradeDowngradeHistory"]
        });

        console.log("Success!");
        console.log(JSON.stringify(result, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
