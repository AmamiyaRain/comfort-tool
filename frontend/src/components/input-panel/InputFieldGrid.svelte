<svelte:options runes={true} />

<script lang="ts">
  import InputFieldRow from "./InputFieldRow.svelte";
  import { ComfortModel } from "../../models/comfortModels";
  import { FieldKey } from "../../models/fieldKeys";
  import { PmvTemperatureInputMode } from "../../models/inputModes";
  import type { ComfortToolState } from "../../state/comfortTool.svelte";

  let {
    toolState,
    onOpenClothingBuilder,
  }: {
    toolState: ComfortToolState;
    onOpenClothingBuilder: () => void;
  } = $props();

  function shouldHideField(fieldKey) {
    return (
      toolState.state.ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.MeanRadiantTemperature &&
      toolState.state.ui.pmvTemperatureInputMode === PmvTemperatureInputMode.Operative
    );
  }
</script>

<div class="grid gap-1">
  {#each toolState.selectors.getFieldOrder() as fieldKey}
    {#if !shouldHideField(fieldKey)}
      <InputFieldRow {toolState} {fieldKey} {onOpenClothingBuilder} />
    {/if}
  {/each}
</div>
