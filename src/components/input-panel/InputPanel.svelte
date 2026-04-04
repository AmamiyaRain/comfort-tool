<svelte:options runes={true} />

<script lang="ts">


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
  let dialogElement: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (clothingBuilderOpen) {
      dialogElement?.showModal();
    } else {
      dialogElement?.close();
    }
  });

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

<section class="w-full border border-stone-300 bg-white p-3 shadow-sm">
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
</section>

<dialog
  bind:this={dialogElement}
  onclose={() => {
    clothingBuilderOpen = false;
  }}
  class="backdrop:bg-stone-950/35 backdrop:backdrop-blur-sm overflow-hidden rounded-2xl border border-stone-200 bg-white p-0 shadow-2xl max-w-md w-full"
>
  <div class="flex items-center justify-between border-b border-stone-100 px-5 py-4">
    <div>
      <h3 class="text-lg font-semibold text-stone-900">Clothing Tools</h3>
      <p class="mt-1 text-sm text-stone-500">Predict clo quickly or build a garment ensemble from the CBE list.</p>
    </div>
    <button
      type="button"
      onclick={() => (clothingBuilderOpen = false)}
      class="text-stone-400 hover:text-stone-900 text-xl"
      aria-label="Close"
    >
      ✕
    </button>
  </div>

  <div class="p-0">
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
  </div>
</dialog>
