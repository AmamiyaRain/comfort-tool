<svelte:options runes={true} />

<script lang="ts">
  import { Modal } from "flowbite-svelte";

  import ClothingEnsembleBuilder from "../ClothingEnsembleBuilder.svelte";
  import { FieldKey } from "../../models/fieldKeys";
  import type { ComfortToolState } from "../../state/comfortTool.svelte";

  let {
    toolState,
    open = false,
    onClose,
  }: {
    toolState: ComfortToolState;
    open: boolean;
    onClose: () => void;
  } = $props();

  function handleApplyClothingValue(caseId, value) {
    toolState.actions.setActiveCaseId(caseId);
    toolState.actions.updateInput(caseId, FieldKey.ClothingInsulation, value.toFixed(2));
  }
</script>

<Modal
  open={open}
  size="md"
  placement="center"
  outsideclose={true}
  class="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-2xl shadow-stone-900/10"
  classBackdrop="fixed inset-0 z-40 bg-stone-950/35 backdrop-blur-sm"
  classHeader="border-b border-stone-100 px-5 py-4"
  classBody="space-y-0 p-0"
  onclose={onClose}
>
  <svelte:fragment slot="header">
    <div>
      <h3 class="text-lg font-semibold text-stone-900">Clothing Tools</h3>
      <p class="mt-1 text-sm text-stone-500">Predict clo quickly or build a garment ensemble from the CBE list.</p>
    </div>
  </svelte:fragment>

  <ClothingEnsembleBuilder
    activeCaseId={toolState.state.ui.activeCaseId}
    visibleCaseIds={toolState.selectors.getVisibleCaseIds()}
    unitSystem={toolState.state.ui.unitSystem}
    onSelectCase={toolState.actions.setActiveCaseId}
    onApplyClothingValue={handleApplyClothingValue}
    onClose={onClose}
  />
</Modal>
