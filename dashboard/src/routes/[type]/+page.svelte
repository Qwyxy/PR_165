<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    let { data } = $props();

    // ── State ─────────────────────────────────────────────────────────────────
    let sensorData = $state(data.data);
    let lastUpdated = $state(new Date().toLocaleTimeString());
    let selectedPeriod = $state('all');
    let loading = $state(false);

    // ── Fonctions utilitaires ─────────────────────────────────────────────────
    function isCritical(value) {
        if (value === null || !data.config) return false;
        return value < data.config.criticalMin || value > data.config.criticalMax;
    }

    function getStatusClass(value) {
        if (value === null) return 'status-unknown';
        const config = data.config;
        if (value < config.criticalMin || value > config.criticalMax) return 'status-critical';
        const warnMin = config.criticalMin * 1.1;
        const warnMax = config.criticalMax * 0.9;
        if (value < warnMin || value > warnMax) return 'status-warning';
        return 'status-ok';
    }

    // ── Graphique détaillé ────────────────────────────────────────────────────
    function buildDetailedChart(history, width = 800, height = 300) {
    if (!history || history.length < 2) return { path: '', points: [], min: 0, max: 0 };

    const values = history.map(h => h.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = range * 0.1; // 10% de marge en haut et en bas
    const displayMin = min - padding;
    const displayMax = max + padding;
    const displayRange = displayMax - displayMin;

    const points = values.map((v, i) => ({
        x: (i / (values.length - 1)) * width,
        y: height - ((v - displayMin) / displayRange) * height,
        value: v,
        timestamp: history[i].timestamp
    }));

    const path = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    return { path, points, min, max };
}


    // ── Changement de période ────────────────────────────────────────────────
    async function changePeriod(period) {
        selectedPeriod = period;
        loading = true;

        try {
            const res = await fetch(`/api/sensors/${data.type}?period=${period}`);
            if (!res.ok) throw new Error('Erreur API');
            sensorData = await res.json();
            lastUpdated = new Date().toLocaleTimeString();
        } catch (err) {
            console.error('Erreur changement période:', err);
        } finally {
            loading = false;
        }
    }

    // ── Polling ────────────────────────────────────────────────────────────────
    async function fetchLatest() {
        try {
            const res = await fetch(`/api/sensors/${data.type}?period=${selectedPeriod}`);
            if (!res.ok) return;
            sensorData = await res.json();
            lastUpdated = new Date().toLocaleTimeString();
        } catch (err) {
            console.error('Polling error:', err);
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    onMount(() => {
        const interval = setInterval(fetchLatest, 5000);
        return () => clearInterval(interval);
    });

    // ── Variables dérivées ────────────────────────────────────────────────────
    const currentValue  = $derived(sensorData?.current ?? null);
    const statusClass   = $derived(getStatusClass(currentValue));
    const critical      = $derived(isCritical(currentValue));
    const chartData = $derived.by(() => {
        const history = sensorData?.history ?? [];
        return buildDetailedChart(history, 800, 300);
    });
</script>

<svelte:head>
    <title>{data.config.label} - Dashboard Capteurs</title>
</svelte:head>

<main>

    <!-- Header -->
    <header>
        <button class="back-button" onclick={() => goto('/')}>
            <span>←</span>
            <span>Retour au dashboard</span>
        </button>
        <div class="last-updated">Mis à jour : {lastUpdated}</div>
    </header>

    <!-- Titre -->
    <section class="sensor-title">
        <span class="sensor-icon-large">{data.config.icon}</span>
        <div class="title-text">
            <h1>{data.config.label}</h1>
            <div class="status-badge {statusClass}">
                <span class="status-dot"></span>
                {#if statusClass === 'status-ok'}Normal
                {:else if statusClass === 'status-warning'}Attention
                {:else if statusClass === 'status-critical'}Critique
                {:else}Inconnu{/if}
            </div>
        </div>
    </section>

    <!-- Valeur actuelle -->
    <section class="current-stats">
        <div class="main-value-card {statusClass} {critical ? 'critical-pulse' : ''}">
            <div class="card-label">Valeur actuelle</div>
            {#if currentValue !== null}
                <div class="big-value">
                    <span class="value">{currentValue.toFixed(1)}</span>
                    <span class="unit">{data.config.unit}</span>
                </div>
            {:else}
                <div class="big-value"><span class="no-data">—</span></div>
            {/if}
        </div>

        <!-- Stats min/avg/max -->
        <div class="stats-cards">
            <div class="stat-card">
                <span class="stat-label">Minimum</span>
                <span class="stat-value min">{sensorData?.min?.toFixed(1) ?? '—'} {data.config.unit}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Moyenne</span>
                <span class="stat-value avg">{sensorData?.avg?.toFixed(1) ?? '—'} {data.config.unit}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Maximum</span>
                <span class="stat-value max">{sensorData?.max?.toFixed(1) ?? '—'} {data.config.unit}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Mesures</span>
                <span class="stat-value">{sensorData?.count ?? '—'}</span>
            </div>
        </div>
    </section>

    <!-- Graphique -->
    <section class="chart-section">
        <div class="chart-header">
            <h2>Historique</h2>

            <!-- Sélecteur de période -->
            <div class="period-selector">
                {#each [['1h', '1 heure'], ['24h', '24 heures'], ['7d', '7 jours'], ['30d', '30 jours'], ['all', 'Tout']] as [value, label]}
                    <button
                        class="period-btn {selectedPeriod === value ? 'active' : ''}"
                        onclick={() => changePeriod(value)}
                    >
                        {label}
                    </button>
                {/each}
            </div>
        </div>

        <div class="chart-container {loading ? 'loading' : ''}">
            {#if sensorData?.history && sensorData.history.length >= 2}
                <div class="chart-wrapper">
                    <!-- Axe Y -->
                    <div class="axis-y">
                        <span>{chartData.max.toFixed(1)}</span>
                        <span>{((chartData.max + chartData.min) / 2).toFixed(1)}</span>
                        <span>{chartData.min.toFixed(1)}</span>
                    </div>

                    <!-- SVG -->
                    <div class="svg-wrapper">
                        <svg
                            viewBox="0 0 800 300"
                            preserveAspectRatio="none"
                            class="chart-svg"
                        >
                            <defs>
                                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:{critical ? '#fc8181' : '#68d391'};stop-opacity:0.3" />
                                    <stop offset="100%" style="stop-color:{critical ? '#fc8181' : '#68d391'};stop-opacity:0" />
                                </linearGradient>
                            </defs>

                            <!-- Zone remplie -->
                            <polyline
                                points="{chartData.path} 800,300 0,300"
                                fill="url(#chartGradient)"
                                stroke="none"
                            />

                            <!-- Ligne principale -->
                            <polyline
                                points={chartData.path}
                                fill="none"
                                stroke={critical ? '#fc8181' : '#68d391'}
                                stroke-width="2.5"
                                stroke-linejoin="round"
                                stroke-linecap="round"
                            />
                        </svg>

                        <!-- Axe X -->
                        <div class="axis-x">
                            <span>
                                {sensorData.history[0]?.timestamp
                                    ? new Date(sensorData.history[0].timestamp).toLocaleString()
                                    : ''}
                            </span>
                            <span>
                                {sensorData.history[sensorData.history.length - 1]?.timestamp
                                    ? new Date(sensorData.history[sensorData.history.length - 1].timestamp).toLocaleString()
                                    : ''}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Nombre de points -->
                <div class="data-count">
                    {sensorData.history.length} mesures affichées
                </div>

            {:else}
                <div class="no-data-chart">
                    <span>📊</span>
                    <p>Pas assez de données pour cette période</p>
                </div>
            {/if}
        </div>
    </section>

    <!-- Seuils -->
    <section class="thresholds-section">
        <h2>Seuils configurés</h2>
        <div class="thresholds-cards">
            <div class="threshold-card">
                <span>⬇️</span>
                <div>
                    <div class="threshold-label">Seuil minimum</div>
                    <div class="threshold-value">{data.config.criticalMin} {data.config.unit}</div>
                </div>
            </div>
            <div class="threshold-card">
                <span>⬆️</span>
                <div>
                    <div class="threshold-label">Seuil maximum</div>
                    <div class="threshold-value">{data.config.criticalMax} {data.config.unit}</div>
                </div>
            </div>
        </div>
    </section>

</main>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 50%, #0f1419 100%);
        background-attachment: fixed;
        min-height: 100vh;
    }

    main {
        max-width: 1200px;
        margin: 0 auto;
        color: #e2e8f0;
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        padding: 2.5rem;
    }

    /* ── Header ── */
    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    .back-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(26, 31, 46, 0.6);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 0.75rem;
        padding: 0.75rem 1.25rem;
        color: #e2e8f0;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.3s;
    }

    .back-button:hover {
        background: rgba(26, 31, 46, 0.8);
        transform: translateX(-3px);
    }

    .last-updated {
        font-size: 0.875rem;
        color: #94a3b8;
    }

    /* ── Titre ── */
    .sensor-title {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .sensor-icon-large { font-size: 4rem; }

    .title-text {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
    }

    /* ── Status ── */
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 1rem;
        border-radius: 2rem;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .status-badge.status-ok       { background: rgba(104,211,145,0.15); color: #68d391; }
    .status-badge.status-warning  { background: rgba(246,173,85,0.15);  color: #f6ad55; }
    .status-badge.status-critical { background: rgba(252,129,129,0.15); color: #fc8181; }
    .status-badge.status-unknown  { background: rgba(148,163,184,0.15); color: #94a3b8; }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
    }

    /* ── Stats ── */
    .current-stats {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1.5rem;
        margin-bottom: 2rem;
        align-items: start;
    }

    .main-value-card {
        background: rgba(26,31,46,0.6);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.5rem;
        padding: 2rem;
        text-align: center;
        min-width: 200px;
    }

    .main-value-card.status-ok       { border-color: rgba(104,211,145,0.3); }
    .main-value-card.status-warning  { border-color: rgba(246,173,85,0.3);  }
    .main-value-card.status-critical { border-color: rgba(252,129,129,0.3); }

    .card-label {
        font-size: 0.875rem;
        color: #94a3b8;
        margin-bottom: 1rem;
    }

    .big-value {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 0.5rem;
    }

    .big-value .value {
        font-size: 3.5rem;
        font-weight: 800;
        line-height: 1;
    }

    .big-value .unit {
        font-size: 1.25rem;
        color: #94a3b8;
    }

    .stats-cards {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }

    .stat-card {
        background: rgba(26,31,46,0.6);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1rem;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat-label {
        font-size: 0.8rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
    }

    .stat-value.min { color: #63b3ed; }
    .stat-value.avg { color: #68d391; }
    .stat-value.max { color: #fc8181; }

    /* ── Graphique ── */
    .chart-section {
        background: rgba(26,31,46,0.6);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.5rem;
        padding: 2rem;
        margin-bottom: 2rem;
    }

    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .chart-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
    }

    /* ── Sélecteur de période ── */
    .period-selector {
        display: flex;
        gap: 0.5rem;
        background: rgba(10,14,26,0.4);
        padding: 0.35rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(255,255,255,0.06);
    }

    .period-btn {
        padding: 0.4rem 0.9rem;
        border: none;
        border-radius: 0.5rem;
        background: transparent;
        color: #94a3b8;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .period-btn:hover {
        color: #e2e8f0;
        background: rgba(255,255,255,0.05);
    }

    .period-btn.active {
        background: rgba(104,211,145,0.15);
        color: #68d391;
        font-weight: 600;
    }

    .chart-container {
        transition: opacity 0.3s;
    }

    .chart-container.loading {
        opacity: 0.4;
        pointer-events: none;
    }

    .chart-wrapper {
        display: flex;
        gap: 0.75rem;
        align-items: stretch;
    }

    .axis-y {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #94a3b8;
        text-align: right;
        min-width: 50px;
        padding: 4px 0;
    }

    .svg-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .chart-svg {
        width: 100%;
        height: 300px;
        border-radius: 0.75rem;
        background: rgba(10,14,26,0.3);
    }

    .axis-x {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #94a3b8;
        padding: 0 4px;
    }

    .data-count {
        text-align: center;
        font-size: 0.8rem;
        color: #64748b;
        margin-top: 1rem;
    }

    .no-data-chart {
        text-align: center;
        padding: 3rem;
        color: #64748b;
    }

    /* ── Seuils ── */
    .thresholds-section {
        background: rgba(26,31,46,0.6);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.5rem;
        padding: 2rem;
    }

    .thresholds-section h2 {
        margin: 0 0 1.5rem;
        font-size: 1.25rem;
    }

    .thresholds-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .threshold-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: rgba(10,14,26,0.3);
        border-radius: 1rem;
        padding: 1.25rem;
        font-size: 1.5rem;
    }

    .threshold-label {
        font-size: 0.8rem;
        color: #94a3b8;
    }

    .threshold-value {
        font-size: 1.25rem;
        font-weight: 700;
        margin-top: 0.25rem;
    }

    /* ── Animation critique ── */
    @keyframes critical-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(252,129,129,0.4); }
        50%       { box-shadow: 0 0 0 10px rgba(252,129,129,0); }
    }

    .critical-pulse {
        animation: critical-pulse 2s infinite;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
        main { padding: 1.5rem; }

        .current-stats {
            grid-template-columns: 1fr;
        }

        .stats-cards {
            grid-template-columns: repeat(2, 1fr);
        }

        .chart-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
        }

        .thresholds-cards {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 480px) {
        main { padding: 1rem; }

        .period-selector {
            flex-wrap: wrap;
        }

        .big-value .value {
            font-size: 2.5rem;
        }
    }
</style>
