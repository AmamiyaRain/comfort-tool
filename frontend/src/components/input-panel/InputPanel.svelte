<svelte:options runes={true} />

<script lang="ts">
  import { Card, Modal } from "flowbite-svelte";

  import ClothingEnsembleBuilder from "../ClothingEnsembleBuilder.svelte";
  import CompareInputToggleGroup from "./CompareInputToggleGroup.svelte";
  import InputFieldRow from "./InputFieldRow.svelte";
  import { FieldKey } from "../../models/fieldKeys";
  import ToolControls from "./ToolControls.svelte";
  import type { ComfortToolController } from "../../state/comfortTool/types";

  let {
    toolState,
  }: {
    toolState: ComfortToolController;
  } = $props();

  let clothingBuilderOpen = $state(false);

  function handleApplyClothingValue(inputId, value) {
    toolState.actions.setActiveInputId(inputId);
    toolState.actions.updateInput(inputId, FieldKey.ClothingInsulation, value.toFixed(2));
  }
</script>

<Card size="none" class="w-full border border-stone-300 bg-white shadow-sm">
  <header class="flex items-start justify-between gap-3 pb-2">
    <h2 class="text-base font-semibold text-stone-900">Inputs</h2>
  </header>

  <ToolControls {toolState} />

  <section class="mt-4 bg-white">
    <CompareInputToggleGroup {toolState} />

    <section class="grid gap-1" aria-label="Input fields">
      {#each toolState.selectors.getFieldOrder() as fieldKey}
        {#if !toolState.selectors.getFieldPresentation(fieldKey).hidden}
          <InputFieldRow
            {toolState}
            {fieldKey}
            onOpenClothingBuilder={() => {
              clothingBuilderOpen = true;
            }}
          />
        {/if}
      {/each}
    </section>
  </section>
</Card>

<Modal
  open={clothingBuilderOpen}
  size="md"
  placement="center"
  outsideclose={true}
  class="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-2xl shadow-stone-900/10"
  classBackdrop="fixed inset-0 z-40 bg-stone-950/35 backdrop-blur-sm"
  classHeader="border-b border-stone-100 px-5 py-4"
  classBody="space-y-0 p-0"
  onclose={() => {
    clothingBuilderOpen = false;
  }}
>
  <svelte:fragment slot="header">
    <header>
      <h3 class="text-lg font-semibold text-stone-900">Clothing Tools</h3>
      <p class="mt-1 text-sm text-stone-500">Predict clo quickly or build a garment ensemble from the CBE list.</p>
    </header>
  </svelte:fragment>

  <ClothingEnsembleBuilder
    activeInputId={toolState.state.ui.activeInputId}
    visibleInputIds={toolState.selectors.getVisibleInputIds()}
    unitSystem={toolState.state.ui.unitSystem}
    onSelectInput={toolState.actions.setActiveInputId}
    onApplyClothingValue={handleApplyClothingValue}
    onClose={() => {
      clothingBuilderOpen = false;
    }}
  />
</Modal>
