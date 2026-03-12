<script lang="ts">
  import { Card } from "flowbite-svelte";
  import { onMount, tick } from "svelte";

  import SearchableSelect from "./SearchableSelect.svelte";
  import { toPlotlyFigure } from "../services/comfortApi";

  let {
    title,
    description,
    chartResult,
    isLoading,
    resultRevision,
    emptyMessage,
    heightClass = "h-[420px]",
    chartOptions = [],
    selectedChart = "",
    onSelectChart = undefined,
    embedded = false,
    showPlotTitle = false,
  } = $props();

  let chartElement = $state<HTMLDivElement | null>(null);
  let plotlyModule = $state<{
    react: (root: HTMLDivElement, data: unknown[], layout: object, config: object) => Promise<void>;
    purge: (root: HTMLDivElement) => void;
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

{#snippet chartBody()}
  {#if chartOptions.length > 0 && onSelectChart}
    <div class={`grid items-center gap-3 ${embedded ? "mt-0" : "mt-3"} md:grid-cols-[auto,minmax(0,1fr)]`}>
      <div class="text-base font-semibold text-stone-900">Charts</div>
      <SearchableSelect
        class="w-full"
        items={chartOptions}
        value={selectedChart}
        placeholder="Select chart"
        searchPlaceholder="Search chart..."
        onSelect={onSelectChart}
      />
    </div>
  {/if}

  <div class={`relative min-w-0 ${chartOptions.length > 0 && onSelectChart ? "mt-1.5" : "mt-0"}`}>
    <div class={`w-full overflow-hidden bg-white ${embedded ? "" : "border border-stone-300"}`}>
      <div
        class={`plotly-panel h-full w-full min-w-0 max-w-full ${chartHeightStyle ? "" : heightClass}`}
        style={chartHeightStyle}
        bind:this={chartElement}
      ></div>
    </div>

    {#if chartError}
      <div class="absolute inset-0 flex items-center justify-center bg-white/92 p-6 text-sm text-red-600">
        {chartError}
      </div>
    {:else if !chartResult}
      <div class="absolute inset-0 flex items-center justify-center bg-white/92 p-6 text-sm text-stone-500">
        {isLoading ? "Waiting for chart data from the backend..." : emptyMessage}
      </div>
    {:else if isLoading && !hasRenderedChart}
      <div class="absolute inset-0 flex items-center justify-center bg-white/75 p-6 text-sm text-stone-500">
        Rendering chart...
      </div>
    {/if}
  </div>
{/snippet}

{#if embedded}
  <div class="w-full min-w-0 bg-white pt-1.5">
    {@render chartBody()}
  </div>
{:else}
  <Card size="none" class="w-full min-w-0 border border-stone-300 bg-white shadow-sm">
    <div class="flex items-start justify-between gap-3 border-b border-stone-200 pb-2">
      <div>
        <h2 class="text-base font-semibold text-stone-900">{title}</h2>
        {#if description}
          <p class="mt-0.5 text-xs text-stone-500">{description}</p>
        {/if}
      </div>
      <div class="rounded-sm border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-500">
        {isLoading ? "Updating" : "Synced"}
      </div>
    </div>

    {@render chartBody()}
  </Card>
{/if}
