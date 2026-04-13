/**
 * UTCI model definition.
 * UTCI uses the shared control-driven contract with fixed numeric inputs and no advanced option menus.
 */
import { ChartId, type ChartId as ChartIdType } from "../../../models/chartOptions";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel } from "../../../models/comfortModels";
import type { UtciChartInputsRequestDto, UtciChartSourceDto, UtciResponseDto } from "../../../models/comfortDtos";
import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/inputFieldsMeta";
import { InputControlId } from "../../../models/inputControls";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import { createControlBehavior } from "../../../services/comfort/controls/controlBehaviors";
import { buildUtciStressChart, buildUtciTemperatureChart } from "../../../services/comfort/charts/utciCharts";
import { calculateUtci } from "../../../services/comfort/utci";
import { convertFieldValueFromSi, formatDisplayValue } from "../../../services/units";
import type { ComfortModelDefinition } from "./index";

const utciChartIds: ChartIdType[] = [ChartId.Stress, ChartId.AirTemperature];

import { ComfortModelBuilder, isRecord, createEmptyResults, buildResultSection } from "./builder";

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
  unitSystem: UnitSystemType,
) {
  const temperatureUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];

  return [
    buildResultSection("UTCI", results, visibleInputIds, (result) => ({
      text: `${formatDisplayValue(
        convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.utci, unitSystem),
        fieldMetaByKey[FieldKey.DryBulbTemperature].decimals,
      )} ${temperatureUnits}`,
      tone: "default",
    })),
    buildResultSection("Stress Category", results, visibleInputIds, (result) => ({
      text: result.stressCategory,
      tone: "default",
    })),
  ];
}

function buildUtciChartResult(
  chartId: ChartIdType,
  chartSource: UtciChartSourceDto | null,
  resultsByInput: Record<InputIdType, UtciResponseDto | null>,
  unitSystem: UnitSystemType,
) {
  if (!chartSource) {
    return null;
  }

  if (chartId === ChartId.Stress) {
    return buildUtciStressChart(chartSource.chartRequest, resultsByInput, unitSystem);
  }

  if (chartId === ChartId.AirTemperature) {
    return buildUtciTemperatureChart(chartSource.chartRequest, resultsByInput, unitSystem);
  }

  return null;
}

export const utciModelConfig = new ComfortModelBuilder<UtciResponseDto, UtciChartSourceDto>(ComfortModel.Utci)
  .addControl({
    id: InputControlId.Temperature,
    behavior: createControlBehavior({
      controlId: InputControlId.Temperature,
      fieldKey: FieldKey.DryBulbTemperature,
    }),
  })
  .addControl({
    id: InputControlId.RadiantTemperature,
    behavior: createControlBehavior({
      controlId: InputControlId.RadiantTemperature,
      fieldKey: FieldKey.MeanRadiantTemperature,
    }),
  })
  .addControl({
    id: InputControlId.WindSpeed,
    behavior: createControlBehavior({
      controlId: InputControlId.WindSpeed,
      fieldKey: FieldKey.WindSpeed,
    }),
  })
  .addControl({
    id: InputControlId.Humidity,
    behavior: createControlBehavior({
      controlId: InputControlId.Humidity,
      fieldKey: FieldKey.RelativeHumidity,
    }),
  })
  .setDefaultChart(ChartId.Stress, utciChartIds)
  .setDefaultOptions({})
  .setOptionNormalizer(normalizeUtciOptions)
  .setCalculator((state, visibleInputIds) => {
    const resultsByInput = createEmptyResults<UtciResponseDto>();
    visibleInputIds.forEach((inputId) => {
      resultsByInput[inputId] = calculateUtci(toUtciRequest(state, inputId));
    });

    const chartRequest = toUtciChartInputsRequest(state, visibleInputIds);

    return {
      resultsByInput,
      chartSource: {
        chartRequest,
      },
    };
  })
  .setResultBuilder(buildUtciResultSections)
  .setChartBuilder(buildUtciChartResult)
  .build();
