import { ChartId, type ChartId as ChartIdType } from "../../../models/chartOptions";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel } from "../../../models/comfortModels";
import type { ThermalIndicesChartInputsRequestDto, ThermalIndicesChartSourceDto, ThermalIndicesResponseDto, ThermalIndicesRequestDto } from "../../../models/comfortDtos";
import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/inputFieldsMeta";
import { InputControlId } from "../../../models/inputControls";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import { createControlBehavior, buildDefaultPresentation } from "../../../services/comfort/controls/controlBehaviors";
import { calculateThermalIndices } from "../../../services/comfort/thermalIndices";
import { convertFieldValueFromSi, formatDisplayValue } from "../../../services/units/index";
import { ComfortModelBuilder, isRecord, createEmptyResults, buildResultSection } from "./builder";
import { buildHeatIndexRangesChart, buildHumidexChart, buildWindChillChart } from "../../../services/comfort/charts/thermalIndicesCharts";

const thermalIndicesChartIds: ChartIdType[] = [ChartId.HeatIndexRanges, ChartId.Humidex, ChartId.WindChill];

function normalizeThermalIndicesOptions(value: unknown) {
  if (isRecord(value)) {
    return {};
  }
  return null;
}

function toThermalIndicesRequest(state: any, inputId: InputIdType): ThermalIndicesRequestDto {
  const inputs = state.inputsByInput[inputId];
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    v: Number(inputs[FieldKey.RelativeAirSpeed]),
    units: "SI" as const,
  };
}

function toThermalIndicesChartInputsRequest(
  state: any,
  visibleInputIds: InputIdType[],
): ThermalIndicesChartInputsRequestDto {
  return {
    inputs: visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = toThermalIndicesRequest(state, inputId);
      return accumulator;
    }, {} as ThermalIndicesChartInputsRequestDto["inputs"]),
  };
}

import {
  HUMIDEX_NOTICEABLE,
  HUMIDEX_EVIDENT,
  HUMIDEX_INTENSE,
  HUMIDEX_DANGEROUS,
  HUMIDEX_STROKE_PROBABLE,
} from "../../../services/comfort/helpers";

// Build the result sections for heat index, humidex, and wind chill charts
function buildThermalIndicesResultSections(
  results: Record<InputIdType, ThermalIndicesResponseDto | null>,
  visibleInputIds: InputIdType[],
  unitSystem: UnitSystemType,
  options: any,
  selectedChartId: ChartIdType,
) {
  // Get the temperature units for the active unit system
  const temperatureUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  const sections = [];

  // Check if the selected chart is wind chill
  const isWindChill = selectedChartId === ChartId.WindChill;

  // If the selected chart is not wind chill, build the heat index and humidex result sections
  if (!isWindChill) {
    // Build the heat index result section
    sections.push(
      buildResultSection("Heat Index", results, visibleInputIds, (result) => {
        // Convert and format the heat index value for display
        const displayValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.hi, unitSystem);
        const formattedValue = formatDisplayValue(
          displayValue,
          fieldMetaByKey[FieldKey.DryBulbTemperature].decimals,
        );

        // Set the tone (color) based on the heat index category
        let tone: any = "default";
        if (result.category === "Extreme Danger") tone = "hiExtremeDanger";
        else if (result.category === "Danger") tone = "hiDanger";
        else if (result.category === "Extreme Caution") tone = "hiExtremeCaution";
        else if (result.category === "Caution") tone = "hiCaution";

        // Return the heat index result section
        return {
          text: `${formattedValue} ${temperatureUnits}`,
          subtext: result.category,
          tone: tone,
        };
      }),
    );

    // Build the humidex result section
    sections.push(
      buildResultSection("Humidex", results, visibleInputIds, (result) => {
        if (!result.humidex) return null;
        
        const formattedValue = formatDisplayValue(
          result.humidex,
          1,
        );

        // Set the tone (color) based on the humidex category
        let tone: any = "default";
        const h = result.humidex;
        if (h >= HUMIDEX_STROKE_PROBABLE) tone = "hiExtremeDanger";
        else if (h >= HUMIDEX_DANGEROUS) tone = "hiDanger";
        else if (h >= HUMIDEX_INTENSE) tone = "hiExtremeCaution";
        else if (h >= HUMIDEX_EVIDENT) tone = "hiCaution";
        else if (h >= HUMIDEX_NOTICEABLE) tone = "default";

        // Return the humidex result section
        return {
          text: `${formattedValue}`,
          subtext: result.humidexDiscomfort,
          tone: tone,
        };
      }),
    );
  } else {
    // Build the wind chill index result section
    sections.push(
      buildResultSection("Wind Chill Index", results, visibleInputIds, (result) => {
        // Return null if the wind chill index is not available
        if (result.wci === undefined) return null;
        
        // Format the wind chill index value for display
        const formattedValue = formatDisplayValue(
          result.wci,
          0,
        );

        // Set the tone (color) based on the wind chill zone
        let tone: any = "default";
        if (result.wciZone === "2 min frostbite") tone = "wc2min";
        else if (result.wciZone === "10 min frostbite") tone = "wc10min";
        else if (result.wciZone === "30 min frostbite") tone = "wc30min";

        // Return the wind chill index result section
        return {
          text: `${formattedValue} W/m²`,
          subtext: result.wciZone,
          tone: tone,
        };
      }),
    );

    // Build the wind chill temperature result section
    sections.push(
      buildResultSection("Wind Chill Temperature", results, visibleInputIds, (result) => {
        // Return null if the wind chill temperature is not available
        if (result.wciTemp === undefined) return null;
        
        // Convert and format the wind chill temperature value for display
        const displayValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.wciTemp, unitSystem);
        const formattedValue = formatDisplayValue(
          displayValue,
          1,
        );

        // Set the tone (color) based on the wind chill zone
        let tone: any = "default";
        if (result.wciZone === "2 min frostbite") tone = "wc2min";
        else if (result.wciZone === "10 min frostbite") tone = "wc10min";
        else if (result.wciZone === "30 min frostbite") tone = "wc30min";

        return {
          text: `${formattedValue} ${temperatureUnits}`,
          tone: tone,
        };
      }),
    );
  }
  
  // Return the result sections for the selected chart
  return sections;
}

