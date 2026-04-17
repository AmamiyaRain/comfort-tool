<script lang="ts">
  import { Button, ButtonGroup, Input, Label, Checkbox, Badge } from "flowbite-svelte";
  import { InputId, type InputId as InputIdType } from "../models/inputSlots";
  import { inputDisplayMetaById } from "../models/inputSlotPresentation";
  import { FieldKey } from "../models/fieldKeys";
  import { fieldMetaByKey } from "../models/inputFieldsMeta";
  import type { UnitSystem as UnitSystemType } from "../models/units";
  import { predictClothingInsulationFromOutdoorTemperature } from "../services/comfort/derivations";
  import { clothingGarmentOptions, type ClothingGarmentOption } from "../services/comfort/referenceValues";

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
    { id: ClothingToolMode.Predict, label: "Predict" },
    { id: ClothingToolMode.Build, label: "Build" },
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

  function filterClothingGarments(garments: ClothingGarmentOption[], query: string): ClothingGarmentOption[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return garments;
    return garments.filter((garment) => garment.article.toLowerCase().includes(normalizedQuery));
  }

  function sumSelectedGarmentClo(selectedGarmentIds: string[], garments: ClothingGarmentOption[] = clothingGarmentOptions): number {
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
    if (!normalizedValue) return null;
    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  });
  const predictedClothingValue = $derived.by(() => {
    if (predictiveOutdoorTemperatureValue === null) return null;
    return predictClothingInsulationFromOutdoorTemperature(predictiveOutdoorTemperatureValue, unitSystem);
  });
  const selectionSummaryLabel = $derived.by(() => {
    if (selectedGarmentIds.length === 0) return "No garments selected";
    return `${selectedGarmentIds.length} garments selected`;
  });
  const predictedClothingDisplayValue = $derived.by(() => (
    predictedClothingValue === null ? "0.00" : predictedClothingValue.toFixed(2)
  ));

  function handleSelectTargetInput(inputId: InputIdType) {
    targetInputId = inputId;
    onSelectInput(inputId);
  }

  function handleToggleGarment(garmentId: string, checked: boolean) {
    if (checked) {
      if (!selectedGarmentIds.includes(garmentId)) {
        selectedGarmentIds = [...selectedGarmentIds, garmentId];
      }
    } else {
      selectedGarmentIds = selectedGarmentIds.filter((id) => id !== garmentId);
    }
  }

  function applyClothingValue(value: number) {
    onSelectInput(targetInputId);
    onApplyClothingValue(targetInputId, value);
    onClose();
  }

  function applyPredictedClothingValue() {
    if (predictedClothingValue !== null) applyClothingValue(predictedClothingValue);
  }

  function clearSelection() {
    selectedGarmentIds = [];
    searchQuery = "";
  }
</script>

<section class="grid gap-5 p-5">
  <header class="flex flex-wrap items-center gap-3">
    <ButtonGroup>
      {#each clothingToolModes as toolMode}
        <Button
          color={toolMode.id === activeToolMode ? "primary" : "alternative"}
          size="sm"
          onclick={() => (activeToolMode = toolMode.id)}
        >
          {toolMode.label}
        </Button>
      {/each}
    </ButtonGroup>

    {#if visibleInputIds.length > 1}
      <aside class="sm:ml-auto flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/90 px-2.5 py-2">
        <p class="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">Apply to</p>
        <ButtonGroup>
          {#each visibleInputIds as inputId}
            <Button
              color={inputId === targetInputId ? "primary" : "alternative"}
              size="xs"
              onclick={() => handleSelectTargetInput(inputId)}
              title={inputDisplayMetaById[inputId].label}
            >
              {inputDisplayMetaById[inputId].shortLabel}
            </Button>
          {/each}
        </ButtonGroup>
      </aside>
    {/if}
  </header>

  {#if activeToolMode === ClothingToolMode.Predict}
    <section class="grid gap-4">
      <div class="grid gap-2">
        <Label for={predictiveTemperatureInputId} class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Outdoor air temperature at 6 a.m. ({temperatureDisplayUnits})
        </Label>
        <Input
          id={predictiveTemperatureInputId}
          type="number"
          step={temperatureStep}
          value={predictiveOutdoorTemperature}
          placeholder={`Enter temperature in ${temperatureDisplayUnits}`}
          oninput={(event) => (predictiveOutdoorTemperature = event.currentTarget.value)}
        />
      </div>

      <article class="rounded-2xl bg-stone-50 px-4 py-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <header class="min-w-0">
            <p class="text-sm font-medium text-stone-900">Estimated Clothing</p>
            <p class="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{predictedClothingDisplayValue} clo</p>
            {#if predictedClothingValue !== null && predictedClothingValue > maxClothingValue}
              <Badge color="yellow" class="mt-2 text-xs">
                Exceeds range ({maxClothingValue.toFixed(1)} clo)
              </Badge>
            {/if}
          </header>
          <footer class="flex shrink-0 items-center gap-2">
            <Button color="primary" onclick={applyPredictedClothingValue} disabled={predictedClothingValue === null}>
              Apply
            </Button>
          </footer>
        </div>
      </article>
    </section>
  {:else}
    <section class="grid gap-4">
      <div class="grid gap-2">
        <Label for={garmentSearchInputId} class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Search garments
        </Label>
        <Input
          id={garmentSearchInputId}
          type="text"
          value={searchQuery}
          placeholder="Search the original CBE garment list"
          oninput={(event) => (searchQuery = event.currentTarget.value)}
        />
      </div>

      <div class="max-h-80 overflow-y-auto rounded-2xl border border-stone-200 bg-white">
        {#if filteredGarments.length === 0}
          <p class="px-4 py-8 text-sm text-stone-500">No garments match this search.</p>
        {:else}
          {#each filteredGarments as garment}
            <div class="flex items-center gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0 hover:bg-stone-50">
              <Checkbox
                checked={selectedGarmentIds.includes(garment.id)}
                onchange={(event) => handleToggleGarment(garment.id, event.currentTarget.checked)}
              />
              <span class="min-w-0 text-sm text-stone-800 flex-grow">{garment.article}</span>
              <span class="shrink-0 text-xs font-semibold text-stone-500">{garment.clo.toFixed(2)} clo</span>
            </div>
          {/each}
        {/if}
      </div>

      <article class="rounded-2xl bg-stone-50 px-4 py-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <header class="min-w-0">
            <p class="text-sm font-medium text-stone-900">{selectionSummaryLabel}</p>
            <p class="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{customClothingValue.toFixed(2)} clo</p>
            {#if customClothingValue > maxClothingValue}
              <Badge color="yellow" class="mt-2 text-xs">
                Exceeds range ({maxClothingValue.toFixed(1)} clo)
              </Badge>
            {/if}
          </header>
          <footer class="flex shrink-0 items-center gap-2">
            <Button color="alternative" onclick={clearSelection}>Clear</Button>
            <Button color="primary" onclick={() => applyClothingValue(customClothingValue)} disabled={selectedGarmentIds.length === 0}>
              Apply
            </Button>
          </footer>
        </div>
      </article>
    </section>
  {/if}
</section>
