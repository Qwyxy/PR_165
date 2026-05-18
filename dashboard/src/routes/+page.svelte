<script>
    import { onMount } from 'svelte';
    import refreshIcon from '$lib/images/refresh.png'; 

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
            <h1>
                <span class="gradient-text">Dashboard</span> Capteurs
            </h1>
            <div class="last-updated">
                <img src={refreshIcon} alt="Refresh" class="update-icon" />
                Mis à jour : {lastUpdated}
            </div>
        </div>
        {#if alerts.length > 0}
            <div class="alert-badge">
                <span class="badge-icon">⚠️</span>
                <span class="badge-text">{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>
            </div>
        {/if}
    </header>

    <!-- Alertes -->
    {#if alerts.length > 0}
        <section class="alerts-section">
            <h2>
                <span class="section-icon">⚠️</span>
                Alertes actives
            </h2>
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
            <a href="/{type}">
                <div class="sensor-card {statusClass} {critical ? 'critical-pulse' : ''}">
                    <!-- En-tête carte -->
                    <div class="card-header">
                        <div class="icon-wrapper">
                            <span class="sensor-icon">{config.icon}</span>
                        </div>
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
                                <!-- Gradient de fond -->
                                <defs>
                                    <linearGradient id="gradient-{type}" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style="stop-color:{critical ? 'rgb(252, 129, 129)' : 'rgb(104, 211, 145)'};stop-opacity:0.2" />
                                        <stop offset="100%" style="stop-color:{critical ? 'rgb(252, 129, 129)' : 'rgb(104, 211, 145)'};stop-opacity:0" />
                                    </linearGradient>
                                </defs>

                                <!-- Zone remplie -->
                                <polyline
                                    points="{buildSparkline(sensor.history)} 300,80 0,80"
                                    fill="url(#gradient-{type})"
                                    stroke="none"
                                />

                                <!-- Ligne de la valeur -->
                                <polyline
                                    points={buildSparkline(sensor.history)}
                                    fill="none"
                                    stroke={critical ? '#fc8181' : '#68d391'}
                                    stroke-width="2.5"
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
                                        r="5"
                                        fill={critical ? '#fc8181' : '#68d391'}
                                        stroke={critical ? '#fef2f2' : '#f0fff4'}
                                        stroke-width="2"
                                    />
                                {/if}
                            </svg>

                            <!-- Labels axe -->
                            <div class="chart-labels">
                                <span>{sensor.history[0]?.timestamp
                                    ? new Date(sensor.history[0].timestamp).toLocaleTimeString()
                                    : ''}</span>
                                <span>{sensor.history[sensor.history.length - 1]?.timestamp
                                    ? new Date(sensor.history[sensor.history.length - 1].timestamp).toLocaleTimeString()
                                    : ''}</span>
                            </div>
                        {:else}
                            <div class="no-chart">Pas assez de données</div>
                        {/if}
                    </div>

                    <!-- Seuils critiques -->
                    <div class="thresholds">
                        <span class="threshold-min">Min: {config.criticalMin}{config.unit}</span>
                        <span class="threshold-max">Max: {config.criticalMax}{config.unit}</span>
                    </div>
                </div>
            </a>
            
        {/each}
    </section>

</main>

<style>
    /* ── Global & Reset ───────────────────────────────────────────────────────── */
    :global(body) {
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 50%, #0f1419 100%);
        background-attachment: fixed;
        min-height: 100vh;
    }

    main {
        max-width: 1400px;
        margin: 0 auto;
        color: #e2e8f0;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        padding: 2.5rem;
    }

    /* ── Header ───────────────────────────────────────────────────────────────── */
    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3rem;
        background: rgba(26, 31, 46, 0.6);
        backdrop-filter: blur(20px);
        border-radius: 1.25rem;
        padding: 1.75rem 2rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    h1 {
        font-size: 2rem;
        font-weight: 800;
        color: #f7fafc;
        margin: 0;
        letter-spacing: -0.02em;
    }

    .gradient-text {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .last-updated {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #94a3b8;
        margin-top: 0.5rem;
        font-weight: 500;
    }

    .update-icon {
        width: 14px;
        height: 14px;
        animation: rotate 3s linear infinite;
    }

    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .alert-badge {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        background: linear-gradient(135deg, rgba(185, 28, 28, 0.15) 0%, rgba(127, 29, 29, 0.15) 100%);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(252, 129, 129, 0.3);
        color: #fca5a5;
        padding: 0.875rem 1.5rem;
        border-radius: 3rem;
        font-weight: 700;
        font-size: 0.9rem;
        animation: pulse-alert 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        box-shadow: 0 4px 20px rgba(252, 129, 129, 0.2);
    }

    .badge-icon {
        font-size: 1.25rem;
        animation: shake 0.5s infinite;
    }

    @keyframes shake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-10deg); }
        75% { transform: rotate(10deg); }
    }

    @keyframes pulse-alert {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(1.02); }
    }

    /* ── Alertes ──────────────────────────────────────────────────────────────── */
    .alerts-section {
        margin-bottom: 2.5rem;
    }

    .alerts-section h2 {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.1rem;
        color: #fca5a5;
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
    }

    .section-icon {
        font-size: 1.25rem;
    }

    .alerts-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .alert-item {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 1.25rem 1.5rem;
        border-radius: 0.875rem;
        border-left: 4px solid;
        background: rgba(26, 31, 46, 0.6);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .alert-item:hover {
        transform: translateX(4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .alert-high {
        background: linear-gradient(135deg, rgba(45, 21, 21, 0.7) 0%, rgba(55, 25, 25, 0.5) 100%);
        border-left-color: #fc8181;
    }

    .alert-low {
        background: linear-gradient(135deg, rgba(26, 37, 53, 0.7) 0%, rgba(30, 45, 65, 0.5) 100%);
        border-left-color: #63b3ed;
    }

    .alert-icon {
        font-size: 2rem;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .alert-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .alert-content strong {
        color: #f7fafc;
        font-weight: 600;
        font-size: 1rem;
    }

    .alert-content span {
        font-size: 0.875rem;
        color: #cbd5e0;
        line-height: 1.5;
    }

    .alert-time {
        font-size: 0.8rem;
        color: #94a3b8;
        font-weight: 500;
    }

    /* ── Grille capteurs ──────────────────────────────────────────────────────── */
    .sensors-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 1.75rem;
    }

    /* ── Carte ────────────────────────────────────────────────────────────────── */
    .sensor-card {
        background: rgba(26, 31, 46, 0.6);
        backdrop-filter: blur(20px);
        border-radius: 1.25rem;
        padding: 1.75rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }

    .sensor-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, currentColor, transparent);
        opacity: 0;
        transition: opacity 0.4s;
    }

    .sensor-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
        border-color: rgba(255, 255, 255, 0.15);
    }

    .sensor-card:hover::before {
        opacity: 0.6;
    }

    .sensor-card.status-critical {
        border-color: rgba(252, 129, 129, 0.4);
        color: #fc8181;
    }

    .sensor-card.status-warning {
        border-color: rgba(246, 173, 85, 0.4);
        color: #f6ad55;
    }

    .sensor-card.status-ok {
        border-color: rgba(104, 211, 145, 0.4);
        color: #68d391;
    }

    .critical-pulse {
        animation: borderPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    /* ── En-tête carte ────────────────────────────────────────────────────────── */
    .card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .icon-wrapper {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 0.875rem;
        font-size: 1.75rem;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
        transition: transform 0.3s;
    }

    .sensor-card:hover .icon-wrapper {
        transform: scale(1.1);
    }

    h3 {
        flex: 1;
        font-size: 1.1rem;
        font-weight: 600;
        color: #f7fafc;
        letter-spacing: -0.01em;
    }

    .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: 0 2px 8px currentColor;
    }

    .status-dot.status-ok {
        background: #68d391;
    }

    .status-dot.status-warning {
        background: #f6ad55;
        animation: pulse-dot 2s infinite;
    }

    .status-dot.status-critical {
        background: #fc8181;
        animation: pulse-dot 1s infinite;
    }

    .status-dot.status-unknown {
        background: #94a3b8;
    }

    @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
    }

    /* ── Valeur principale ────────────────────────────────────────────────────── */
    .current-value {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
        margin: 0.5rem 0;
    }

    .value {
        font-size: 3.5rem;
        font-weight: 800;
        color: #f7fafc;
        line-height: 1;
        letter-spacing: -0.02em;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    }

    .unit {
        font-size: 1.25rem;
        color: #94a3b8;
        font-weight: 600;
    }

    .no-data {
        font-size: 2.5rem;
        color: #64748b;
    }

    /* ── Stats ────────────────────────────────────────────────────────────────── */
    .stats-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        background: rgba(15, 17, 23, 0.7);
        border-radius: 0.875rem;
        padding: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.375rem;
    }

    .stat-label {
        font-size: 0.75rem;
        color: #94a3b8;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
    }

    .stat-value {
        font-size: 1.125rem;
        font-weight: 700;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    .stat-value.min {
        color: #63b3ed;
    }

    .stat-value.avg {
        color: #f7fafc;
    }

    .stat-value.max {
        color: #fc8181;
    }

    /* ── Graphique ────────────────────────────────────────────────────────────── */
    .chart-container {
        background: rgba(15, 17, 23, 0.7);
        border-radius: 0.875rem;
        padding: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .sparkline {
        width: 100%;
        height: 80px;
        display: block;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
    }

    .chart-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        color: #64748b;
        margin-top: 0.5rem;
        font-weight: 500;
    }

    .no-chart {
        text-align: center;
        color: #64748b;
        font-size: 0.875rem;
        padding: 1.5rem;
        font-weight: 500;
    }

    /* ── Seuils ───────────────────────────────────────────────────────────────── */
    .thresholds {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #94a3b8;
        padding: 0.5rem 0.75rem;
        background: rgba(15, 17, 23, 0.5);
        border-radius: 0.5rem;
        font-weight: 500;
    }

    /* ── Animations ───────────────────────────────────────────────────────────── */
    @keyframes borderPulse {
        0%, 100% {
            box-shadow: 0 0 0 0 rgba(252, 129, 129, 0.4),
                        0 8px 24px rgba(0, 0, 0, 0.3);
        }
        50% {
            box-shadow: 0 0 0 12px rgba(252, 129, 129, 0),
                        0 8px 24px rgba(0, 0, 0, 0.3);
        }
    }

    /* ── Responsive ───────────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
        main {
            padding: 1.5rem;
        }

        header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
        }

        .sensors-grid {
            grid-template-columns: 1fr;
        }

        .value {
            font-size: 2.75rem;
        }

        h1 {
            font-size: 1.5rem;
        }
    }

    @media (max-width: 480px) {
        main {
            padding: 1rem;
        }

        .value {
            font-size: 2.25rem;
        }

        .sensor-card {
            padding: 1.25rem;
        }
    }
</style>
