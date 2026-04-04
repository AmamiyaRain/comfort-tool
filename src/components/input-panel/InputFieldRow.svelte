<script lang="ts">
  import PresetNumericInput from "../PresetNumericInput.svelte";
  import { inputMetaById } from "../../models/inputSlots";
  import type { InputId as InputIdType } from "../../models/inputSlots";
  import type { InputControlViewModel } from "../../models/inputControls";
  import type { ComfortToolController } from "../../state/comfortTool/types";

  let {
    toolState,
    control,
    onOpenClothingBuilder,
  }: {
    toolState: ComfortToolController;
    control: InputControlViewModel;
    onOpenClothingBuilder: () => void;
  } = $props();

  let menuOpen = $state(false);
  let menu = $derived(control.menu);

  function getVisibleInputIds() {
    return toolState.selectors.getVisibleInputIds();
  }

  function getAdvancedMenuTriggerId() {
    return `advanced-input-${control.id}`;
  }

  function getMatrixTemplateColumns() {
    return `repeat(${getVisibleInputIds().length}, minmax(0, 1fr))`;
  }

  function handleFieldInput(inputId: InputIdType, value: string) {
    toolState.actions.setActiveInputId(inputId);
    toolState.actions.updateInput(inputId, control.id, value);
  }

  function handleApplyPresetValue(inputId: InputIdType, value: number) {
    toolState.actions.setActiveInputId(inputId);
    toolState.actions.updateInput(inputId, control.id, value.toFixed(control.presetDecimals));
  }

  function handleWindowClick(event: MouseEvent) {
    if (menuOpen && !(event.target as HTMLElement).closest(".advanced-menu-container")) {
      menuOpen = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} />

<section class="px-1 py-0.5">
  <header class="flex items-start justify-between gap-3">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <p class="text-sm font-medium text-sky-700">
        {control.label} ({control.displayUnits})
      </p>

      {#if menu}
        <div class="advanced-menu-container relative inline-block">
          <button
            id={getAdvancedMenuTriggerId()}
            type="button"
            class="more-btn"
            onclick={() => (menuOpen = !menuOpen)}
          >
            More
            <span class="text-[10px]">▼</span>
          </button>

          {#if menuOpen}
            <div class="absolute left-0 z-30 mt-1 w-72 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg shadow-stone-200/70">
              <header class="border-b border-stone-100 px-4 py-2">
                <p class="text-[11px] uppercase tracking-[0.16em] text-stone-500">{menu.title}</p>
              </header>
              {#each menu.sections as section, sectionIndex}
                {#if section.title}
                  <p class="px-4 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                    {section.title}
                  </p>
                {/if}

                {#each section.items as item}
                  <button
                    type="button"
                    class="menu-item"
                    onclick={() => {
                      toolState.actions.setModelOption(item.optionKey, item.value);
                      menuOpen = false;
                    }}
                  >
                    <span class={item.active ? "font-semibold text-stone-900" : ""}>
                      {item.label}
                    </span>
                    <span class="text-xs text-stone-500">{item.description}</span>
                  </button>
                {/each}

                {#if sectionIndex < menu.sections.length - 1}
                  <div class="my-1 border-t border-stone-100"></div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if control.showClothingBuilder}
        <button type="button" onclick={onOpenClothingBuilder} class="more-btn">
          More
          <span class="text-[10px]">▼</span>
        </button>
      {/if}
    </div>

    {#if control.rangeText}
      <small class="shrink-0 text-[11px] text-stone-500">
        {control.rangeText.replace("From ", "").replace(" to ", " ~ ")}
      </small>
    {/if}
  </header>

  <ul class="mt-1 grid gap-2" style={`grid-template-columns: ${getMatrixTemplateColumns()};`}>
    {#each getVisibleInputIds() as inputId}
      <li class={toolState.state.ui.activeInputId === inputId ? "rounded-sm bg-sky-50/50 p-1" : "p-1"}>
        {#if control.editorKind === "preset"}
          <PresetNumericInput
            items={control.presetOptions}
            value={control.numericValuesByInput[inputId] ?? 0}
            decimals={control.presetDecimals}
            valueSuffix={control.displayUnits}
            placeholder={`Enter ${control.displayUnits} or search preset`}
            searchPlaceholder={`Search ${control.label.toLowerCase()} presets`}
            ariaLabel={`${inputMetaById[inputId].label} ${control.label}`}
            onActivate={() => toolState.actions.setActiveInputId(inputId)}
            onCommit={(value) => handleApplyPresetValue(inputId, value)}
          />
        {:else}
          <input
            id={`${inputId}-${control.id}`}
            type="number"
            step={control.step}
            value={control.displayValuesByInput[inputId] ?? ""}
            aria-label={`${inputMetaById[inputId].label} ${control.label}`}
            onfocus={() => toolState.actions.setActiveInputId(inputId)}
            oninput={(event) => handleFieldInput(inputId, event.currentTarget.value)}
            class="field-input"
          />
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .more-btn {
    @apply inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900;
  }

  .menu-item {
    @apply flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left text-stone-700 hover:bg-stone-50;
  }

  .field-input {
    @apply w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-sky-600 focus:outline-none;
  }
</style>

