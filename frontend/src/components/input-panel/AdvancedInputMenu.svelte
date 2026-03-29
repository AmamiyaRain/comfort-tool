<svelte:options runes={true} />

<script lang="ts">
  import { Dropdown, DropdownItem } from "flowbite-svelte";

  import type { ComfortToolState } from "../../state/comfortTool.svelte";

  let {
    toolState,
    fieldKey,
  }: {
    toolState: ComfortToolState;
    fieldKey: string;
  } = $props();

  let menuOpen = $state(false);
  let menu = $derived(toolState.selectors.getAdvancedOptionMenu(fieldKey));

  function getTriggerId() {
    return `advanced-input-${fieldKey}`;
  }
</script>

{#if menu}
  <button
    id={getTriggerId()}
    type="button"
    class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
  >
    More
    <span class="text-[10px]">▼</span>
  </button>

  <Dropdown
    bind:open={menuOpen}
    triggeredBy={`#${getTriggerId()}`}
    placement="bottom-start"
    arrow={false}
    class="w-72 py-1"
    containerClass="z-30 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/70"
    headerClass="border-b border-stone-100 px-4 py-2"
  >
    <svelte:fragment slot="header">
      <div class="text-[11px] uppercase tracking-[0.16em] text-stone-500">{menu.title}</div>
    </svelte:fragment>
    {#each menu.items as item}
      <DropdownItem
        class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
        onclick={() => {
          toolState.actions.setModelOption(item.optionKey, item.value);
          menuOpen = false;
        }}
      >
        <span class={item.active ? "font-semibold text-stone-900" : ""}>
          {item.label}
        </span>
        <span class="text-xs text-stone-500">{item.description}</span>
      </DropdownItem>
    {/each}
  </Dropdown>
{/if}
