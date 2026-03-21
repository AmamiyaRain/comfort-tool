<script lang="ts">
  import { Badge, Card, Dropdown, DropdownItem, Modal, Toggle } from "flowbite-svelte";

  import ClothingEnsembleBuilder from "./ClothingEnsembleBuilder.svelte";
  import PresetNumericInput from "./PresetNumericInput.svelte";
  import SearchableSelect from "./SearchableSelect.svelte";
  import { clothingTypicalEnsembles } from "../models/clothingEnsembles";
  import { compareCaseMetaById, compareCaseOrder } from "../models/compareCases";
  import { PmvChartId } from "../models/chartOptions";
  import { ComfortModel } from "../models/comfortModels";
  import { comfortModelMetaById, comfortModelOrder } from "../models/comfortModels";
  import { fieldMetaByKey } from "../models/fieldMeta";
  import { FieldKey } from "../models/fieldKeys";
  import {
    PmvAirSpeedControlMode,
    PmvAirSpeedInputMode,
    PmvHumidityInputMode,
    PmvTemperatureInputMode,
  } from "../models/inputModes";
  import { metabolicActivityOptions } from "../models/metabolicActivities";
  import { UnitSystem } from "../models/units";
  import {
    convertHumidityRatioSiToDisplay,
    convertVaporPressureSiToDisplay,
  } from "../services/advancedPmvInputs";
  import { convertSiToDisplay, formatDisplayValue } from "../services/unitConversion";

  let {
    selectedModel,
    selectedPmvChart,
    compareEnabled,
    activeCaseId,
    visibleCaseIds,
    fieldOrder,
    inputsByCase,
    measuredAirSpeedByCase,
    dewPointByCase,
    humidityRatioByCase,
    wetBulbByCase,
    vaporPressureByCase,
    unitSystem,
    isLoading,
    calculationCount,
    pmvTemperatureInputMode,
    pmvAirSpeedControlMode,
    pmvAirSpeedInputMode,
    pmvHumidityInputMode,
    onSelectModel,
    onToggleCompare,
    onSelectActiveCase,
    onToggleCaseVisibility,
    onToggleUnits,
    onSetPmvTemperatureInputMode,
    onSetPmvAirSpeedControlMode,
    onSetPmvAirSpeedInputMode,
    onSetPmvHumidityInputMode,
    onUpdateField,
  } = $props();

  let temperatureMenuOpen = $state(false);
  let airSpeedMenuOpen = $state(false);
  let humidityMenuOpen = $state(false);
  let clothingBuilderOpen = $state(false);

  function getDisplayValue(caseId, fieldKey, decimals) {
    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeAirSpeed && pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured) {
      return formatDisplayValue(convertSiToDisplay(FieldKey.RelativeAirSpeed, measuredAirSpeedByCase[caseId], unitSystem), decimals);
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.DewPoint) {
      return formatDisplayValue(convertSiToDisplay(FieldKey.DryBulbTemperature, dewPointByCase[caseId], unitSystem), decimals);
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio) {
      return formatDisplayValue(convertHumidityRatioSiToDisplay(humidityRatioByCase[caseId], unitSystem), decimals);
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.WetBulb) {
      return formatDisplayValue(convertSiToDisplay(FieldKey.DryBulbTemperature, wetBulbByCase[caseId], unitSystem), decimals);
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure) {
      return formatDisplayValue(convertVaporPressureSiToDisplay(vaporPressureByCase[caseId], unitSystem), decimals);
    }

    return formatDisplayValue(convertSiToDisplay(fieldKey, inputsByCase[caseId][fieldKey], unitSystem), decimals);
  }

  function getInputIndex(caseId) {
    return compareCaseOrder.indexOf(caseId) + 1;
  }

  function isCaseVisible(caseId) {
    return visibleCaseIds.includes(caseId);
  }

  function getCompareToggleClasses(caseId) {
    const caseUi = compareCaseMetaById[caseId].ui;
    return isCaseVisible(caseId)
      ? `border-solid bg-white ${caseUi.inputToggleVisibleClass}`
      : `border-dashed bg-stone-50 ${caseUi.inputToggleHiddenClass}`;
  }

  function getMatrixTemplateColumns() {
    return `repeat(${visibleCaseIds.length}, minmax(0, 1fr))`;
  }

  function handleFieldInput(caseId, fieldKey, value) {
    onSelectActiveCase(caseId);
    onUpdateField(caseId, fieldKey, value);
  }

  const modelOptions = comfortModelOrder.map((modelId) => ({
    name: comfortModelMetaById[modelId].label,
    value: modelId,
  }));

  function shouldHideField(fieldKey) {
    return (
      selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.MeanRadiantTemperature &&
      pmvTemperatureInputMode === PmvTemperatureInputMode.Operative
    );
  }

  function getFieldLabel(fieldKey) {
    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.DryBulbTemperature && pmvTemperatureInputMode === PmvTemperatureInputMode.Operative) {
      return "Operative temperature";
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeAirSpeed && pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured) {
      return "Air speed";
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.DewPoint) {
      return "Dew point";
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio) {
      return "Humidity ratio";
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.WetBulb) {
      return "Wet-bulb temperature";
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure) {
      return "Vapor pressure";
    }

    return fieldMetaByKey[fieldKey].label;
  }

  function getFieldDisplayUnits(fieldKey) {
    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.DewPoint) {
      return fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio) {
      return unitSystem === UnitSystem.IP ? "gr/lb" : "g/kg";
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.WetBulb) {
      return fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure) {
      return unitSystem === UnitSystem.IP ? "inHg" : "kPa";
    }

    return fieldMetaByKey[fieldKey].displayUnits[unitSystem];
  }

  function getFieldStep(fieldKey) {
    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.DewPoint) {
      return fieldMetaByKey[FieldKey.DryBulbTemperature].step;
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio) {
      return unitSystem === UnitSystem.IP ? 1 : 0.1;
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.WetBulb) {
      return fieldMetaByKey[FieldKey.DryBulbTemperature].step;
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure) {
      return 0.01;
    }

    return fieldMetaByKey[fieldKey].step;
  }

  function getFieldDecimals(fieldKey) {
    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.DewPoint) {
      return fieldMetaByKey[FieldKey.DryBulbTemperature].decimals;
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio) {
      return unitSystem === UnitSystem.IP ? 0 : 1;
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.WetBulb) {
      return fieldMetaByKey[FieldKey.DryBulbTemperature].decimals;
    }

    if (selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.RelativeHumidity && pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure) {
      return 2;
    }

    return fieldMetaByKey[fieldKey].decimals;
  }

  function getFieldRange(fieldKey) {
    const meta = fieldMetaByKey[fieldKey];
    if (
      selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      pmvHumidityInputMode !== PmvHumidityInputMode.RelativeHumidity
    ) {
      return "";
    }
    const min = formatDisplayValue(convertSiToDisplay(fieldKey, meta.minValue, unitSystem), meta.decimals);
    const max = formatDisplayValue(convertSiToDisplay(fieldKey, meta.maxValue, unitSystem), meta.decimals);
    return `From ${min} to ${max}`;
  }

  function showTemperatureModeControl(fieldKey) {
    return (
      selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.DryBulbTemperature &&
      (selectedPmvChart === PmvChartId.Psychrometric || pmvTemperatureInputMode === PmvTemperatureInputMode.Operative)
    );
  }

  function showAdvancedFieldMenu(fieldKey) {
    return (
      selectedModel === ComfortModel.Pmv &&
      (fieldKey === FieldKey.RelativeAirSpeed || fieldKey === FieldKey.RelativeHumidity)
    );
  }

  function showClothingBuilder(fieldKey) {
    return selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.ClothingInsulation;
  }

  function showPresetInput(fieldKey) {
    return (
      selectedModel === ComfortModel.Pmv &&
      (fieldKey === FieldKey.ClothingInsulation || fieldKey === FieldKey.MetabolicRate)
    );
  }

  const clothingPresetOptions = clothingTypicalEnsembles.map((ensemble) => ({
    id: ensemble.id,
    label: ensemble.label,
    value: ensemble.clo,
  }));

  const metabolicPresetOptions = metabolicActivityOptions.map((activity) => ({
    id: activity.id,
    label: activity.label,
    value: activity.met,
  }));

  function getPresetInputOptions(fieldKey) {
    if (fieldKey === FieldKey.ClothingInsulation) {
      return clothingPresetOptions;
    }

    if (fieldKey === FieldKey.MetabolicRate) {
      return metabolicPresetOptions;
    }

    return [];
  }

  function getPresetInputDecimals(fieldKey) {
    if (fieldKey === FieldKey.ClothingInsulation) {
      return 2;
    }

    return fieldMetaByKey[fieldKey].decimals;
  }

  function getAdvancedTriggerId(fieldKey) {
    return `advanced-input-${fieldKey}`;
  }

  function handleSelectTemperatureMode(nextMode) {
    onSetPmvTemperatureInputMode(nextMode);
    temperatureMenuOpen = false;
  }

  function handleSelectAirSpeedControlMode(nextMode) {
    onSetPmvAirSpeedControlMode(nextMode);
    airSpeedMenuOpen = false;
  }

  function handleSelectHumidityMode(nextMode) {
    onSetPmvHumidityInputMode(nextMode);
    humidityMenuOpen = false;
  }

  function handleApplyClothingValue(caseId, value) {
    onSelectActiveCase(caseId);
    onUpdateField(caseId, FieldKey.ClothingInsulation, value.toFixed(2));
  }

  function handleApplyPresetValue(caseId, fieldKey, value) {
    onSelectActiveCase(caseId);
    onUpdateField(caseId, fieldKey, value.toFixed(getPresetInputDecimals(fieldKey)));
  }
