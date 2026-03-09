<script lang="ts">
  import { Badge, Button, Card, Toggle } from "flowbite-svelte";

  import { compareCaseMetaById, compareCaseOrder } from "../models/compareCases";
  import { comfortModelMetaById, comfortModelOrder } from "../models/comfortModels";
  import { fieldMetaByKey } from "../models/fieldMeta";
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
    return `8.25rem repeat(${visibleCaseIds.length}, minmax(0, 1fr))`;
  }

  function handleFieldInput(caseId, fieldKey, value) {
    onSelectActiveCase(caseId);
    onUpdateField(caseId, fieldKey, value);
  }
</script>

<Card size="none" class="w-full border border-stone-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
  <div class="flex items-start justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <Badge color="dark">Manual Run</Badge>
        <Badge color="dark">#{requestCount}</Badge>
      </div>
      <h2 class="mt-4 text-xl font-semibold text-stone-950">Input</h2>
      <p class="mt-2 text-sm leading-6 text-stone-600">
        {compareEnabled
          ? "Compare mode keeps this panel fixed and arranges the visible cases into columns."
          : "Edit one input set, then calculate results and charts."}
      </p>
    </div>

    {#if compareEnabled}
      <div class="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Active {compareCaseMetaById[activeCaseId].label}
      </div>
    {/if}
  </div>

  <div class="mt-6 grid gap-4">
    <div class="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
      <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Model</div>
      <div class="mt-3 grid grid-cols-2 gap-2">
        {#each comfortModelOrder as modelId}
          <Button type="button" color={selectedModel === modelId ? "dark" : "alternative"} onclick={() => onSelectModel(modelId)}>
            {comfortModelMetaById[modelId].label}
          </Button>
        {/each}
      </div>
      <p class="mt-3 text-sm text-stone-600">{comfortModelMetaById[selectedModel].description}</p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
        <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Compare</div>
        <div class="mt-3 flex items-center justify-between gap-4">
          <span class={`text-sm font-medium ${!compareEnabled ? "text-stone-950" : "text-stone-500"}`}>Off</span>
          <Toggle checked={compareEnabled} color="teal" onchange={(event) => onToggleCompare(event.currentTarget.checked)} />
          <span class={`text-sm font-medium ${compareEnabled ? "text-stone-950" : "text-stone-500"}`}>On</span>
        </div>
      </div>

      <div class="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
        <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Units</div>
        <div class="mt-3 flex items-center justify-between gap-4">
          <span class={`text-sm font-medium ${unitSystem === UnitSystem.SI ? "text-stone-950" : "text-stone-500"}`}>SI</span>
          <Toggle checked={unitSystem === UnitSystem.IP} color="teal" onchange={onToggleUnits} />
          <span class={`text-sm font-medium ${unitSystem === UnitSystem.IP ? "text-stone-950" : "text-stone-500"}`}>IP</span>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-6 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-3">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div>
        <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Input Matrix</div>
        <p class="mt-1 text-xs text-stone-500">
          {compareEnabled
            ? "Use the input buttons to control which columns are visible. The visible columns stay aligned by row."
            : "Single-column editing for the current model."}
        </p>
      </div>
      <div class="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {fieldOrder.length} fields
      </div>
    </div>

    {#if compareEnabled}
      <div class="mb-3 grid grid-cols-3 gap-2">
        {#each compareCaseOrder as caseId}
          <button
            type="button"
            class={`rounded-[1rem] border px-3 py-3 text-left transition ${
              isCaseVisible(caseId)
                ? activeCaseId === caseId
                  ? "border-stone-950 bg-stone-950 text-white"
                  : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                : "border-dashed border-stone-300 bg-white/70 text-stone-400 hover:border-stone-400 hover:text-stone-600"
            }`}
            onclick={() => onToggleCaseVisibility(caseId)}
          >
            <span class={`block text-[10px] font-semibold uppercase tracking-[0.16em] ${
              isCaseVisible(caseId)
                ? activeCaseId === caseId
                  ? "text-white/70"
                  : compareCaseMetaById[caseId].accentClass
                : "text-stone-400"
            }`}>
              Input {getInputIndex(caseId)}
            </span>
            <span class="mt-1 block text-sm font-semibold">{isCaseVisible(caseId) ? "Visible" : "Hidden"}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white">
      <div class="grid" style={`grid-template-columns: ${getMatrixTemplateColumns()};`}>
        <div class="border-b border-stone-200 bg-stone-50 px-3 py-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Fields</div>
          <div class="mt-1 text-[11px] uppercase tracking-[0.16em] text-stone-400">{unitSystem}</div>
        </div>

        {#each visibleCaseIds as caseId}
          <div
            class={`border-b border-l border-stone-200 px-2 py-3 text-center ${
              activeCaseId === caseId ? "bg-stone-950 text-white" : "bg-white text-stone-700"
            }`}
          >
            <span class={`block text-[10px] font-semibold uppercase tracking-[0.16em] ${activeCaseId === caseId ? "text-white/70" : compareCaseMetaById[caseId].accentClass}`}>
              Input {getInputIndex(caseId)}
            </span>
            <span class="mt-1 block text-sm font-semibold">{compareCaseMetaById[caseId].label}</span>
          </div>
        {/each}

        {#each fieldOrder as fieldKey}
          {@const meta = fieldMetaByKey[fieldKey]}
          <div class="border-t border-stone-200 bg-stone-50/80 px-3 py-3">
            <div class="text-sm font-medium leading-5 text-stone-800">{meta.label}</div>
            <div class="mt-1 text-[11px] uppercase tracking-[0.16em] text-stone-400">{meta.units[unitSystem]}</div>
          </div>

          {#each visibleCaseIds as caseId}
            <div class={`border-l border-t border-stone-200 px-2 py-2 ${activeCaseId === caseId ? "bg-stone-50" : "bg-white"}`}>
              <input
                id={`${caseId}-${fieldKey}`}
                type="number"
                step={meta.step}
                value={getDisplayValue(caseId, fieldKey, meta.decimals)}
                aria-label={`${compareCaseMetaById[caseId].label} ${meta.label}`}
                onfocus={() => onSelectActiveCase(caseId)}
                oninput={(event) => handleFieldInput(caseId, fieldKey, event.currentTarget.value)}
                class="w-full rounded-xl border border-stone-200 bg-white px-2 py-2 text-center text-sm font-medium text-stone-900 shadow-sm transition focus:border-stone-950 focus:outline-none"
              />
            </div>
          {/each}
        {/each}
      </div>
    </div>
  </div>

  <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-stone-500">
      {#if isLoading}
        Running model calculations and refreshing all visible outputs.
      {:else}
        Calculate updates the visible cases, results, and current chart.
      {/if}
    </p>
    <Button type="button" color="dark" shadow onclick={onRefresh} disabled={isLoading} class="shrink-0">
      {isLoading ? "Calculating..." : "Calculate"}
    </Button>
  </div>
</Card>
