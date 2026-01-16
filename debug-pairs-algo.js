
// Helper for Mean
function mean(data) {
    return data.reduce((a, b) => a + b, 0) / data.length;
}

// OLS
function calculateOLS(logX, logY) {
    const n = logX.length;
    const meanX = mean(logX);
    const meanY = mean(logY);

    let num = 0;
    let den = 0;

    for (let i = 0; i < n; i++) {
        num += (logX[i] - meanX) * (logY[i] - meanY);
        den += (logX[i] - meanX) ** 2;
    }

    const beta = num / den;
    const alpha = meanY - beta * meanX;

    return { beta, alpha };
}

// Halflife
function calculateHalfLife(spread) {
    const x_t = spread.slice(1);
    const x_prev = spread.slice(0, spread.length - 1);
    const { beta: slope } = calculateOLS(x_prev, x_t);

    if (slope >= 1 || slope <= 0) return 999;
    const theta = -Math.log(slope);
    return Math.log(2) / theta;
}

// TEST CASE 1: Perfect Cointegration (y = 1.5x + 5 + noise)
console.log("\n--- TEST CASE 1: Cointegrated ---");
const pricesA = [];
const pricesB = [];
for (let i = 100; i < 300; i++) { // Trend from 100 to 300
    const pB = i + (Math.random() * 5); // Asset B
    const pA = (pB * 1.5) + 5 + (Math.random() * 5); // Asset A (Correlated)
    pricesB.push(pB);
    pricesA.push(pA);
}
// Transform to log for consistency with our app logic (though linear works for this simple test too)
const logA = pricesA.map(Math.log);
const logB = pricesB.map(Math.log);

const { beta, alpha } = calculateOLS(logB, logA);
console.log(`Beta (Should be ~1.0 since log linear relationship changes, but spread should be stationary): ${beta.toFixed(3)}`);

// Calculate Spread
const spread = logA.map((valA, i) => valA - beta * logB[i] - alpha);
const hl = calculateHalfLife(spread);
console.log(`Half-Life (Should be small < 10): ${hl.toFixed(2)}`);


// TEST CASE 2: Random Walk (No Relation)
console.log("\n--- TEST CASE 2: Random Walk ---");
const randA = [];
const randB = [];
let valA = 100, valB = 100;
for (let i = 0; i < 200; i++) {
    valA += (Math.random() - 0.5) * 2;
    valB += (Math.random() - 0.5) * 2;
    randA.push(valA);
    randB.push(valB);
}

const res2 = calculateOLS(randB.map(Math.log), randA.map(Math.log));
const spread2 = randA.map((v, i) => Math.log(v) - res2.beta * Math.log(randB[i]) - res2.alpha);
const hl2 = calculateHalfLife(spread2);
console.log(`Beta: ${res2.beta.toFixed(3)}`);
console.log(`Half-Life (Should be large/invalid > 50): ${hl2.toFixed(2)}`);
