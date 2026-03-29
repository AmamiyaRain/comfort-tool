<svelte:options runes={true} />

<script lang="ts">
  import { Button, Dropdown, DropdownItem } from "flowbite-svelte";

  let {
    isLoading,
    onExport,
  } = $props();

  let exportMenuOpen = $state(false);
  const exportTriggerId = `plotly-export-${Math.random().toString(36).slice(2, 10)}`;
</script>

<section class="flex items-center justify-end">
  <Button
    id={exportTriggerId}
    type="button"
    size="xs"
    color="alternative"
    class="gap-2 rounded-lg border-stone-200 bg-white text-stone-700 hover:bg-stone-50 focus-within:ring-sky-200"
    disabled={isLoading}
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
  </Button>

  <Dropdown
    bind:open={exportMenuOpen}
    triggeredBy={`#${exportTriggerId}`}
    placement="bottom-end"
    arrow={false}
    class="w-52 py-1"
    containerClass="z-30 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/70"
    headerClass="border-b border-stone-100 px-4 py-2"
  >
    <p slot="header" class="text-[11px] uppercase tracking-[0.16em] text-stone-500">
      Download chart
    </p>
    <DropdownItem
      class="flex items-center justify-between gap-3 text-stone-700 hover:bg-stone-50"
      onclick={() => {
        exportMenuOpen = false;
        onExport("png");
      }}
    >
      <span>Download PNG</span>
      <span class="text-[11px] uppercase tracking-[0.12em] text-stone-400">Image</span>
    </DropdownItem>
    <DropdownItem
      class="flex items-center justify-between gap-3 text-stone-700 hover:bg-stone-50"
      onclick={() => {
        exportMenuOpen = false;
        onExport("svg");
      }}
    >
      <span>Download SVG</span>
      <span class="text-[11px] uppercase tracking-[0.12em] text-stone-400">Vector</span>
    </DropdownItem>
  </Dropdown>
</section>
