/**
 * PMV model definition.
 * Shared input semantics live in pure behavior modules; this file only composes controls and calculation outputs.
 */
import { ChartId, type ChartId as ChartIdType } from "../../../models/chartOptions";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel } from "../../../models/comfortModels";
import type {
  ComfortZoneRequestDto,
  PmvChartSourceDto,
  PmvChartInputsRequestDto,
  PmvResponseDto,
} from "../../../models/comfortDtos";
import { FieldKey } from "../../../models/fieldKeys";
import { InputControlId } from "../../../models/inputControls";
import {
  AirSpeedControlMode,
  AirSpeedInputMode,
  HumidityInputMode,
  OptionKey,
  type OptionKey as OptionKeyType,
  TemperatureMode,
  defaultPmvOptions,
} from "../../../models/inputModes";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import {
  type ComfortZonesByInput,
} from "../../../services/comfort/helpers";
import { buildComparePsychrometricChart } from "../../../services/comfort/charts/pmvCharts";
import { buildRelativeHumidityChart } from "../../../services/comfort/charts/sharedCharts";
import { calculateComfortZone } from "../../../services/comfort/comfortZone";
import { calculatePmv } from "../../../services/comfort/pmv";
import {
  normalizePmvOptions,
  synchronizePmvInputState,
} from "../../../services/comfort/syncState";
import {
  createAirSpeedControlBehavior,
  createControlBehavior,
  createHumidityControlBehavior,
  createTemperatureControlBehavior,
} from "../../../services/comfort/controls/controlBehaviors";
import { createSingleInputPatch, type InputControlBehavior } from "../../../services/comfort/controls/types";
import { clothingTypicalEnsembles, metabolicActivityOptions } from "../../../services/comfort/referenceValues";
import type { ComfortModelDefinition } from "./index";

const pmvChartIds: ChartIdType[] = [ChartId.Psychrometric, ChartId.RelativeHumidity];

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

const temperatureModeValues = new Set<string>(Object.values(TemperatureMode));
const airSpeedControlModeValues = new Set<string>(Object.values(AirSpeedControlMode));
const airSpeedInputModeValues = new Set<string>(Object.values(AirSpeedInputMode));
const humidityInputModeValues = new Set<string>(Object.values(HumidityInputMode));

import { ComfortModelBuilder, isRecord, createEmptyResults, buildResultSection } from "./builder";

function normalizePmvOptionsSnapshot(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const nextTemperatureMode = value[OptionKey.TemperatureMode];
  const nextAirSpeedControlMode = value[OptionKey.AirSpeedControlMode];
  const nextAirSpeedInputMode = value[OptionKey.AirSpeedInputMode];
  const nextHumidityInputMode = value[OptionKey.HumidityInputMode];

  if (nextTemperatureMode !== undefined && !temperatureModeValues.has(String(nextTemperatureMode))) {
    return null;
  }

  if (nextAirSpeedControlMode !== undefined && !airSpeedControlModeValues.has(String(nextAirSpeedControlMode))) {
    return null;
  }

  if (nextAirSpeedInputMode !== undefined && !airSpeedInputModeValues.has(String(nextAirSpeedInputMode))) {
    return null;
  }

  if (nextHumidityInputMode !== undefined && !humidityInputModeValues.has(String(nextHumidityInputMode))) {
    return null;
  }

  return {
    ...defaultPmvOptions,
    ...(nextTemperatureMode !== undefined ? { [OptionKey.TemperatureMode]: String(nextTemperatureMode) } : {}),
    ...(nextAirSpeedControlMode !== undefined ? { [OptionKey.AirSpeedControlMode]: String(nextAirSpeedControlMode) } : {}),
    ...(nextAirSpeedInputMode !== undefined ? { [OptionKey.AirSpeedInputMode]: String(nextAirSpeedInputMode) } : {}),
    ...(nextHumidityInputMode !== undefined ? { [OptionKey.HumidityInputMode]: String(nextHumidityInputMode) } : {}),
  };
}

function toPmvRequest(state, inputId: InputIdType) {
  const inputs = state.inputsByInput[inputId];
  const options = normalizePmvOptions(state.ui.modelOptionsByModel[ComfortModel.Pmv]);
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    tr: Number(inputs[FieldKey.MeanRadiantTemperature]),
    vr: Number(inputs[FieldKey.RelativeAirSpeed]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    met: Number(inputs[FieldKey.MetabolicRate]),
    clo: Number(inputs[FieldKey.ClothingInsulation]),
    wme: Number(inputs[FieldKey.ExternalWork]),
    occupantHasAirSpeedControl: options[OptionKey.AirSpeedControlMode] === AirSpeedControlMode.WithLocalControl,
    units: UnitSystem.SI,
  };
}

function toComfortZoneRequest(state, inputId: InputIdType): ComfortZoneRequestDto {
  return {
    ...toPmvRequest(state, inputId),
    rhMin: 0,
    rhMax: 100,
    rhPoints: 31,
  };
}

function toPmvChartInputsRequest(
  state,
  visibleInputIds: InputIdType[],
): PmvChartInputsRequestDto {
  return {
    inputs: visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = toComfortZoneRequest(state, inputId);
      return accumulator;
    }, {} as PmvChartInputsRequestDto["inputs"]),
    chartRange: {
      tdbMin: 10,
      tdbMax: 40,
      tdbPoints: 121,
      humidityRatioMin: 0,
      humidityRatioMax: 0.03,
    },
    rhCurves: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  };
}

