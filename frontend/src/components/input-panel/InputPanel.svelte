<svelte:options runes={true} />

<script lang="ts">
  import { Card } from "flowbite-svelte";

  import CompareCaseToggleGroup from "./CompareCaseToggleGroup.svelte";
  import ClothingToolsModal from "./ClothingToolsModal.svelte";
  import InputFieldGrid from "./InputFieldGrid.svelte";
  import ToolControls from "./ToolControls.svelte";
  import type { ComfortToolState } from "../../state/comfortTool.svelte";

  let {
    toolState,
  }: {
    toolState: ComfortToolState;
  } = $props();

  let clothingBuilderOpen = $state(false);
</script>

<Card size="none" class="w-full border border-stone-300 bg-white shadow-sm">
  <div class="flex items-start justify-between gap-3 pb-2">
    <div>
      <h2 class="text-base font-semibold text-stone-900">Inputs</h2>
    </div>
  </div>

  <ToolControls {toolState} />

  <div class="bg-white">
    <CompareCaseToggleGroup {toolState} />
    <InputFieldGrid {toolState} onOpenClothingBuilder={() => {
      clothingBuilderOpen = true;
    }} />
  </div>
</Card>

<ClothingToolsModal
  {toolState}
  open={clothingBuilderOpen}
  onClose={() => {
    clothingBuilderOpen = false;
  }}
/>
