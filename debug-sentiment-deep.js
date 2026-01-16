const YahooFinance = require('yahoo-finance2').default;

async function run() {
    try {
        const yf = new YahooFinance({
            suppressNotices: ['yahooSurvey', 'yahooFinance']
        });

        const symbol = "TSLA";
        console.log(`fetching ${symbol}...`);

        const res = await yf.quoteSummary(symbol, {
            modules: ["financialData", "summaryDetail", "defaultKeyStatistics", "price", "recommendationTrend"]
        });

        console.log("--- financialData ---");
        console.log(JSON.stringify(res.financialData, null, 2));

        console.log("--- summaryDetail ---");
        console.log(JSON.stringify(res.summaryDetail, null, 2));

        console.log("--- price ---");
        console.log(JSON.stringify(res.price, null, 2));

        console.log("--- defaultKeyStatistics (Target) ---");
        console.log("targetMeanPrice:", res.defaultKeyStatistics?.targetMeanPrice); // Sometimes it's here?

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