function buildPmvResultSections(
  results: Record<InputIdType, PmvResponseDto | null>,
  visibleInputIds: InputIdType[],
  _unitSystem: UnitSystemType,
) {
  return [
    buildResultSection("Compliance", results, visibleInputIds, (result) => ({
      text: result.acceptable80 ? "Compliant" : "Out of range",
      tone: result.acceptable80 ? "success" : "danger",
    })),
    buildResultSection("PMV", results, visibleInputIds, (result) => ({
      text: result.pmv.toFixed(2),
      tone: "default",
    })),
    buildResultSection("PPD", results, visibleInputIds, (result) => ({
      text: `${result.ppd.toFixed(1)}%`,
      tone: "default",
    })),
    buildResultSection("Acceptability", results, visibleInputIds, (result) => ({
      text: `${(100 - result.ppd).toFixed(1)}%`,
      tone: "default",
    })),
  ];
}

function buildPmvChartResult(
  chartId: ChartIdType,
  chartSource: PmvChartSourceDto | null,
  unitSystem: UnitSystemType,
) {
  if (!chartSource) {
    return null;
  }

  if (chartId === ChartId.Psychrometric) {
    return buildComparePsychrometricChart(chartSource.chartRequest, chartSource.comfortZonesByInput, unitSystem);
  }

  if (chartId === ChartId.RelativeHumidity) {
    return buildRelativeHumidityChart(chartSource.chartRequest, chartSource.comfortZonesByInput, unitSystem);
  }

  return null;
}

function createOptionHandler(
  behavior: InputControlBehavior,
  optionKey: OptionKeyType,
) {
  return (context, nextValue: string) => behavior.applyOptionChange?.(context, optionKey, nextValue) ?? null;
}

const temperatureBehavior = createTemperatureControlBehavior(InputControlId.Temperature);
const airSpeedBehavior = createAirSpeedControlBehavior(InputControlId.AirSpeed);
const humidityBehavior = createHumidityControlBehavior(InputControlId.Humidity);

export const pmvModelConfig = new ComfortModelBuilder<PmvResponseDto, PmvChartSourceDto>(ComfortModel.Pmv)
  .addControl({
    id: InputControlId.Temperature,
    behavior: temperatureBehavior,
  })
  .addControl({
    id: InputControlId.RadiantTemperature,
    behavior: createControlBehavior({
      controlId: InputControlId.RadiantTemperature,
      fieldKey: FieldKey.MeanRadiantTemperature,
      hidden: (context) => (
        normalizePmvOptions(context.options)[OptionKey.TemperatureMode] === TemperatureMode.Operative
      ),
    }),
  })
  .addControl({
    id: InputControlId.AirSpeed,
    behavior: airSpeedBehavior,
  })
  .addControl({
    id: InputControlId.Humidity,
    behavior: humidityBehavior,
  })
  .addControl({
    id: InputControlId.MetabolicRate,
    behavior: createControlBehavior({
      controlId: InputControlId.MetabolicRate,
      fieldKey: FieldKey.MetabolicRate,
      presetOptions: metabolicPresetOptions,
      applyInput: (context, inputId, nextValue) => {
        const nextInputState = {
          ...context.inputsByInput[inputId],
          [FieldKey.MetabolicRate]: nextValue,
        };
        const synchronizedState = synchronizePmvInputState(
          nextInputState,
          context.options,
          context.derivedByInput[inputId],
        );
        return createSingleInputPatch(inputId, synchronizedState.inputState);
      },
    }),
  })
  .addControl({
    id: InputControlId.ClothingInsulation,
    behavior: createControlBehavior({
      controlId: InputControlId.ClothingInsulation,
      fieldKey: FieldKey.ClothingInsulation,
      presetOptions: clothingPresetOptions,
      presetDecimals: 2,
      showClothingBuilder: true,
    }),
  })
  .addOptionHandler(OptionKey.TemperatureMode, createOptionHandler(temperatureBehavior, OptionKey.TemperatureMode))
  .addOptionHandler(OptionKey.AirSpeedControlMode, createOptionHandler(airSpeedBehavior, OptionKey.AirSpeedControlMode))
  .addOptionHandler(OptionKey.AirSpeedInputMode, createOptionHandler(airSpeedBehavior, OptionKey.AirSpeedInputMode))
  .addOptionHandler(OptionKey.HumidityInputMode, createOptionHandler(humidityBehavior, OptionKey.HumidityInputMode))
  .setDefaultChart(ChartId.Psychrometric, pmvChartIds)
  .setDefaultOptions({ ...defaultPmvOptions })
  .setOptionNormalizer(normalizePmvOptionsSnapshot)
  .setCalculator((state, visibleInputIds) => {
    const compareChartRequest = toPmvChartInputsRequest(state, visibleInputIds);
    const resultsByInput = createEmptyResults<PmvResponseDto>();
    const comfortZonesByInput = visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = calculateComfortZone(toComfortZoneRequest(state, inputId));
      return accumulator;
    }, {} as ComfortZonesByInput);

    visibleInputIds.forEach((inputId) => {
      resultsByInput[inputId] = calculatePmv(toPmvRequest(state, inputId));
    });

    return {
      resultsByInput,
      chartSource: {
        chartRequest: compareChartRequest,
        comfortZonesByInput,
      },
    };
  })
  .setResultBuilder(buildPmvResultSections)
  .setChartBuilder((chartId, chartSource, _resultsByInput, unitSystem) => (
    buildPmvChartResult(chartId, chartSource, unitSystem)
  ))
  .build();
