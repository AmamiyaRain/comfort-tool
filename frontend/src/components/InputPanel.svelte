<script lang="ts">
  import { Badge, Button, Card, Input, Label, Toggle } from "flowbite-svelte";

  import { fieldMetaByKey } from "../models/fieldMeta";
  import { UnitSystem } from "../models/units";
  import { convertSiToDisplay, formatDisplayValue } from "../services/unitConversion";

  let {
    fieldOrder,
    inputs,
    unitSystem,
    isLoading,
    requestCount,
    onToggleUnits,
    onUpdateField,
    onRefresh,
  } = $props();

  function handleRefresh() {
    onRefresh();
  }

  function getDisplayValue(fieldKey, decimals) {
    return formatDisplayValue(convertSiToDisplay(fieldKey, inputs[fieldKey], unitSystem), decimals);
  }
</script>

<Card size="none" class="w-full border border-stone-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
  <div class="flex items-start justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <Badge color="dark">Manual Run</Badge>
        <Badge color="alternative">#{requestCount}</Badge>
      </div>
      <h2 class="mt-4 text-xl font-semibold text-stone-950">Inputs</h2>
      <p class="mt-2 max-w-sm text-sm leading-6 text-stone-600">
        Canonical state remains in SI. Switching units only changes how values are displayed.
      </p>
    </div>
    <div class="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <div class="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Units</div>
      <div class="flex items-center gap-3">
        <span class={`text-sm font-medium ${unitSystem === UnitSystem.SI ? "text-stone-950" : "text-stone-500"}`}>SI</span>
        <Toggle checked={unitSystem === UnitSystem.IP} onchange={onToggleUnits} color="teal" />
        <span class={`text-sm font-medium ${unitSystem === UnitSystem.IP ? "text-stone-950" : "text-stone-500"}`}>IP</span>
      </div>
    </div>
  </div>

  <div class="mt-8 grid gap-4">
    {#each fieldOrder as fieldKey}
      {@const meta = fieldMetaByKey[fieldKey]}
      <div class="grid gap-2 rounded-2xl border border-stone-200/90 bg-stone-50/75 p-4">
        <div class="flex items-center justify-between gap-4">
          <Label for={fieldKey} class="font-medium text-stone-800">{meta.label}</Label>
          <span class="text-xs uppercase tracking-[0.18em] text-stone-400">{meta.units[unitSystem]}</span>
        </div>
        <Input
          id={fieldKey}
          type="number"
          step={meta.step}
          color="base"
          value={getDisplayValue(fieldKey, meta.decimals)}
          oninput={(event) => onUpdateField(fieldKey, event.currentTarget.value)}
          class="bg-white"
        />
      </div>
    {/each}
  </div>

  <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-stone-500">
      {#if isLoading}
        Re-running backend calculations and refreshing the chart.
      {:else}
        Click calculate any time to refresh PMV, PPD, and psychrometric traces.
      {/if}
    </p>
    <Button type="button" color="dark" shadow onclick={handleRefresh} disabled={isLoading} class="shrink-0">
      {isLoading ? "Calculating..." : "Calculate"}
    </Button>
  </div>
</Card>
