<svelte:options runes={true} />

<script lang="ts">
  import InputPanelContent from "./input-panel/InputPanel.svelte";
  import type { ComfortToolState } from "../state/comfortTool.svelte";

  let {
    toolState,
  }: {
    toolState: ComfortToolState;
  } = $props();
</script>

<InputPanelContent {toolState} />
