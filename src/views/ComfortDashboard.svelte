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

<section id="overview" class="bg-stone-50 scroll-mt-32">
  <section class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
    <section class="grid items-start gap-4 xl:grid-cols-[minmax(0,25rem),minmax(0,1fr)]">
      <aside id="inputs-panel" class="scroll-mt-32">
        <InputPanel {toolState} />
      </aside>

      <section class="grid min-w-0 self-start gap-4">
        <section id="results-panel" class="scroll-mt-32">
          <Card size="none" class="w-full min-w-0 border border-stone-300 bg-white shadow-sm">
            <section class="p-3">
              <h2 class="text-base font-semibold text-stone-900">Results</h2>
              <ResultsPanel
                activeInputId={toolState.state.ui.activeInputId}
                visibleInputIds={toolState.selectors.getVisibleInputIds()}
                resultSections={toolState.selectors.getResultSections()}
                errorMessage={toolState.state.ui.errorMessage}
                isLoading={toolState.state.ui.isLoading}
                embedded={true}
              />
              <ChartPanel
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
            </section>
          </Card>
        </section>
      </section>
    </section>
  </section>
</section>