</script>

<Card size="none" class="w-full border border-stone-300 bg-white shadow-sm">
  <div class="flex items-start justify-between gap-3 pb-2">
    <div>
      <h2 class="text-base font-semibold text-stone-900">Inputs</h2>
    </div>
  </div>

  <div class="mt-3 grid gap-3">
    <div>
      <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Model</div>
      <SearchableSelect
        class="mt-1.5"
        items={modelOptions}
        value={selectedModel}
        placeholder="Select model"
        searchPlaceholder="Search model..."
        onSelect={onSelectModel}
      />
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Compare</div>
        <div class="mt-1.5 flex w-full items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5">
          <span class={`text-xs ${!compareEnabled ? "font-semibold text-stone-900" : "text-stone-500"}`}>Off</span>
          <Toggle checked={compareEnabled} color="teal" onchange={(event) => onToggleCompare(event.currentTarget.checked)} />
          <span class={`text-xs ${compareEnabled ? "font-semibold text-stone-900" : "text-stone-500"}`}>On</span>
        </div>
      </div>

      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Units</div>
        <div class="mt-1.5 flex w-full items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5">
          <span class={`text-xs ${unitSystem === UnitSystem.SI ? "font-semibold text-stone-900" : "text-stone-500"}`}>SI</span>
          <Toggle checked={unitSystem === UnitSystem.IP} color="teal" onchange={onToggleUnits} />
          <span class={`text-xs ${unitSystem === UnitSystem.IP ? "font-semibold text-stone-900" : "text-stone-500"}`}>IP</span>
        </div>
      </div>
    </div>

    <div class="bg-white">
      {#if compareEnabled}
        <div class="grid gap-2 px-1 pb-2 md:grid-cols-3">
          {#each compareCaseOrder as caseId}
            <button
              type="button"
              class={`min-w-0 rounded-sm border px-2 py-1.5 text-left ${getCompareToggleClasses(caseId)}`}
              onclick={() => onToggleCaseVisibility(caseId)}
            >
              <div class="text-sm font-semibold">Input {getInputIndex(caseId)}</div>
            </button>
          {/each}
        </div>
      {/if}

      <div class="grid gap-1">
        {#each fieldOrder as fieldKey}
          {#if !shouldHideField(fieldKey)}
            <div class="px-1 py-0.5">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <div class="text-sm font-medium text-sky-700">{getFieldLabel(fieldKey)} ({getFieldDisplayUnits(fieldKey)})</div>

                  {#if showTemperatureModeControl(fieldKey)}
                    <button
                      id={getAdvancedTriggerId(`${fieldKey}-temperature`)}
                      type="button"
                      class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
                    >
                      More
                      <span class="text-[10px]">▼</span>
                    </button>

                    <Dropdown
                      bind:open={temperatureMenuOpen}
                      triggeredBy={`#${getAdvancedTriggerId(`${fieldKey}-temperature`)}`}
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
                        onclick={() => handleSelectTemperatureMode(PmvTemperatureInputMode.Air)}
                      >
                        <span class={pmvTemperatureInputMode === PmvTemperatureInputMode.Air ? "font-semibold text-stone-900" : ""}>
                          Air temperature
                        </span>
                        <span class="text-xs text-stone-500">Use dry-bulb air temperature and keep radiant temperature separate.</span>
                      </DropdownItem>
                      <DropdownItem
                        class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
                        onclick={() => handleSelectTemperatureMode(PmvTemperatureInputMode.Operative)}
                      >
                        <span class={pmvTemperatureInputMode === PmvTemperatureInputMode.Operative ? "font-semibold text-stone-900" : ""}>
                          Operative temp
                        </span>
                        <span class="text-xs text-stone-500">Treat operative temperature as the single temperature input.</span>
                      </DropdownItem>
                    </Dropdown>
                  {/if}

                  {#if showAdvancedFieldMenu(fieldKey)}
                    <button
                      id={getAdvancedTriggerId(fieldKey)}
                      type="button"
                      class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
                    >
                      More
                      <span class="text-[10px]">▼</span>
                    </button>

                    {#if fieldKey === FieldKey.RelativeAirSpeed}
                      <Dropdown
                        bind:open={airSpeedMenuOpen}
                        triggeredBy={`#${getAdvancedTriggerId(fieldKey)}`}
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
                          onclick={() => handleSelectAirSpeedControlMode(PmvAirSpeedControlMode.NoLocalControl)}
                        >
                          <span class={pmvAirSpeedControlMode === PmvAirSpeedControlMode.NoLocalControl ? "font-semibold text-stone-900" : ""}>
                            No local control
                          </span>
                          <span class="text-xs text-stone-500">Assume occupants do not have local control over elevated air speed.</span>
                        </DropdownItem>
                        <DropdownItem
                          class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
                          onclick={() => handleSelectAirSpeedControlMode(PmvAirSpeedControlMode.WithLocalControl)}
                        >
                          <span class={pmvAirSpeedControlMode === PmvAirSpeedControlMode.WithLocalControl ? "font-semibold text-stone-900" : ""}>
                            With local control
                          </span>
                          <span class="text-xs text-stone-500">Assume occupants can locally control elevated air speed.</span>
                        </DropdownItem>
                      </Dropdown>
                    {:else if fieldKey === FieldKey.RelativeHumidity}
                      <Dropdown
                        bind:open={humidityMenuOpen}
                        triggeredBy={`#${getAdvancedTriggerId(fieldKey)}`}
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
                          onclick={() => handleSelectHumidityMode(PmvHumidityInputMode.RelativeHumidity)}
                        >
                          <span class={pmvHumidityInputMode === PmvHumidityInputMode.RelativeHumidity ? "font-semibold text-stone-900" : ""}>
                            Relative humidity
                          </span>
                          <span class="text-xs text-stone-500">Input relative humidity as a percentage.</span>
                        </DropdownItem>
                        <DropdownItem
                          class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
                          onclick={() => handleSelectHumidityMode(PmvHumidityInputMode.HumidityRatio)}
                        >
                          <span class={pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio ? "font-semibold text-stone-900" : ""}>
                            Humidity ratio
                          </span>
                          <span class="text-xs text-stone-500">Hold absolute moisture content constant.</span>
                        </DropdownItem>
                        <DropdownItem
                          class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
                          onclick={() => handleSelectHumidityMode(PmvHumidityInputMode.DewPoint)}
                        >
                          <span class={pmvHumidityInputMode === PmvHumidityInputMode.DewPoint ? "font-semibold text-stone-900" : ""}>
                            Dew point
                          </span>
                          <span class="text-xs text-stone-500">Keep dew point fixed and derive relative humidity from dry-bulb temperature.</span>
                        </DropdownItem>
                        <DropdownItem
                          class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
                          onclick={() => handleSelectHumidityMode(PmvHumidityInputMode.WetBulb)}
                        >
                          <span class={pmvHumidityInputMode === PmvHumidityInputMode.WetBulb ? "font-semibold text-stone-900" : ""}>
                            Wet bulb
                          </span>
                          <span class="text-xs text-stone-500">Input wet-bulb temperature instead of relative humidity.</span>
                        </DropdownItem>
                        <DropdownItem
                          class="flex flex-col items-start gap-0.5 text-left text-stone-700 hover:bg-stone-50"
                          onclick={() => handleSelectHumidityMode(PmvHumidityInputMode.VaporPressure)}
                        >
                          <span class={pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure ? "font-semibold text-stone-900" : ""}>
                            Vapor pressure
                          </span>
                          <span class="text-xs text-stone-500">Input vapor pressure directly.</span>
                        </DropdownItem>
                      </Dropdown>
                    {/if}
                  {/if}

                  {#if showClothingBuilder(fieldKey)}
                    <button
                      type="button"
                      onclick={() => {
                        clothingBuilderOpen = true;
                      }}
                      class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-900"
                    >
                      More
                      <span class="text-[10px]">▼</span>
                    </button>
                  {/if}
                </div>

                {#if getFieldRange(fieldKey)}
                  <div class="shrink-0 text-[11px] text-stone-500">
                    {getFieldRange(fieldKey).replace("From ", "").replace(" to ", " ~ ")}
                  </div>
                {/if}
              </div>
              <div class="mt-1 grid gap-2" style={`grid-template-columns: ${getMatrixTemplateColumns()};`}>
                {#each visibleCaseIds as caseId}
                  <div class={activeCaseId === caseId ? "rounded-sm bg-sky-50/50 p-1" : "p-1"}>
                    {#if showPresetInput(fieldKey)}
                      <PresetNumericInput
                        items={getPresetInputOptions(fieldKey)}
                        value={inputsByCase[caseId][fieldKey]}
                        decimals={getPresetInputDecimals(fieldKey)}
                        valueSuffix={getFieldDisplayUnits(fieldKey)}
                        placeholder={`Enter ${getFieldDisplayUnits(fieldKey)} or search preset`}
                        searchPlaceholder={`Search ${getFieldLabel(fieldKey).toLowerCase()} presets`}
                        ariaLabel={`${compareCaseMetaById[caseId].label} ${getFieldLabel(fieldKey)}`}
                        onActivate={() => onSelectActiveCase(caseId)}
                        onCommit={(value) => handleApplyPresetValue(caseId, fieldKey, value)}
                      />
                    {:else}
                      <input
                        id={`${caseId}-${fieldKey}`}
                        type="number"
                        step={getFieldStep(fieldKey)}
                        value={getDisplayValue(caseId, fieldKey, getFieldDecimals(fieldKey))}
                        aria-label={`${compareCaseMetaById[caseId].label} ${getFieldLabel(fieldKey)}`}
                        onfocus={() => onSelectActiveCase(caseId)}
                        oninput={(event) => handleFieldInput(caseId, fieldKey, event.currentTarget.value)}
                        class="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-sky-600 focus:outline-none"
                      />
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</Card>

<Modal
  bind:open={clothingBuilderOpen}
  size="md"
  placement="center"
  outsideclose={true}
  class="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-2xl shadow-stone-900/10"
  classBackdrop="fixed inset-0 z-40 bg-stone-950/35 backdrop-blur-sm"
  classHeader="border-b border-stone-100 px-5 py-4"
  classBody="space-y-0 p-0"
>
  <svelte:fragment slot="header">
    <div>
      <h3 class="text-lg font-semibold text-stone-900">Clothing Tools</h3>
      <p class="mt-1 text-sm text-stone-500">Predict clo quickly or build a garment ensemble from the CBE list.</p>
    </div>
  </svelte:fragment>

  <ClothingEnsembleBuilder
    activeCaseId={activeCaseId}
    visibleCaseIds={visibleCaseIds}
    {unitSystem}
    onSelectCase={onSelectActiveCase}
    onApplyClothingValue={handleApplyClothingValue}
    onClose={() => {
      clothingBuilderOpen = false;
    }}
  />
</Modal>
