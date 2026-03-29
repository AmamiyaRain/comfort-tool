<svelte:options runes={true} />

<script lang="ts">
  import { Card, Modal } from "flowbite-svelte";

  import ClothingEnsembleBuilder from "../ClothingEnsembleBuilder.svelte";
  import InputFieldRow from "./InputFieldRow.svelte";
  import { inputMetaById, inputOrder, type InputId as InputIdType } from "../../models/inputSlots";
  import { InputControlId } from "../../models/inputControls";
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
    toolState.actions.updateInput(inputId, InputControlId.ClothingInsulation, value.toFixed(2));
  }

  function isInputVisible(inputId: InputIdType) {
    return toolState.selectors.getVisibleInputIds().includes(inputId);
  }

  function getCompareToggleClasses(inputId: InputIdType) {
    const inputUi = inputMetaById[inputId].ui;
    return isInputVisible(inputId)
      ? `border-solid bg-white ${inputUi.inputToggleVisibleClass}`
      : `border-dashed bg-stone-50 ${inputUi.inputToggleHiddenClass}`;
  }
</script>

<Card size="none" class="w-full border border-stone-300 bg-white shadow-sm">
  <header class="flex items-start justify-between gap-3 pb-2">
    <h2 class="text-base font-semibold text-stone-900">Inputs</h2>
  </header>

  <ToolControls {toolState} />

  <section class="mt-4 bg-white">
    {#if toolState.state.ui.compareEnabled}
      <fieldset class="px-1 pb-2">
        <legend class="sr-only">Visible compare inputs</legend>
        <ul class="grid gap-2 md:grid-cols-3">
          {#each inputOrder as inputId}
            <li>
              <button
                type="button"
                class={`min-w-0 rounded-sm border px-2 py-1.5 text-left ${getCompareToggleClasses(inputId)}`}
                onclick={() => toolState.actions.toggleCompareInputVisibility(inputId)}
              >
                <span class="text-sm font-semibold">{inputMetaById[inputId].label}</span>
              </button>
            </li>
          {/each}
        </ul>
      </fieldset>
    {/if}

    <section class="grid gap-1" aria-label="Input fields">
      {#each toolState.selectors.getInputControls() as control}
        <InputFieldRow
          {toolState}
          {control}
          onOpenClothingBuilder={() => {
            clothingBuilderOpen = true;
          }}
        />
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
