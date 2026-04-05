<script lang="ts">
  import { Card } from "flowbite-svelte";
  import PlotlyCanvas from "./PlotlyCanvas.svelte";
  import ChartExportMenu from "./ChartExportMenu.svelte";
  import type { ChartId } from "../../models/chartOptions";
  import type { PlotlyChartResponseDto } from "../../models/dto";

  let {
    title,
    description,
    chartResult,
    isLoading,
    emptyMessage,
    heightClass,
    chartOptions,
    selectedChart,
    onSelectChart,
    embedded = false,
  }: {
    title: string;
    description: string;
    chartResult: PlotlyChartResponseDto | null;
    isLoading: boolean;
    emptyMessage: string;
    heightClass: string;
    chartOptions: Array<{ name: string; value: ChartId }>;
    selectedChart: ChartId;
    onSelectChart: (chartId: ChartId) => void;
    embedded?: boolean;
  } = $props();

  let exportChart: ((type: "png" | "svg") => void) | undefined = $state(undefined);
</script>

{#snippet content()}
  <header class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      {#if title}
        <h3 class="text-sm font-semibold text-stone-900">{title}</h3>
      {/if}
      {#if description}
        <p class="mt-1 text-xs text-stone-500">{description}</p>
      {/if}
    </div>

    <ChartExportMenu
      {chartOptions}
      {selectedChart}
      activeChartId={selectedChart}
      onSelectChart={onSelectChart}
      onExport={(type) => exportChart?.(type)}
    />
  </header>

  <div class={`mt-4 ${heightClass} relative overflow-hidden rounded-lg bg-stone-50/50`}>
    <PlotlyCanvas
      {chartResult}
      {isLoading}
      {emptyMessage}
      {heightClass}
      onRegisterExport={(handler) => (exportChart = handler)}
    />
  </div>
{/snippet}

{#if embedded}
  <div class="mt-4 border-t border-stone-200 pt-4">
    {@render content()}
  </div>
{:else}
  <Card size="none" class="w-full border-stone-300 p-4 shadow-sm">
    {@render content()}
  </Card>
{/if}
