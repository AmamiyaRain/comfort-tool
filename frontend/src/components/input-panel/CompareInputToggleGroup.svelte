<svelte:options runes={true} />

<script lang="ts">
  import { inputMetaById, inputOrder } from "../../models/inputSlots";
  import type { ComfortToolController } from "../../state/comfortTool/types";

  let {
    toolState,
  }: {
    toolState: ComfortToolController;
  } = $props();

  function isInputVisible(inputId) {
    return toolState.selectors.getVisibleInputIds().includes(inputId);
  }

  function getCompareToggleClasses(inputId) {
    const inputUi = inputMetaById[inputId].ui;
    return isInputVisible(inputId)
      ? `border-solid bg-white ${inputUi.inputToggleVisibleClass}`
      : `border-dashed bg-stone-50 ${inputUi.inputToggleHiddenClass}`;
  }
</script>

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
