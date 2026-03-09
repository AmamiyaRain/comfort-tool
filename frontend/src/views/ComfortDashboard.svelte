<svelte:options runes={true} />

<script lang="ts">
  import { Button, Card } from "flowbite-svelte";
  import PlotlyChartCard from "../components/PlotlyChartCard.svelte";
  import InputPanel from "../components/InputPanel.svelte";
  import ResultsPanel from "../components/ResultsPanel.svelte";
  import { ComfortModel } from "../models/comfortModels";
  import { UnitSystem } from "../models/units";
  import { createComfortToolState } from "../state/comfortTool.svelte";

  const toolState = createComfortToolState();

  function handleToggleUnits() {
    toolState.setUnitSystem(toolState.ui.unitSystem === UnitSystem.SI ? UnitSystem.IP : UnitSystem.SI);
  }

  function handleCalculate() {
    void toolState.refresh();
  }

  function handleUpdateField(caseId, fieldKey, value) {
    toolState.updateInput(caseId, fieldKey, value);
  }
</script>

<main class="relative min-h-screen overflow-hidden bg-stone-100">
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <div class="absolute -left-24 top-8 h-72 w-72 rounded-full bg-amber-300/40 blur-3xl"></div>
    <div class="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-300/35 blur-3xl"></div>
    <div class="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl"></div>
  </div>

  <section class="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem),minmax(0,1fr)]">
      <InputPanel
        selectedModel={toolState.ui.selectedModel}
        compareEnabled={toolState.ui.compareEnabled}
        activeCaseId={toolState.ui.activeCaseId}
        visibleCaseIds={toolState.getVisibleCaseIds()}
        fieldOrder={toolState.getFieldOrder()}
        inputsByCase={toolState.inputsByCase}
        unitSystem={toolState.ui.unitSystem}
        isLoading={toolState.ui.isLoading}
        requestCount={toolState.ui.requestCount}
        onSelectModel={toolState.setSelectedModel}
        onToggleCompare={toolState.setCompareEnabled}
        onSelectActiveCase={toolState.setActiveCaseId}
        onToggleCaseVisibility={toolState.toggleCompareCaseVisibility}
        onToggleUnits={handleToggleUnits}
        onUpdateField={handleUpdateField}
        onRefresh={handleCalculate}
      />

      <div class="grid min-w-0 self-start gap-6">
        <ResultsPanel
          selectedModel={toolState.ui.selectedModel}
          activeCaseId={toolState.ui.activeCaseId}
          visibleCaseIds={toolState.getVisibleCaseIds()}
          pmvResults={toolState.ui.pmvResults}
          utciResults={toolState.ui.utciResults}
          errorMessage={toolState.ui.errorMessage}
          isLoading={toolState.ui.isLoading}
          requestCount={toolState.ui.requestCount}
          lastCompletedAt={toolState.ui.lastCompletedAt}
          resultRevision={toolState.ui.resultRevision}
        />

        {#if toolState.ui.selectedModel === ComfortModel.Pmv}
          <Card size="none" class="w-full border border-stone-200/80 bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Charts</div>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                color={toolState.ui.selectedPmvChart === "psychrometric" ? "dark" : "alternative"}
                onclick={() => toolState.setSelectedPmvChart("psychrometric")}
              >
                Psychrometric Chart
              </Button>
              <Button
                type="button"
                color={toolState.ui.selectedPmvChart === "relativeHumidity" ? "dark" : "alternative"}
                onclick={() => toolState.setSelectedPmvChart("relativeHumidity")}
              >
                Relative Humidity Chart
              </Button>
            </div>
          </Card>

          {#if toolState.ui.selectedPmvChart === "psychrometric"}
            <PlotlyChartCard
              title="Psychrometric Chart"
              description="Comfort zones, humidity-ratio curves, and current case points."
              chartResult={toolState.ui.psychrometricChart}
              isLoading={toolState.ui.isLoading}
              resultRevision={toolState.ui.resultRevision}
              emptyMessage="No psychrometric chart yet."
              heightClass="h-[460px]"
            />
          {:else}
            <PlotlyChartCard
              title="Relative Humidity Chart"
              description="Relative humidity vs. dry bulb temperature comfort boundaries."
              chartResult={toolState.ui.relativeHumidityChart}
              isLoading={toolState.ui.isLoading}
              resultRevision={toolState.ui.resultRevision}
              emptyMessage="No relative humidity chart yet."
              heightClass="h-[460px]"
            />
          {/if}
        {:else}
          <PlotlyChartCard
            title="UTCI Stress Visualization"
            description="Stress category bands with one to three UTCI markers."
            chartResult={toolState.ui.utciStressChart}
            isLoading={toolState.ui.isLoading}
            resultRevision={toolState.ui.resultRevision}
            emptyMessage="No UTCI stress visualization yet."
            heightClass="h-[360px]"
          />
        {/if}
      </div>
    </div>
  </section>
</main>
