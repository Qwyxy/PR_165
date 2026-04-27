const express = require("express")
const app = express()
const PORT = 3000
const TEMPBASE = 20
const MAX_VARIATION = 2.0;

let temperature = TEMPBASE;

function simulerTemp() {
    const variation = (Math.random() - 0.5) * 2 * MAX_VARIATION;
    temperature += variation;
    temperature = Math.max(10, Math.min(35, temperature));
}

setInterval(simulerTemp, 5000);

app.get("/api/temp", (req, res) => {

    res.json({
        temperature: parseFloat(temperature.toFixed(2)),
        timestamp: Date.now()
    });
});

app.listen(PORT, () => {
    console.log(`Api on port ${PORT}`)
});