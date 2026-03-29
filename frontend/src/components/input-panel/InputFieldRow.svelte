<svelte:options runes={true} />

<script lang="ts">
  import { Dropdown, DropdownItem } from "flowbite-svelte";

  import PresetNumericInput from "../PresetNumericInput.svelte";
  import { inputMetaById } from "../../models/inputSlots";
  import type { ComfortToolController } from "../../state/comfortTool/types";

  let {
    toolState,
    fieldKey,
    onOpenClothingBuilder,
  }: {
    toolState: ComfortToolController;
    fieldKey: string;
    onOpenClothingBuilder: () => void;
  } = $props();

  let menuOpen = $state(false);
  let fieldPresentation = $derived(toolState.selectors.getFieldPresentation(fieldKey));
  let menu = $derived(toolState.selectors.getAdvancedOptionMenu(fieldKey));

  function getVisibleInputIds() {
    return toolState.selectors.getVisibleInputIds();
  }

  function getAdvancedMenuTriggerId() {
    return `advanced-input-${fieldKey}`;
  }

  function getMatrixTemplateColumns() {
    return `repeat(${getVisibleInputIds().length}, minmax(0, 1fr))`;
  }

  function handleFieldInput(inputId, value) {
    toolState.actions.setActiveInputId(inputId);
    toolState.actions.updateInput(inputId, fieldKey, value);
  }

  function handleApplyPresetValue(inputId, value) {
    toolState.actions.setActiveInputId(inputId);
    toolState.actions.updateInput(inputId, fieldKey, value.toFixed(fieldPresentation.presetDecimals));
  }
</script>

<section class="px-1 py-0.5">
  <header class="flex items-start justify-between gap-3">
    <section class="flex min-w-0 flex-wrap items-center gap-2">
      <p class="text-sm font-medium text-sky-700">
        {fieldPresentation.label} ({fieldPresentation.displayUnits})
      </p>

      {#if menu}
        <button
          id={getAdvancedMenuTriggerId()}
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
        >
          More
          <span class="text-[10px]">▼</span>
        </button>

        <Dropdown
          bind:open={menuOpen}
          triggeredBy={`#${getAdvancedMenuTriggerId()}`}
          placement="bottom-start"
          arrow={false}
          class="w-72 py-1"
          containerClass="z-30 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/70"
          headerClass="border-b border-stone-100 px-4 py-2"
        >
          <svelte:fragment slot="header">
            <p class="text-[11px] uppercase tracking-[0.16em] text-stone-500">{menu.title}</p>
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

      {#if fieldPresentation.showClothingBuilder}
        <button
          type="button"
          onclick={onOpenClothingBuilder}
          class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
        >
          More
          <span class="text-[10px]">▼</span>
        </button>
      {/if}
    </section>

    {#if fieldPresentation.rangeText}
      <small class="shrink-0 text-[11px] text-stone-500">
        {fieldPresentation.rangeText.replace("From ", "").replace(" to ", " ~ ")}
      </small>
    {/if}
  </header>

  <ul class="mt-1 grid gap-2" style={`grid-template-columns: ${getMatrixTemplateColumns()};`}>
    {#each getVisibleInputIds() as inputId}
      <li class={toolState.state.ui.activeInputId === inputId ? "rounded-sm bg-sky-50/50 p-1" : "p-1"}>
        {#if fieldPresentation.showPresetInput}
          <PresetNumericInput
            items={fieldPresentation.presetOptions}
            value={toolState.state.inputsByInput[inputId][fieldKey]}
            decimals={fieldPresentation.presetDecimals}
            valueSuffix={fieldPresentation.displayUnits}
            placeholder={`Enter ${fieldPresentation.displayUnits} or search preset`}
            searchPlaceholder={`Search ${fieldPresentation.label.toLowerCase()} presets`}
            ariaLabel={`${inputMetaById[inputId].label} ${fieldPresentation.label}`}
            onActivate={() => toolState.actions.setActiveInputId(inputId)}
            onCommit={(value) => handleApplyPresetValue(inputId, value)}
          />
        {:else}
          <input
            id={`${inputId}-${fieldKey}`}
            type="number"
            step={fieldPresentation.step}
            value={toolState.selectors.getFieldDisplayValue(inputId, fieldKey)}
            aria-label={`${inputMetaById[inputId].label} ${fieldPresentation.label}`}
            onfocus={() => toolState.actions.setActiveInputId(inputId)}
            oninput={(event) => handleFieldInput(inputId, event.currentTarget.value)}
            class="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-sky-600 focus:outline-none"
          />
        {/if}
      </li>
    {/each}
  </ul>
</section>
