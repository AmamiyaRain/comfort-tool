<svelte:options runes={true} />

<script lang="ts">
  import { Button, Input } from "flowbite-svelte";

  let {
    predictiveTemperatureInputId,
    predictiveOutdoorTemperature,
    temperatureStep,
    temperatureDisplayUnits,
    predictedClothingValue,
    predictedClothingDisplayValue,
    maxClothingValue,
    onTemperatureInput,
    onApply,
  } = $props();
</script>

<div class="grid gap-4">
  <div class="grid gap-2">
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
      oninput={(event) => onTemperatureInput(event.currentTarget.value)}
    />
  </div>

  <div class="rounded-2xl bg-stone-50 px-4 py-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <div class="text-sm font-medium text-stone-900">Estimated Clothing</div>
        <div class="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{predictedClothingDisplayValue} clo</div>

        {#if predictedClothingValue !== null && predictedClothingValue > maxClothingValue}
          <p class="mt-2 text-xs leading-5 text-amber-700">
            This exceeds the current PMV input range used in this interface ({maxClothingValue.toFixed(1)} clo).
          </p>
        {/if}
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <Button color="blue" size="sm" onclick={onApply} disabled={predictedClothingValue === null}>Apply</Button>
      </div>
    </div>
  </div>
</div>
