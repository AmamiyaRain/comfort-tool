<svelte:options runes={true} />

<script lang="ts">
  import { compareCaseMetaById, CompareCaseId, type CompareCaseId as CompareCaseIdType } from "../models/compareCases";
  import { FieldKey } from "../models/fieldKeys";
  import { fieldMetaByKey } from "../models/fieldMeta";
  import { clothingGarmentOptions } from "../models/clothingEnsembles";
  import type { UnitSystem as UnitSystemType } from "../models/units";
  import { predictClothingInsulationFromOutdoorTemperature } from "../services/advancedPmvInputs";
  import {
    filterClothingGarments,
    sumSelectedGarmentClo,
  } from "../services/clothingEnsembles";
  import ClothingPredictor from "./input-panel/ClothingPredictor.svelte";
  import GarmentBuilder from "./input-panel/GarmentBuilder.svelte";

  let {
    activeCaseId,
    visibleCaseIds,
    unitSystem,
    onSelectCase,
    onApplyClothingValue,
    onClose,
  }: {
    activeCaseId: CompareCaseIdType;
    visibleCaseIds: CompareCaseIdType[];
    unitSystem: UnitSystemType;
    onSelectCase: (caseId: CompareCaseIdType) => void;
    onApplyClothingValue: (caseId: CompareCaseIdType, value: number) => void;
    onClose: () => void;
  } = $props();

  const ClothingToolMode = {
    Predict: "predict",
    Build: "build",
  } as const;

  type ClothingToolMode = (typeof ClothingToolMode)[keyof typeof ClothingToolMode];

  const clothingToolModes = [
    {
      id: ClothingToolMode.Predict,
      label: "Predict",
    },
    {
      id: ClothingToolMode.Build,
      label: "Build",
    },
  ] as const;

  let activeToolMode = $state<ClothingToolMode>(ClothingToolMode.Predict);
  let targetCaseId = $state<CompareCaseIdType>(CompareCaseId.A);
  let searchQuery = $state("");
  let selectedGarmentIds = $state<string[]>([]);
  let predictiveOutdoorTemperature = $state<string | number>("");

  const predictiveTemperatureInputId = "clothing-predictive-temperature";
  const garmentSearchInputId = "clothing-garment-search";
  const maxClothingValue = fieldMetaByKey[FieldKey.ClothingInsulation].maxValue;
  const temperatureStep = fieldMetaByKey[FieldKey.DryBulbTemperature].step;
  const temperatureDisplayUnits = $derived(fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]);

  $effect(() => {
    if (visibleCaseIds.includes(activeCaseId)) {
      targetCaseId = activeCaseId;
      return;
    }

    if (!visibleCaseIds.includes(targetCaseId)) {
      targetCaseId = visibleCaseIds[0] ?? CompareCaseId.A;
    }
  });

  const filteredGarments = $derived.by(() => filterClothingGarments(clothingGarmentOptions, searchQuery));
  const customClothingValue = $derived.by(() => sumSelectedGarmentClo(selectedGarmentIds, clothingGarmentOptions));
  const predictiveOutdoorTemperatureValue = $derived.by(() => {
    const normalizedValue = String(predictiveOutdoorTemperature).trim();
    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  });
  const predictedClothingValue = $derived.by(() => {
    if (predictiveOutdoorTemperatureValue === null) {
      return null;
    }

    return predictClothingInsulationFromOutdoorTemperature(predictiveOutdoorTemperatureValue, unitSystem);
  });
  const selectionSummaryLabel = $derived.by(() => {
    if (selectedGarmentIds.length === 0) {
      return "No garments selected";
    }

    return `${selectedGarmentIds.length} garments selected`;
  });
  const predictedClothingDisplayValue = $derived.by(() => (
    predictedClothingValue === null ? "0.00" : predictedClothingValue.toFixed(2)
  ));

  function handleSelectTargetCase(caseId: CompareCaseIdType) {
    targetCaseId = caseId;
    onSelectCase(caseId);
  }

  function getCaseButtonClasses(caseId: CompareCaseIdType): string {
    const caseUi = compareCaseMetaById[caseId].ui;
    return caseId === targetCaseId ? caseUi.clothingTargetActiveClass : caseUi.clothingTargetInactiveClass;
  }

  function handleToggleGarment(garmentId: string, checked: boolean) {
    if (checked) {
      if (!selectedGarmentIds.includes(garmentId)) {
        selectedGarmentIds = [...selectedGarmentIds, garmentId];
      }
      return;
    }

    selectedGarmentIds = selectedGarmentIds.filter((selectedGarmentId) => selectedGarmentId !== garmentId);
  }

  function applyClothingValue(value: number) {
    onSelectCase(targetCaseId);
    onApplyClothingValue(targetCaseId, value);
    onClose();
  }

  function applyPredictedClothingValue() {
    if (predictedClothingValue === null) {
      return;
    }

    applyClothingValue(predictedClothingValue);
  }

  function clearSelection() {
    selectedGarmentIds = [];
    searchQuery = "";
  }
</script>

<div class="grid gap-5 p-5">
  <div class="flex flex-wrap items-center gap-3">
    <div class="inline-flex gap-2 rounded-full bg-stone-100 p-1">
      {#each clothingToolModes as toolMode}
        <button
          type="button"
          class={`rounded-full px-4 py-2 text-sm font-medium transition ${
            toolMode.id === activeToolMode
              ? "bg-white text-stone-900 shadow-sm shadow-stone-200/80"
              : "text-stone-500 hover:text-stone-900"
          }`}
          onclick={() => {
            activeToolMode = toolMode.id;
          }}
        >
          {toolMode.label}
        </button>
      {/each}
    </div>

    {#if visibleCaseIds.length > 1}
      <div class="sm:ml-auto flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/90 px-2.5 py-2">
        <span class="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">Apply to</span>

        <div class="inline-flex rounded-xl bg-white/90 p-1 ring-1 ring-inset ring-stone-200">
          {#each visibleCaseIds as caseId}
            <button
              type="button"
              class={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${getCaseButtonClasses(caseId)}`}
              aria-label={compareCaseMetaById[caseId].label}
              title={compareCaseMetaById[caseId].label}
              onclick={() => handleSelectTargetCase(caseId)}
            >
              {compareCaseMetaById[caseId].shortLabel}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if activeToolMode === ClothingToolMode.Predict}
    <ClothingPredictor
      {predictiveTemperatureInputId}
      {predictiveOutdoorTemperature}
      {temperatureStep}
      {temperatureDisplayUnits}
      {predictedClothingValue}
      {predictedClothingDisplayValue}
      {maxClothingValue}
      onTemperatureInput={(value) => {
        predictiveOutdoorTemperature = value;
      }}
      onApply={applyPredictedClothingValue}
    />
  {:else}
    <GarmentBuilder
      {garmentSearchInputId}
      {searchQuery}
      {filteredGarments}
      {selectedGarmentIds}
      {selectionSummaryLabel}
      {customClothingValue}
      {maxClothingValue}
      onSearchInput={(value) => {
        searchQuery = value;
      }}
      onToggleGarment={handleToggleGarment}
      onClear={clearSelection}
      onApply={() => applyClothingValue(customClothingValue)}
    />
  {/if}
</div>
