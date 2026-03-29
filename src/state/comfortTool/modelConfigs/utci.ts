/**
 * UTCI model definition.
 * UTCI uses the shared control-driven contract with fixed numeric inputs and no advanced option menus.
 */
import { ChartId, type ChartId as ChartIdType } from "../../../models/chartOptions";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel } from "../../../models/comfortModels";
import type { UtciChartInputsRequestDto, UtciResponseDto } from "../../../models/dto";
import { FieldKey } from "../../../models/fieldKeys";
import { InputControlId } from "../../../models/inputControls";
import { createControlBehavior } from "../../../services/comfort/controls/controlBehaviors";
import { buildUtciStressChart, buildUtciTemperatureChart } from "../../../services/comfort/charts/utciCharts";
import { calculateUtci } from "../../../services/comfort/utci";
import type { ComfortModelDefinition } from "./index";

const utciChartIds: ChartIdType[] = [ChartId.Stress, ChartId.AirTemperature];

function createEmptyUtciResults(): Record<InputIdType, UtciResponseDto | null> {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = null;
    return accumulator;
  }, {} as Record<InputIdType, UtciResponseDto | null>);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeUtciOptions(value: unknown) {
  return isRecord(value) ? {} : null;
}

function toUtciRequest(state, inputId: InputIdType) {
  const inputs = state.inputsByInput[inputId];
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    tr: Number(inputs[FieldKey.MeanRadiantTemperature]),
    v: Number(inputs[FieldKey.WindSpeed]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    units: "SI" as const,
  };
}

function toUtciChartInputsRequest(
  state,
  visibleInputIds: InputIdType[],
): UtciChartInputsRequestDto {
  return {
    inputs: visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = toUtciRequest(state, inputId);
      return accumulator;
    }, {} as UtciChartInputsRequestDto["inputs"]),
  };
}

function buildUtciResultSections(
  results: Record<InputIdType, UtciResponseDto | null>,
  visibleInputIds: InputIdType[],
) {
  return [
    {
      title: "UTCI",
      valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
        const result = results[inputId];
        accumulator[inputId] = result
          ? { text: `${result.utci.toFixed(1)} C`, toneClass: "text-base font-semibold text-stone-900" }
          : null;
        return accumulator;
      }, {}),
    },
    {
      title: "Stress Category",
      valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
        const result = results[inputId];
        accumulator[inputId] = result
          ? { text: result.stressCategory, toneClass: "font-medium text-stone-900" }
          : null;
        return accumulator;
      }, {}),
    },
  ];
}

export const utciModelConfig: ComfortModelDefinition<UtciResponseDto> = {
  id: ComfortModel.Utci,
  controls: [
    {
      id: InputControlId.Temperature,
      behavior: createControlBehavior({
        controlId: InputControlId.Temperature,
        fieldKey: FieldKey.DryBulbTemperature,
        refreshDerived: true,
      }),
    },
    {
      id: InputControlId.RadiantTemperature,
      behavior: createControlBehavior({
        controlId: InputControlId.RadiantTemperature,
        fieldKey: FieldKey.MeanRadiantTemperature,
      }),
    },
    {
      id: InputControlId.WindSpeed,
      behavior: createControlBehavior({
        controlId: InputControlId.WindSpeed,
        fieldKey: FieldKey.WindSpeed,
      }),
    },
    {
      id: InputControlId.Humidity,
      behavior: createControlBehavior({
        controlId: InputControlId.Humidity,
        fieldKey: FieldKey.RelativeHumidity,
        refreshDerived: true,
      }),
    },
  ],
  chartIds: utciChartIds,
  defaultChartId: ChartId.Stress,
  defaultOptions: {},
  normalizeOptions: normalizeUtciOptions,
  calculate: (state, visibleInputIds) => {
    const resultsByInput = createEmptyUtciResults();
    visibleInputIds.forEach((inputId) => {
      resultsByInput[inputId] = calculateUtci(toUtciRequest(state, inputId));
    });

    const chartRequest = toUtciChartInputsRequest(state, visibleInputIds);

    return {
      resultsByInput,
      chartResults: {
        [ChartId.Stress]: buildUtciStressChart(chartRequest, resultsByInput),
        [ChartId.AirTemperature]: buildUtciTemperatureChart(chartRequest, resultsByInput),
      },
      resultSections: buildUtciResultSections(resultsByInput, visibleInputIds),
    };
  },
};
