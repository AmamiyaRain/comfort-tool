<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from "svelte";

  export interface NumericPresetOption {
    id: string;
    label: string;
    value: number;
  }

  let {
    items,
    value,
    decimals = 2,
    valueSuffix = "",
    placeholder = "Enter a value or search a preset",
    searchPlaceholder = "Type a value or search a preset",
    emptyMessage = "No matching preset.",
    disabled = false,
    ariaLabel = "Preset input",
    onActivate = undefined,
    onCommit = undefined,
    class: className = "",
  }: {
    items: NumericPresetOption[];
    value: number;
    decimals?: number;
    valueSuffix?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    ariaLabel?: string;
    onActivate?: (() => void) | undefined;
    onCommit?: ((value: number) => void) | undefined;
    class?: string;
  } = $props();

  let rootElement = $state<HTMLElement | null>(null);
  let searchInput = $state<HTMLInputElement | null>(null);
  let isOpen = $state(false);
  let query = $state("");
  let highlightedIndex = $state(-1);
  const listboxId = `numeric-preset-listbox-${Math.random().toString(36).slice(2, 10)}`;
  const dropdownPanelStyle = "width: min(max(100%, 24rem), calc(100vw - 2rem));";

  const selectedPreset = $derived.by(() => (
    items.find((item) => Math.abs(item.value - value) < 0.001) ?? null
  ));
  const filteredItems = $derived.by(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => (
      item.label.toLowerCase().includes(normalizedQuery) ||
      item.value.toFixed(decimals).includes(normalizedQuery)
    ));
  });
  const displayValue = $derived(value.toFixed(decimals));
  const inputValue = $derived(isOpen ? query : displayValue);

  function getSelectedIndex() {
    if (!selectedPreset) {
      return filteredItems.findIndex(() => true);
    }

    return filteredItems.findIndex((item) => item.id === selectedPreset.id);
  }

  function formatValue(value: number): string {
    return `${value.toFixed(decimals)}${valueSuffix ? ` ${valueSuffix}` : ""}`;
  }

  function parseNumericQuery(rawValue: string): number | null {
    const normalizedValue = rawValue.trim().toLowerCase().replace(valueSuffix.toLowerCase(), "").trim();
    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function getExactPresetMatch(rawValue: string) {
    const normalizedValue = rawValue.trim().toLowerCase();
    if (!normalizedValue) {
      return null;
    }

    return items.find((item) => (
      item.label.toLowerCase() === normalizedValue ||
      item.value.toFixed(decimals) === normalizedValue ||
      formatValue(item.value).toLowerCase() === normalizedValue
    )) ?? null;
  }

  function commitQueryValue() {
    const exactPreset = getExactPresetMatch(query);
    if (exactPreset) {
      onActivate?.();
      onCommit?.(exactPreset.value);
      return true;
    }

    const parsedValue = parseNumericQuery(query);
    if (parsedValue === null) {
      return false;
    }

    onActivate?.();
    onCommit?.(parsedValue);
    return true;
  }

  function openDropdown(options?: { resetQuery?: boolean; selectInput?: boolean }) {
    if (disabled) {
      return;
    }

    onActivate?.();
    isOpen = true;
    query = options?.resetQuery ? "" : displayValue;
    highlightedIndex = getSelectedIndex();

    queueMicrotask(() => {
      searchInput?.focus();
      if (options?.selectInput) {
        searchInput?.select();
      }
    });
  }

  function closeDropdown(options?: { commitIfNumeric?: boolean }) {
    if (options?.commitIfNumeric) {
      commitQueryValue();
    }

    isOpen = false;
    query = "";
    highlightedIndex = -1;
  }

  function handleSelect(nextValue: number) {
    onActivate?.();
    onCommit?.(nextValue);
    closeDropdown();
  }

  function handleInput(event: Event) {
    query = (event.currentTarget as HTMLInputElement).value;
    if (!isOpen) {
      isOpen = true;
    }

    highlightedIndex = filteredItems.findIndex(() => true);
  }

  function highlightNextOption(direction: 1 | -1) {
    if (filteredItems.length === 0) {
      highlightedIndex = -1;
      return;
    }

    let nextIndex = highlightedIndex;
    for (let attempts = 0; attempts < filteredItems.length; attempts += 1) {
      nextIndex = (nextIndex + direction + filteredItems.length) % filteredItems.length;
      highlightedIndex = nextIndex;
      return;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")) {
      event.preventDefault();
      openDropdown({ resetQuery: true });
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      highlightNextOption(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      highlightNextOption(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const exactPreset = getExactPresetMatch(query);
      if (exactPreset) {
        handleSelect(exactPreset.value);
        return;
      }

      if (parseNumericQuery(query) !== null) {
        if (commitQueryValue()) {
          closeDropdown();
        }
        return;
      }

      const highlightedItem = filteredItems[highlightedIndex];
      if (highlightedItem) {
        handleSelect(highlightedItem.value);
        return;
      }

      if (commitQueryValue()) {
        closeDropdown();
      }
      return;
    }

    if (event.key === "Tab") {
      closeDropdown({ commitIfNumeric: true });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  }

  function toggleDropdown() {
    if (isOpen) {
      closeDropdown({ commitIfNumeric: true });
      return;
    }

    openDropdown({ resetQuery: true });
  }

  onMount(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootElement && event.target instanceof Node && !rootElement.contains(event.target)) {
        closeDropdown({ commitIfNumeric: true });
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  });
</script>

<section class={`relative w-full min-w-0 ${className}`} bind:this={rootElement}>
  <input
    bind:this={searchInput}
    type="text"
    value={inputValue}
    placeholder={placeholder}
    class={`w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 pr-10 text-sm text-stone-900 focus:border-sky-600 focus:outline-none ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    onfocus={() => openDropdown({ resetQuery: true })}
    oninput={handleInput}
    onkeydown={handleKeydown}
    role="combobox"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    aria-controls={listboxId}
    aria-autocomplete="list"
    aria-label={ariaLabel}
    disabled={disabled}
    autocomplete="off"
    spellcheck="false"
  />
  <button
    type="button"
    class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-stone-500"
    onclick={toggleDropdown}
    tabindex="-1"
    aria-label={isOpen ? "Close presets" : "Open presets"}
    disabled={disabled}
  >
    <span class="text-xs">{isOpen ? "▲" : "▼"}</span>
  </button>

  {#if isOpen}
    <section
      id={listboxId}
      role="listbox"
      class="absolute left-0 z-20 mt-1 rounded-lg border border-stone-300 bg-white p-2 shadow-lg"
      style={dropdownPanelStyle}
    >
      <header class="flex items-center justify-between gap-3 px-1 pb-2">
        <p class="text-[11px] uppercase tracking-[0.16em] text-stone-500">
          {searchPlaceholder}
        </p>
        <p class="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
          Current {formatValue(value)}
        </p>
      </header>
      <ul class="max-h-64 overflow-y-auto">
        {#if filteredItems.length > 0}
          {#each filteredItems as item, index}
            <li>
              <button
                type="button"
                class={`flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left ${
                  index === highlightedIndex
                    ? "bg-stone-100 text-stone-900"
                    : selectedPreset?.id === item.id
                      ? "bg-sky-50 text-sky-900"
                      : "text-stone-700 hover:bg-stone-100"
                }`}
                onclick={() => handleSelect(item.value)}
                onmouseenter={() => {
                  highlightedIndex = index;
                }}
              >
                <span class="min-w-0 text-sm">{item.label}</span>
                <span class="shrink-0 rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {formatValue(item.value)}
                </span>
              </button>
            </li>
          {/each}
        {:else}
          <li class="px-2 py-2 text-sm text-stone-500">{emptyMessage}</li>
        {/if}
      </ul>
    </section>
  {/if}
</section>
