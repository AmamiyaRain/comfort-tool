<script lang="ts">
  import { Dropdown, DropdownItem, Input, Label } from "flowbite-svelte";
  import PresetNumericInput from "../PresetNumericInput.svelte";
  import { inputDisplayMetaById } from "../../models/inputSlotPresentation";
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

  function commitFieldValue(inputId: InputIdType, inputElement: HTMLInputElement) {
    const rawValue = inputElement.value.trim();
    toolState.actions.setActiveInputId(inputId);

    if (!rawValue || !Number.isFinite(Number(rawValue))) {
      inputElement.value = control.displayValuesByInput[inputId] ?? "";
      return;
    }

    toolState.actions.updateInput(inputId, control.id, rawValue);
  }

  function handleApplyPresetValue(inputId: InputIdType, value: number) {
    toolState.actions.setActiveInputId(inputId);
    toolState.actions.updateInput(inputId, control.id, value.toFixed(control.presetDecimals));
  }
</script>

<section class="px-1 py-0.5">
  <header class="flex items-start justify-between gap-3">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <Label class="text-sm font-medium text-sky-700">
        {control.label} ({control.displayUnits})
      </Label>

      {#if menu}
        <button
          id={getAdvancedMenuTriggerId()}
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
        >
          More
          <span class="text-[10px]">▼</span>
        </button>

        <Dropdown triggeredBy={`#${getAdvancedMenuTriggerId()}`} class="w-72 overflow-hidden rounded-xl py-1 shadow-lg">
          <p slot="header" class="border-b border-stone-100 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-stone-500">
            {menu.title}
          </p>
          {#each menu.sections as section}
            {#if section.title}
              <p class="px-4 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                {section.title}
              </p>
            {/if}

            {#each section.items as item}
              <DropdownItem
                class="flex flex-col items-start gap-0.5 px-4 py-2 text-left"
                onclick={() => {
                  toolState.actions.setModelOption(item.optionKey, item.value);
                }}
              >
                <span class={item.active ? "font-semibold text-stone-900" : ""}>
                  {item.label}
                </span>
                <span class="text-xs text-stone-500">{item.description}</span>
              </DropdownItem>
            {/each}
          {/each}
        </Dropdown>
      {/if}

      {#if control.showClothingBuilder}
        <button
          id={`clothing-builder-trigger-${control.id}`}
          type="button"
          onclick={onOpenClothingBuilder}
          class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
        >
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
            ariaLabel={`${inputDisplayMetaById[inputId].label} ${control.label}`}
            onActivate={() => toolState.actions.setActiveInputId(inputId)}
            onCommit={(value) => handleApplyPresetValue(inputId, value)}
          />
        {:else}
          <Input
            id={`${inputId}-${control.id}`}
            type="number"
            step={control.step}
            size="sm"
            value={control.displayValuesByInput[inputId] ?? ""}
            aria-label={`${inputDisplayMetaById[inputId].label} ${control.label}`}
            onfocus={() => toolState.actions.setActiveInputId(inputId)}
            onchange={(event) => commitFieldValue(inputId, event.currentTarget)}
            onblur={(event) => {
              if (!event.currentTarget.value.trim()) {
                event.currentTarget.value = control.displayValuesByInput[inputId] ?? "";
              }
            }}
            onkeydown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();
                event.currentTarget.value = control.displayValuesByInput[inputId] ?? "";
                event.currentTarget.blur();
              }
            }}
            class="rounded-sm border-stone-300 bg-white"
          />
        {/if}
      </li>
    {/each}
  </ul>
</section>
