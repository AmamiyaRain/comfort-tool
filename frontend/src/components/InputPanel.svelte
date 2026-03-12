<script lang="ts">
  import { Badge, Button, Card, Toggle } from "flowbite-svelte";

  import SearchableSelect from "./SearchableSelect.svelte";
  import { compareCaseMetaById, compareCaseOrder } from "../models/compareCases";
  import { comfortModelMetaById, comfortModelOrder } from "../models/comfortModels";
  import { fieldMetaByKey } from "../models/fieldMeta";
  import { FieldKey } from "../models/fieldKeys";
  import { UnitSystem } from "../models/units";
  import { convertSiToDisplay, formatDisplayValue } from "../services/unitConversion";

  let {
    selectedModel,
    compareEnabled,
    activeCaseId,
    visibleCaseIds,
    fieldOrder,
    inputsByCase,
    unitSystem,
    isLoading,
    requestCount,
    onSelectModel,
    onToggleCompare,
    onSelectActiveCase,
    onToggleCaseVisibility,
    onToggleUnits,
    onUpdateField,
    onRefresh,
  } = $props();

  function getDisplayValue(caseId, fieldKey, decimals) {
    return formatDisplayValue(convertSiToDisplay(fieldKey, inputsByCase[caseId][fieldKey], unitSystem), decimals);
  }

  function getInputIndex(caseId) {
    return compareCaseOrder.indexOf(caseId) + 1;
  }

  function isCaseVisible(caseId) {
    return visibleCaseIds.includes(caseId);
  }

  function getMatrixTemplateColumns() {
    return `repeat(${visibleCaseIds.length}, minmax(0, 1fr))`;
  }

  function handleFieldInput(caseId, fieldKey, value) {
    onSelectActiveCase(caseId);
    onUpdateField(caseId, fieldKey, value);
  }

  const modelOptions = comfortModelOrder.map((modelId) => ({
    name: comfortModelMetaById[modelId].label,
    value: modelId,
  }));

  function getFieldRange(fieldKey) {
    const meta = fieldMetaByKey[fieldKey];
    const min = formatDisplayValue(convertSiToDisplay(fieldKey, meta.minValue, unitSystem), meta.decimals);
    const max = formatDisplayValue(convertSiToDisplay(fieldKey, meta.maxValue, unitSystem), meta.decimals);
    return `From ${min} to ${max}`;
  }
</script>

<Card size="none" class="w-full border border-stone-300 bg-white shadow-sm">
  <div class="flex items-start justify-between gap-3 pb-2">
    <div>
      <h2 class="text-base font-semibold text-stone-900">Inputs</h2>
    </div>
    <Badge color="light">#{requestCount}</Badge>
  </div>

  <div class="mt-3 grid gap-3">
    <div>
      <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Model</div>
      <SearchableSelect
        class="mt-1.5"
        items={modelOptions}
        value={selectedModel}
        placeholder="Select model"
        searchPlaceholder="Search model..."
        onSelect={onSelectModel}
      />
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Compare</div>
        <div class="mt-1.5 flex w-full items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5">
          <span class={`text-xs ${!compareEnabled ? "font-semibold text-stone-900" : "text-stone-500"}`}>Off</span>
          <Toggle checked={compareEnabled} color="teal" onchange={(event) => onToggleCompare(event.currentTarget.checked)} />
          <span class={`text-xs ${compareEnabled ? "font-semibold text-stone-900" : "text-stone-500"}`}>On</span>
        </div>
      </div>

      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Units</div>
        <div class="mt-1.5 flex w-full items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5">
          <span class={`text-xs ${unitSystem === UnitSystem.SI ? "font-semibold text-stone-900" : "text-stone-500"}`}>SI</span>
          <Toggle checked={unitSystem === UnitSystem.IP} color="teal" onchange={onToggleUnits} />
          <span class={`text-xs ${unitSystem === UnitSystem.IP ? "font-semibold text-stone-900" : "text-stone-500"}`}>IP</span>
        </div>
      </div>
    </div>

    <div class="bg-white">
      {#if compareEnabled}
        <div class="grid gap-2 px-1 pb-2 md:grid-cols-3">
          {#each compareCaseOrder as caseId}
            <button
              type="button"
              class={`min-w-0 rounded-sm border px-2 py-1.5 text-left ${
                isCaseVisible(caseId)
                  ? "border-stone-900 border-solid bg-white"
                  : "border-stone-400 border-dashed bg-stone-50"
              }`}
              onclick={() => onToggleCaseVisibility(caseId)}
            >
              <div class="text-sm font-semibold text-stone-900">Input {getInputIndex(caseId)}</div>
            </button>
          {/each}
        </div>
      {/if}

      <div class="grid gap-1">
        {#each fieldOrder as fieldKey}
          {@const meta = fieldMetaByKey[fieldKey]}
          <div class="px-1 py-0.5">
            <div class="flex items-baseline justify-between gap-3">
              <div class="text-sm font-medium text-sky-700">{meta.label} ({meta.displayUnits[unitSystem]})</div>
              <div class="text-[11px] text-stone-500">{getFieldRange(fieldKey).replace("From ", "").replace(" to ", " ~ ")}</div>
            </div>
            <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getMatrixTemplateColumns()};`}>
              {#each visibleCaseIds as caseId}
                <div class={activeCaseId === caseId ? "rounded-sm bg-sky-50/50 p-1" : "p-1"}>
                  <input
                    id={`${caseId}-${fieldKey}`}
                    type="number"
                    step={meta.step}
                    value={getDisplayValue(caseId, fieldKey, meta.decimals)}
                    aria-label={`${compareCaseMetaById[caseId].label} ${meta.label}`}
                    onfocus={() => onSelectActiveCase(caseId)}
                    oninput={(event) => handleFieldInput(caseId, fieldKey, event.currentTarget.value)}
                    class="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-sky-600 focus:outline-none"
                  />
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-xs text-stone-500">
      {#if isLoading}
        Running model calculations.
      {:else}
        Calculate updates the visible inputs, results, and chart.
      {/if}
    </p>
    <Button type="button" size="sm" color="dark" onclick={onRefresh} disabled={isLoading} class="shrink-0">
      {isLoading ? "Calculating..." : "Calculate"}
    </Button>
  </div>
</Card>
