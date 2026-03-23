<svelte:options runes={true} />

<script lang="ts">
  import { compareCaseMetaById, compareCaseOrder } from "../../models/compareCases";
  import type { ComfortToolState } from "../../state/comfortTool.svelte";

  let {
    toolState,
  }: {
    toolState: ComfortToolState;
  } = $props();

  function getInputIndex(caseId) {
    return compareCaseOrder.indexOf(caseId) + 1;
  }

  function isCaseVisible(caseId) {
    return toolState.selectors.getVisibleCaseIds().includes(caseId);
  }

  function getCompareToggleClasses(caseId) {
    const caseUi = compareCaseMetaById[caseId].ui;
    return isCaseVisible(caseId)
      ? `border-solid bg-white ${caseUi.inputToggleVisibleClass}`
      : `border-dashed bg-stone-50 ${caseUi.inputToggleHiddenClass}`;
  }
</script>

{#if toolState.state.ui.compareEnabled}
  <div class="grid gap-2 px-1 pb-2 md:grid-cols-3">
    {#each compareCaseOrder as caseId}
      <button
        type="button"
        class={`min-w-0 rounded-sm border px-2 py-1.5 text-left ${getCompareToggleClasses(caseId)}`}
        onclick={() => toolState.actions.toggleCompareCaseVisibility(caseId)}
      >
        <div class="text-sm font-semibold">Input {getInputIndex(caseId)}</div>
      </button>
    {/each}
  </div>
{/if}