// Build the chart result for the selected chart
function buildChartResult(
  // Parameters passed by the Comfort Tool
  chartId: ChartIdType,
  chartSource: ThermalIndicesChartSourceDto | null,
  resultsByInput: Record<InputIdType, ThermalIndicesResponseDto | null>,
  unitSystem: UnitSystemType,
) {
  // Return null if the chart source is not available
  if (!chartSource) {
    return null;
  }

  // Build the heat index ranges chart
  if (chartId === ChartId.HeatIndexRanges) {
    return buildHeatIndexRangesChart(chartSource.chartRequest, resultsByInput, unitSystem);
  }

  // Build the humidex chart
  if (chartId === ChartId.Humidex) {
    return buildHumidexChart(chartSource.chartRequest, resultsByInput, unitSystem);
  }

  // Build the wind chill chart
  if (chartId === ChartId.WindChill) {
    return buildWindChillChart(chartSource.chartRequest, resultsByInput, unitSystem);
  }

  // Return null if the chart ID is not recognized
  return null;
}

// Initialize the Thermal Indices model builder
const builder = new ComfortModelBuilder<ThermalIndicesResponseDto, ThermalIndicesChartSourceDto>(ComfortModel.HeatIndex);

builder.addControl({
  id: InputControlId.Temperature,
  // Create the behavior for the temperature control
  behavior: createControlBehavior({
    controlId: InputControlId.Temperature,
    fieldKey: FieldKey.DryBulbTemperature,
    // Get the presentation for the temperature control (UI configuration and constraints)
    getPresentation: (context, meta) => {
      // Get the default presentation for the temperature control
      const presentation = buildDefaultPresentation(context, meta);
      
      // Adjust the temperature range for the wind chill chart only
      if (context.selectedChartId === ChartId.WindChill) {
        // Set the minimum and maximum temperature values for the wind chill chart
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

// Add the humidity control
builder.addControl({
  id: InputControlId.Humidity,
  behavior: createControlBehavior({
    controlId: InputControlId.Humidity,
    fieldKey: FieldKey.RelativeHumidity,
    hidden: (context) => context.selectedChartId === ChartId.WindChill,
  }),
});

// Add the air speed control
builder.addControl({
  id: InputControlId.AirSpeed,
  behavior: createControlBehavior({
    controlId: InputControlId.AirSpeed,
    fieldKey: FieldKey.RelativeAirSpeed,
    // Hide the air speed control for the heat index and humidex charts as it is not needed for them
    hidden: (context) => context.selectedChartId !== ChartId.WindChill,
    // Get the presentation for the air speed control (UI configuration and constraints)
    getPresentation: (context, meta) => {
      // Get the default air speed presentation
      const presentation = buildDefaultPresentation(context, meta);
      // Adjust the air speed range and step (increment/decrement) size for the wind chill chart only
      if (context.selectedChartId === ChartId.WindChill) {
        // Set the minimum and maximum air speed values for the wind chill chart
        const minSi = 1;
        const maxSi = 20;
        presentation.minValue = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, minSi, context.unitSystem);
        presentation.maxValue = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, maxSi, context.unitSystem);
        // Set the step (increment/decrement) size for the wind chill chart
        presentation.step = 1;
        // Set the number of decimal places for the wind chill chart
        presentation.decimals = 0;
        
        const minFmt = formatDisplayValue(presentation.minValue, presentation.decimals);
        const maxFmt = formatDisplayValue(presentation.maxValue, presentation.decimals);
        presentation.rangeText = `From ${minFmt} to ${maxFmt}`;
      }
      return presentation;
    },
  }),
});

// Set the default chart for the thermal indices model
builder.setDefaultChart(ChartId.HeatIndexRanges, thermalIndicesChartIds);
// Set the dynamic axis fields for the thermal indices model
builder.setDynamicAxisFields([FieldKey.DryBulbTemperature, FieldKey.RelativeHumidity, FieldKey.RelativeAirSpeed]);
// Set the default options for the thermal indices model
builder.setDefaultOptions({});
// Set the option normalizer for the thermal indices model
builder.setOptionNormalizer(normalizeThermalIndicesOptions);

// Set the calculator for the thermal indices model
builder.setCalculator((state, visibleInputIds) => {
  // Create an empty results object
  const resultsByInput = createEmptyResults<ThermalIndicesResponseDto>();
  // Iterate over the visible input IDs and calculate the thermal indices for each input
  visibleInputIds.forEach((inputId) => {
    resultsByInput[inputId] = calculateThermalIndices(toThermalIndicesRequest(state, inputId));
  });
  // Build the chart inputs request
  const chartRequest = toThermalIndicesChartInputsRequest(state, visibleInputIds);

  // Return the results and chart source
  return {
    resultsByInput: resultsByInput,
    chartSource: {
      chartRequest: chartRequest,
    },
  };
});

// Set the result builder for the thermal indices model
builder.setResultBuilder(buildThermalIndicesResultSections);
// Set the chart builder for the thermal indices model
builder.setChartBuilder(buildChartResult);
// Export the thermal indices model configuration
export const thermalIndicesModelConfig = builder.build();
