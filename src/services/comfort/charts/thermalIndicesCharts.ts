/** Thermal Indices Charting Service
 *  These charts display relationships between air temperature, relative humidity, air speed, and thermal indices.
*/

import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/inputFieldsMeta";
import { CalculationSource } from "../../../models/calculationMetadata";
import type {
  PlotAnnotationDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
  ThermalIndicesChartInputsRequestDto,
} from "../../../models/comfortDtos";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import { convertFieldValueFromSi, convertFieldValueToSi } from "../../units/index";
import { heat_index, humidex, wc } from "jsthermalcomfort";
import {
  getCompareInputs,
  roundValue,
  getHeatIndexCategory,
  getHumidexDiscomfort,
  getWindChillZone,
  HI_CAUTION,
  HI_EXTREME_CAUTION,
  HI_DANGER,
  HI_EXTREME_DANGER,
  HUMIDEX_NOTICEABLE,
  HUMIDEX_EVIDENT,
  HUMIDEX_INTENSE,
  HUMIDEX_DANGEROUS,
  HUMIDEX_STROKE_PROBABLE,
  WCI_FROSTBITE_2,
  WCI_FROSTBITE_10,
  WCI_FROSTBITE_30,
} from "../helpers";
import { inputDisplayMetaById } from "../../../models/inputSlotPresentation";
import { buildInputScatterTrace, buildContourTrace } from "./plotlyBuilders";


/**
 * Builds the Heat Index Chart.
 * @param payload - The inputs for the chart
 * @param cachedResultsByInput - The cached results for the chart
 * @param unitSystem - The unit system to use
 * @returns PlotlyChartResponseDto - The chart data
 */
export function buildHeatIndexRangesChart(
  payload: ThermalIndicesChartInputsRequestDto,
  cachedResultsByInput: any = {},
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  // Get the inputs for the chart
  const inputs = getCompareInputs(payload.inputs);
  // Check if we should show the input legend
  const showInputLegend = inputs.length > 1;

  // Get the metadata for the y-axis (air temperature)
  const yMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];

  // Set the min/max values for the x-axis (relative humidity)
  const xMin = 0; // RH 0%
  const xMax = 100; // RH 100%
  
  // Set the min/max values for the y-axis (air temperature)
  const yMinSi = 20;
  const yMaxSi = 50;
  const yMin = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMinSi, unitSystem);
  const yMax = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMaxSi, unitSystem);

  // Set the number of points for the x and y axes
  const xPoints = 50;
  const yPoints = 50;
  const xValues: number[] = [];
  const yValues: number[] = [];

  // Build the x and y values
  for (let i = 0; i < xPoints; i++) {
    xValues.push(xMin + (xMax - xMin) * (i / (xPoints - 1)));
  }
  for (let i = 0; i < yPoints; i++) {
    yValues.push(yMin + (yMax - yMin) * (i / (yPoints - 1)));
  }

  // Build the z and text values
  const zValues: number[][] = [];
  const textValues: string[][] = [];

  // Build the z and text values
  for (let i = 0; i < yPoints; i++) {
    const row: number[] = [];
    const textRow: string[] = [];
    const ySi = unitSystem === UnitSystem.IP ? (yValues[i] - 32) * 5/9 : yValues[i];

    // Calculate the heat index for each x value
    for (let j = 0; j < xPoints; j++) {
      const xSi = xValues[j]; // RH is same
      
      // Try to calculate the heat index
      try {
        const result = heat_index(ySi, xSi, { round: true, units: "SI" });
        const hi = result.hi;
        
        // Check which range the heat index falls into
        let rangeValue = 0;
        if (hi >= HI_EXTREME_DANGER) rangeValue = 4;
        else if (hi >= HI_DANGER) rangeValue = 3;
        else if (hi >= HI_EXTREME_CAUTION) rangeValue = 2;
        else if (hi >= HI_CAUTION) rangeValue = 1;
        // Push the range value and category to the row and text row
        row.push(rangeValue);
        textRow.push(getHeatIndexCategory(hi));
      } catch (e) {
        // If calculation fails, push NaN and "Error"
        row.push(NaN);
        textRow.push("Error");
      }
    }
    // Push the row and text row to the z and text values
    zValues.push(row);
    textValues.push(textRow);
  }

  // Build the traces
  const traces: PlotTraceDto[] = [
    buildContourTrace({
      name: "Heat Index",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: [
        [0, "#e2e8f0"], [0.2, "#e2e8f0"], // Safe
        [0.2, "#fef08a"], [0.4, "#fef08a"], // Caution
        [0.4, "#fde047"], [0.6, "#fde047"], // Extreme Caution
        [0.6, "#f97316"], [0.8, "#f97316"], // Danger
        [0.8, "#dc2626"], [1, "#dc2626"] // Extreme Danger
      ],
      zmin: 0,
      zmax: 4,
      contours: { coloring: "heatmap", showlines: false },
      hovertemplate: "Category: %{text}<extra></extra>",
      showscale: true,
      colorbar: {
        tickmode: "array",
        tickvals: [0.4, 1.2, 2.0, 2.8, 3.6],
        ticktext: ["Safe", "Caution", "Extreme Caution", "Danger", "Extreme Danger"],
        thickness: 15,
        len: 0.8
      }
    })
  ];

  // Build the input scatter traces for each input
  inputs.forEach((input) => {
    const cached = cachedResultsByInput[input.inputId];
    const xVal = input.payload.rh;
    const yVal = convertFieldValueFromSi(FieldKey.DryBulbTemperature, input.payload.tdb, unitSystem);
    
    // Push the input scatter trace to the traces array
    traces.push(
      buildInputScatterTrace({
        inputId: input.inputId,
        x: xVal,
        y: yVal,
        showLegend: showInputLegend,
        hovertemplate: `${inputDisplayMetaById[input.inputId].label}<br>RH: %{x:.1f}%<br>Air Temp: %{y:.1f}°<br>Heat Index: ${roundValue(cached?.hi, 1)}°<extra></extra>`,
      })
    );
  });

  // Return the traces and layout
  return {
    traces,
    layout: {
      title: "Heat Index Ranges",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: showInputLegend,
      margin: { l: 60, r: 40, t: 60, b: 60 },
      xaxis: { title: "Relative Humidity (%)", range: [0, 100] },
      yaxis: { title: `Air Temperature (${yMeta.displayUnits[unitSystem]})`, range: [yMin, yMax] }
    },
    annotations: [],
    source: CalculationSource.JsThermalComfort
  };
}

