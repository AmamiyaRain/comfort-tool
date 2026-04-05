<script lang="ts">
  import { Alert, Badge, Card } from "flowbite-svelte";
  import { inputDisplayMetaById } from "../models/inputSlotPresentation";

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
    const inputUi = inputDisplayMetaById[inputId].ui;
    const activeClasses = activeInputId === inputId ? inputUi.resultActiveRingClass : "";
    return `rounded-md border px-2 py-1.5 ${inputUi.resultCellClass} ${activeClasses}`.trim();
  }

  function getResultToneClass(tone) {
    if (tone === "success") {
      return "font-semibold text-emerald-700";
    }

    if (tone === "danger") {
      return "font-semibold text-red-600";
    }

    return "text-base font-semibold text-stone-900";
  }
</script>

{#snippet content()}
  {#if !embedded}
    <header class="flex items-start justify-between gap-3 border-b border-stone-200 pb-2">
      <h2 class="text-base font-semibold text-stone-900">Results</h2>
      <p class="flex items-center gap-2">
        <Badge color={isLoading ? "yellow" : "green"}>{isLoading ? "Refreshing" : "Ready"}</Badge>
      </p>
    </header>

    {#if errorMessage}
      <Alert color="red" class="mt-3 rounded-md text-sm">
        {errorMessage}
      </Alert>
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
                  <span class={getResultToneClass(resultCell.tone)}>{resultCell.text}</span>
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
{/snippet}

{#if embedded}
  {@render content()}
{:else}
  <Card size="none" class="w-full min-w-0 bg-white border-stone-300 p-3 shadow-sm">
    {@render content()}
  </Card>
{/if}
