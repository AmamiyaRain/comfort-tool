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

<Dropdown triggeredBy={`#chart-select-trigger-${activeChartId}`} class="w-48">
  <div slot="header" class="px-4 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider">
    Select Chart
  </div>
  <!-- Chart Selection Section -->
  {#each chartOptions as option}
    <DropdownItem
      onclick={() => onSelectChart(option.value)}
      class="text-left"
    >
      <span class={selectedChart === option.value ? "font-bold text-teal-700" : ""}>
        {option.name}
      </span>
    </DropdownItem>
  {/each}

  <!-- Export Section Divider & Label -->
  <div class="px-4 py-2 text-xs font-medium text-stone-500 border-t border-stone-100 mt-1 uppercase tracking-wider">
    Export options
  </div>
  <DropdownItem onclick={() => onExport("png")}>
    Export as image (PNG)
  </DropdownItem>
  <DropdownItem onclick={() => onExport("svg")}>
    Export as vector (SVG)
  </DropdownItem>
</Dropdown>
