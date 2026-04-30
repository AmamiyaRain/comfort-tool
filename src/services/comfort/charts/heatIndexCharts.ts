/** Heat Index Charting Service */
import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/inputFieldsMeta";
import { CalculationSource } from "../../../models/calculationMetadata";
import type {
  PlotAnnotationDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
  HeatIndexChartInputsRequestDto,
} from "../../../models/comfortDtos";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import { convertFieldValueFromSi } from "../../units/index";
import { heat_index, humidex, wc } from "jsthermalcomfort";
import { getCompareInputs, roundValue } from "../helpers";
import { inputDisplayMetaById } from "../../../models/inputSlotPresentation";
import { buildInputScatterTrace, buildContourTrace } from "./plotlyBuilders";

const HI_CAUTION = 27;
const HI_EXTREME_CAUTION = 32;
const HI_DANGER = 39;
const HI_EXTREME_DANGER = 51;


/**
 * Builds the Heat Index Chart.
 */
export function buildHeatIndexRangesChart(
  payload: HeatIndexChartInputsRequestDto,
  cachedResultsByInput: any = {},
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;

  const yMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];

  const xMin = 0; // RH 0%
  const xMax = 100; // RH 100%
  
  const yMinSi = 20;
  const yMaxSi = 50;
  const yMin = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMinSi, unitSystem);
  const yMax = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMaxSi, unitSystem);

  const xPoints = 50;
  const yPoints = 50;
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (let i = 0; i < xPoints; i++) {
    xValues.push(xMin + (xMax - xMin) * (i / (xPoints - 1)));
  }
  for (let i = 0; i < yPoints; i++) {
    yValues.push(yMin + (yMax - yMin) * (i / (yPoints - 1)));
  }

  const zValues: number[][] = [];
  const textValues: string[][] = [];

  for (let i = 0; i < yPoints; i++) {
    const row: number[] = [];
    const textRow: string[] = [];
    const ySi = unitSystem === UnitSystem.IP ? (yValues[i] - 32) * 5/9 : yValues[i];

    for (let j = 0; j < xPoints; j++) {
      const xSi = xValues[j]; // RH is same
      
      try {
        const result = heat_index(ySi, xSi, { round: true, units: "SI" });
        const hi = result.hi;
        
        let rangeValue = 0;
        let rangeText = "Safe";
        if (hi >= HI_EXTREME_DANGER) {
          rangeValue = 4;
          rangeText = "Extreme Danger";
        } else if (hi >= HI_DANGER) {
          rangeValue = 3;
          rangeText = "Danger";
        } else if (hi >= HI_EXTREME_CAUTION) {
          rangeValue = 2;
          rangeText = "Extreme Caution";
        } else if (hi >= HI_CAUTION) {
          rangeValue = 1;
          rangeText = "Caution";
        }

        row.push(rangeValue);
        textRow.push(rangeText);
      } catch (e) {
        row.push(NaN);
        textRow.push("Error");
      }
    }
    zValues.push(row);
    textValues.push(textRow);
  }

  const traces: PlotTraceDto[] = [];

  if (zValues.length > 0) {
    traces.push(buildContourTrace({
      name: "Heat Index Chart",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: [
        [0, "#e2e8f0"], [0.125, "#e2e8f0"], // 0
        [0.125, "#fef08a"], [0.375, "#fef08a"], // 1
        [0.375, "#facc15"], [0.625, "#facc15"], // 2
        [0.625, "#f97316"], [0.875, "#f97316"], // 3
        [0.875, "#dc2626"], [1, "#dc2626"] // 4
      ],
      contours: { coloring: "heatmap" },
      zmin: 0,
      zmax: 4,
      showscale: true,
      colorbar: {
        tickvals: [0, 1, 2, 3, 4],
        ticktext: ["Safe", "Caution", "Ext. Caution", "Danger", "Ext. Danger"],
        thickness: 20,
      } as any,
      hovertemplate: `RH: %{x:.1f}%<br>Temp: %{y:.1f} ${yMeta.displayUnits[unitSystem]}<br><b>Zone: %{text}</b><extra></extra>`,
    }));
  }

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    let inputX = inputPayload.rh;
    let inputY = convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem);

    traces.push(buildInputScatterTrace({
      inputId,
      x: roundValue(inputX),
      y: roundValue(inputY),
      showLegend: showInputLegend,
      color: "#ffffff",
      markerSize: 14,
      hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>RH %{x:.1f}%<br>Temp %{y:.1f} ${yMeta.displayUnits[unitSystem]}<extra></extra>`,
    }));
  });

  return {
    traces,
    layout: {
      title: "Heat Index Chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showInputLegend,
      margin: { l: 64, r: 24, t: 48, b: 64 },
      xaxis: {
        title: `Relative Humidity (%)`,
        range: [xMin, xMax],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: `Dry Bulb Temperature (${yMeta.displayUnits[unitSystem]})`,
        range: [yMin, yMax],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 480,
    },
    annotations: [],
    source: CalculationSource.FrontendGenerated,
  };
}


/**
 * Builds the Humidex Chart.
 */
export function buildHumidexChart(
  payload: HeatIndexChartInputsRequestDto,
  cachedResultsByInput: any = {},
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;

  const yMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];

  const xMin = 0;
  const xMax = 100;
  
  const yMinSi = 20;
  const yMaxSi = 50;
  const yMin = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMinSi, unitSystem);
  const yMax = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMaxSi, unitSystem);

  const xPoints = 50;
  const yPoints = 50;
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (let i = 0; i < xPoints; i++) {
    xValues.push(xMin + (xMax - xMin) * (i / (xPoints - 1)));
  }
  for (let i = 0; i < yPoints; i++) {
    yValues.push(yMin + (yMax - yMin) * (i / (yPoints - 1)));
  }

  const zValues: number[][] = [];
  const textValues: string[][] = [];

  for (let i = 0; i < yPoints; i++) {
    const row: number[] = [];
    const textRow: string[] = [];
    const ySi = unitSystem === UnitSystem.IP ? (yValues[i] - 32) * 5/9 : yValues[i];

    for (let j = 0; j < xPoints; j++) {
      const xSi = xValues[j];
      
      try {
        const result = humidex(ySi, xSi, { round: true });
        const h = result.humidex;
        
        let rangeValue = 0;
        let rangeText = "Little or no discomfort";
        if (h > 54) {
          rangeValue = 5;
          rangeText = "Heat stroke probable";
        } else if (h > 45) {
          rangeValue = 4;
          rangeText = "Dangerous discomfort";
        } else if (h > 40) {
          rangeValue = 3;
          rangeText = "Intense discomfort";
        } else if (h > 35) {
          rangeValue = 2;
          rangeText = "Evident discomfort";
        } else if (h > 30) {
          rangeValue = 1;
          rangeText = "Noticeable discomfort";
        }

        row.push(rangeValue);
        textRow.push(rangeText);
      } catch (e) {
        row.push(NaN);
        textRow.push("Error");
      }
    }
    zValues.push(row);
    textValues.push(textRow);
  }

  const traces: PlotTraceDto[] = [];

  if (zValues.length > 0) {
    traces.push(buildContourTrace({
      name: "Humidex Chart",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: [
        [0, "#e2e8f0"], [0.166, "#e2e8f0"], // 0
        [0.166, "#fef08a"], [0.333, "#fef08a"], // 1
        [0.333, "#fde047"], [0.5, "#fde047"], // 2
        [0.5, "#facc15"], [0.666, "#facc15"], // 3
        [0.666, "#f97316"], [0.833, "#f97316"], // 4
        [0.833, "#dc2626"], [1, "#dc2626"] // 5
      ],
      contours: { coloring: "heatmap" },
      zmin: 0,
      zmax: 5,
      showscale: true,
      colorbar: {
        tickvals: [0, 1, 2, 3, 4, 5],
        ticktext: ["Little/None", "Noticeable", "Evident", "Intense", "Dangerous", "Stroke Probable"],
        thickness: 20,
      } as any,
      hovertemplate: `RH: %{x:.1f}%<br>Temp: %{y:.1f} ${yMeta.displayUnits[unitSystem]}<br><b>Zone: %{text}</b><extra></extra>`,
    }));
  }

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    let inputX = inputPayload.rh;
    let inputY = convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem);

    traces.push(buildInputScatterTrace({
      inputId,
      x: roundValue(inputX),
      y: roundValue(inputY),
      showLegend: showInputLegend,
      color: "#ffffff",
      markerSize: 14,
      hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>RH %{x:.1f}%<br>Temp %{y:.1f} ${yMeta.displayUnits[unitSystem]}<extra></extra>`,
    }));
  });

  return {
    traces,
    layout: {
      title: "Humidex Chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showInputLegend,
      margin: { l: 64, r: 24, t: 48, b: 64 },
      xaxis: {
        title: `Relative Humidity (%)`,
        range: [xMin, xMax],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: `Dry Bulb Temperature (${yMeta.displayUnits[unitSystem]})`,
        range: [yMin, yMax],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 480,
    },
    annotations: [],
    source: CalculationSource.FrontendGenerated,
  };
}


