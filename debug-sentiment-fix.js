const YahooFinance = require('yahoo-finance2').default;

async function run() {
    try {
        const yf = new YahooFinance({
            suppressNotices: ['yahooSurvey', 'yahooFinance']
        });

        const symbol = "TSLA";
        console.log(`fetching ${symbol}...`);

        const res = await yf.quoteSummary(symbol, {
            modules: ["recommendationTrend", "indexTrend", "upgradeDowngradeHistory", "financialData", "defaultKeyStatistics", "price"]
        });

        console.log("--- FINANCIAL DATA ---");
        console.log(JSON.stringify(res.financialData, null, 2));

        console.log("--- HISTORY SAMPLE ---");
        if (res.upgradeDowngradeHistory && res.upgradeDowngradeHistory.history) {
            console.log(JSON.stringify(res.upgradeDowngradeHistory.history.slice(0, 5), null, 2));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
