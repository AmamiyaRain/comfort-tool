<svelte:options runes={true} />

<script lang="ts">
  import PlotlyChartCard from "./PlotlyChartCard.svelte";
  import ResultsPanel from "./ResultsPanel.svelte";
  import type { ComfortToolState } from "../state/comfortTool.svelte";

  let {
    toolState,
  }: {
    toolState: ComfortToolState;
  } = $props();

  function handleSelectChart(nextChart: string) {
    toolState.actions.setSelectedChart(nextChart);
  }
</script>

<div id="results-panel" class="scroll-mt-32">
  <div class="w-full min-w-0 border border-stone-300 bg-white p-3 shadow-sm">
    <div class="text-base font-semibold text-stone-900">Results</div>
    <ResultsPanel
      activeCaseId={toolState.state.ui.activeCaseId}
      visibleCaseIds={toolState.selectors.getVisibleCaseIds()}
      resultSections={toolState.selectors.getResultSections()}
      errorMessage={toolState.state.ui.errorMessage}
      isLoading={toolState.state.ui.isLoading}
      lastCompletedAt={toolState.state.ui.lastCompletedAt}
      resultRevision={toolState.state.ui.resultRevision}
      embedded={true}
    />
    <PlotlyChartCard
      description=""
      chartResult={toolState.selectors.getCurrentChartResult()}
      isLoading={toolState.state.ui.isLoading}
      resultRevision={toolState.state.ui.resultRevision}
      emptyMessage={toolState.selectors.getCurrentChartEmptyMessage()}
      heightClass={toolState.selectors.getCurrentChartHeightClass()}
      chartOptions={toolState.selectors.getCurrentChartOptions()}
      selectedChart={toolState.selectors.getCurrentSelectedChart()}
      onSelectChart={handleSelectChart}
      embedded={true}
    />
  </div>
</div>
