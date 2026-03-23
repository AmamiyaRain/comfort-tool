<svelte:options runes={true} />

<script lang="ts">
  import { Button, Input } from "flowbite-svelte";

  let {
    garmentSearchInputId,
    searchQuery,
    filteredGarments,
    selectedGarmentIds,
    selectionSummaryLabel,
    customClothingValue,
    maxClothingValue,
    onSearchInput,
    onToggleGarment,
    onClear,
    onApply,
  } = $props();
</script>

<div class="grid gap-4">
  <div class="grid gap-2">
    <label for={garmentSearchInputId} class="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Search garments</label>
    <Input
      id={garmentSearchInputId}
      value={searchQuery}
      size="sm"
      placeholder="Search the original CBE garment list"
      class="bg-white"
      oninput={(event) => onSearchInput(event.currentTarget.value)}
    />
  </div>

  <div class="max-h-80 overflow-y-auto rounded-2xl border border-stone-200 bg-white">
    {#if filteredGarments.length === 0}
      <div class="px-4 py-8 text-sm text-stone-500">No garments match this search.</div>
    {:else}
      {#each filteredGarments as garment}
        <label class="grid cursor-pointer grid-cols-[auto,minmax(0,1fr),auto] items-start gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0 hover:bg-stone-50">
          <input
            type="checkbox"
            checked={selectedGarmentIds.includes(garment.id)}
            onchange={(event) => onToggleGarment(garment.id, event.currentTarget.checked)}
            class="mt-0.5 h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
          />
          <span class="min-w-0 text-sm text-stone-800">{garment.article}</span>
          <span class="shrink-0 text-xs font-semibold text-stone-500">{garment.clo.toFixed(2)} clo</span>
        </label>
      {/each}
    {/if}
  </div>

  <div class="rounded-2xl bg-stone-50 px-4 py-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <div class="text-sm font-medium text-stone-900">{selectionSummaryLabel}</div>
        <div class="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{customClothingValue.toFixed(2)} clo</div>

        {#if customClothingValue > maxClothingValue}
          <p class="mt-2 text-xs leading-5 text-amber-700">
            This exceeds the current PMV input range used in this interface ({maxClothingValue.toFixed(1)} clo).
          </p>
        {/if}
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <Button color="light" size="sm" onclick={onClear}>Clear</Button>
        <Button color="blue" size="sm" onclick={onApply} disabled={selectedGarmentIds.length === 0}>
          Apply
        </Button>
      </div>
    </div>
  </div>
</div>
