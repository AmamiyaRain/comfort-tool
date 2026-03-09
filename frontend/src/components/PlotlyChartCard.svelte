<script lang="ts">
  import { Card } from "flowbite-svelte";
  import { onMount, tick } from "svelte";

  import { toPlotlyFigure } from "../services/comfortApi";

  let {
    title,
    description,
    chartResult,
    isLoading,
    resultRevision,
    emptyMessage,
    heightClass = "h-[420px]",
  } = $props();

  let chartElement = $state<HTMLDivElement | null>(null);
  let plotlyModule = $state<{
    react: (root: HTMLDivElement, data: unknown[], layout: object, config: object) => Promise<void>;
    purge: (root: HTMLDivElement) => void;
  } | null>(null);
  let hasRenderedChart = $state(false);
  let chartError = $state("");

  async function loadPlotly() {
    if (plotlyModule) {
      return plotlyModule;
    }
    const importedModule = await import("plotly.js-dist-min");
    plotlyModule = (importedModule.default ?? importedModule) as typeof plotlyModule;
    return plotlyModule;
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
    return () => {
      if (chartElement && plotlyModule) {
        plotlyModule.purge(chartElement);
      }
    };
  });

  $effect(() => {
    resultRevision;
    chartResult;
    void renderChart();
  });
</script>

<Card size="none" class="w-full min-w-0 border border-stone-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold text-stone-950">{title}</h2>
      <p class="mt-2 text-sm leading-6 text-stone-600">{description}</p>
    </div>
    <div class="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
      {isLoading ? "Updating" : "Synced"}
    </div>
  </div>

  <div class="relative mt-6 min-w-0">
    <div class={`plotly-panel w-full min-w-0 rounded-[1.5rem] border border-stone-200 bg-stone-50 ${heightClass}`} bind:this={chartElement}></div>

    {#if chartError}
      <div class="absolute inset-0 flex items-center justify-center rounded-[1.5rem] bg-stone-50/92 p-6 text-sm text-red-600">
        {chartError}
      </div>
    {:else if !chartResult}
      <div class="absolute inset-0 flex items-center justify-center rounded-[1.5rem] bg-stone-50/92 p-6 text-sm text-stone-500">
        {isLoading ? "Waiting for chart data from the backend..." : emptyMessage}
      </div>
    {:else if isLoading && !hasRenderedChart}
      <div class="absolute inset-0 flex items-center justify-center rounded-[1.5rem] bg-stone-50/75 p-6 text-sm text-stone-500">
        Rendering chart...
      </div>
    {/if}
  </div>
</Card>
