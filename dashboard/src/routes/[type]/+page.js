import { error } from '@sveltejs/kit';

const SENSOR_CONFIG = {
    temperature: { label: 'Température',    unit: '°C',  icon: '🌡️', criticalMin: 20,  criticalMax: 35   },
    humidity:    { label: 'Humidité',       unit: '%',   icon: '💧', criticalMin: 50,  criticalMax: 95   },
    co2:         { label: 'CO₂',            unit: 'ppm', icon: '💨', criticalMin: 300, criticalMax: 1000 },
    light_upper: { label: 'Lumière (haut)', unit: 'lux', icon: '☀️', criticalMin: 50,  criticalMax: 900  },
    light_lower: { label: 'Lumière (bas)',  unit: 'lux', icon: '🔆', criticalMin: 50,  criticalMax: 900  }
};

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
    const { type } = params;

    if (!SENSOR_CONFIG[type]) {
        throw error(404, 'Capteur non trouvé');
    }

    // Charger avec toutes les données par défaut
    const res = await fetch(`/api/sensors/${type}?period=all`);

    if (!res.ok) {
        throw error(res.status, 'Erreur lors du chargement des données');
    }

    const sensorData = await res.json();

    return {
        type,
        config: SENSOR_CONFIG[type],
        data: sensorData
    };
}
