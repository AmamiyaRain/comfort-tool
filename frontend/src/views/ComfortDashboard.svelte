<svelte:options runes={true} />

<script lang="ts">
  import PlotlyChartCard from "../components/PlotlyChartCard.svelte";
  import InputPanel from "../components/InputPanel.svelte";
  import ResultsPanel from "../components/ResultsPanel.svelte";
  import {
    pmvChartOptions,
    PmvChartId,
    UtciChartId,
    utciChartOptions,
    type PmvChartId as PmvChartIdType,
    type UtciChartId as UtciChartIdType,
  } from "../models/chartOptions";
  import { ComfortModel } from "../models/comfortModels";
  import { UnitSystem } from "../models/units";
  import type { ComfortToolState } from "../state/comfortTool.svelte";

  let {
    toolState,
  }: {
    toolState: ComfortToolState;
  } = $props();

  function handleToggleUnits() {
    toolState.setUnitSystem(toolState.ui.unitSystem === UnitSystem.SI ? UnitSystem.IP : UnitSystem.SI);
  }

  function handleUpdateField(caseId, fieldKey, value) {
    toolState.updateInput(caseId, fieldKey, value);
  }

  const currentChartResult = $derived.by(() => {
    if (toolState.ui.selectedModel === ComfortModel.Pmv) {
      return toolState.ui.selectedPmvChart === PmvChartId.Psychrometric
        ? toolState.ui.psychrometricChart
        : toolState.ui.relativeHumidityChart;
    }

    return toolState.ui.selectedUtciChart === UtciChartId.Stress
      ? toolState.ui.utciStressChart
      : toolState.ui.utciTemperatureChart;
  });

  const currentChartEmptyMessage = $derived.by(() => {
    if (toolState.ui.selectedModel === ComfortModel.Pmv) {
      return toolState.ui.selectedPmvChart === PmvChartId.Psychrometric
        ? "No psychrometric chart yet."
        : "No relative humidity chart yet.";
    }

    return toolState.ui.selectedUtciChart === UtciChartId.Stress
      ? "No UTCI stress visualization yet."
      : "No UTCI temperature comparison yet.";
  });

  const currentChartOptions = $derived.by(() => (
    toolState.ui.selectedModel === ComfortModel.Pmv ? pmvChartOptions : utciChartOptions
  ));

  const currentSelectedChart = $derived.by(() => (
    toolState.ui.selectedModel === ComfortModel.Pmv ? toolState.ui.selectedPmvChart : toolState.ui.selectedUtciChart
  ));

  function handleSelectChart(nextChart: string) {
    if (toolState.ui.selectedModel === ComfortModel.Pmv) {
      toolState.setSelectedPmvChart(nextChart as PmvChartIdType);
      return;
    }

    toolState.setSelectedUtciChart(nextChart as UtciChartIdType);
  }
</script>

<section id="overview" class="bg-stone-50 scroll-mt-32">
  <section class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,25rem),minmax(0,1fr)]">
      <div id="inputs-panel" class="scroll-mt-32">
        <InputPanel
          selectedModel={toolState.ui.selectedModel}
          selectedPmvChart={toolState.ui.selectedPmvChart}
          compareEnabled={toolState.ui.compareEnabled}
          activeCaseId={toolState.ui.activeCaseId}
          visibleCaseIds={toolState.getVisibleCaseIds()}
          fieldOrder={toolState.getFieldOrder()}
          inputsByCase={toolState.inputsByCase}
          measuredAirSpeedByCase={toolState.measuredAirSpeedByCase}
          dewPointByCase={toolState.dewPointByCase}
          humidityRatioByCase={toolState.humidityRatioByCase}
          wetBulbByCase={toolState.wetBulbByCase}
          vaporPressureByCase={toolState.vaporPressureByCase}
          unitSystem={toolState.ui.unitSystem}
          isLoading={toolState.ui.isLoading}
          calculationCount={toolState.ui.calculationCount}
          pmvTemperatureInputMode={toolState.ui.pmvTemperatureInputMode}
          pmvAirSpeedControlMode={toolState.ui.pmvAirSpeedControlMode}
          pmvAirSpeedInputMode={toolState.ui.pmvAirSpeedInputMode}
          pmvHumidityInputMode={toolState.ui.pmvHumidityInputMode}
          onSelectModel={toolState.setSelectedModel}
          onToggleCompare={toolState.setCompareEnabled}
          onSelectActiveCase={toolState.setActiveCaseId}
          onToggleCaseVisibility={toolState.toggleCompareCaseVisibility}
          onToggleUnits={handleToggleUnits}
          onSetPmvTemperatureInputMode={toolState.setPmvTemperatureInputMode}
          onSetPmvAirSpeedControlMode={toolState.setPmvAirSpeedControlMode}
          onSetPmvAirSpeedInputMode={toolState.setPmvAirSpeedInputMode}
          onSetPmvHumidityInputMode={toolState.setPmvHumidityInputMode}
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
            <PlotlyChartCard
              description=""
              chartResult={currentChartResult}
              isLoading={toolState.ui.isLoading}
              resultRevision={toolState.ui.resultRevision}
              emptyMessage={currentChartEmptyMessage}
              heightClass={
                toolState.ui.selectedModel === ComfortModel.Pmv
                  ? "h-[420px] xl:h-[420px]"
                  : toolState.ui.selectedUtciChart === UtciChartId.Stress
                    ? "h-[360px] xl:h-[360px]"
                    : "h-[380px] xl:h-[380px]"
              }
              chartOptions={currentChartOptions}
              selectedChart={currentSelectedChart}
              onSelectChart={handleSelectChart}
              embedded={true}
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</section>
