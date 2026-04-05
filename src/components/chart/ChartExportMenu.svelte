<script lang="ts">
  import { Button, Dropdown, DropdownItem } from "flowbite-svelte";
  import { chartMetaById, chartOrder } from "../../models/chartOptions";
  import type { ChartId, ChartOptions } from "../../models/chartOptions";

  let {
    chartOptions,
    selectedChart,
    activeChartId,
    onSelectChart,
  }: {
    chartOptions: ChartOptions;
    selectedChart: ChartId;
    activeChartId: ChartId;
    onSelectChart: (chartId: ChartId) => void;
  } = $props();

  const currentChartLabel = $derived(chartMetaById[activeChartId].label);
</script>

<div class="relative inline-block text-left">
  <Button
    id={`chart-select-trigger-${activeChartId}`}
    color="light"
    pill
    size="xs"
    class="flex items-center gap-2 border-stone-200 bg-white px-3 py-1.5 font-semibold text-stone-700 hover:border-stone-300 hover:bg-stone-50"
  >
    {currentChartLabel}
    <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
    </svg>
  </Button>

  <Dropdown triggeredBy={`#chart-select-trigger-${activeChartId}`} class="w-56 overflow-hidden rounded-xl py-1 shadow-lg">
    <header class="border-b border-stone-100 px-4 py-2">
      <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Select Chart</p>
    </header>
    {#each chartOrder as chartId}
      <DropdownItem
        onclick={() => onSelectChart(chartId)}
        class="flex flex-col items-start gap-0.5 px-4 py-2 text-left"
      >
        <span class={selectedChart === chartId ? "font-bold text-teal-700" : "text-stone-700"}>
          {chartMetaById[chartId].label}
        </span>
      </DropdownItem>
    {/each}

    <header class="mt-2 border-b border-stone-100 px-4 py-2">
      <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Export options</p>
    </header>
    <DropdownItem class="px-4 py-2 text-left text-sm text-stone-700" onclick={() => chartOptions.actions.exportAsCsv()}>
      Export data (CSV)
    </DropdownItem>
    <DropdownItem class="px-4 py-2 text-left text-sm text-stone-700" onclick={() => chartOptions.actions.exportAsJson()}>
      Export data (JSON)
    </DropdownItem>
    <div class="my-1 border-t border-stone-100"></div>
    <DropdownItem class="px-4 py-2 text-left text-sm text-stone-700" onclick={() => chartOptions.actions.exportAsImage()}>
      Export as image (PNG)
    </DropdownItem>
  </Dropdown>
</div>
