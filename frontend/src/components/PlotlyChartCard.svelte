<script lang="ts">
  import { Button, Card, Dropdown, DropdownItem } from "flowbite-svelte";
  import { onMount, tick } from "svelte";

  import SearchableSelect from "./SearchableSelect.svelte";
  import { toPlotlyFigure } from "../services/plotlyFigure";

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
  let exportMenuOpen = $state(false);
  let plotlyModule = $state<{
    react: (root: HTMLDivElement, data: unknown[], layout: object, config: object) => Promise<void>;
    purge: (root: HTMLDivElement) => void;
    downloadImage: (root: HTMLDivElement, options: Record<string, unknown>) => Promise<void>;
  } | null>(null);
  let hasRenderedChart = $state(false);
  let chartError = $state("");
  const exportTriggerId = `plotly-export-${Math.random().toString(36).slice(2, 10)}`;
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
    const titleText = chartResult?.layout?.title?.trim() || title || "cbe-thermal-comfort-chart";
    return titleText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cbe-thermal-comfort-chart";
  }

  async function exportChart(format: "png" | "svg") {
    if (!chartElement || !chartResult) {
      return;
    }

    exportMenuOpen = false;

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

  {#if chartResult}
    <div class={`flex items-center justify-end ${chartOptions.length > 0 && onSelectChart ? "mt-2" : "mb-2"}`}>
      <Button
        id={exportTriggerId}
        type="button"
        size="xs"
        color="alternative"
        class="gap-2 rounded-lg border-stone-200 bg-white text-stone-700 hover:bg-stone-50 focus-within:ring-sky-200"
        disabled={isLoading}
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <path d="M10 3.5v8.25"></path>
          <path d="m6.75 8.75 3.25 3.25 3.25-3.25"></path>
          <path d="M4 14.5h12"></path>
        </svg>
        <span>Export</span>
        <svg class="h-3 w-3 text-stone-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.12l3.71-3.89a.75.75 0 1 1 1.08 1.04l-4.25 4.46a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"></path>
        </svg>
      </Button>

      <Dropdown
        bind:open={exportMenuOpen}
        triggeredBy={`#${exportTriggerId}`}
        placement="bottom-end"
        arrow={false}
        class="w-52 py-1"
        containerClass="z-30 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/70"
        headerClass="border-b border-stone-100 px-4 py-2"
      >
        <div slot="header" class="text-[11px] uppercase tracking-[0.16em] text-stone-500">
          Download chart
        </div>
        <DropdownItem class="flex items-center justify-between gap-3 text-stone-700 hover:bg-stone-50" onclick={() => void exportChart("png")}>
          <span>Download PNG</span>
          <span class="text-[11px] uppercase tracking-[0.12em] text-stone-400">Image</span>
        </DropdownItem>
        <DropdownItem class="flex items-center justify-between gap-3 text-stone-700 hover:bg-stone-50" onclick={() => void exportChart("svg")}>
          <span>Download SVG</span>
          <span class="text-[11px] uppercase tracking-[0.12em] text-stone-400">Vector</span>
        </DropdownItem>
      </Dropdown>
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
        {isLoading ? "Calculating chart..." : emptyMessage}
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
        {isLoading ? "Calculating" : "Ready"}
      </div>
    </div>

    {@render chartBody()}
  </Card>
{/if}
