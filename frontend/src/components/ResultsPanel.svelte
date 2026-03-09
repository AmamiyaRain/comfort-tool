<script lang="ts">
  import { Alert, Badge, Card } from "flowbite-svelte";

  import { compareCaseMetaById } from "../models/compareCases";
  import { ComfortModel } from "../models/comfortModels";
  import { getHealthUrl } from "../services/comfortApi";

  let {
    selectedModel,
    activeCaseId,
    visibleCaseIds,
    pmvResults,
    utciResults,
    errorMessage,
    isLoading,
    requestCount,
    lastCompletedAt,
    resultRevision,
  } = $props();

  function formatUpdatedAt(timestamp: number) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(timestamp);
  }

  function getResultsGridClass() {
    if (visibleCaseIds.length === 3) {
      return "xl:grid-cols-3";
    }
    if (visibleCaseIds.length === 2) {
      return "xl:grid-cols-2";
    }
    return "";
  }
</script>

<Card size="none" class="w-full min-w-0 border border-stone-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
  <div class="flex items-start justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <Badge color={isLoading ? "yellow" : "green"}>{isLoading ? "Refreshing" : "Ready"}</Badge>
        <Badge color="dark">Run {requestCount}</Badge>
      </div>
      <h2 class="mt-4 text-xl font-semibold text-stone-950">Results</h2>
      <p class="mt-2 text-sm leading-6 text-stone-600">
        {selectedModel === ComfortModel.Pmv
          ? "PMV and PPD outputs for the visible case columns."
          : "UTCI values and stress categories for the visible case columns."}
      </p>
    </div>
    {#if lastCompletedAt > 0}
      <div class="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Updated {formatUpdatedAt(lastCompletedAt)}
      </div>
    {/if}
  </div>

  {#if errorMessage}
    <Alert color="red" class="mt-6 rounded-2xl">
      {errorMessage}
      <div class="mt-2 text-xs text-stone-500">Health check: {getHealthUrl()}</div>
    </Alert>
  {/if}

  {#key resultRevision}
    <div class={`mt-6 grid min-w-0 gap-4 ${getResultsGridClass()}`}>
      {#each visibleCaseIds as caseId}
        {@const pmvResult = pmvResults[caseId]}
        {@const utciResult = utciResults[caseId]}
        <section
          class={`rounded-[1.5rem] border p-5 ${
            activeCaseId === caseId
              ? "border-stone-900 bg-stone-50 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              : "border-stone-200 bg-stone-50"
          }`}
        >
          <div class="flex items-center justify-between gap-4">
            <Badge color={compareCaseMetaById[caseId].badgeColor}>{compareCaseMetaById[caseId].label}</Badge>
            {#if selectedModel === ComfortModel.Pmv && pmvResult}
              <Badge color={pmvResult.acceptable_80 ? "green" : "red"}>
                {pmvResult.acceptable_80 ? "Pass" : "Fail"}
              </Badge>
            {/if}
          </div>

          {#if selectedModel === ComfortModel.Pmv && pmvResult}
            <div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-4">
              <div class="rounded-[1.25rem] bg-gradient-to-br from-stone-950 via-stone-900 to-teal-900 p-4 text-white">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200/80">PMV</div>
                <div class="mt-3 text-3xl font-semibold">{pmvResult.pmv.toFixed(3)}</div>
              </div>
              <div class="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">PPD</div>
                <div class="mt-3 text-3xl font-semibold text-stone-950">{pmvResult.ppd.toFixed(1)}%</div>
              </div>
              <div class="rounded-[1.25rem] border border-stone-200 bg-white p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">Acceptability</div>
                <div class="mt-3 text-3xl font-semibold text-stone-950">{(100 - pmvResult.ppd).toFixed(1)}%</div>
              </div>
            </div>
          {:else if selectedModel === ComfortModel.Utci && utciResult}
            <div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">
              <div class="rounded-[1.25rem] bg-gradient-to-br from-stone-950 via-stone-900 to-sky-900 p-4 text-white">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">UTCI</div>
                <div class="mt-3 text-3xl font-semibold">{utciResult.utci.toFixed(1)} C</div>
              </div>
              <div class="rounded-[1.25rem] border border-stone-200 bg-white p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">Stress Category</div>
                <div class="mt-3 text-lg font-semibold text-stone-950">{utciResult.stress_category}</div>
              </div>
            </div>
          {:else}
            <div class="mt-4 rounded-[1.25rem] border border-dashed border-stone-300 bg-white/70 p-4 text-sm text-stone-500">
              {isLoading ? "Waiting for result..." : "Run Calculate to populate this case."}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {/key}
</Card>
