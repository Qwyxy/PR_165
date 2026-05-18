import { connectDB } from '$lib/server/db';
import { json } from '@sveltejs/kit';

const SENSOR_TYPES = ['temperature', 'humidity', 'co2', 'light_upper', 'light_lower'];

export const GET = async () => {
    const db = await connectDB();
    const sensors = {};

    for (const sensorType of SENSOR_TYPES) {
        const readings = await db.collection('data')
            .find({ sensor: sensorType })
            .sort({ timestamp: -1 })
            .limit(50)
            .toArray();

        const values = readings.map(r => r.value);

        sensors[sensorType] = {
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

    return json(sensors);
};
