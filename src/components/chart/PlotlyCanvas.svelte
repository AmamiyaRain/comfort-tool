<svelte:options runes={true} />

<script lang="ts">
  import { onMount, tick } from "svelte";

  import { toPlotlyFigure } from "../../services/plotlyFigure";

  let {
    chartResult,
    isLoading,
    emptyMessage,
    heightClass = "h-[420px]",
    showPlotTitle = false,
    onRegisterExport = undefined,
  } = $props();

  let chartElement = $state<HTMLDivElement | null>(null);
  let plotlyModule = $state<{
    react: (root: HTMLDivElement, data: unknown[], layout: object, config: object) => Promise<void>;
    purge: (root: HTMLDivElement) => void;
    downloadImage: (root: HTMLDivElement, options: Record<string, unknown>) => Promise<void>;
  } | null>(null);
  let hasRenderedChart = $state(false);
  let chartError = $state("");
  let chartHeightStyle = $derived(
    chartResult?.layout?.height && chartResult.layout.height > 0 ? `height: ${chartResult.layout.height}px;` : undefined,
  );

  async function loadPlotly() {
    if (plotlyModule) {
      return plotlyModule;
    }
    const importedModule = await import("plotly.js-dist-min");
    plotlyModule = (importedModule.default ?? importedModule) as typeof plotlyModule;
    return plotlyModule;
  }

  function getExportFilename() {
    const titleText = chartResult?.layout?.title?.trim() || "cbe-thermal-comfort-chart";
    return titleText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cbe-thermal-comfort-chart";
  }

  async function exportChart(format: "png" | "svg") {
    if (!chartElement || !chartResult) {
      return;
    }

    try {
      const plotly = await loadPlotly();
      await plotly.downloadImage(chartElement, {
        format,
        filename: getExportFilename(),
        ...(format === "png" ? { scale: 2 } : {}),
      });
    } catch (error) {
      chartError = error instanceof Error ? error.message : "Chart export failed.";
    }
  }

  async function renderChart() {
    if (!chartResult) {
      hasRenderedChart = false;
      chartError = "";
      return;
    }
    if (!chartElement) {
      await tick();
    }
    if (!chartElement) {
      return;
    }
    try {
      const plotly = await loadPlotly();
      const chartPayload = JSON.parse(JSON.stringify(chartResult));
      const figure = toPlotlyFigure(chartPayload);
      if (!showPlotTitle) {
        figure.layout.title = undefined;
        if (typeof figure.layout.margin?.t === "number") {
          figure.layout.margin = {
            ...figure.layout.margin,
            t: Math.max(24, figure.layout.margin.t - 24),
          };
        }
      }
      chartError = "";
      await plotly.react(chartElement, figure.data, figure.layout, figure.config);
      hasRenderedChart = true;
    } catch (error) {
      hasRenderedChart = false;
      chartError = error instanceof Error ? error.message : "Chart rendering failed.";
    }
  }

  onMount(() => {
    void renderChart();
    if (onRegisterExport) {
      onRegisterExport(exportChart);
    }

    return () => {
      if (chartElement && plotlyModule) {
        plotlyModule.purge(chartElement);
      }
    };
  });

  $effect(() => {
    chartResult;
    if (onRegisterExport) {
      onRegisterExport(exportChart);
    }
    void renderChart();
  });
</script>

<figure class="relative mt-2 min-w-0">
  <section class="w-full overflow-hidden bg-white">
    <div
      class={`plotly-panel h-full w-full min-w-0 max-w-full ${chartHeightStyle ? "" : heightClass}`}
      style={chartHeightStyle}
      bind:this={chartElement}
    ></div>
  </section>

  {#if chartError}
    <p class="absolute inset-0 flex items-center justify-center bg-white/92 p-6 text-sm text-red-600">
      {chartError}
    </p>
  {:else if !chartResult}
    <p class="absolute inset-0 flex items-center justify-center bg-white/92 p-6 text-sm text-stone-500">
      {isLoading ? "Calculating chart..." : emptyMessage}
    </p>
  {:else if isLoading && !hasRenderedChart}
    <p class="absolute inset-0 flex items-center justify-center bg-white/75 p-6 text-sm text-stone-500">
      Rendering chart...
    </p>
  {/if}
</figure>
