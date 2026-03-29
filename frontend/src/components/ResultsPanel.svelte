<script lang="ts">
  import { Alert, Badge, Card } from "flowbite-svelte";

  import { compareCaseMetaById } from "../models/compareCases";

  let {
    activeCaseId,
    visibleCaseIds,
    resultSections,
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
        {#each resultSections as section}
          <div class="px-1 py-1.5">
            <div class="text-sm font-medium text-sky-700">{section.title}</div>
            <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getResultsTemplateColumns()};`}>
              {#each visibleCaseIds as caseId}
                {@const resultCell = section.valuesByCase[caseId]}
                <div class={getResultCellClasses(caseId)}>
                  {#if resultCell}
                    <span class={resultCell.toneClass ?? "text-base font-semibold text-stone-900"}>{resultCell.text}</span>
                  {:else}
                    <span class="text-stone-400">{isLoading ? "Loading..." : "No result"}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/key}
</Card>
