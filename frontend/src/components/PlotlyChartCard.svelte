<svelte:options runes={true} />

<script lang="ts">
  import ChartPanel from "./chart/ChartPanel.svelte";

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
</script>

<ChartPanel
  {title}
  {description}
  {chartResult}
  {isLoading}
  {resultRevision}
  {emptyMessage}
  {heightClass}
  {chartOptions}
  {selectedChart}
  {onSelectChart}
  {embedded}
  {showPlotTitle}
/>
