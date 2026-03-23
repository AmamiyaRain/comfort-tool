<svelte:options runes={true} />

<script lang="ts">
  import { Dropdown, DropdownItem } from "flowbite-svelte";

  import { PmvChartId } from "../../models/chartOptions";
  import { ComfortModel } from "../../models/comfortModels";
  import { FieldKey } from "../../models/fieldKeys";
  import {
    PmvAirSpeedControlMode,
    PmvHumidityInputMode,
    PmvTemperatureInputMode,
  } from "../../models/inputModes";
  import type { ComfortToolState } from "../../state/comfortTool.svelte";

  let {
    toolState,
    fieldKey,
  }: {
    toolState: ComfortToolState;
    fieldKey: string;
  } = $props();

  let menuOpen = $state(false);

  function getTriggerId() {
    return `advanced-input-${fieldKey}`;
  }

  function showTemperatureModeControl() {
    return (
      toolState.state.ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.DryBulbTemperature &&
      (
        toolState.state.ui.selectedPmvChart === PmvChartId.Psychrometric ||
        toolState.state.ui.pmvTemperatureInputMode === PmvTemperatureInputMode.Operative
      )
    );
  }

  function showAirSpeedMenu() {
    return toolState.state.ui.selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeAirSpeed;
  }

  function showHumidityMenu() {
    return toolState.state.ui.selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity;
  }
</script>

{#if showTemperatureModeControl()}
  <button
    id={getTriggerId()}
    type="button"
    class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
  >
    More
    <span class="text-[10px]">▼</span>
  </button>

  <Dropdown
    bind:open={menuOpen}
    triggeredBy={`#${getTriggerId()}`}
    placement="bottom-start"
    arrow={false}
    class="w-72 py-1"
    containerClass="z-30 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/70"
    headerClass="border-b border-stone-100 px-4 py-2"
  >
    <svelte:fragment slot="header">
      <div class="text-[11px] uppercase tracking-[0.16em] text-stone-500">Temperature input</div>
    </svelte:fragment>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvTemperatureInputMode(PmvTemperatureInputMode.Air);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvTemperatureInputMode === PmvTemperatureInputMode.Air ? "font-semibold text-stone-900" : ""}>
        Air temperature
      </span>
      <span class="text-xs text-stone-500">Use dry-bulb air temperature and keep radiant temperature separate.</span>
    </DropdownItem>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvTemperatureInputMode(PmvTemperatureInputMode.Operative);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvTemperatureInputMode === PmvTemperatureInputMode.Operative ? "font-semibold text-stone-900" : ""}>
        Operative temp
      </span>
      <span class="text-xs text-stone-500">Treat operative temperature as the single temperature input.</span>
    </DropdownItem>
  </Dropdown>
{:else if showAirSpeedMenu()}
  <button
    id={getTriggerId()}
    type="button"
    class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
  >
    More
    <span class="text-[10px]">▼</span>
  </button>

  <Dropdown
    bind:open={menuOpen}
    triggeredBy={`#${getTriggerId()}`}
    placement="bottom-start"
    arrow={false}
    class="w-72 py-1"
    containerClass="z-30 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/70"
    headerClass="border-b border-stone-100 px-4 py-2"
  >
    <svelte:fragment slot="header">
      <div class="text-[11px] uppercase tracking-[0.16em] text-stone-500">Air speed input</div>
    </svelte:fragment>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvAirSpeedControlMode(PmvAirSpeedControlMode.NoLocalControl);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvAirSpeedControlMode === PmvAirSpeedControlMode.NoLocalControl ? "font-semibold text-stone-900" : ""}>
        No local control
      </span>
      <span class="text-xs text-stone-500">Assume occupants do not have local control over elevated air speed.</span>
    </DropdownItem>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvAirSpeedControlMode(PmvAirSpeedControlMode.WithLocalControl);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvAirSpeedControlMode === PmvAirSpeedControlMode.WithLocalControl ? "font-semibold text-stone-900" : ""}>
        With local control
      </span>
      <span class="text-xs text-stone-500">Assume occupants can locally control elevated air speed.</span>
    </DropdownItem>
  </Dropdown>
{:else if showHumidityMenu()}
  <button
    id={getTriggerId()}
    type="button"
    class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
  >
    More
    <span class="text-[10px]">▼</span>
  </button>

  <Dropdown
    bind:open={menuOpen}
    triggeredBy={`#${getTriggerId()}`}
    placement="bottom-start"
    arrow={false}
    class="w-72 py-1"
    containerClass="z-30 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-200/70"
    headerClass="border-b border-stone-100 px-4 py-2"
  >
    <svelte:fragment slot="header">
      <div class="text-[11px] uppercase tracking-[0.16em] text-stone-500">Humidity input</div>
    </svelte:fragment>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvHumidityInputMode(PmvHumidityInputMode.RelativeHumidity);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.RelativeHumidity ? "font-semibold text-stone-900" : ""}>
        Relative humidity
      </span>
      <span class="text-xs text-stone-500">Input relative humidity as a percentage.</span>
    </DropdownItem>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvHumidityInputMode(PmvHumidityInputMode.HumidityRatio);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio ? "font-semibold text-stone-900" : ""}>
        Humidity ratio
      </span>
      <span class="text-xs text-stone-500">Hold absolute moisture content constant.</span>
    </DropdownItem>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvHumidityInputMode(PmvHumidityInputMode.DewPoint);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint ? "font-semibold text-stone-900" : ""}>
        Dew point
      </span>
      <span class="text-xs text-stone-500">Keep dew point fixed and derive relative humidity from dry-bulb temperature.</span>
    </DropdownItem>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvHumidityInputMode(PmvHumidityInputMode.WetBulb);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb ? "font-semibold text-stone-900" : ""}>
        Wet bulb
      </span>
      <span class="text-xs text-stone-500">Input wet-bulb temperature instead of relative humidity.</span>
    </DropdownItem>
    <DropdownItem
      class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
      onclick={() => {
        toolState.actions.setPmvHumidityInputMode(PmvHumidityInputMode.VaporPressure);
        menuOpen = false;
      }}
    >
      <span class={toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure ? "font-semibold text-stone-900" : ""}>
        Vapor pressure
      </span>
      <span class="text-xs text-stone-500">Input vapor pressure directly.</span>
    </DropdownItem>
  </Dropdown>
{/if}
