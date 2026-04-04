<script lang="ts">
  let {
    isLoading,
    onExport,
  } = $props();

  let exportMenuOpen = $state(false);
  const exportTriggerId = `plotly-export-${Math.random().toString(36).slice(2, 10)}`;

  function handleWindowClick(event: MouseEvent) {
    if (exportMenuOpen && !(event.target as HTMLElement).closest(".export-menu-container")) {
      exportMenuOpen = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="export-menu-container relative inline-block">
  <button
    id={exportTriggerId}
    type="button"
    class="export-btn"
    disabled={isLoading}
    onclick={() => (exportMenuOpen = !exportMenuOpen)}
  >
    <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
      <path d="M10 3.5v8.25"></path>
      <path d="m6.75 8.75 3.25 3.25 3.25-3.25"></path>
      <path d="M4 14.5h12"></path>
    </svg>
    <span>Export</span>
    <svg class="h-3 w-3 text-stone-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.12l3.71-3.89a.75.75 0 1 1 1.08 1.04l-4.25 4.46a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"></path>
    </svg>
  </button>

  {#if exportMenuOpen}
    <div class="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg shadow-stone-200/70">
      <header class="border-b border-stone-100 px-4 py-2">
        <p class="text-[11px] uppercase tracking-[0.16em] text-stone-500">Download chart</p>
      </header>
      <button
        type="button"
        class="dropdown-item"
        onclick={() => {
          exportMenuOpen = false;
          onExport("png");
        }}
      >
        <span>Download PNG</span>
        <span class="text-[11px] uppercase tracking-[0.12em] text-stone-400">Image</span>
      </button>
      <button
        type="button"
        class="dropdown-item"
        onclick={() => {
          exportMenuOpen = false;
          onExport("svg");
        }}
      >
        <span>Download SVG</span>
        <span class="text-[11px] uppercase tracking-[0.12em] text-stone-400">Vector</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .export-btn {
    @apply inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-200;
  }

  .dropdown-item {
    @apply flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50;
  }
</style>

