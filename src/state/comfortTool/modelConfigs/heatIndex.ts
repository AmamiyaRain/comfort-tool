import { ChartId, type ChartId as ChartIdType } from "../../../models/chartOptions";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel } from "../../../models/comfortModels";
import type { HeatIndexChartInputsRequestDto, HeatIndexChartSourceDto, HeatIndexResponseDto, HeatIndexRequestDto } from "../../../models/comfortDtos";
import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/inputFieldsMeta";
import { InputControlId } from "../../../models/inputControls";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import { createControlBehavior, buildDefaultPresentation } from "../../../services/comfort/controls/controlBehaviors";
import { calculateHeatIndex } from "../../../services/comfort/heatIndex";
import { convertFieldValueFromSi, formatDisplayValue } from "../../../services/units/index";
import { ComfortModelBuilder, isRecord, createEmptyResults, buildResultSection } from "./builder";
import { buildHeatIndexRangesChart, buildHumidexChart, buildWindChillChart } from "../../../services/comfort/charts/heatIndexCharts";

const heatIndexChartIds: ChartIdType[] = [ChartId.HeatIndexRanges, ChartId.Humidex, ChartId.WindChill];

function normalizeHeatIndexOptions(value: unknown) {
  if (isRecord(value)) {
    return {};
  }
  return null;
}

function toHeatIndexRequest(state: any, inputId: InputIdType): HeatIndexRequestDto {
  const inputs = state.inputsByInput[inputId];
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    v: Number(inputs[FieldKey.RelativeAirSpeed]),
    units: "SI" as const,
  };
}

function toHeatIndexChartInputsRequest(
  state: any,
  visibleInputIds: InputIdType[],
): HeatIndexChartInputsRequestDto {
  return {
    inputs: visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = toHeatIndexRequest(state, inputId);
      return accumulator;
    }, {} as HeatIndexChartInputsRequestDto["inputs"]),
  };
}

function buildHeatIndexResultSections(
  results: Record<InputIdType, HeatIndexResponseDto | null>,
  visibleInputIds: InputIdType[],
  unitSystem: UnitSystemType,
  options: any,
  selectedChartId: ChartIdType,
) {
  const temperatureUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  const sections = [];

  const isWindChill = selectedChartId === ChartId.WindChill;

  if (!isWindChill) {
    sections.push(
      buildResultSection("Heat Index", results, visibleInputIds, (result) => {
        const displayValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.hi, unitSystem);
        const formattedValue = formatDisplayValue(
          displayValue,
          fieldMetaByKey[FieldKey.DryBulbTemperature].decimals,
        );

        let tone: any = "default";
        if (result.category === "Extreme Danger") tone = "hiExtremeDanger";
        else if (result.category === "Danger") tone = "hiDanger";
        else if (result.category === "Extreme Caution") tone = "hiExtremeCaution";
        else if (result.category === "Caution") tone = "hiCaution";

        return {
          text: `${formattedValue} ${temperatureUnits}`,
          subtext: result.category,
          tone: tone,
        };
      }),
    );

    sections.push(
      buildResultSection("Humidex", results, visibleInputIds, (result) => {
        if (!result.humidex) return null;
        
        const formattedValue = formatDisplayValue(
          result.humidex,
          1,
        );

        let tone: any = "default";
        const h = result.humidex;
        if (h > 45) tone = "hiExtremeDanger";
        else if (h > 40) tone = "hiDanger";
        else if (h > 35) tone = "hiExtremeCaution";
        else if (h > 30) tone = "hiCaution";

        return {
          text: `${formattedValue}`,
          subtext: result.humidexDiscomfort,
          tone: tone,
        };
      }),
    );
  } else {
    sections.push(
      buildResultSection("Wind Chill Index", results, visibleInputIds, (result) => {
        if (result.wci === undefined) return null;
        
        const formattedValue = formatDisplayValue(
          result.wci,
          0,
        );

        let tone: any = "default";
        if (result.wciZone === "2 mins to frostbite") tone = "wc2min";
        else if (result.wciZone === "10 mins to frostbite") tone = "wc10min";
        else if (result.wciZone === "30 mins to frostbite") tone = "wc30min";
        else if (result.wciZone === "Safe") tone = "wcSafe";

        return {
          text: `${formattedValue} W/m²`,
          subtext: result.wciZone,
          tone: tone,
        };
      }),
    );

    sections.push(
      buildResultSection("Wind Chill Temperature", results, visibleInputIds, (result) => {
        if (result.wciTemp === undefined) return null;
        
        const displayValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.wciTemp, unitSystem);
        const formattedValue = formatDisplayValue(
          displayValue,
          1,
        );

        let tone: any = "default";
        if (result.wciZone === "2 mins to frostbite") tone = "wc2min";
        else if (result.wciZone === "10 mins to frostbite") tone = "wc10min";
        else if (result.wciZone === "30 mins to frostbite") tone = "wc30min";
        else if (result.wciZone === "Safe") tone = "wcSafe";

        return {
          text: `${formattedValue} ${temperatureUnits}`,
          tone: tone,
        };
      }),
    );
  }

  return sections;
}

