/**
 * UTCI model adapter.
 * This config keeps UTCI-specific calculation and chart wiring isolated while reading canonical SI inputs from the
 * shared controller state and exposing a lean presentation layer to the UI.
 */
import { ChartId, chartMetaById, type ChartId as ChartIdType } from "../../../models/chartOptions";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel } from "../../../models/comfortModels";
import type { UtciChartInputsRequestDto, UtciResponseDto } from "../../../models/dto";
import { FieldKey, type FieldKey as FieldKeyType } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/fieldMeta";
import { buildUtciStressChart, buildUtciTemperatureChart, calculateUtci } from "../../../services/comfort";
import { convertFieldValueFromSi, convertFieldValueToSi, formatDisplayValue } from "../../../services/units";
import { refreshAllDerivedState, refreshDerivedStateForInput } from "../derivedState";
import type { ComfortToolStateSlice, ModelOptionsState } from "../types";
import type { ComfortModelConfig } from "./index";

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

function normalizeUtciOptions(value: unknown): ModelOptionsState | null {
  return isRecord(value) ? {} : null;
}

function getChartOptions() {
  return utciChartIds.map((chartId) => ({
    name: chartMetaById[chartId].name,
    value: chartId,
  }));
}

function toUtciRequest(state: ComfortToolStateSlice, inputId: InputIdType) {
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
  state: ComfortToolStateSlice,
  visibleInputIds: InputIdType[],
): UtciChartInputsRequestDto {
  return {
    inputs: visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = toUtciRequest(state, inputId);
      return accumulator;
    }, {} as UtciChartInputsRequestDto["inputs"]),
  };
}

function formatRangeText(state: ComfortToolStateSlice, fieldKey: FieldKeyType): string {
  const meta = fieldMetaByKey[fieldKey];
  const minimum = formatDisplayValue(
    convertFieldValueFromSi(fieldKey, meta.minValue, state.ui.unitSystem),
    meta.decimals,
  );
  const maximum = formatDisplayValue(
    convertFieldValueFromSi(fieldKey, meta.maxValue, state.ui.unitSystem),
    meta.decimals,
  );
  return `From ${minimum} to ${maximum}`;
}

export const utciModelConfig: ComfortModelConfig<UtciResponseDto> = {
  id: ComfortModel.Utci,
  chartIds: utciChartIds,
  defaultChartId: ChartId.Stress,
  defaultOptions: {},
  normalizeOptions: normalizeUtciOptions,
  getChartOptions,
  fieldOrder: [
    FieldKey.DryBulbTemperature,
    FieldKey.MeanRadiantTemperature,
    FieldKey.WindSpeed,
    FieldKey.RelativeHumidity,
  ],
  syncDerivedState: (state) => {
    refreshAllDerivedState(state);
  },
  setOption: () => false,
  updateInput: (state, inputId, fieldKey, rawValue) => {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }

    state.inputsByInput[inputId][fieldKey] = convertFieldValueToSi(fieldKey, nextValue, state.ui.unitSystem);
    refreshDerivedStateForInput(state, inputId);
  },
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
    };
  },
  getFieldPresentation: (state, fieldKey) => {
    const meta = fieldMetaByKey[fieldKey];
    return {
      label: meta.label,
      displayUnits: meta.displayUnits[state.ui.unitSystem],
      step: meta.step,
      decimals: meta.decimals,
      rangeText: formatRangeText(state, fieldKey),
      hidden: false,
      showClothingBuilder: false,
      showPresetInput: false,
      presetOptions: [],
      presetDecimals: meta.decimals,
    };
  },
  getDisplayValue: (state, inputId, fieldKey) => {
    const presentation = utciModelConfig.getFieldPresentation(state, fieldKey);
    return formatDisplayValue(
      convertFieldValueFromSi(fieldKey, state.inputsByInput[inputId][fieldKey], state.ui.unitSystem),
      presentation.decimals,
    );
  },
  getAdvancedOptionMenu: () => null,
  getResultSections: (state, visibleInputIds) => {
    const results = state.ui.resultsByModel[ComfortModel.Utci];

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
  },
};
