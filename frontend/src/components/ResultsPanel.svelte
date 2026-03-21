<script lang="ts">
  import { Alert, Badge, Card } from "flowbite-svelte";

  import { compareCaseMetaById } from "../models/compareCases";
  import { ComfortModel } from "../models/comfortModels";

  let {
    selectedModel,
    activeCaseId,
    visibleCaseIds,
    pmvResults,
    utciResults,
    errorMessage,
    isLoading,
    lastCompletedAt,
    resultRevision,
    embedded = false,
  } = $props();

  function formatUpdatedAt(timestamp: number) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(timestamp);
  }

  function getResultsTemplateColumns() {
    return `repeat(${visibleCaseIds.length}, minmax(0, 1fr))`;
  }

  function formatPmvValue(value: number) {
    return value.toFixed(2);
  }

  function formatPercentValue(value: number) {
    return `${value.toFixed(1)}%`;
  }

  function formatUtciValue(value: number) {
    return `${value.toFixed(1)} C`;
  }

  function getResultCellClasses(caseId) {
    const caseUi = compareCaseMetaById[caseId].ui;
    const activeClasses = activeCaseId === caseId ? caseUi.resultActiveRingClass : "";
    return `rounded-md border px-2 py-1.5 ${caseUi.resultCellClass} ${activeClasses}`.trim();
  }
</script>

<Card size="none" class={`w-full min-w-0 bg-white ${embedded ? "border-0 p-0 shadow-none" : "border border-stone-300 shadow-sm"}`}>
  {#if !embedded}
    <div class="flex items-start justify-between gap-3 border-b border-stone-200 pb-2">
      <div>
        <h2 class="text-base font-semibold text-stone-900">Results</h2>
      </div>
      <div class="flex items-center gap-2">
        <Badge color={isLoading ? "yellow" : "success"}>{isLoading ? "Refreshing" : "Ready"}</Badge>
        {#if lastCompletedAt > 0}
          <span class="text-[11px] text-stone-500">{formatUpdatedAt(lastCompletedAt)}</span>
        {/if}
      </div>
    </div>

    {#if errorMessage}
      <Alert color="red" class="mt-3 rounded-md text-sm">
        {errorMessage}
      </Alert>
    {/if}
  {/if}

  {#key resultRevision}
    <div class={embedded ? "bg-white" : "mt-3 bg-white"}>
      <div class="grid gap-x-4 gap-y-2 md:grid-cols-2">
        {#if selectedModel === ComfortModel.Pmv}
          <div class="px-1 py-1.5">
            <div class="text-sm font-medium text-sky-700">Compliance</div>
            <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getResultsTemplateColumns()};`}>
              {#each visibleCaseIds as caseId}
                {@const pmvResult = pmvResults[caseId]}
                <div class={getResultCellClasses(caseId)}>
                  {#if pmvResult}
                    <span class={pmvResult.acceptable_80 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
                      {pmvResult.acceptable_80 ? "Compliant" : "Out of range"}
                    </span>
                  {:else}
                    <span class="text-stone-400">{isLoading ? "Loading..." : "No result"}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <div class="px-1 py-1.5">
            <div class="text-sm font-medium text-sky-700">PMV</div>
            <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getResultsTemplateColumns()};`}>
              {#each visibleCaseIds as caseId}
                {@const pmvResult = pmvResults[caseId]}
                <div class={getResultCellClasses(caseId)}>
                  {#if pmvResult}
                    <span class="text-base font-semibold text-stone-900">{formatPmvValue(pmvResult.pmv)}</span>
                  {:else}
                    <span class="text-stone-400">{isLoading ? "Loading..." : "No result"}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <div class="px-1 py-1.5">
            <div class="text-sm font-medium text-sky-700">PPD</div>
            <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getResultsTemplateColumns()};`}>
              {#each visibleCaseIds as caseId}
                {@const pmvResult = pmvResults[caseId]}
                <div class={getResultCellClasses(caseId)}>
                  {#if pmvResult}
                    <span class="text-base font-semibold text-stone-900">{formatPercentValue(pmvResult.ppd)}</span>
                  {:else}
                    <span class="text-stone-400">{isLoading ? "Loading..." : "No result"}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <div class="px-1 py-1.5">
            <div class="text-sm font-semibold text-sky-800">Acceptability</div>
            <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getResultsTemplateColumns()};`}>
              {#each visibleCaseIds as caseId}
                {@const pmvResult = pmvResults[caseId]}
                <div class={getResultCellClasses(caseId)}>
                  {#if pmvResult}
                    <span class="text-base font-semibold text-stone-900">{formatPercentValue(100 - pmvResult.ppd)}</span>
                  {:else}
                    <span class="text-stone-400">{isLoading ? "Loading..." : "No result"}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="px-1 py-1.5">
            <div class="text-sm font-medium text-sky-700">UTCI</div>
            <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getResultsTemplateColumns()};`}>
              {#each visibleCaseIds as caseId}
                {@const utciResult = utciResults[caseId]}
                <div class={getResultCellClasses(caseId)}>
                  {#if utciResult}
                    <span class="text-base font-semibold text-stone-900">{formatUtciValue(utciResult.utci)}</span>
                  {:else}
                    <span class="text-stone-400">{isLoading ? "Loading..." : "No result"}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <div class="px-1 py-1.5">
            <div class="text-sm font-medium text-sky-700">Stress Category</div>
            <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getResultsTemplateColumns()};`}>
              {#each visibleCaseIds as caseId}
                {@const utciResult = utciResults[caseId]}
                <div class={getResultCellClasses(caseId)}>
                  {#if utciResult}
                    <span class="font-medium text-stone-900">{utciResult.stress_category}</span>
                  {:else}
                    <span class="text-stone-400">{isLoading ? "Loading..." : "No result"}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/key}
</Card>
