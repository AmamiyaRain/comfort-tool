<script lang="ts">
  import { Button, Dropdown, DropdownItem } from "flowbite-svelte";
  import { ChevronDownOutline } from "flowbite-svelte-icons";
  import { FieldKey } from "../../models/fieldKeys";
  import { fieldMetaByKey } from "../../models/inputFieldsMeta";

  let {
    dynamicXAxis,
    dynamicYAxis,
    onSelectXAxis,
    onSelectYAxis,
  }: {
    dynamicXAxis: string;
    dynamicYAxis: string;
    onSelectXAxis: (fieldKey: string) => void;
    onSelectYAxis: (fieldKey: string) => void;
  } = $props();

  const axisOptions = [
    FieldKey.DryBulbTemperature,
    FieldKey.MeanRadiantTemperature,
    FieldKey.RelativeAirSpeed,
    FieldKey.RelativeHumidity,
    FieldKey.MetabolicRate,
    FieldKey.ClothingInsulation,
  ];

  const currentXLabel = $derived(fieldMetaByKey[dynamicXAxis as FieldKey]?.label ?? "X-Axis");
  const currentYLabel = $derived(fieldMetaByKey[dynamicYAxis as FieldKey]?.label ?? "Y-Axis");
</script>

<div class="flex items-center gap-2">
  <span class="text-xs font-medium text-stone-500">X:</span>
  <Button id="chart-x-axis-trigger" color="light" pill size="xs" class="text-stone-700">
    {currentXLabel}
    <ChevronDownOutline class="ms-2 h-3 w-3" strokeWidth="2" />
  </Button>
  <Dropdown triggeredBy="#chart-x-axis-trigger" class="w-48 shadow-lg">
    <div slot="header" class="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
      Select X Axis
    </div>
    {#each axisOptions as option}
      <DropdownItem onclick={() => onSelectXAxis(option)} class="text-left">
        <span class={dynamicXAxis === option ? "font-bold text-teal-700" : "text-stone-700"}>
          {fieldMetaByKey[option].label}
        </span>
      </DropdownItem>
    {/each}
  </Dropdown>

  <span class="ml-2 text-xs font-medium text-stone-500">Y:</span>
  <Button id="chart-y-axis-trigger" color="light" pill size="xs" class="text-stone-700">
    {currentYLabel}
    <ChevronDownOutline class="ms-2 h-3 w-3" strokeWidth="2" />
  </Button>
  <Dropdown triggeredBy="#chart-y-axis-trigger" class="w-48 shadow-lg">
    <div slot="header" class="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
      Select Y Axis
    </div>
    {#each axisOptions as option}
      <DropdownItem onclick={() => onSelectYAxis(option)} class="text-left">
        <span class={dynamicYAxis === option ? "font-bold text-teal-700" : "text-stone-700"}>
          {fieldMetaByKey[option].label}
        </span>
      </DropdownItem>
    {/each}
  </Dropdown>
</div>
