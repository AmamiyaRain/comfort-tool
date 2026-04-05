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

<Card size="none" class="w-full border border-stone-300 bg-white p-3 shadow-sm">
  <header class="flex items-start justify-between gap-3 pb-2">
    <h2 class="text-base font-semibold text-stone-900">Inputs</h2>
  </header>

  <ToolControls {toolState} />

  <div class="mt-4 bg-white">
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

    <div class="grid gap-1" aria-label="Input fields">
      {#each toolState.selectors.getInputControls() as control}
        <InputFieldRow
          {toolState}
          {control}
          onOpenClothingBuilder={() => {
            clothingBuilderOpen = true;
          }}
        />
      {/each}
    </div>
  </div>
</Card>

<Modal
  bind:open={clothingBuilderOpen}
  size="md"
  autoclose={false}
  outsideclose={true}
  class="w-full"
  title="Clothing Tools"
>
  <p slot="header" class="text-sm text-stone-500">
    Predict clo quickly or build a garment ensemble from the CBE list.
  </p>
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

