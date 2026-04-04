<script lang="ts">
  import { inputMetaById } from "../models/inputSlots";

  let {
    activeInputId,
    visibleInputIds,
    resultSections,
    errorMessage,
    isLoading,
    embedded = false,
  } = $props();

  function getResultsTemplateColumns() {
    return `repeat(${visibleInputIds.length}, minmax(0, 1fr))`;
  }

  function getResultCellClasses(inputId) {
    const inputUi = inputMetaById[inputId].ui;
    const activeClasses = activeInputId === inputId ? inputUi.resultActiveRingClass : "";
    return `rounded-md border px-2 py-1.5 ${inputUi.resultCellClass} ${activeClasses}`.trim();
  }
</script>

<div class={`w-full min-w-0 bg-white ${embedded ? "border-0 p-0 shadow-none" : "border border-stone-300 p-3 shadow-sm"}`}>
  {#if !embedded}
    <header class="flex items-start justify-between gap-3 border-b border-stone-200 pb-2">
      <h2 class="text-base font-semibold text-stone-900">Results</h2>
      <p class="flex items-center gap-2">
        <span class={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${isLoading ? "bg-yellow-100 border-yellow-200 text-yellow-700" : "bg-green-100 border-green-200 text-green-700"}`}>
          {isLoading ? "Refreshing" : "Ready"}
        </span>
      </p>
    </header>

    {#if errorMessage}
      <div class="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
        {errorMessage}
      </div>
    {/if}
  {/if}

  <section class={embedded ? "bg-white" : "mt-3 bg-white"}>
    <div class="grid gap-x-4 gap-y-2 md:grid-cols-2" aria-label="Calculated results">
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
    </div>
  </section>
</div>
