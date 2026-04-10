<svelte:options runes={true} />

<script lang="ts">
  import { Card } from "flowbite-svelte";

  import ChartPanel from "../components/chart/ChartPanel.svelte";
  import InputPanel from "../components/input-panel/InputPanel.svelte";
  import ResultsPanel from "../components/ResultsPanel.svelte";
  import type { ChartId } from "../models/chartOptions";
  import type { ComfortToolController } from "../state/comfortTool/types";

  let {
    toolState,
  }: {
    toolState: ComfortToolController;
  } = $props();

  function handleSelectChart(nextChart: ChartId) {
    toolState.actions.setSelectedChart(nextChart);
  }
</script>

<main id="overview" class="bg-stone-50 px-4 py-4 sm:px-6 lg:px-8">
  <div class="mx-auto max-w-7xl grid gap-4 xl:grid-cols-[25rem_1fr]">
    <aside class="scroll-mt-32">
      <InputPanel {toolState} />
    </aside>

    <section class="grid gap-4">
      <Card size="none" class="border-stone-300 p-3 shadow-sm">
        <ResultsPanel
          activeInputId={toolState.state.ui.activeInputId}
          visibleInputIds={toolState.selectors.getVisibleInputIds()}
          resultSections={toolState.selectors.getResultSections()}
          errorMessage={toolState.state.ui.errorMessage}
          isLoading={toolState.state.ui.isLoading}
          embedded={true}
        />
        <ChartPanel
          title=""
          description=""
          chartResult={toolState.selectors.getCurrentChartResult()}
          isLoading={toolState.state.ui.isLoading}
          emptyMessage={toolState.selectors.getCurrentChartEmptyMessage()}
          heightClass={toolState.selectors.getCurrentChartHeightClass()}
          chartOptions={toolState.selectors.getCurrentChartOptions()}
          selectedChart={toolState.selectors.getCurrentSelectedChart()}
          onSelectChart={handleSelectChart}
          embedded={true}
        />
      </Card>
    </section>
  </div>
</main>

