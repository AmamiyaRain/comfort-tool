<svelte:options runes={true} />

<script>
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
  const P_ATM = 101325;

  const inputs = $state({
    tdb: 25.0,
    tr: 25.0,
    vr: 0.1,
    rh: 50.0,
    met: 1.2,
    clo: 0.5,
    wme: 0.0,
  });

  const ui = $state({
    units: "SI",
    loading: false,
    error: "",
    result: null,
    comfortZone: null,
  });

  let activeController = null;
  let requestToken = 0;

  const fields = [
    { key: "tdb", label: "Air temperature", si: "degC", ip: "degF", step: 0.1 },
    { key: "tr", label: "Radiant temperature", si: "degC", ip: "degF", step: 0.1 },
    { key: "vr", label: "Air speed", si: "m/s", ip: "ft/s", step: 0.01 },
    { key: "rh", label: "Relative humidity", si: "%", ip: "%", step: 1 },
    { key: "met", label: "Metabolic rate", si: "met", ip: "met", step: 0.1 },
    { key: "clo", label: "Clothing insulation", si: "clo", ip: "clo", step: 0.1 },
    { key: "wme", label: "External work", si: "met", ip: "met", step: 0.1 },
  ];

  function siToIp(key, value) {
    if (key === "tdb" || key === "tr") return value * (9 / 5) + 32;
    if (key === "vr") return value / 0.3048;
    return value;
  }

  function ipToSi(key, value) {
    if (key === "tdb" || key === "tr") return (value - 32) * (5 / 9);
    if (key === "vr") return value * 0.3048;
    return value;
  }

  function formatValue(key, value, step) {
    if (key === "rh") return value.toFixed(0);
    return value.toFixed(step < 0.1 ? 2 : 1);
  }

  const display = $derived({
    tdb: ui.units === "SI" ? inputs.tdb : siToIp("tdb", inputs.tdb),
    tr: ui.units === "SI" ? inputs.tr : siToIp("tr", inputs.tr),
    vr: ui.units === "SI" ? inputs.vr : siToIp("vr", inputs.vr),
    rh: inputs.rh,
    met: inputs.met,
    clo: inputs.clo,
    wme: inputs.wme,
  });

  function updateField(key, raw) {
    const next = Number(raw);
    if (Number.isNaN(next)) return;
    inputs[key] = ui.units === "SI" ? next : ipToSi(key, next);
  }

  function snapshot() {
    return {
      tdb: Number(inputs.tdb),
      tr: Number(inputs.tr),
      vr: Number(inputs.vr),
      rh: Number(inputs.rh),
      met: Number(inputs.met),
      clo: Number(inputs.clo),
      wme: Number(inputs.wme),
      units: "SI",
    };
  }

  async function postJson(path, payload, signal) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed: ${path}`);
    }
    return response.json();
  }

  async function requestBackendCalculation() {
    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;
    const token = ++requestToken;
    const timeoutId = setTimeout(() => controller.abort("timeout"), 8000);
    ui.loading = true;
    ui.error = "";

    try {
      const payload = snapshot();
      const [result, comfortZone] = await Promise.all([
        postJson("/api/ashrae55/pmv", payload, controller.signal),
        postJson(
          "/api/ashrae55/comfort-zone",
          {
            ...payload,
            rh_min: 0,
            rh_max: 100,
            rh_points: 31,
          },
          controller.signal,
        ),
      ]);
      if (token !== requestToken || activeController !== controller) return;
      ui.result = result;
      ui.comfortZone = comfortZone;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        const isTimeout = controller.signal.aborted && controller.signal.reason === "timeout";
        if (isTimeout && token === requestToken && activeController === controller) {
          ui.result = null;
          ui.comfortZone = null;
          ui.error = "Request timed out. Check backend status at /api/health.";
        }
        return;
      }
      if (token !== requestToken || activeController !== controller) return;
      ui.result = null;
      ui.comfortZone = null;
      ui.error =
        error instanceof Error && error.message ? error.message : "Backend request failed";
    } finally {
      clearTimeout(timeoutId);
      if (token === requestToken && activeController === controller) {
        ui.loading = false;
        activeController = null;
      }
    }
  }

  function onFieldInput(key, value) {
    updateField(key, value);
  }

  function saturationPressurePa(tC) {
    return 611.21 * Math.exp((18.678 - tC / 234.5) * (tC / (257.14 + tC)));
  }

  function humidityRatioGkg(tC, rhPercent) {
    const pws = saturationPressurePa(tC);
    const rh = Math.max(0, Math.min(1, rhPercent / 100));
    const pw = rh * pws;
    if (pw >= P_ATM) return 0;
    return (0.62198 * pw) / (P_ATM - pw) * 1000;
  }

  const psychChart = $derived.by(() => {
    const width = 700;
    const height = 360;
    const padding = { left: 52, right: 24, top: 20, bottom: 40 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const xMin = 10;
    const xMax = 40;
    const yMin = 0;
    const yMax = 30;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const x = (value) => padding.left + ((value - xMin) / (xMax - xMin)) * innerWidth;
    const y = (value) => padding.top + ((yMax - clamp(value, yMin, yMax)) / (yMax - yMin)) * innerHeight;
    const snap = (value) => Math.round(value) + 0.5;
    const xLine = (value) => snap(x(value));
    const yLine = (value) => snap(y(value));

    const tempPoints = Array.from({ length: 121 }, (_, i) => xMin + (i * (xMax - xMin)) / 120);
    const rhLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const rhCurves = [];

    for (const rhValue of rhLevels) {
      const points = tempPoints
        .map((t) => ({ t, w: humidityRatioGkg(t, rhValue) }))
        .filter((pt) => Number.isFinite(pt.w) && pt.w >= yMin && pt.w <= yMax);
      if (points.length < 2) continue;
      const path = points
        .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${x(pt.t).toFixed(2)} ${y(pt.w).toFixed(2)}`)
        .join(" ");
      rhCurves.push({ rh: rhValue, path });
    }

    let comfortPath = null;
    const coolEdgeRaw = ui.comfortZone?.cool_edge ?? [];
    const warmEdgeRaw = ui.comfortZone?.warm_edge ?? [];
    const coolEdge = coolEdgeRaw
      .map((p) => ({ t: p.tdb, w: clamp(humidityRatioGkg(p.tdb, p.rh), yMin, yMax) }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.w));
    const warmEdge = warmEdgeRaw
      .map((p) => ({ t: p.tdb, w: clamp(humidityRatioGkg(p.tdb, p.rh), yMin, yMax) }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.w));
    if (coolEdge.length >= 4 && warmEdge.length >= 4) {
      const polygon = [...coolEdge, ...[...warmEdge].reverse()];
      comfortPath =
        polygon
          .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${x(pt.t).toFixed(2)} ${y(pt.w).toFixed(2)}`)
          .join(" ") + " Z";
    }

    const currentW = humidityRatioGkg(inputs.tdb, inputs.rh);

    return {
      width,
      height,
      x,
      y,
      xLine,
      yLine,
      xTicks: [10, 15, 20, 25, 30, 35, 40],
      yTicks: [0, 5, 10, 15, 20, 25, 30],
      rhCurves,
      comfortPath,
      currentX: x(inputs.tdb),
      currentY: y(currentW),
    };
  });

  function temperatureLabel(tC) {
    if (ui.units === "SI") return `${tC.toFixed(0)} degC`;
    return `${siToIp("tdb", tC).toFixed(0)} degF`;
  }

</script>

<main class="page">
  <section class="header">
    <h1>CBE Thermal Comfort Tool: Minimal ASHRAE 55 Demo</h1>
    <p>Backend-driven PMV/PPD with manual calculation trigger.</p>
  </section>

  <section class="layout">
    <article class="card">
      <div class="card-head">
        <h2>Inputs</h2>
        <div class="units">
          <button class:active={ui.units === "SI"} onclick={() => (ui.units = "SI")}>SI</button>
          <button class:active={ui.units === "IP"} onclick={() => (ui.units = "IP")}>IP</button>
        </div>
      </div>

      <div class="form">
        {#each fields as field}
          <label class="field" for={field.key}>
            <span class="field-label">
              <span>{field.label}</span>
              <span>{ui.units === "SI" ? field.si : field.ip}</span>
            </span>
            <input
              id={field.key}
              type="number"
              step={field.step}
              value={formatValue(field.key, display[field.key], field.step)}
              oninput={(event) => onFieldInput(field.key, event.currentTarget.value)}
            />
          </label>
        {/each}

        <button class="calc-btn" onclick={requestBackendCalculation} disabled={ui.loading}>
          {ui.loading ? "Calculating..." : "Calculate"}
        </button>
      </div>
    </article>

    <article class="card">
      <div class="card-head">
        <h2>Psychrometric (air temperature)</h2>
      </div>

      <div class="results">
        {#if ui.error}
          <p class="warn">Error: {ui.error}</p>
        {/if}

        {#if ui.result}
          <section class="metrics-grid">
            <section class="metric metric-accept">
              <p class={ui.result.acceptable_80 ? "ok" : "warn"}>
                {ui.result.acceptable_80 ? "Pass" : "Fail"}
              </p>
              <p class="metric-sub">{(100 - ui.result.ppd).toFixed(1)}%</p>
            </section>

            <section class="metric metric-pmv">
              <h3>PMV</h3>
              <p>{ui.result.pmv.toFixed(3)}</p>
            </section>

            <section class="metric metric-ppd">
              <h3>PPD</h3>
              <p>{ui.result.ppd.toFixed(1)}%</p>
            </section>
          </section>
        {:else}
          <p class="note">{ui.loading ? "Loading..." : "Waiting for first calculation."}</p>
        {/if}

        <section>

          <svg viewBox={`0 0 ${psychChart.width} ${psychChart.height}`} role="img" aria-label="Psychrometric chart">
            {#each psychChart.yTicks as yTick}
              <line x1={psychChart.xLine(10)} y1={psychChart.yLine(yTick)} x2={psychChart.xLine(40)} y2={psychChart.yLine(yTick)} class="grid-line" />
              <text x="10" y={psychChart.y(yTick) + 4} class="axis-text">{yTick}</text>
            {/each}

            {#each psychChart.xTicks as xTick}
              <line x1={psychChart.xLine(xTick)} y1={psychChart.yLine(0)} x2={psychChart.xLine(xTick)} y2={psychChart.yLine(30)} class="grid-line-v" />
              <text x={psychChart.x(xTick)} y={psychChart.height - 12} class="axis-text axis-text-bottom">
                {temperatureLabel(xTick)}
              </text>
            {/each}

            {#if psychChart.comfortPath}
              <path d={psychChart.comfortPath} class="comfort-zone" />
            {/if}

            {#each psychChart.rhCurves as curve}
              <path d={curve.path} class="rh-line" />
            {/each}

            <circle cx={psychChart.currentX} cy={psychChart.currentY} r="5" class="current-dot" />
            <text x={psychChart.currentX + 8} y={psychChart.currentY - 8} class="current-label">Current</text>
          </svg>
        </section>
      </div>
    </article>
  </section>
</main>
