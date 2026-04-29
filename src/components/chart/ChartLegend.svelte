<script lang="ts">
  import { ChartId } from "../../models/chartOptions";
  import { utciStressBands } from "../../models/utciStress";

  let { selectedChart }: { selectedChart: ChartId } = $props();

  const pmvZones = [
    { label: "Cold", color: "#0571b0" },
    { label: "Cool", color: "#4c78a8" },
    { label: "Slightly Cool", color: "#92c5de" },
    { label: "Neutral", color: "#f2f2f2" },
    { label: "Slightly Warm", color: "#f4a582" },
    { label: "Warm", color: "#e15759" },
    { label: "Hot", color: "#cc79a7" },
  ];

  const utciZones = utciStressBands.map((band) => ({
    label: band.category,
    color: band.color,
  }));

  const isPmvChart = $derived(
    selectedChart === ChartId.Psychrometric ||
    selectedChart === ChartId.RelativeHumidity ||
    selectedChart === ChartId.PmvDynamic
  );

  const isUtciDynamicChart = $derived(
    selectedChart === ChartId.UtciDynamic
  );
</script>

{#if isPmvChart}
  <div class="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-stone-100 pt-4">
    <span class="text-xs font-semibold uppercase tracking-wider text-stone-400">PMV Zones</span>
    <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      {#each pmvZones as zone}
        <div class="flex items-center gap-1.5">
          <div class="h-2.5 w-2.5 rounded-full border border-stone-200 shadow-sm" style="background-color: {zone.color}"></div>
          <span class="text-[11px] font-medium text-stone-500">{zone.label}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

{#if isUtciDynamicChart}
  <div class="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-stone-100 pt-4">
    <span class="text-xs font-semibold uppercase tracking-wider text-stone-400">UTCI Zones</span>
    <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      {#each utciZones as zone}
        <div class="flex items-center gap-1.5">
          <div class="h-2.5 w-2.5 rounded-full border border-stone-200 shadow-sm" style="background-color: {zone.color}"></div>
          <span class="text-[11px] font-medium text-stone-500 capitalize">{zone.label}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}
