<svelte:options runes={true} />

<script lang="ts">
  import { Toggle } from "flowbite-svelte";

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
  <section>
    <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Model</p>
    <SearchableSelect
      class="mt-1.5"
      items={modelOptions}
      value={toolState.state.ui.selectedModel}
      placeholder="Select model"
      searchPlaceholder="Search model..."
      onSelect={toolState.actions.setSelectedModel}
    />
  </section>

  <section class="grid gap-3 md:grid-cols-2">
    <fieldset class="min-w-0">
      <legend class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Compare</legend>
      <p class="mt-1.5 flex w-full items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5">
        <span class={`text-xs ${!toolState.state.ui.compareEnabled ? "font-semibold text-stone-900" : "text-stone-500"}`}>Off</span>
        <Toggle
          checked={toolState.state.ui.compareEnabled}
          color="teal"
          onchange={(event) => toolState.actions.setCompareEnabled(event.currentTarget.checked)}
        />
        <span class={`text-xs ${toolState.state.ui.compareEnabled ? "font-semibold text-stone-900" : "text-stone-500"}`}>On</span>
      </p>
    </fieldset>

    <fieldset class="min-w-0">
      <legend class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Units</legend>
      <p class="mt-1.5 flex w-full items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5">
        <span class={`text-xs ${toolState.state.ui.unitSystem === UnitSystem.SI ? "font-semibold text-stone-900" : "text-stone-500"}`}>SI</span>
        <Toggle
          checked={toolState.state.ui.unitSystem === UnitSystem.IP}
          color="teal"
          onchange={toolState.actions.toggleUnitSystem}
        />
        <span class={`text-xs ${toolState.state.ui.unitSystem === UnitSystem.IP ? "font-semibold text-stone-900" : "text-stone-500"}`}>IP</span>
      </p>
    </fieldset>
  </section>
</section>
