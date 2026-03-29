<script lang="ts">
  import { Alert, Badge, Card } from "flowbite-svelte";

  import { inputMetaById } from "../models/inputSlots";

  let {
    activeInputId,
    visibleInputIds,
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
    return `repeat(${visibleInputIds.length}, minmax(0, 1fr))`;
  }

  function getResultCellClasses(inputId) {
    const inputUi = inputMetaById[inputId].ui;
    const activeClasses = activeInputId === inputId ? inputUi.resultActiveRingClass : "";
    return `rounded-md border px-2 py-1.5 ${inputUi.resultCellClass} ${activeClasses}`.trim();
  }
</script>

<Card size="none" class={`w-full min-w-0 bg-white ${embedded ? "border-0 p-0 shadow-none" : "border border-stone-300 shadow-sm"}`}>
  {#if !embedded}
    <header class="flex items-start justify-between gap-3 border-b border-stone-200 pb-2">
      <h2 class="text-base font-semibold text-stone-900">Results</h2>
      <p class="flex items-center gap-2">
        <Badge color={isLoading ? "yellow" : "success"}>{isLoading ? "Refreshing" : "Ready"}</Badge>
        {#if lastCompletedAt > 0}
          <span class="text-[11px] text-stone-500">{formatUpdatedAt(lastCompletedAt)}</span>
        {/if}
      </p>
    </header>

    {#if errorMessage}
      <Alert color="red" class="mt-3 rounded-md text-sm">
        {errorMessage}
      </Alert>
    {/if}
  {/if}

  {#key resultRevision}
    <section class={embedded ? "bg-white" : "mt-3 bg-white"}>
      <section class="grid gap-x-4 gap-y-2 md:grid-cols-2" aria-label="Calculated results">
        {#each resultSections as section}
          <article class="px-1 py-1.5">
            <h3 class="text-sm font-medium text-sky-700">{section.title}</h3>
            <ul class="mt-1 grid gap-2" style={`grid-template-columns: ${getResultsTemplateColumns()};`}>
              {#each visibleInputIds as inputId}
                {@const resultCell = section.valuesByInput[inputId]}
                <li class={getResultCellClasses(inputId)}>
                  {#if resultCell}
                    <span class={resultCell.toneClass ?? "text-base font-semibold text-stone-900"}>{resultCell.text}</span>
                  {:else}
                    <span class="text-stone-400">{isLoading ? "Loading..." : "No result"}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          </article>
        {/each}
      </section>
    </section>
  {/key}
</Card>
