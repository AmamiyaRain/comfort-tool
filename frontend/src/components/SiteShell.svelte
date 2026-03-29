<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";

  import SiteFooter from "./SiteFooter.svelte";
  import SiteHeader from "./SiteHeader.svelte";
  import type { ComfortToolController } from "../state/comfortTool/types";

  let {
    toolState,
    children,
  }: {
    toolState: ComfortToolController;
    children: Snippet;
  } = $props();
</script>

<section class="min-h-screen bg-stone-950 text-stone-950">
  <article class="flex min-h-screen flex-col">
    <SiteHeader {toolState} />

    <main class="flex-1 bg-stone-50">
      {@render children?.()}
    </main>

    <SiteFooter />
  </article>
</section>
