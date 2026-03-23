<svelte:options runes={true} />

<script lang="ts">
  import DashboardResultsPane from "../components/DashboardResultsPane.svelte";
  import InputPanel from "../components/InputPanel.svelte";
  import type { ComfortToolState } from "../state/comfortTool.svelte";

  let {
    toolState,
  }: {
    toolState: ComfortToolState;
  } = $props();
</script>

<section id="overview" class="bg-stone-50 scroll-mt-32">
  <section class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,25rem),minmax(0,1fr)]">
      <div id="inputs-panel" class="scroll-mt-32">
        <InputPanel {toolState} />
      </div>

      <div class="grid min-w-0 self-start gap-4">
        <DashboardResultsPane {toolState} />
      </div>
    </div>
  </section>
</section>
