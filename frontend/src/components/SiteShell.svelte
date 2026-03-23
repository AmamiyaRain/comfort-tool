<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";

  import SiteFooter from "./SiteFooter.svelte";
  import SiteHeader from "./SiteHeader.svelte";
  import type { ComfortToolState } from "../state/comfortTool.svelte";

  let {
    toolState,
    children,
  }: {
    toolState: ComfortToolState;
    children: Snippet;
  } = $props();
</script>

<div class="min-h-screen bg-stone-950 text-stone-950">
  <div class="flex min-h-screen flex-col">
    <SiteHeader {toolState} />

    <main class="flex-1 bg-white">
      {@render children?.()}
    </main>

    <SiteFooter />
  </div>
</div>
