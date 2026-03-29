<svelte:options runes={true} />

<script lang="ts">
  import { Card } from "flowbite-svelte";

  import SearchableSelect from "../SearchableSelect.svelte";
  import ChartExportMenu from "./ChartExportMenu.svelte";
  import PlotlyCanvas from "./PlotlyCanvas.svelte";

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

  let exportChart = $state<((format: "png" | "svg") => Promise<void>) | null>(null);
  let hasChartSelector = $derived(chartOptions.length > 0 && Boolean(onSelectChart));
  let hasControls = $derived(hasChartSelector || Boolean(chartResult));
</script>

{#snippet chartBody()}
  {#if hasControls}
    <header class={`flex flex-col gap-3 ${embedded ? "mt-0" : "mt-3"} ${hasChartSelector ? "md:flex-row md:items-center" : "items-end"}`}>
      {#if hasChartSelector}
        <h3 class="shrink-0 text-base font-semibold text-stone-900">Charts</h3>
      {/if}

      <section class={`flex min-w-0 flex-col gap-2 ${hasChartSelector ? "md:flex-1 sm:flex-row sm:items-center" : "items-end"}`}>
        {#if hasChartSelector}
          <SearchableSelect
            class="w-full min-w-0 flex-1"
            items={chartOptions}
            value={selectedChart}
            placeholder="Select chart"
            searchPlaceholder="Search chart..."
            onSelect={onSelectChart}
          />
        {/if}

        {#if chartResult}
          <ChartExportMenu
            {isLoading}
            onExport={(format) => {
              if (exportChart) {
                void exportChart(format);
              }
            }}
          />
        {/if}
      </section>
    </header>
  {/if}

  <PlotlyCanvas
    {chartResult}
    {isLoading}
    {resultRevision}
    {emptyMessage}
    {heightClass}
    {showPlotTitle}
    onRegisterExport={(handler) => {
      exportChart = handler;
    }}
  />
{/snippet}

{#if embedded}
  <section class="w-full min-w-0 bg-white pt-1.5">
    {@render chartBody()}
  </section>
{:else}
  <Card size="none" class="w-full min-w-0 border border-stone-300 bg-white shadow-sm">
    <header class="flex items-start justify-between gap-3 border-b border-stone-200 pb-2">
      <section>
        <h2 class="text-base font-semibold text-stone-900">{title}</h2>
        {#if description}
          <p class="mt-0.5 text-xs text-stone-500">{description}</p>
        {/if}
      </section>
      <p class="rounded-sm border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-500">
        {isLoading ? "Calculating" : "Ready"}
      </p>
    </header>

    {@render chartBody()}
  </Card>
{/if}
