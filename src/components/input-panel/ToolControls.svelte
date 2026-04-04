<svelte:options runes={true} />

<script lang="ts">


  import SearchableSelect from "../SearchableSelect.svelte";
  import { comfortModelMetaById, comfortModelOrder } from "../../models/comfortModels";
  import { UnitSystem } from "../../models/units";
  import type { ComfortToolController } from "../../state/comfortTool/types";

  let {
    toolState,
  }: {
    toolState: ComfortToolController;
  } = $props();

  const modelOptions = comfortModelOrder.map((modelId) => ({
    name: comfortModelMetaById[modelId].label,
    value: modelId,
  }));
</script>

<section class="mt-3 grid gap-3" aria-label="Tool controls">
  <div>
    <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Model</p>
    <SearchableSelect
      class="mt-1.5"
      items={modelOptions}
      value={toolState.state.ui.selectedModel}
      placeholder="Select model"
      searchPlaceholder="Search model..."
      onSelect={toolState.actions.setSelectedModel}
    />
  </div>

  <div class="grid gap-3 md:grid-cols-2">
    <fieldset class="min-w-0">
      <legend class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Compare</legend>
      <div class="mt-1.5 flex w-full items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5">
        <span class={`text-xs ${!toolState.state.ui.compareEnabled ? "font-semibold text-stone-900" : "text-stone-500"}`}>Off</span>
        <label class="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            class="peer sr-only"
            checked={toolState.state.ui.compareEnabled}
            onchange={(event) => toolState.actions.setCompareEnabled(event.currentTarget.checked)}
          />
          <div class="peer h-5 w-9 rounded-full bg-stone-300 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-stone-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300"></div>
        </label>
        <span class={`text-xs ${toolState.state.ui.compareEnabled ? "font-semibold text-stone-900" : "text-stone-500"}`}>On</span>
      </div>
    </fieldset>

    <fieldset class="min-w-0">
      <legend class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Units</legend>
      <div class="mt-1.5 flex w-full items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5">
        <span class={`text-xs ${toolState.state.ui.unitSystem === UnitSystem.SI ? "font-semibold text-stone-900" : "text-stone-500"}`}>SI</span>
        <label class="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            class="peer sr-only"
            checked={toolState.state.ui.unitSystem === UnitSystem.IP}
            onchange={toolState.actions.toggleUnitSystem}
          />
          <div class="peer h-5 w-9 rounded-full bg-stone-300 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-stone-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300"></div>
        </label>
        <span class={`text-xs ${toolState.state.ui.unitSystem === UnitSystem.IP ? "font-semibold text-stone-900" : "text-stone-500"}`}>IP</span>
      </div>
    </fieldset>
  </div>
</section>
