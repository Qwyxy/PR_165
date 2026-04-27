const express = require("express")
const { MongoClient } = require("mongodb")
const app = express()
const PORT = 3000

// MongoDB connection
const uri = "mongodb://localhost:27017"
const client = new MongoClient(uri)
const dbName = "sensors"

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect()
        console.log("Connected to MongoDB")
    } catch (error) {
        console.error("MongoDB connection error:", error)
    }
}

connectDB()

// Function to save sensor data
async function saveSensorData(sensorType, value) {
    try {
        const db = client.db(dbName)
        const collection = db.collection("data")

        await collection.insertOne({
            value: value,
            timestamp: new Date(),
            sensor: sensorType
        })
    } catch (error) {
        console.error(`Error saving ${sensorType} data:`, error)
    }
}

// Fake temperature sensor
const TEMPBASE = 20
const MAX_VARIATION = 1.0;

let temperature = TEMPBASE;

function fakeTemp() {
    const variation = (Math.random() - 0.5) * 2 * MAX_VARIATION;
    temperature += variation;
    temperature = Math.max(10, Math.min(35, temperature));

    // Save to database
    saveSensorData("temperature", parseFloat(temperature.toFixed(2)));
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

    // Save to database
    saveSensorData("humidity", parseFloat(humidity.toFixed(2)));
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

    // Save to database
    saveSensorData("light_upper", parseFloat(light.toFixed(2)));
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

    // Save to database
    saveSensorData("light_lower", parseFloat(lightLower.toFixed(2)));
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

    // Save to database
    saveSensorData("co2", parseFloat(co2.toFixed(2)));
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