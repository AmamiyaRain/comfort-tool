<svelte:options runes={true} />

<script lang="ts">
  import InputFieldRow from "./InputFieldRow.svelte";
  import type { ComfortToolState } from "../../state/comfortTool.svelte";

  let {
    toolState,
    onOpenClothingBuilder,
  }: {
    toolState: ComfortToolState;
    onOpenClothingBuilder: () => void;
  } = $props();
</script>

<div class="grid gap-1">
  {#each toolState.selectors.getFieldOrder() as fieldKey}
    {#if !toolState.selectors.getFieldPresentation(fieldKey).hidden}
      <InputFieldRow {toolState} {fieldKey} {onOpenClothingBuilder} />
    {/if}
  {/each}
</div>
