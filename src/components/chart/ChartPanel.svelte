<script lang="ts">
  import { Card } from "flowbite-svelte";
  import ChartResultView from "./ChartResultView.svelte";
  import ChartExportMenu from "./ChartExportMenu.svelte";
  import type { ChartResult } from "../../models/chartResults";
  import type { ChartId, ChartOptions } from "../../models/chartOptions";

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
    chartResult: ChartResult | null;
    isLoading: boolean;
    emptyMessage: string;
    heightClass: string;
    chartOptions: ChartOptions;
    selectedChart: ChartId;
    onSelectChart: (chartId: ChartId) => void;
    embedded?: boolean;
  } = $props();
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
    />
  </header>

  <div class={`mt-4 ${heightClass} relative overflow-hidden rounded-lg bg-stone-50/50`}>
    <ChartResultView {chartResult} {isLoading} {emptyMessage} />
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
