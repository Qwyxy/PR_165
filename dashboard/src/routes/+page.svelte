<script>
    import { onMount } from 'svelte';

    let { data } = $props();

    // ── State ──────────────────────────────────────────────────────────────────
    let sensors = $state(data.sensors);
    let lastUpdated = $state(new Date().toLocaleTimeString());
    let alerts = $state([]);

    // ── Config (dupliquée côté client pour les alertes) ────────────────────────
    const SENSOR_CONFIG = {
        temperature:  { label: 'Température',     unit: '°C',  icon: '🌡️', criticalMin: 20,  criticalMax: 35   },
        humidity:     { label: 'Humidité',        unit: '%',   icon: '💧', criticalMin: 50,  criticalMax: 95   },
        co2:          { label: 'CO₂',             unit: 'ppm', icon: '💨', criticalMin: 300, criticalMax: 1000 },
        light_upper:  { label: 'Lumière (haut)',  unit: 'lux', icon: '☀️', criticalMin: 50,  criticalMax: 900  },
        light_lower:  { label: 'Lumière (bas)',   unit: 'lux', icon: '🔆', criticalMin: 50,  criticalMax: 900  }
    };

    // ── Alertes ────────────────────────────────────────────────────────────────
    function checkAlerts(sensorsData) {
        const newAlerts = [];

        for (const [type, sensor] of Object.entries(sensorsData)) {
            const config = SENSOR_CONFIG[type];
            if (sensor.current === null) continue;

            if (sensor.current < config.criticalMin) {
                newAlerts.push({
                    id: `${type}-low`,
                    type: 'low',
                    sensor: type,
                    label: config.label,
                    icon: config.icon,
                    message: `Valeur trop basse : ${sensor.current}${config.unit} (min: ${config.criticalMin}${config.unit})`,
                    timestamp: new Date().toLocaleTimeString()
                });
            }

            if (sensor.current > config.criticalMax) {
                newAlerts.push({
                    id: `${type}-high`,
                    type: 'high',
                    sensor: type,
                    label: config.label,
                    icon: config.icon,
                    message: `Valeur trop haute : ${sensor.current}${config.unit} (max: ${config.criticalMax}${config.unit})`,
                    timestamp: new Date().toLocaleTimeString()
                });
            }
        }

        alerts = newAlerts;
    }

    // ── Polling ────────────────────────────────────────────────────────────────
    async function fetchLatest() {
        try {
            const res = await fetch('/api/sensors/latest');
            if (!res.ok) return;

            const fresh = await res.json();

            // Merge config dans les nouvelles données
            for (const type of Object.keys(fresh)) {
                fresh[type].config = SENSOR_CONFIG[type];
            }

            sensors = fresh;
            lastUpdated = new Date().toLocaleTimeString();
            checkAlerts(fresh);
        } catch (err) {
            console.error('Polling error:', err);
        }
    }

    // ── Graphique SVG ──────────────────────────────────────────────────────────
    function buildSparkline(history, width = 300, height = 80) {
        if (!history || history.length < 2) return '';

        const values = history.map(h => h.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const points = values.map((v, i) => {
            const x = (i / (values.length - 1)) * width;
            const y = height - ((v - min) / range) * height;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        return points.join(' ');
    }

    function isCritical(type, value) {
        if (value === null) return false;
        const config = SENSOR_CONFIG[type];
        return value < config.criticalMin || value > config.criticalMax;
    }

    function getStatusClass(type, value) {
        if (value === null) return 'status-unknown';
        const config = SENSOR_CONFIG[type];
        if (value < config.criticalMin || value > config.criticalMax) return 'status-critical';
        const warnMin = config.criticalMin * 1.1;
        const warnMax = config.criticalMax * 0.9;
        if (value < warnMin || value > warnMax) return 'status-warning';
        return 'status-ok';
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    onMount(() => {
        checkAlerts(sensors);
        const interval = setInterval(fetchLatest, 5000);
        return () => clearInterval(interval);
    });
</script>

<svelte:head>
    <title>Dashboard Capteurs</title>
</svelte:head>

<main>

    <!-- Header -->
    <header>
        <div class="header-left">
            <h1>Dashboard Capteurs</h1>
            <span class="last-updated">Mis à jour : {lastUpdated}</span>
        </div>
        {#if alerts.length > 0}
            <div class="alert-badge">
                ⚠️ {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
            </div>
        {/if}
    </header>

    <!-- Alertes -->
    {#if alerts.length > 0}
        <section class="alerts-section">
            <h2>⚠️ Alertes actives</h2>
            <div class="alerts-list">
                {#each alerts as alert (alert.id)}
                    <div class="alert-item alert-{alert.type}">
                        <span class="alert-icon">{alert.icon}</span>
                        <div class="alert-content">
                            <strong>{alert.label}</strong>
                            <span>{alert.message}</span>
                        </div>
                        <span class="alert-time">{alert.timestamp}</span>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Cartes capteurs -->
    <section class="sensors-grid">
        {#each Object.entries(sensors) as [type, sensor]}
            {@const config = SENSOR_CONFIG[type]}
            {@const critical = isCritical(type, sensor.current)}
            {@const statusClass = getStatusClass(type, sensor.current)}

            <div class="sensor-card {statusClass} {critical ? 'critical-pulse' : ''}">

                <!-- En-tête carte -->
                <div class="card-header">
                    <span class="sensor-icon">{config.icon}</span>
                    <h3>{config.label}</h3>
                    <span class="status-dot {statusClass}"></span>
                </div>

                <!-- Valeur principale -->
                <div class="current-value">
                    {#if sensor.current !== null}
                        <span class="value">{sensor.current.toFixed(1)}</span>
                        <span class="unit">{config.unit}</span>
                    {:else}
                        <span class="no-data">—</span>
                    {/if}
                </div>

                <!-- Stats min / avg / max -->
                <div class="stats-row">
                    <div class="stat">
                        <span class="stat-label">Min</span>
                        <span class="stat-value min">{sensor.min?.toFixed(1) ?? '—'}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Moy</span>
                        <span class="stat-value avg">{sensor.avg?.toFixed(1) ?? '—'}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Max</span>
                        <span class="stat-value max">{sensor.max?.toFixed(1) ?? '—'}</span>
                    </div>
                </div>

                <!-- Sparkline -->
                <div class="chart-container">
                    {#if sensor.history && sensor.history.length >= 2}
                        <svg
                            viewBox="0 0 300 80"
                            preserveAspectRatio="none"
                            class="sparkline"
                            aria-label="Graphique {config.label}"
                        >
                            <!-- Zone de seuil critique -->
                            <rect x="0" y="0" width="300" height="80"
                                fill="none" stroke="none" />

                            <!-- Ligne de la valeur -->
                            <polyline
                                points={buildSparkline(sensor.history)}
                                fill="none"
                                stroke={critical ? '#fc8181' : '#68d391'}
                                stroke-width="2"
                                stroke-linejoin="round"
                                stroke-linecap="round"
                            />

                            <!-- Point actuel -->
                            {#if sensor.history.length > 0}
                                {@const lastIdx = sensor.history.length - 1}
                                {@const values = sensor.history.map(h => h.value)}
                                {@const minV = Math.min(...values)}
                                {@const maxV = Math.max(...values)}
                                {@const range = maxV - minV || 1}
                                {@const cx = 300}
                                {@const cy = 80 - ((values[lastIdx] - minV) / range) * 80}
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r="4"
                                    fill={critical ? '#fc8181' : '#68d391'}
                                />
                            {/if}
                        </svg>

                        <!-- Labels axe -->
                        <div class="chart-labels">
                            <span>{sensor.history[0]?.timestamp
                                ? new Date(sensor.history[0].timestamp).toLocaleTimeString()
                                : ''}</span>
                            <span>Maintenant</span>
                        </div>
                    {:else}
                        <p class="no-chart">Données insuffisantes</p>
                    {/if}
                </div>

                <!-- Seuils -->
                <div class="thresholds">
                    <span class="threshold-item">
                        🔵 Min critique : {config.criticalMin}{config.unit}
                    </span>
                    <span class="threshold-item">
                        🔴 Max critique : {config.criticalMax}{config.unit}
                    </span>
                </div>
            </div>
        {/each}
    </section>

</main>

<style>
    /* ── Reset & Base ─────────────────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    main {
        min-height: 100vh;
        background: #0f1117;
        color: #e2e8f0;
        font-family: 'Segoe UI', system-ui, sans-serif;
        padding: 2rem;
    }

    /* ── Header ───────────────────────────────────────────────────────────────── */
    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 1.8rem;
        font-weight: 700;
        color: #f7fafc;
    }

    .last-updated {
        font-size: 0.8rem;
        color: #718096;
        display: block;
        margin-top: 0.25rem;
    }

    .alert-badge {
        background: #742a2a;
        color: #feb2b2;
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        font-weight: 600;
        animation: pulse 2s infinite;
    }

    /* ── Alertes ──────────────────────────────────────────────────────────────── */
    .alerts-section {
        margin-bottom: 2rem;
    }

    .alerts-section h2 {
        font-size: 1rem;
        color: #fc8181;
        margin-bottom: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .alerts-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .alert-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid;
    }

    .alert-high {
        background: #2d1515;
        border-color: #fc8181;
    }

    .alert-low {
        background: #1a2535;
        border-color: #63b3ed;
    }

    .alert-icon { font-size: 1.5rem; }

    .alert-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }

    .alert-content strong { color: #f7fafc; }
    .alert-content span   { font-size: 0.85rem; color: #a0aec0; }
    .alert-time           { font-size: 0.75rem; color: #718096; }

    /* ── Grille capteurs ──────────────────────────────────────────────────────── */
    .sensors-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
    }

    /* ── Carte ────────────────────────────────────────────────────────────────── */
    .sensor-card {
        background: #1a1f2e;
        border-radius: 1rem;
        padding: 1.5rem;
        border: 1px solid #2d3748;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .sensor-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    .sensor-card.status-critical { border-color: #fc8181; }
    .sensor-card.status-warning  { border-color: #f6ad55; }
    .sensor-card.status-ok       { border-color: #68d391; }

    .critical-pulse {
        animation: borderPulse 2s infinite;
    }

    /* ── En-tête carte ────────────────────────────────────────────────────────── */
    .card-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .sensor-icon { font-size: 1.5rem; }

    h3 {
        flex: 1;
        font-size: 1rem;
        font-weight: 600;
        color: #e2e8f0;
    }

    .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    .status-dot.status-ok       { background: #68d391; }
    .status-dot.status-warning  { background: #f6ad55; }
    .status-dot.status-critical { background: #fc8181; animation: pulse 1s infinite; }
    .status-dot.status-unknown  { background: #718096; }

    /* ── Valeur principale ────────────────────────────────────────────────────── */
    .current-value {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
    }

    .value {
        font-size: 3rem;
        font-weight: 700;
        color: #f7fafc;
        line-height: 1;
    }

    .unit    { font-size: 1.2rem; color: #718096; }
    .no-data { font-size: 2rem; color: #4a5568; }

    /* ── Stats ────────────────────────────────────────────────────────────────── */
    .stats-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        background: #0f1117;
        border-radius: 0.5rem;
        padding: 0.75rem;
    }

    .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
    }

    .stat-label {
        font-size: 0.7rem;
        color: #718096;
        text-transform: uppercase;
    }

    .stat-value       { font-size: 1rem; font-weight: 600; }
    .stat-value.min   { color: #63b3ed; }
    .stat-value.avg   { color: #e2e8f0; }
    .stat-value.max   { color: #fc8181; }

    /* ── Graphique ────────────────────────────────────────────────────────────── */
    .chart-container {
        background: #0f1117;
        border-radius: 0.5rem;
        padding: 0.5rem;
    }

    .sparkline {
        width: 100%;
        height: 80px;
        display: block;
    }

    .chart-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.65rem;
        color: #4a5568;
        margin-top: 0.25rem;
    }

    .no-chart {
        text-align: center;
        color: #4a5568;
        font-size: 0.8rem;
        padding: 1rem;
    }

    /* ── Seuils ───────────────────────────────────────────────────────────────── */
    .thresholds {
        display: flex;
        justify-content: space-between;
        font-size: 0.72rem;
        color: #718096;
    }

    /* ── Animations ───────────────────────────────────────────────────────────── */
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
    }

    @keyframes borderPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(252, 129, 129, 0.4); }
        50%       { box-shadow: 0 0 0 8px rgba(252, 129, 129, 0); }
    }

    /* ── Responsive ───────────────────────────────────────────────────────────── */
    @media (max-width: 640px) {
        main            { padding: 1rem; }
        .sensors-grid   { grid-template-columns: 1fr; }
        .value          { font-size: 2.2rem; }
    }
</style>
