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

/**
 * Validates an untyped object layer.
 * Since UTCI exposes no complex advanced user options, normalization cleanly rejects complex objects 
 * and enforces an empty options record `{}`.
 * @param value Unvalidated unknown state shape.
 * @returns An empty valid options map `{}`, or null if not a record.
 */
function normalizeUtciOptions(value: unknown) {
  return isRecord(value) ? {} : null;
}

/**
 * Formats the canonical global state into a discrete SI structure required
 * by the core `jsthermalcomfort` mathematical UTCI solver, aligned to a specific InputId slot.
 * @param state Global Reactivity UI Canonical state.
 * @param inputId Active Target Input slot enumerator.
 * @returns Isolated `UtciRequestDto`.
 */
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

/**
 * Derives UTCI inputs needed to correctly render the backend Chart components.
 * This bundles requests for all simultaneously visible inputs at once.
 * @param state Global state context.
 * @param visibleInputIds All actively rendered inputs to query.
 * @returns Chart Input bundle payload container.
 */
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

/**
 * Assembles tabular data blocks detailing UTCI and text Stress categories based
 * on previously ran model resolution.
 * @param results Compiled Model Results for active inputs.
 * @param visibleInputIds Ordered ID references determining render sequences.
 * @param unitSystem Preferred User format metric (SI vs IP).
 * @returns Abstract section mappings.
 */
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

/**
 * Executes rendering assignments for the UTCI specific Plotly diagrams
 * based on the selected Model Chart ID (Stress/AirTemperature).
 * @param chartId User selected View/Chart ID.
 * @param chartSource The mapped properties containing bounds.
 * @param resultsByInput Pre-compiled scalar solutions tracking outputs per input.
 * @param unitSystem Local UI SI/IP metric schema.
 * @returns A composite configuration structure for Plotly.
 */
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

/**
 * UTCI Implementation Standard ComfortModelBuilder.
 * Wires the 4 core behavior fields strictly without extraneous advanced options.
 * This builder is directly injected into the Reactivity model layer (`createComfortToolState.svelte.ts`) to bootstrap the tool's UTCI context.
 */
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
