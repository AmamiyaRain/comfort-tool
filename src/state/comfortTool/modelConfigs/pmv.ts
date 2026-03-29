/**
 * PMV model definition.
 * Shared input semantics live in pure behavior modules; this file only composes controls and calculation outputs.
 */
import { clothingTypicalEnsembles } from "../../../models/clothingEnsembles";
import { ChartId, type ChartId as ChartIdType } from "../../../models/chartOptions";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel } from "../../../models/comfortModels";
import type {
  ComfortZoneRequestDto,
  PlotlyChartResponseDto,
  PmvChartInputsRequestDto,
  PmvResponseDto,
} from "../../../models/dto";
import { FieldKey } from "../../../models/fieldKeys";
import { InputControlId } from "../../../models/inputControls";
import {
  AirSpeedControlMode,
  AirSpeedInputMode,
  HumidityInputMode,
  OptionKey,
  TemperatureMode,
  defaultPmvOptions,
} from "../../../models/inputModes";
import { metabolicActivityOptions } from "../../../models/metabolicActivities";
import { UnitSystem } from "../../../models/units";
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
} from "../../../services/comfort/inputDerivations";
import {
  createNumericControlBehavior,
} from "../../../services/comfort/controls/numericControlBehavior";
import {
  createPmvAirSpeedControlBehavior,
  createPmvHumidityControlBehavior,
  createPmvTemperatureControlBehavior,
} from "../../../services/comfort/controls/pmvControlBehaviors";
import { createSingleInputPatch } from "../../../services/comfort/controls/types";
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

function createEmptyPmvResults(): Record<InputIdType, PmvResponseDto | null> {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = null;
    return accumulator;
  }, {} as Record<InputIdType, PmvResponseDto | null>);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
      humidityRatioMax: 30,
    },
    rhCurves: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  };
}

function buildPmvResultSections(
  results: Record<InputIdType, PmvResponseDto | null>,
  visibleInputIds: InputIdType[],
) {
  return [
    {
      title: "Compliance",
      valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
        const result = results[inputId];
        accumulator[inputId] = result
          ? {
              text: result.acceptable80 ? "Compliant" : "Out of range",
              toneClass: result.acceptable80 ? "font-semibold text-emerald-700" : "font-semibold text-red-600",
            }
          : null;
        return accumulator;
      }, {}),
    },
    {
      title: "PMV",
      valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
        const result = results[inputId];
        accumulator[inputId] = result
          ? { text: result.pmv.toFixed(2), toneClass: "text-base font-semibold text-stone-900" }
          : null;
        return accumulator;
      }, {}),
    },
    {
      title: "PPD",
      valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
        const result = results[inputId];
        accumulator[inputId] = result
          ? { text: `${result.ppd.toFixed(1)}%`, toneClass: "text-base font-semibold text-stone-900" }
          : null;
        return accumulator;
      }, {}),
    },
    {
      title: "Acceptability",
      valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
        const result = results[inputId];
        accumulator[inputId] = result
          ? { text: `${(100 - result.ppd).toFixed(1)}%`, toneClass: "text-base font-semibold text-stone-900" }
          : null;
        return accumulator;
      }, {}),
    },
  ];
}

export const pmvModelConfig: ComfortModelDefinition<PmvResponseDto> = {
  id: ComfortModel.Pmv,
  controls: [
    {
      id: InputControlId.Temperature,
      behavior: createPmvTemperatureControlBehavior(InputControlId.Temperature),
    },
    {
      id: InputControlId.RadiantTemperature,
      behavior: createNumericControlBehavior({
        controlId: InputControlId.RadiantTemperature,
        fieldKey: FieldKey.MeanRadiantTemperature,
        hidden: (context) => (
          normalizePmvOptions(context.options)[OptionKey.TemperatureMode] === TemperatureMode.Operative
        ),
      }),
    },
    {
      id: InputControlId.AirSpeed,
      behavior: createPmvAirSpeedControlBehavior(InputControlId.AirSpeed),
    },
    {
      id: InputControlId.Humidity,
      behavior: createPmvHumidityControlBehavior(InputControlId.Humidity),
    },
    {
      id: InputControlId.MetabolicRate,
      behavior: createNumericControlBehavior({
        controlId: InputControlId.MetabolicRate,
        fieldKey: FieldKey.MetabolicRate,
        presetOptions: metabolicPresetOptions,
        applyInput: (context, inputId, nextValueSi) => {
          const nextInputState = {
            ...context.inputsByInput[inputId],
            [FieldKey.MetabolicRate]: nextValueSi,
          };
          const synchronizedState = synchronizePmvInputState(
            nextInputState,
            context.derivedByInput[inputId],
            context.options,
          );
          return createSingleInputPatch(inputId, synchronizedState.inputState, synchronizedState.derivedState);
        },
      }),
    },
    {
      id: InputControlId.ClothingInsulation,
      behavior: createNumericControlBehavior({
        controlId: InputControlId.ClothingInsulation,
        fieldKey: FieldKey.ClothingInsulation,
        presetOptions: clothingPresetOptions,
        presetDecimals: 2,
        showClothingBuilder: true,
      }),
    },
  ],
  chartIds: pmvChartIds,
  defaultChartId: ChartId.Psychrometric,
  defaultOptions: { ...defaultPmvOptions },
  normalizeOptions: normalizePmvOptionsSnapshot,
  calculate: (state, visibleInputIds) => {
    const compareChartRequest = toPmvChartInputsRequest(state, visibleInputIds);
    const resultsByInput = createEmptyPmvResults();
    const comfortZonesByInput = visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = calculateComfortZone(toComfortZoneRequest(state, inputId));
      return accumulator;
    }, {} as ComfortZonesByInput);

    visibleInputIds.forEach((inputId) => {
      resultsByInput[inputId] = calculatePmv(toPmvRequest(state, inputId));
    });

    return {
      resultsByInput,
      chartResults: {
        [ChartId.Psychrometric]: buildComparePsychrometricChart(
          compareChartRequest,
          comfortZonesByInput,
        ) as PlotlyChartResponseDto,
        [ChartId.RelativeHumidity]: buildRelativeHumidityChart(
          compareChartRequest,
          comfortZonesByInput,
        ) as PlotlyChartResponseDto,
      },
      resultSections: buildPmvResultSections(resultsByInput, visibleInputIds),
    };
  },
};
