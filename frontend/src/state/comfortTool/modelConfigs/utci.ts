import { ChartId } from "../../../models/chartOptions";
import { compareCaseOrder, type CompareCaseId as CompareCaseIdType } from "../../../models/compareCases";
import { ComfortModel } from "../../../models/comfortModels";
import type { UtciStressChartRequestDto, UtciResponseDto } from "../../../models/dto";
import { FieldKey, type FieldKey as FieldKeyType } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/fieldMeta";
import { buildUtciStressChart, buildUtciTemperatureChart, calculateUtci } from "../../../services/comfort";
import { convertDisplayToSi, convertSiToDisplay, formatDisplayValue } from "../../../services/units";
import { refreshAllDerivedState, refreshDerivedStateForCase } from "../derivedState";
import type { ComfortModelConfig } from "./types";

function createEmptyUtciResults(): Record<CompareCaseIdType, UtciResponseDto | null> {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = null;
    return accumulator;
  }, {} as Record<CompareCaseIdType, UtciResponseDto | null>);
}

function toUtciRequest(state, caseId: CompareCaseIdType) {
  const inputs = state.inputsByCase[caseId];
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    tr: Number(inputs[FieldKey.MeanRadiantTemperature]),
    v: Number(inputs[FieldKey.WindSpeed]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    units: "SI" as const,
  };
}

function toUtciStressChartRequest(
  state,
  visibleCaseIds: CompareCaseIdType[],
): UtciStressChartRequestDto {
  return {
    case_a: toUtciRequest(state, compareCaseOrder[0]),
    case_b: visibleCaseIds.includes(compareCaseOrder[1]) ? toUtciRequest(state, compareCaseOrder[1]) : null,
    case_c: visibleCaseIds.includes(compareCaseOrder[2]) ? toUtciRequest(state, compareCaseOrder[2]) : null,
  };
}

function formatRangeText(state, fieldKey: FieldKeyType): string {
  const meta = fieldMetaByKey[fieldKey];
  const minimum = formatDisplayValue(
    convertSiToDisplay(fieldKey, meta.minValue, state.ui.unitSystem),
    meta.decimals,
  );
  const maximum = formatDisplayValue(
    convertSiToDisplay(fieldKey, meta.maxValue, state.ui.unitSystem),
    meta.decimals,
  );
  return `From ${minimum} to ${maximum}`;
}

export const utciModelConfig: ComfortModelConfig<UtciResponseDto> = {
  id: ComfortModel.Utci,
  fieldOrder: [
    FieldKey.DryBulbTemperature,
    FieldKey.MeanRadiantTemperature,
    FieldKey.WindSpeed,
    FieldKey.RelativeHumidity,
  ],
  defaultChartId: ChartId.Stress,
  defaultOptions: {},
  syncDerivedState: (state) => {
    refreshAllDerivedState(state);
  },
  setOption: () => false,
  updateInput: (state, caseId, fieldKey, rawValue) => {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }

    state.inputsByCase[caseId][fieldKey] = convertDisplayToSi(fieldKey, nextValue, state.ui.unitSystem);
    refreshDerivedStateForCase(state, caseId);
  },
  calculate: (state, visibleCaseIds) => {
    const resultsByCase = createEmptyUtciResults();
    visibleCaseIds.forEach((caseId) => {
      resultsByCase[caseId] = calculateUtci(toUtciRequest(state, caseId));
    });

    const chartRequest = toUtciStressChartRequest(state, visibleCaseIds);

    return {
      resultsByCase,
      chartResults: {
        [ChartId.Stress]: buildUtciStressChart(chartRequest, resultsByCase),
        [ChartId.AirTemperature]: buildUtciTemperatureChart(chartRequest, resultsByCase),
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
  getDisplayValue: (state, caseId, fieldKey) => {
    const presentation = utciModelConfig.getFieldPresentation(state, fieldKey);
    return formatDisplayValue(
      convertSiToDisplay(fieldKey, state.inputsByCase[caseId][fieldKey], state.ui.unitSystem),
      presentation.decimals,
    );
  },
  getAdvancedOptionMenu: () => null,
  getResultSections: (state, visibleCaseIds) => {
    const results = state.ui.resultsByModel[ComfortModel.Utci];

    return [
      {
        title: "UTCI",
        valuesByCase: visibleCaseIds.reduce((accumulator, caseId) => {
          const result = results[caseId];
          accumulator[caseId] = result
            ? { text: `${result.utci.toFixed(1)} C`, toneClass: "text-base font-semibold text-stone-900" }
            : null;
          return accumulator;
        }, {}),
      },
      {
        title: "Stress Category",
        valuesByCase: visibleCaseIds.reduce((accumulator, caseId) => {
          const result = results[caseId];
          accumulator[caseId] = result
            ? { text: result.stress_category, toneClass: "font-medium text-stone-900" }
            : null;
          return accumulator;
        }, {}),
      },
    ];
  },
};
