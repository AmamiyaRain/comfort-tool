<svelte:options runes={true} />

<script lang="ts">
  import InputPanel from "../components/InputPanel.svelte";
  import PsychrometricChart from "../components/PsychrometricChart.svelte";
  import ResultsPanel from "../components/ResultsPanel.svelte";
  import { UnitSystem } from "../models/units";
  import { createComfortToolState } from "../state/comfortTool.svelte";

  const toolState = createComfortToolState();

  function handleToggleUnits() {
    toolState.setUnitSystem(toolState.ui.unitSystem === UnitSystem.SI ? UnitSystem.IP : UnitSystem.SI);
  }

  function handleCalculate() {
    void toolState.refresh();
  }

  function handleUpdateField(fieldKey, value) {
    toolState.updateInput(fieldKey, value);
  }
</script>

<main class="relative min-h-screen overflow-hidden bg-stone-100">
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <div class="absolute -left-24 top-8 h-72 w-72 rounded-full bg-amber-300/40 blur-3xl"></div>
    <div class="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-300/35 blur-3xl"></div>
    <div class="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl"></div>
  </div>

  <section class="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="grid gap-6 xl:grid-cols-[24rem,minmax(0,1fr)]">
      <InputPanel
        fieldOrder={toolState.fieldOrder}
        inputs={toolState.inputs}
        unitSystem={toolState.ui.unitSystem}
        isLoading={toolState.ui.isLoading}
        requestCount={toolState.ui.requestCount}
        onToggleUnits={handleToggleUnits}
        onUpdateField={handleUpdateField}
        onRefresh={handleCalculate}
      />

      <div class="grid min-w-0 gap-6">
        <ResultsPanel
          result={toolState.ui.pmvResult}
          errorMessage={toolState.ui.errorMessage}
          isLoading={toolState.ui.isLoading}
          requestCount={toolState.ui.requestCount}
          lastCompletedAt={toolState.ui.lastCompletedAt}
          resultRevision={toolState.ui.resultRevision}
        />
        <PsychrometricChart
          chartResult={toolState.ui.chartResult}
          isLoading={toolState.ui.isLoading}
          resultRevision={toolState.ui.resultRevision}
        />
      </div>
    </div>
  </section>
</main>
