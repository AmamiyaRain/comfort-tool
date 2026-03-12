<svelte:options runes={true} />

<script lang="ts">
  import { Input } from "flowbite-svelte";
  import { onMount } from "svelte";

  type SelectOption<TValue> = {
    name: string | number;
    value: TValue;
    disabled?: boolean;
  };

  let {
    items = [],
    value = "",
    placeholder = "Select option",
    searchPlaceholder = "Search...",
    emptyMessage = "No matching options.",
    disabled = false,
    onSelect = undefined,
    class: className = "",
  }: {
    items?: SelectOption<string>[];
    value?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    onSelect?: ((value: string) => void) | undefined;
    class?: string;
  } = $props();

  let rootElement = $state<HTMLDivElement | null>(null);
  let searchInput = $state<HTMLInputElement | null>(null);
  let isOpen = $state(false);
  let query = $state("");

  const selectedItem = $derived(items.find((item) => item.value === value) ?? null);
  const filteredItems = $derived(
    items.filter((item) => `${item.name}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  function openDropdown() {
    if (disabled) {
      return;
    }
    isOpen = true;
    queueMicrotask(() => searchInput?.focus());
  }

  function toggleDropdown() {
    if (isOpen) {
      isOpen = false;
      query = "";
      return;
    }
    openDropdown();
  }

  function closeDropdown() {
    isOpen = false;
    query = "";
  }

  function handleSelect(nextValue: string) {
    onSelect?.(nextValue);
    closeDropdown();
  }

  onMount(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootElement && event.target instanceof Node && !rootElement.contains(event.target)) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  });
</script>

<div class={`relative w-full min-w-0 ${className}`} bind:this={rootElement}>
  <button
    type="button"
    class={`flex w-full items-center justify-between rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-left text-sm text-stone-900 focus:border-sky-600 focus:outline-none ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    onclick={toggleDropdown}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    disabled={disabled}
  >
    <span class={selectedItem ? "text-stone-900" : "text-stone-500"}>
      {selectedItem ? selectedItem.name : placeholder}
    </span>
    <span class="text-xs text-stone-500">{isOpen ? "▲" : "▼"}</span>
  </button>

  {#if isOpen}
    <div class="absolute z-20 mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 shadow-lg">
      <Input
        bind:this={searchInput}
        type="search"
        size="sm"
        placeholder={searchPlaceholder}
        bind:value={query}
      />

      <div class="mt-2 max-h-64 overflow-y-auto">
        {#if filteredItems.length > 0}
          {#each filteredItems as item}
            <button
              type="button"
              class={`flex w-full items-center rounded-md px-2 py-2 text-left text-sm ${item.value === value ? "bg-sky-50 text-sky-900" : "text-stone-700 hover:bg-stone-100"} ${item.disabled ? "cursor-not-allowed opacity-50" : ""}`}
              onclick={() => !item.disabled && handleSelect(item.value)}
              disabled={item.disabled}
            >
              {item.name}
            </button>
          {/each}
        {:else}
          <div class="px-2 py-2 text-sm text-stone-500">{emptyMessage}</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
