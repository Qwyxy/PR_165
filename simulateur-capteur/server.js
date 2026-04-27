const express = require("express")
const app = express()
const PORT = 3000

// Fake temperature sensor
const TEMPBASE = 20
const MAX_VARIATION = 1.0;

let temperature = TEMPBASE;

function fakeTemp() {
    const variation = (Math.random() - 0.5) * 2 * MAX_VARIATION;
    temperature += variation;
    temperature = Math.max(10, Math.min(35, temperature));
}
setInterval(fakeTemp, 5000);

app.get("/api/temperature", (req, res) => {

    res.json({
        temperature: parseFloat(temperature.toFixed(2)),
        timestamp: Date.now()
    });
});

// Fake humidity sensor
const HUMIDITYBASE = 60;
const MAX_HUMIDITY_VARIATION = 2.0;

let humidity = HUMIDITYBASE;

function fakeHumidity() {
    const variation = (Math.random() - 0.5) * 2 * MAX_HUMIDITY_VARIATION;
    humidity += variation;
    humidity = Math.max(20, Math.min(90, humidity));
}
setInterval(fakeHumidity, 5000);

app.get("/api/humidity", (req, res) => {
    res.json({
        humidity: parseFloat(humidity.toFixed(2)),
        timestamp: Date.now()
    });
});

// Fake upper light sensor
const LIGHTBASE = 300;
const MAX_LIGHT_VARIATION = 50.0;

let light = LIGHTBASE;

function fakeLight() {
    const variation = (Math.random() - 0.5) * 2 * MAX_LIGHT_VARIATION;
    light += variation;
    light = Math.max(0, Math.min(1000, light));
}
setInterval(fakeLight, 5000);

app.get("/api/light/upper", (req, res) => {
    res.json({
        light: parseFloat(light.toFixed(2)),
        timestamp: Date.now()
    });
});

// Fake lower light sensor
const LIGHTBASELOWER = 300;
const MAX_LIGHT_VARIATION_LOWER = 50.0;

let lightLower = LIGHTBASELOWER;

function fakeLightLower() {
    const variation = (Math.random() - 0.5) * 2 * MAX_LIGHT_VARIATION_LOWER;
    lightLower += variation;
    lightLower = Math.max(0, Math.min(1000, lightLower));
}
setInterval(fakeLightLower, 5000);

app.get("/api/light/lower", (req, res) => {
    res.json({
        light: parseFloat(lightLower.toFixed(2)),
        timestamp: Date.now()
    });
});

// Fake CO2 sensor
const CO2BASE = 400;
const MAX_CO2_VARIATION = 20.0;

let co2 = CO2BASE;

function fakeCO2() {
    const variation = (Math.random() - 0.5) * 2 * MAX_CO2_VARIATION;
    co2 += variation;
    co2 = Math.max(300, Math.min(2000, co2));
}
setInterval(fakeCO2, 5000);

app.get("/api/co2", (req, res) => {
    res.json({
        co2: parseFloat(co2.toFixed(2)),
        timestamp: Date.now()
    });
});


app.listen(PORT, () => {
    console.log(`Api on port ${PORT}`)
});