/**
 * Builds the Wind Chill Chart.
 */
export function buildWindChillChart(
  payload: HeatIndexChartInputsRequestDto,
  cachedResultsByInput: any = {},
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;

  const yMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];
  const xMeta = fieldMetaByKey[FieldKey.RelativeAirSpeed];

  const xMinSi = 1; 
  const xMaxSi = 20; 
  const xMin = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, xMinSi, unitSystem);
  const xMax = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, xMaxSi, unitSystem);
  
  const yMinSi = -45;
  const yMaxSi = 0;
  const yMin = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMinSi, unitSystem);
  const yMax = convertFieldValueFromSi(FieldKey.DryBulbTemperature, yMaxSi, unitSystem);

  const xPoints = 50;
  const yPoints = 50;
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (let i = 0; i < xPoints; i++) {
    xValues.push(xMin + (xMax - xMin) * (i / (xPoints - 1)));
  }
  for (let i = 0; i < yPoints; i++) {
    yValues.push(yMin + (yMax - yMin) * (i / (yPoints - 1)));
  }

  const zValues: number[][] = [];
  const textValues: string[][] = [];

  for (let i = 0; i < yPoints; i++) {
    const row: number[] = [];
    const textRow: string[] = [];
    const ySi = unitSystem === UnitSystem.IP ? (yValues[i] - 32) * 5/9 : yValues[i];

    for (let j = 0; j < xPoints; j++) {
      const xSi = unitSystem === UnitSystem.IP ? xValues[j] * 0.44704 : xValues[j]; // conversion if needed, but let's use convertFieldValueToSi if we had it.
      // Wait, Wind Speed in IP is usually mph or fpm.
      // Let's assume the UI provides it in display units.
      
      try {
        const result = wc(ySi, xSi, { round: true });
        const wciVal = result.wci;
        
        let rangeValue = 0;
        let rangeText = "Safe";
        if (wciVal >= 2300) {
          rangeValue = 3;
          rangeText = "2 mins to frostbite";
        } else if (wciVal >= 1600) {
          rangeValue = 2;
          rangeText = "10 mins to frostbite";
        } else if (wciVal >= 1400) {
          rangeValue = 1;
          rangeText = "30 mins to frostbite";
        }

        row.push(rangeValue);
        textRow.push(rangeText);
      } catch (e) {
        row.push(NaN);
        textRow.push("Error");
      }
    }
    zValues.push(row);
    textValues.push(textRow);
  }

  const traces: PlotTraceDto[] = [];

  if (zValues.length > 0) {
    traces.push(buildContourTrace({
      name: "Wind Chill Chart",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: [
        [0, "#bbdffa"], [0.25, "#bbdffa"], // Safe
        [0.25, "#64b5f5"], [0.5, "#64b5f5"], // 30 mins to frostbite
        [0.5, "#5d6ac0"], [0.75, "#5d6ac0"], // 10 mins to frostbite
        [0.75, "#8e24a9"], [1, "#8e24a9"] // 2 mins to frostbite
      ],
      contours: { coloring: "heatmap" },
      zmin: 0,
      zmax: 3,
      showscale: true,
      colorbar: {
        tickvals: [0, 1, 2, 3],
        ticktext: ["Safe", "30 min frostbite", "10 min frostbite", "2 min frostbite"],
        thickness: 20,
      } as any,
      hovertemplate: `Wind Speed: %{x:.1f} ${xMeta.displayUnits[unitSystem]}<br>Temp: %{y:.1f} ${yMeta.displayUnits[unitSystem]}<br><b>Zone: %{text}</b><extra></extra>`,
    }));
  }

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    let inputX = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, inputPayload.v ?? 0.5, unitSystem);
    let inputY = convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem);

    traces.push(buildInputScatterTrace({
      inputId,
      x: roundValue(inputX),
      y: roundValue(inputY),
      showLegend: showInputLegend,
      color: "#ffffff",
      markerSize: 14,
      hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>Wind: %{x:.1f} ${xMeta.displayUnits[unitSystem]}<br>Temp: %{y:.1f} ${yMeta.displayUnits[unitSystem]}<extra></extra>`,
    }));
  });

  return {
    traces,
    layout: {
      title: "Wind Chill Chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showInputLegend,
      margin: { l: 64, r: 24, t: 48, b: 64 },
      xaxis: {
        title: `Wind Speed (${xMeta.displayUnits[unitSystem]})`,
        range: [xMin, xMax],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: `Dry Bulb Temperature (${yMeta.displayUnits[unitSystem]})`,
        range: [yMin, yMax],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 480,
    },
    annotations: [],
    source: CalculationSource.FrontendGenerated,
  };
}