function buildChartResult(
  chartId: ChartIdType,
  chartSource: HeatIndexChartSourceDto | null,
  resultsByInput: Record<InputIdType, HeatIndexResponseDto | null>,
  unitSystem: UnitSystemType,
) {
  if (!chartSource) {
    return null;
  }

  if (chartId === ChartId.HeatIndexRanges) {
    return buildHeatIndexRangesChart(chartSource.chartRequest, resultsByInput, unitSystem);
  }

  if (chartId === ChartId.Humidex) {
    return buildHumidexChart(chartSource.chartRequest, resultsByInput, unitSystem);
  }

  if (chartId === ChartId.WindChill) {
    return buildWindChillChart(chartSource.chartRequest, resultsByInput, unitSystem);
  }

  return null;
}

const builder = new ComfortModelBuilder<HeatIndexResponseDto, HeatIndexChartSourceDto>(ComfortModel.HeatIndex);

builder.addControl({
  id: InputControlId.Temperature,
  behavior: createControlBehavior({
    controlId: InputControlId.Temperature,
    fieldKey: FieldKey.DryBulbTemperature,
    getPresentation: (context, meta) => {
      const presentation = buildDefaultPresentation(context, meta);
      if (context.selectedChartId === ChartId.WindChill) {
        const minSi = -45;
        const maxSi = 0;
        presentation.minValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, minSi, context.unitSystem);
        presentation.maxValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, maxSi, context.unitSystem);
        
        const minFmt = formatDisplayValue(presentation.minValue, presentation.decimals);
        const maxFmt = formatDisplayValue(presentation.maxValue, presentation.decimals);
        presentation.rangeText = `From ${minFmt} to ${maxFmt}`;
      }
      return presentation;
    },
  }),
});

builder.addControl({
  id: InputControlId.Humidity,
  behavior: createControlBehavior({
    controlId: InputControlId.Humidity,
    fieldKey: FieldKey.RelativeHumidity,
    hidden: (context) => context.selectedChartId === ChartId.WindChill,
  }),
});

builder.addControl({
  id: InputControlId.AirSpeed,
  behavior: createControlBehavior({
    controlId: InputControlId.AirSpeed,
    fieldKey: FieldKey.RelativeAirSpeed,
    hidden: (context) => context.selectedChartId !== ChartId.WindChill,
    getPresentation: (context, meta) => {
      const presentation = buildDefaultPresentation(context, meta);
      if (context.selectedChartId === ChartId.WindChill) {
        const minSi = 1;
        const maxSi = 20;
        presentation.minValue = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, minSi, context.unitSystem);
        presentation.maxValue = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, maxSi, context.unitSystem);
        presentation.step = 1;
        presentation.decimals = 0;
        
        const minFmt = formatDisplayValue(presentation.minValue, presentation.decimals);
        const maxFmt = formatDisplayValue(presentation.maxValue, presentation.decimals);
        presentation.rangeText = `From ${minFmt} to ${maxFmt}`;
      }
      return presentation;
    },
  }),
});

builder.setDefaultChart(ChartId.HeatIndexRanges, heatIndexChartIds);
builder.setDynamicAxisFields([FieldKey.DryBulbTemperature, FieldKey.RelativeHumidity, FieldKey.RelativeAirSpeed]);
builder.setDefaultOptions({});
builder.setOptionNormalizer(normalizeHeatIndexOptions);

builder.setCalculator((state, visibleInputIds) => {
  const resultsByInput = createEmptyResults<HeatIndexResponseDto>();
  
  visibleInputIds.forEach((inputId) => {
    resultsByInput[inputId] = calculateHeatIndex(toHeatIndexRequest(state, inputId));
  });

  const chartRequest = toHeatIndexChartInputsRequest(state, visibleInputIds);

  return {
    resultsByInput: resultsByInput,
    chartSource: {
      chartRequest: chartRequest,
    },
  };
});

builder.setResultBuilder(buildHeatIndexResultSections);
builder.setChartBuilder(buildChartResult);

export const heatIndexModelConfig = builder.build();
