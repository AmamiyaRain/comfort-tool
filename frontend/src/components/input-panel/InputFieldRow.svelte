<svelte:options runes={true} />

<script lang="ts">
  import PresetNumericInput from "../PresetNumericInput.svelte";
  import AdvancedInputMenu from "./AdvancedInputMenu.svelte";
  import {
    getDisplayValue,
    getFieldDecimals,
    getFieldDisplayUnits,
    getFieldLabel,
    getFieldRange,
    getFieldStep,
    getPresetInputDecimals,
    getPresetInputOptions,
    showClothingBuilder,
    showPresetInput,
  } from "./fieldDisplay";
  import { compareCaseMetaById } from "../../models/compareCases";
  import type { ComfortToolState } from "../../state/comfortTool.svelte";

  let {
    toolState,
    fieldKey,
    onOpenClothingBuilder,
  }: {
    toolState: ComfortToolState;
    fieldKey: string;
    onOpenClothingBuilder: () => void;
  } = $props();

  function getVisibleCaseIds() {
    return toolState.selectors.getVisibleCaseIds();
  }

  function getMatrixTemplateColumns() {
    return `repeat(${getVisibleCaseIds().length}, minmax(0, 1fr))`;
  }

  function handleFieldInput(caseId, value) {
    toolState.actions.setActiveCaseId(caseId);
    toolState.actions.updateInput(caseId, fieldKey, value);
  }

  function handleApplyPresetValue(caseId, value) {
    toolState.actions.setActiveCaseId(caseId);
    toolState.actions.updateInput(caseId, fieldKey, value.toFixed(getPresetInputDecimals(fieldKey)));
  }
</script>

<div class="px-1 py-0.5">
  <div class="flex items-start justify-between gap-3">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <div class="text-sm font-medium text-sky-700">
        {getFieldLabel(toolState, fieldKey)} ({getFieldDisplayUnits(toolState, fieldKey)})
      </div>

      <AdvancedInputMenu {toolState} {fieldKey} />

      {#if showClothingBuilder(toolState, fieldKey)}
        <button
          type="button"
          onclick={onOpenClothingBuilder}
          class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
        >
          More
          <span class="text-[10px]">▼</span>
        </button>
      {/if}
    </div>

    {#if getFieldRange(toolState, fieldKey)}
      <div class="shrink-0 text-[11px] text-stone-500">
        {getFieldRange(toolState, fieldKey).replace("From ", "").replace(" to ", " ~ ")}
      </div>
    {/if}
  </div>
  <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getMatrixTemplateColumns()};`}>
    {#each getVisibleCaseIds() as caseId}
      <div class={toolState.state.ui.activeCaseId === caseId ? "rounded-sm bg-sky-50/50 p-1" : "p-1"}>
        {#if showPresetInput(toolState, fieldKey)}
          <PresetNumericInput
            items={getPresetInputOptions(fieldKey)}
            value={toolState.state.inputsByCase[caseId][fieldKey]}
            decimals={getPresetInputDecimals(fieldKey)}
            valueSuffix={getFieldDisplayUnits(toolState, fieldKey)}
            placeholder={`Enter ${getFieldDisplayUnits(toolState, fieldKey)} or search preset`}
            searchPlaceholder={`Search ${getFieldLabel(toolState, fieldKey).toLowerCase()} presets`}
            ariaLabel={`${compareCaseMetaById[caseId].label} ${getFieldLabel(toolState, fieldKey)}`}
            onActivate={() => toolState.actions.setActiveCaseId(caseId)}
            onCommit={(value) => handleApplyPresetValue(caseId, value)}
          />
        {:else}
          <input
            id={`${caseId}-${fieldKey}`}
            type="number"
            step={getFieldStep(toolState, fieldKey)}
            value={getDisplayValue(toolState, caseId, fieldKey, getFieldDecimals(toolState, fieldKey))}
            aria-label={`${compareCaseMetaById[caseId].label} ${getFieldLabel(toolState, fieldKey)}`}
            onfocus={() => toolState.actions.setActiveCaseId(caseId)}
            oninput={(event) => handleFieldInput(caseId, event.currentTarget.value)}
            class="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-sky-600 focus:outline-none"
          />
        {/if}
      </div>
    {/each}
  </div>
</div>
