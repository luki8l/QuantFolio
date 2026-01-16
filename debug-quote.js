const YahooFinance = require('yahoo-finance2').default;

async function run() {
    try {
        const yf = new YahooFinance({
            suppressNotices: ['yahooSurvey']
        });

        const symbol = "TSLA";
        console.log(`fetching data for ${symbol}...`);

        const [summary, quote] = await Promise.all([
            yf.quoteSummary(symbol, {
                modules: ["recommendationTrend", "indexTrend", "upgradeDowngradeHistory", "financialData", "defaultKeyStatistics", "price", "summaryDetail"]
            }).catch((e) => {
                console.error(`QuoteSummary Error:`, e.message);
                return {};
            }),
            yf.quote(symbol).catch((e) => {
                console.error(`Quote Error:`, e.message);
                return {};
            })
        ]);

        console.log("--- Summary Keys ---", Object.keys(summary));
        console.log("--- Quote Keys ---", Object.keys(quote));

        // Fallbacks
        const result = { ...summary };

        if (!result.price) result.price = {};
        if (!result.price.regularMarketPrice && quote.regularMarketPrice) {
            console.log("fallback: price from quote");
            result.price.regularMarketPrice = { raw: quote.regularMarketPrice, fmt: quote.regularMarketPrice.toFixed(2) };
        }

        if (!result.financialData) result.financialData = {};
        if (!result.financialData.currentPrice && quote.regularMarketPrice) {
            console.log("fallback: currentPrice from quote");
            result.financialData.currentPrice = { raw: quote.regularMarketPrice, fmt: quote.regularMarketPrice.toFixed(2) };
        }

        if (!result.financialData.recommendationMean && result.recommendationTrend?.trend?.[0]) {
            console.log("fallback: calc mean score");
            const t = result.recommendationTrend.trend[0];
            const total = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell;
            if (total > 0) {
                const score = ((t.strongBuy * 1) + (t.buy * 2) + (t.hold * 3) + (t.sell * 4) + (t.strongSell * 5)) / total;
                result.financialData.recommendationMean = { raw: score, fmt: score.toFixed(1) };
            }
        }

        if (!result.financialData.targetMeanPrice && quote.targetMeanPrice) {
            console.log("fallback: targetMeanPrice from quote");
            result.financialData.targetMeanPrice = { raw: quote.targetMeanPrice, fmt: quote.targetMeanPrice.toFixed(2) };
        }

        console.log("--- FINAL RESULT ---");
        console.log("Mean:", result.financialData?.recommendationMean);
        console.log("Target:", result.financialData?.targetMeanPrice);
        console.log("Price:", result.financialData?.currentPrice);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
