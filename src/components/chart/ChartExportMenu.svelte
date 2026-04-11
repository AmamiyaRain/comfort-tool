<script lang="ts">
  import { Button, Dropdown, DropdownItem } from "flowbite-svelte";
  import { chartMetaById } from "../../models/chartOptions";
  import type { ChartId } from "../../models/chartOptions";

  let {
    chartOptions,
    selectedChart,
    activeChartId,
    onSelectChart,
    onExport,
  }: {
    chartOptions: Array<{ name: string; value: ChartId }>;
    selectedChart: ChartId;
    activeChartId: ChartId;
    onSelectChart: (chartId: ChartId) => void;
    onExport: (type: "png" | "svg") => void;
  } = $props();

  const currentChartLabel = $derived(chartMetaById[activeChartId].name);
</script>

<Button
  id={`chart-select-trigger-${activeChartId}`}
  color="light"
  pill
  size="xs"
>
  {currentChartLabel}
  <svg class="ms-2 h-3 w-3" aria-hidden="true" fill="none" viewBox="0 0 10 6">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
  </svg>
</Button>

<Dropdown triggeredBy={`#chart-select-trigger-${activeChartId}`} class="w-48 shadow-lg">
  <div slot="header" class="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
    Select Chart
  </div>
  {#each chartOptions as option}
    <DropdownItem
      onclick={() => onSelectChart(option.value)}
      class="text-left"
    >
      <span class={selectedChart === option.value ? "font-bold text-teal-700" : "text-stone-700"}>
        {option.name}
      </span>
    </DropdownItem>
  {/each}

  <div class="mt-1 border-t border-stone-100 px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
    Export options
  </div>
  <DropdownItem class="text-left text-sm text-stone-700" onclick={() => onExport("png")}>
    Export as image (PNG)
  </DropdownItem>
  <DropdownItem class="text-left text-sm text-stone-700" onclick={() => onExport("svg")}>
    Export as vector (SVG)
  </DropdownItem>
</Dropdown>
