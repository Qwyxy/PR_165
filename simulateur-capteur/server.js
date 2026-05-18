const express = require("express")
const { MongoClient } = require("mongodb")

const app = express()
const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017"
const DB_NAME = "sensors"

// ─── Database ────────────────────────────────────────────────────────────────

const client = new MongoClient(MONGO_URI)

async function connectDB() {
    try {
        await client.connect()
        console.log("Connected to MongoDB")
    } catch (error) {
        console.error("MongoDB connection error:", error)
        process.exit(1)
    }
}

async function saveSensorData(sensorType, value) {
    try {
        const collection = client.db(DB_NAME).collection("data")
        await collection.insertOne({
            sensor: sensorType,
            value,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error(`Error saving ${sensorType} data:`, error)
    }
}

// ─── Sensor Factory ───────────────────────────────────────────────────────────

function createSensor({ name, base, maxVariation, min, max, interval = 5000 }) {
    let value = base

    function update() {
        const variation = (Math.random() - 0.5) * 2 * maxVariation
        value = Math.max(min, Math.min(max, value + variation))
        saveSensorData(name, parseFloat(value.toFixed(2)))
    }

    setInterval(update, interval)
    return { getValue: () => parseFloat(value.toFixed(2)) }
}

// ─── Sensor Definitions ───────────────────────────────────────────────────────

const sensors = {
    temperature: createSensor({ name: "temperature", base: 20,  maxVariation: 1.0,  min: 10,  max: 35   }),
    humidity:    createSensor({ name: "humidity",    base: 60,  maxVariation: 2.0,  min: 20,  max: 90   }),
    co2:         createSensor({ name: "co2",         base: 400, maxVariation: 20.0, min: 300, max: 2000 }),
    light_upper: createSensor({ name: "light_upper", base: 300, maxVariation: 50.0, min: 0,   max: 1000 }),
    light_lower: createSensor({ name: "light_lower", base: 300, maxVariation: 50.0, min: 0,   max: 1000 })
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const routes = [
    { path: "/api/temperature", key: "temperature", sensor: "temperature" },
    { path: "/api/humidity",    key: "humidity",    sensor: "humidity"    },
    { path: "/api/co2",         key: "co2",         sensor: "co2"         },
    { path: "/api/light/upper", key: "light",       sensor: "light_upper" },
    { path: "/api/light/lower", key: "light",       sensor: "light_lower" }
]

app.get("/api", (req, res) => {
    res.json({ endpoints: routes.map(r => r.path), updateInterval: "5000ms" })
})

routes.forEach(({ path, key, sensor }) => {
    app.get(path, (req, res) => {
        res.json({
            [key]: sensors[sensor].getValue(),
            timestamp: new Date().toISOString()
        })
    })
})

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: "Internal server error" })
})

// ─── Startup ──────────────────────────────────────────────────────────────────

process.on("SIGINT", async () => {
    await client.close()
    console.log("MongoDB disconnected")
    process.exit(0)
})

connectDB().then(() => {
    app.listen(PORT, () => console.log(`API running on port ${PORT}`))
})
