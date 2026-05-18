import { connectDB } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';

const SENSOR_TYPES = ['temperature', 'humidity', 'co2', 'light_upper', 'light_lower'];

export const GET = async ({ params, url }) => {
    const { type } = params;

    if (!SENSOR_TYPES.includes(type)) {
        throw error(404, 'Capteur non trouvé');
    }

    try {
        const db = await connectDB();

        const period = url.searchParams.get('period') ?? '24h';

        const now = new Date();
        const periodMap = {
            '1h':  new Date(now - 1000 * 60 * 60),
            '24h': new Date(now - 1000 * 60 * 60 * 24),
            '7d':  new Date(now - 1000 * 60 * 60 * 24 * 7),
            '30d': new Date(now - 1000 * 60 * 60 * 24 * 30),
            'all': null
        };

        const since = periodMap[period] ?? null;

        const query = since
    ? { 
        sensor: type, 
        $or: [
            { timestamp: { $gte: since } },           // si Date
            { timestamp: { $gte: since.toISOString() } } // si string
        ]
    }
    : { sensor: type };


        const readings = await db.collection('data')
            .find(query)
            .sort({ timestamp: 1 })
            .toArray();

        const values = readings.map(r => r.value);

        return json({
            current: values[values.length - 1] ?? null,
            min: values.length ? Math.min(...values) : null,
            max: values.length ? Math.max(...values) : null,
            avg: values.length
                ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                : null,
            count: values.length,
            history: readings.map(r => ({
                value: r.value,
                timestamp: r.timestamp
            }))
        });

    } catch (err) {
        console.error(err);
        throw error(500, 'Erreur base de données');
    }
};
