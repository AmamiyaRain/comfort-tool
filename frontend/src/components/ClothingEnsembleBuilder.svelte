<svelte:options runes={true} />

<script lang="ts">
  import { Button, Input } from "flowbite-svelte";

  import { inputMetaById, InputId, type InputId as InputIdType } from "../models/inputSlots";
  import { FieldKey } from "../models/fieldKeys";
  import { fieldMetaByKey } from "../models/fieldMeta";
  import { clothingGarmentOptions } from "../models/clothingEnsembles";
  import type { ClothingGarmentOption } from "../models/clothingEnsembles";
  import type { UnitSystem as UnitSystemType } from "../models/units";
  import { predictClothingInsulationFromOutdoorTemperature } from "../services/comfort/inputDerivations";

  let {
    activeInputId,
    visibleInputIds,
    unitSystem,
    onSelectInput,
    onApplyClothingValue,
    onClose,
  }: {
    activeInputId: InputIdType;
    visibleInputIds: InputIdType[];
    unitSystem: UnitSystemType;
    onSelectInput: (inputId: InputIdType) => void;
    onApplyClothingValue: (inputId: InputIdType, value: number) => void;
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
  let targetInputId = $state<InputIdType>(InputId.Input1);
  let searchQuery = $state("");
  let selectedGarmentIds = $state<string[]>([]);
  let predictiveOutdoorTemperature = $state<string | number>("");

  const predictiveTemperatureInputId = "clothing-predictive-temperature";
  const garmentSearchInputId = "clothing-garment-search";
  const maxClothingValue = fieldMetaByKey[FieldKey.ClothingInsulation].maxValue;
  const temperatureStep = fieldMetaByKey[FieldKey.DryBulbTemperature].step;
  const temperatureDisplayUnits = $derived(fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]);

  function roundClothingValue(value: number): number {
    return Number(value.toFixed(2));
  }

  function filterClothingGarments(
    garments: ClothingGarmentOption[],
    query: string,
  ): ClothingGarmentOption[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return garments;
    }

    return garments.filter((garment) => garment.article.toLowerCase().includes(normalizedQuery));
  }

  function sumSelectedGarmentClo(
    selectedGarmentIds: string[],
    garments: ClothingGarmentOption[] = clothingGarmentOptions,
  ): number {
    const selectedSet = new Set(selectedGarmentIds);
    const total = garments.reduce((accumulator, garment) => (
      selectedSet.has(garment.id) ? accumulator + garment.clo : accumulator
    ), 0);

    return roundClothingValue(total);
  }

  $effect(() => {
    if (visibleInputIds.includes(activeInputId)) {
      targetInputId = activeInputId;
      return;
    }

    if (!visibleInputIds.includes(targetInputId)) {
      targetInputId = visibleInputIds[0] ?? InputId.Input1;
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

  function handleSelectTargetInput(inputId: InputIdType) {
    targetInputId = inputId;
    onSelectInput(inputId);
  }

  function getInputButtonClasses(inputId: InputIdType): string {
    const inputUi = inputMetaById[inputId].ui;
    return inputId === targetInputId ? inputUi.clothingTargetActiveClass : inputUi.clothingTargetInactiveClass;
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
    onSelectInput(targetInputId);
    onApplyClothingValue(targetInputId, value);
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

<section class="grid gap-5 p-5">
  <header class="flex flex-wrap items-center gap-3">
    <nav class="inline-flex gap-2 rounded-full bg-stone-100 p-1" aria-label="Clothing tool modes">
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
    </nav>

    {#if visibleInputIds.length > 1}
      <aside class="sm:ml-auto flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/90 px-2.5 py-2">
        <p class="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">Apply to</p>

        <ul class="inline-flex rounded-xl bg-white/90 p-1 ring-1 ring-inset ring-stone-200">
          {#each visibleInputIds as inputId}
            <li>
              <button
                type="button"
                class={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${getInputButtonClasses(inputId)}`}
                aria-label={inputMetaById[inputId].label}
                title={inputMetaById[inputId].label}
                onclick={() => handleSelectTargetInput(inputId)}
              >
                {inputMetaById[inputId].shortLabel}
              </button>
            </li>
          {/each}
        </ul>
      </aside>
    {/if}
  </header>

  {#if activeToolMode === ClothingToolMode.Predict}
    <section class="grid gap-4">
      <section class="grid gap-2">
        <label for={predictiveTemperatureInputId} class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Outdoor air temperature at 6 a.m. ({temperatureDisplayUnits})
        </label>
        <Input
          id={predictiveTemperatureInputId}
          value={predictiveOutdoorTemperature}
          type="number"
          size="sm"
          step={temperatureStep}
          placeholder={`Enter temperature in ${temperatureDisplayUnits}`}
          class="bg-white"
          oninput={(event) => {
            predictiveOutdoorTemperature = event.currentTarget.value;
          }}
        />
      </section>

      <article class="rounded-2xl bg-stone-50 px-4 py-4">
        <section class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <header class="min-w-0">
            <p class="text-sm font-medium text-stone-900">Estimated Clothing</p>
            <p class="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{predictedClothingDisplayValue} clo</p>

            {#if predictedClothingValue !== null && predictedClothingValue > maxClothingValue}
              <p class="mt-2 text-xs leading-5 text-amber-700">
                This exceeds the current PMV input range used in this interface ({maxClothingValue.toFixed(1)} clo).
              </p>
            {/if}
          </header>

          <footer class="flex shrink-0 items-center gap-2">
            <Button color="blue" size="sm" onclick={applyPredictedClothingValue} disabled={predictedClothingValue === null}>
              Apply
            </Button>
          </footer>
        </section>
      </article>
    </section>
  {:else}
    <section class="grid gap-4">
      <section class="grid gap-2">
        <label for={garmentSearchInputId} class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Search garments
        </label>
        <Input
          id={garmentSearchInputId}
          value={searchQuery}
          size="sm"
          placeholder="Search the original CBE garment list"
          class="bg-white"
          oninput={(event) => {
            searchQuery = event.currentTarget.value;
          }}
        />
      </section>

      <section class="max-h-80 overflow-y-auto rounded-2xl border border-stone-200 bg-white">
        {#if filteredGarments.length === 0}
          <p class="px-4 py-8 text-sm text-stone-500">No garments match this search.</p>
        {:else}
          {#each filteredGarments as garment}
            <label class="grid cursor-pointer grid-cols-[auto,minmax(0,1fr),auto] items-start gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0 hover:bg-stone-50">
              <input
                type="checkbox"
                checked={selectedGarmentIds.includes(garment.id)}
                onchange={(event) => handleToggleGarment(garment.id, event.currentTarget.checked)}
                class="mt-0.5 h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
              />
              <span class="min-w-0 text-sm text-stone-800">{garment.article}</span>
              <span class="shrink-0 text-xs font-semibold text-stone-500">{garment.clo.toFixed(2)} clo</span>
            </label>
          {/each}
        {/if}
      </section>

      <article class="rounded-2xl bg-stone-50 px-4 py-4">
        <section class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <header class="min-w-0">
            <p class="text-sm font-medium text-stone-900">{selectionSummaryLabel}</p>
            <p class="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{customClothingValue.toFixed(2)} clo</p>

            {#if customClothingValue > maxClothingValue}
              <p class="mt-2 text-xs leading-5 text-amber-700">
                This exceeds the current PMV input range used in this interface ({maxClothingValue.toFixed(1)} clo).
              </p>
            {/if}
          </header>

          <footer class="flex shrink-0 items-center gap-2">
            <Button color="light" size="sm" onclick={clearSelection}>Clear</Button>
            <Button color="blue" size="sm" onclick={() => applyClothingValue(customClothingValue)} disabled={selectedGarmentIds.length === 0}>
              Apply
            </Button>
          </footer>
        </section>
      </article>
    </section>
  {/if}
</section>
