<script lang="ts">
  import { Card, Heading } from "flowbite-svelte";
  import PlotlyCanvas from "./PlotlyCanvas.svelte";
  import ChartExportMenu from "./ChartExportMenu.svelte";
  import ChartAxisMenu from "./ChartAxisMenu.svelte";
  import ChartLegend from "./ChartLegend.svelte";
  import { ChartId } from "../../models/chartOptions";
  import type { PlotlyChartResponseDto } from "../../models/comfortDtos";

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
    dynamicXAxis,
    dynamicYAxis,
    onSelectXAxis,
    onSelectYAxis,
    dynamicAxisOptions,
    baselineInputId,
    onSelectBaselineInput,
    visibleInputIds = [],
    compareEnabled = false,
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
    dynamicXAxis?: string;
    dynamicYAxis?: string;
    onSelectXAxis?: (fieldKey: string) => void;
    onSelectYAxis?: (fieldKey: string) => void;
    dynamicAxisOptions?: string[];
    baselineInputId?: string;
    onSelectBaselineInput?: (inputId: string) => void;
    visibleInputIds?: string[];
    compareEnabled?: boolean;
    embedded?: boolean;
  } = $props();

  let exportChart: ((type: "png" | "svg") => void) | undefined = $state(undefined);
</script>

{#snippet content()}
  <header class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      {#if title}
        <Heading tag="h3" class="text-sm font-semibold text-stone-900">{title}</Heading>
      {/if}
      {#if description}
        <p class="mt-1 text-xs text-stone-500">{description}</p>
      {/if}
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2">
      {#if (selectedChart === ChartId.PmvDynamic || selectedChart === ChartId.UtciDynamic || selectedChart === ChartId.AdaptiveDynamic) && dynamicXAxis && dynamicYAxis && onSelectXAxis && onSelectYAxis}
        <ChartAxisMenu
          {dynamicXAxis}
          {dynamicYAxis}
          axisOptions={dynamicAxisOptions}
          {baselineInputId}
          {onSelectBaselineInput}
          {visibleInputIds}
          {compareEnabled}
          {onSelectXAxis}
          {onSelectYAxis}
        />
      {/if}
      <ChartExportMenu
        {chartOptions}
        {selectedChart}
        activeChartId={selectedChart}
        onSelectChart={onSelectChart}
        onExport={(type) => exportChart?.(type)}
      />
    </div>
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

  <ChartLegend {selectedChart} />
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
