import { connectDB } from '$lib/server/db';

const SENSOR_CONFIG = {
    temperature: {
        label: 'Température',
        unit: '°C',
        icon: '🌡️',
        criticalMin: 10,
        criticalMax: 30,
        historyLimit: 50
    },
    humidity: {
        label: 'Humidité',
        unit: '%',
        icon: '💧',
        criticalMin: 30,
        criticalMax: 80,
        historyLimit: 50
    },
    co2: {
        label: 'CO₂',
        unit: 'ppm',
        icon: '💨',
        criticalMin: 300,
        criticalMax: 1000,
        historyLimit: 50
    },
    light_upper: {
        label: 'Lumière (haut)',
        unit: 'lux',
        icon: '☀️',
        criticalMin: 50,
        criticalMax: 900,
        historyLimit: 50
    },
    light_lower: {
        label: 'Lumière (bas)',
        unit: 'lux',
        icon: '🔆',
        criticalMin: 50,
        criticalMax: 900,
        historyLimit: 50
    }
};

export const load = async () => {
    const db = await connectDB();
    const sensors = {};

    for (const [sensorType, config] of Object.entries(SENSOR_CONFIG)) {
        const readings = await db.collection('data')
            .find({ sensor: sensorType })
            .sort({ timestamp: -1 })
            .limit(config.historyLimit)
            .toArray();

        const values = readings.map(r => r.value);

        sensors[sensorType] = {
            config,
            current: values[0] ?? null,
            min: values.length ? Math.min(...values) : null,
            max: values.length ? Math.max(...values) : null,
            avg: values.length
                ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                : null,
            history: readings.reverse().map(r => ({
                value: r.value,
                timestamp: r.timestamp
            }))
        };
    }

    return {
        sensors: JSON.parse(JSON.stringify(sensors))
    };
};
