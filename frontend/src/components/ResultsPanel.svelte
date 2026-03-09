<script lang="ts">
  import { Alert, Badge, Card } from "flowbite-svelte";

  import { getHealthUrl } from "../services/comfortApi";

  let { result, errorMessage, isLoading, requestCount, lastCompletedAt, resultRevision } = $props();

  function formatUpdatedAt(timestamp: number) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    }).format(timestamp);
  }
</script>

<Card size="none" class="w-full min-w-0 border border-stone-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
  <div class="flex items-start justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <Badge color={isLoading ? "yellow" : "green"}>{isLoading ? "Refreshing" : "Ready"}</Badge>
        <Badge color="alternative">Run {requestCount}</Badge>
      </div>
      <h2 class="mt-4 text-xl font-semibold text-stone-950">Results</h2>
      <p class="mt-2 text-sm leading-6 text-stone-600">Backend-calculated PMV/PPD and acceptance status.</p>
    </div>
    {#if result}
      <Badge large color={result.acceptable_80 ? "green" : "red"} class="self-start">
        {result.acceptable_80 ? "Pass" : "Fail"}
      </Badge>
    {/if}
  </div>

  {#if errorMessage}
    <Alert color="red" class="mt-6 rounded-2xl">
      {errorMessage}
      <div class="mt-2 text-xs text-stone-500">Health check: {getHealthUrl()}</div>
    </Alert>
  {/if}

  {#if result}
    {#key resultRevision}
      <div class="mt-6 grid min-w-0 gap-4 lg:grid-cols-3">
        <div class="rounded-[1.5rem] bg-gradient-to-br from-stone-950 via-stone-900 to-teal-900 p-5 text-white shadow-lg">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200/80">Thermal Vote</div>
          <div class="mt-3 text-4xl font-semibold">{result.pmv.toFixed(3)}</div>
          <div class="mt-3 text-sm text-stone-200">ASHRAE 55 PMV result from the backend service.</div>
        </div>
        <div class="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">PPD</div>
          <div class="mt-3 text-4xl font-semibold text-stone-950">{result.ppd.toFixed(1)}%</div>
          <div class="mt-3 text-sm text-stone-600">Predicted percentage dissatisfied.</div>
        </div>
        <div class="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">Acceptability</div>
          <div class="mt-3 text-4xl font-semibold text-stone-950">{(100 - result.ppd).toFixed(1)}%</div>
          <div class="mt-3 text-sm text-stone-600">
            {#if lastCompletedAt > 0}
              Updated at {formatUpdatedAt(lastCompletedAt)}
            {:else}
              No completed request yet.
            {/if}
          </div>
        </div>
      </div>
    {/key}
  {:else}
    <div class="mt-6 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/70 p-6 text-sm text-stone-500">
      {isLoading ? "Waiting for backend response..." : "Run a calculation to populate PMV and chart results."}
    </div>
  {/if}
</Card>