/**
 * Builds the Humidex Chart.
 * @param payload - The inputs for the chart
 * @param cachedResultsByInput - The cached results for the chart
 * @param unitSystem - The unit system to use
 * @returns PlotlyChartResponseDto - The chart data
 */
export function buildHumidexChart(
  payload: ThermalIndicesChartInputsRequestDto,
  cachedResultsByInput: any = {},
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  // Get the inputs for the chart
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;

  // Get the metadata for the y-axis (air temperature)
  const yMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];

  // Set the min/max values for the x-axis (relative humidity)
  const xMin = 0; // RH 0%
  const xMax = 100; // RH 100%
  
  // Set the min/max values for the y-axis (air temperature)
  const yMinSi = 20;
  const yMaxSi = 50;
  const yMin = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMinSi, unitSystem);
  const yMax = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMaxSi, unitSystem);

  // Set the number of points for the x and y axes
  const xPoints = 50;
  const yPoints = 50;
  const xValues: number[] = [];
  const yValues: number[] = [];

  // Build the x and y values
  for (let i = 0; i < xPoints; i++) xValues.push(i * (100 / (xPoints - 1)));
  for (let i = 0; i < yPoints; i++) yValues.push(yMin + i * ((yMax - yMin) / (yPoints - 1)));

  // Build the z and text values
  const zValues: number[][] = [];
  const textValues: string[][] = [];

  // Calculate the heat index for each x value
  for (let i = 0; i < yPoints; i++) {
    const row: number[] = [];
    const textRow: string[] = [];
    const ySi = convertFieldValueToSi(FieldKey.DryBulbTemperature, yValues[i], unitSystem);

    // Calculate the heat index for each x value
    for (let j = 0; j < xPoints; j++) {
      const xSi = xValues[j];

      // Try to calculate the heat index
      try {
        const result = humidex(ySi, xSi, { round: true });
        const h = result.humidex;
        
        // Check which range the heat index falls into
        let rangeValue = 0;
        if (h >= HUMIDEX_STROKE_PROBABLE) rangeValue = 5;
        else if (h >= HUMIDEX_DANGEROUS) rangeValue = 4;
        else if (h >= HUMIDEX_INTENSE) rangeValue = 3;
        else if (h >= HUMIDEX_EVIDENT) rangeValue = 2;
        else if (h >= HUMIDEX_NOTICEABLE) rangeValue = 1;

        // Push the range value and category to the row and text row
        row.push(rangeValue);
        textRow.push(getHumidexDiscomfort(h));
      } catch {
        // If calculation fails, push NaN and "Error"
        row.push(NaN);
        textRow.push("Error");
      }
    }
    zValues.push(row);
    textValues.push(textRow);
  }

  // Build the traces
  const traces: PlotTraceDto[] = [
    buildContourTrace({
      name: "Humidex",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: [
        [0, "#e2e8f0"], [0.166, "#e2e8f0"], // Little/None
        [0.166, "#fef08a"], [0.333, "#fef08a"], // Noticeable
        [0.333, "#fde047"], [0.5, "#fde047"], // Evident
        [0.5, "#facc15"], [0.666, "#facc15"], // Intense
        [0.666, "#f97316"], [0.833, "#f97316"], // Dangerous
        [0.833, "#dc2626"], [1, "#dc2626"] // Stroke Probable
      ],
      zmin: 0,
      zmax: 5,
      contours: { coloring: "heatmap", showlines: false },
      hovertemplate: "Discomfort: %{text}<extra></extra>",
      showscale: true,
      colorbar: {
        tickmode: "array",
        tickvals: [0.4, 1.25, 2.1, 2.9, 3.75, 4.6],
        ticktext: ["Little/None", "Noticeable", "Evident", "Intense", "Dangerous", "Stroke Probable"],
        thickness: 15,
        len: 0.8
      }
    })
  ];

  // Build the input scatter traces for each input
  inputs.forEach((input) => {
    const cached = cachedResultsByInput[input.inputId];
    const yVal = convertFieldValueFromSi(FieldKey.DryBulbTemperature, input.payload.tdb, unitSystem);

    // Push the input scatter trace to the traces array
    traces.push(
      buildInputScatterTrace({
        inputId: input.inputId,
        x: input.payload.rh,
        y: yVal,
        showLegend: showInputLegend,
        hovertemplate: `${inputDisplayMetaById[input.inputId].label}<br>RH: %{x:.1f}%<br>Air Temp: %{y:.1f}°<br>Humidex: ${roundValue(cached?.humidex, 1)}<extra></extra>`,
      })
    );
  });

  // Return the traces and layout
  return {
    traces,
    layout: {
      title: "Humidex Discomfort",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: showInputLegend,
      margin: { l: 60, r: 40, t: 60, b: 60 },
      xaxis: { title: "Relative Humidity (%)", range: [0, 100] },
      yaxis: { title: `Air Temperature (${yMeta.displayUnits[unitSystem]})`, range: [yMin, yMax] }
    },
    annotations: [],
    source: CalculationSource.JsThermalComfort
  };
}

