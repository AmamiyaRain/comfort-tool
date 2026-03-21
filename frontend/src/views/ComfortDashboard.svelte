<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from "svelte";

  import PlotlyChartCard from "../components/PlotlyChartCard.svelte";
  import InputPanel from "../components/InputPanel.svelte";
  import ResultsPanel from "../components/ResultsPanel.svelte";
  import { pmvChartOptions, PmvChartId } from "../models/chartOptions";
  import { ComfortModel } from "../models/comfortModels";
  import { UnitSystem } from "../models/units";
  import { createComfortToolState } from "../state/comfortTool.svelte";

  const toolState = createComfortToolState();

  onMount(() => {
    toolState.scheduleCalculation({ immediate: true });
  });

  function handleToggleUnits() {
    toolState.setUnitSystem(toolState.ui.unitSystem === UnitSystem.SI ? UnitSystem.IP : UnitSystem.SI);
  }

  function handleUpdateField(caseId, fieldKey, value) {
    toolState.updateInput(caseId, fieldKey, value);
  }
</script>

<section id="overview" class="bg-stone-50 scroll-mt-32">
  <section class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,25rem),minmax(0,1fr)]">
      <div id="inputs-panel" class="scroll-mt-32">
        <InputPanel
          selectedModel={toolState.ui.selectedModel}
          compareEnabled={toolState.ui.compareEnabled}
          activeCaseId={toolState.ui.activeCaseId}
          visibleCaseIds={toolState.getVisibleCaseIds()}
          fieldOrder={toolState.getFieldOrder()}
          inputsByCase={toolState.inputsByCase}
          unitSystem={toolState.ui.unitSystem}
          isLoading={toolState.ui.isLoading}
          calculationCount={toolState.ui.calculationCount}
          onSelectModel={toolState.setSelectedModel}
          onToggleCompare={toolState.setCompareEnabled}
          onSelectActiveCase={toolState.setActiveCaseId}
          onToggleCaseVisibility={toolState.toggleCompareCaseVisibility}
          onToggleUnits={handleToggleUnits}
          onUpdateField={handleUpdateField}
        />
      </div>

      <div class="grid min-w-0 self-start gap-4">
        <div id="results-panel" class="scroll-mt-32">
          <div class="w-full min-w-0 border border-stone-300 bg-white p-3 shadow-sm">
            <div class="text-base font-semibold text-stone-900">Results</div>
            <ResultsPanel
              selectedModel={toolState.ui.selectedModel}
              activeCaseId={toolState.ui.activeCaseId}
              visibleCaseIds={toolState.getVisibleCaseIds()}
              pmvResults={toolState.ui.pmvResults}
              utciResults={toolState.ui.utciResults}
              errorMessage={toolState.ui.errorMessage}
              isLoading={toolState.ui.isLoading}
              lastCompletedAt={toolState.ui.lastCompletedAt}
              resultRevision={toolState.ui.resultRevision}
              embedded={true}
            />
            {#if toolState.ui.selectedModel === ComfortModel.Pmv}
              {#if toolState.ui.selectedPmvChart === PmvChartId.Psychrometric}
                <PlotlyChartCard
                  description=""
                  chartResult={toolState.ui.psychrometricChart}
                  isLoading={toolState.ui.isLoading}
                  resultRevision={toolState.ui.resultRevision}
                  emptyMessage="No psychrometric chart yet."
                  heightClass="h-[420px] xl:h-[420px]"
                  chartOptions={pmvChartOptions}
                  selectedChart={toolState.ui.selectedPmvChart}
                  onSelectChart={toolState.setSelectedPmvChart}
                  embedded={true}
                />
              {:else}
                <PlotlyChartCard
                  description=""
                  chartResult={toolState.ui.relativeHumidityChart}
                  isLoading={toolState.ui.isLoading}
                  resultRevision={toolState.ui.resultRevision}
                  emptyMessage="No relative humidity chart yet."
                  heightClass="h-[420px] xl:h-[420px]"
                  chartOptions={pmvChartOptions}
                  selectedChart={toolState.ui.selectedPmvChart}
                  onSelectChart={toolState.setSelectedPmvChart}
                  embedded={true}
                />
              {/if}
            {:else}
              <PlotlyChartCard
                description=""
                chartResult={toolState.ui.utciStressChart}
                isLoading={toolState.ui.isLoading}
                resultRevision={toolState.ui.resultRevision}
                emptyMessage="No UTCI stress visualization yet."
                heightClass="h-[360px] xl:h-[360px]"
                embedded={true}
              />
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>
</section>
