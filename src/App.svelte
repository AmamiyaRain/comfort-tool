<script lang="ts">
  import { onMount } from "svelte";

  import SiteShell from "./components/SiteShell.svelte";
  import ComfortDashboard from "./views/ComfortDashboard.svelte";
  import { createComfortToolState } from "./state/comfortTool/createComfortToolState.svelte";
  import { readShareStateFromUrl } from "./state/comfortTool/shareState";

  const toolState = createComfortToolState();

  onMount(() => {
    const sharedSnapshot = readShareStateFromUrl(window.location.href);
    if (sharedSnapshot) {
      toolState.actions.applyShareSnapshot(sharedSnapshot);
      return;
    }

    toolState.actions.scheduleCalculation({ immediate: true });
  });
</script>

<SiteShell {toolState}>
  <ComfortDashboard {toolState} />
</SiteShell>