/**
 * Builds the Wind Chill Chart.
 * @param payload - The inputs for the chart
 * @param cachedResultsByInput - The cached results for the chart
 * @param unitSystem - The unit system to use
 * @returns PlotlyChartResponseDto - The chart data
 */
export function buildWindChillChart(
  payload: ThermalIndicesChartInputsRequestDto,
  cachedResultsByInput: any = {},
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  // Get the inputs for the chart
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;

  // Get the metadata for the y-axis (air temperature) and x-axis (wind speed)
  const yMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];
  const vMeta = fieldMetaByKey[FieldKey.RelativeAirSpeed];

  // Set the min/max values for the x-axis (wind speed)
  const xMinSi = 1;
  const xMaxSi = 20;
  const xMin = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, xMinSi, unitSystem);
  const xMax = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, xMaxSi, unitSystem);

  // Set the min/max values for the y-axis (air temperature)
  const yMinSi = -45;
  const yMaxSi = 0;
  const yMin = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMinSi, unitSystem);
  const yMax = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMaxSi, unitSystem);

  // Set the number of points for the x and y axes
  const xPoints = 50;
  const yPoints = 50;

  // Build the x and y values
  const xValues: number[] = [];
  const yValues: number[] = [];
  for (let i = 0; i < xPoints; i++) xValues.push(xMin + i * ((xMax - xMin) / (xPoints - 1)));
  for (let i = 0; i < yPoints; i++) yValues.push(yMin + i * ((yMax - yMin) / (yPoints - 1)));

  // Build the z and text values
  const zValues: number[][] = [];
  const textValues: string[][] = [];

  // Calculate the wind chill for each x and y value
  for (let i = 0; i < yPoints; i++) {
    const row: number[] = [];
    const textRow: string[] = [];
    const ySi = convertFieldValueToSi(FieldKey.DryBulbTemperature, yValues[i], unitSystem);

    // Calculate the wind chill for each x value
    for (let j = 0; j < xPoints; j++) {
      const xSi = convertFieldValueToSi(FieldKey.RelativeAirSpeed, xValues[j], unitSystem);

      // Try to calculate the wind chill
      try {
        const result = wc(ySi, xSi, { round: true });
        const wci = result.wci;
        
        // Check which range the wind chill falls into
        let rangeValue = 0;
        if (wci >= WCI_FROSTBITE_2) rangeValue = 3;
        else if (wci >= WCI_FROSTBITE_10) rangeValue = 2;
        else if (wci >= WCI_FROSTBITE_30) rangeValue = 1;

        // Push the range value and category to the row and text row
        row.push(rangeValue);
        textRow.push(getWindChillZone(wci));
      } catch {
        // If calculation fails, push NaN and "Error"
        row.push(NaN);
        textRow.push("Error");
      }
    }
    zValues.push(row);
    textValues.push(textRow);
  }

  // Build the contour trace
  const traces: PlotTraceDto[] = [
    buildContourTrace({
      name: "Wind Chill",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: [
        [0, "#e0f2fe"], [0.25, "#e0f2fe"], // Safe
        [0.25, "#64b5f5"], [0.5, "#64b5f5"], // 30 min
        [0.5, "#5c6bc0"], [0.75, "#5c6bc0"], // 10 min
        [0.75, "#8e24aa"], [1, "#8e24aa"] // 2 min
      ],
      zmin: 0,
      zmax: 3,
      contours: { coloring: "heatmap", showlines: false },
      hovertemplate: "Frostbite Risk: %{text}<extra></extra>",
      showscale: true,
      colorbar: {
        tickmode: "array",
        tickvals: [0.4, 1.15, 1.9, 2.6],
        ticktext: ["Safe", "30 min frostbite", "10 min frostbite", "2 min frostbite"],
        thickness: 15,
        len: 0.8
      }
    })
  ];

  // Build the input scatter traces for each input
  inputs.forEach((input) => {
    const cached = cachedResultsByInput[input.inputId];
    const xVal = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, input.payload.v || 0, unitSystem);
    const yVal = convertFieldValueFromSi(FieldKey.DryBulbTemperature, input.payload.tdb, unitSystem);
    traces.push(
      buildInputScatterTrace({
        inputId: input.inputId,
        x: xVal,
        y: yVal,
        showLegend: showInputLegend,
        hovertemplate: `${inputDisplayMetaById[input.inputId].label}<br>Wind Speed: %{x:.2f}<br>Air Temp: %{y:.1f}°<br>Wind Chill: ${roundValue(cached?.wciTemp, 1)}°<extra></extra>`,
      })
    );
  });

  // Return the traces and layout
  return {
    traces,
    layout: {
      title: "Wind Chill Frostbite Risk",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: showInputLegend,
      margin: { l: 60, r: 40, t: 60, b: 60 },
      xaxis: { title: `Wind Speed (${vMeta.displayUnits[unitSystem]})`, range: [xMin, xMax] },
      yaxis: { title: `Air Temperature (${yMeta.displayUnits[unitSystem]})`, range: [yMin, yMax] }
    },
    annotations: [],
    source: CalculationSource.JsThermalComfort
  };
}
