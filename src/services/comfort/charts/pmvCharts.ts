import {
  inputChartStyleById,
  inputDisplayMetaById,
} from "../../../models/inputSlotPresentation";
import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/fieldMeta";
import { CalculationSource } from "../../../models/calculationMetadata";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import type {
  PlotlyChartResponseDto,
  PlotTraceDto,
  PmvChartInputsRequestDto,
} from "../../../models/dto";
import {
  convertFieldValueFromSi,
  convertHumidityRatioFromSi,
  getHumidityRatioDisplayMeta,
} from "../../units";
import { calculateComfortZone } from "../comfortZone";
import {
  ensureFiniteValue,
  getCompareInputs,
  roundValue,
  type ComfortZonesByInput,
} from "../helpers";
import { derivePsychrometricStateFromRelativeHumidity } from "../inputDerivations";

function getComfortZoneForInput(inputId, payload, comfortZonesByInput: ComfortZonesByInput) {
  return comfortZonesByInput[inputId] ?? calculateComfortZone(payload);
}

function getHumidityRatioSi(
  temperature: number,
  relativeHumidity: number,
): number {
  return ensureFiniteValue(
    "Humidity ratio",
    derivePsychrometricStateFromRelativeHumidity(temperature, relativeHumidity).humidityRatio,
  );
}

function getHumidityRatioDisplayValue(
  temperature: number,
  relativeHumidity: number,
  unitSystem: UnitSystemType,
): number {
  return convertHumidityRatioFromSi(getHumidityRatioSi(temperature, relativeHumidity), unitSystem);
}

export function buildComparePsychrometricChart(
  payload: PmvChartInputsRequestDto,
  comfortZonesByInput: ComfortZonesByInput = {},
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const { chartRange } = payload;
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  const humidityRatioMeta = getHumidityRatioDisplayMeta(unitSystem);
  const temperatures = Array.from({ length: chartRange.tdbPoints }, (_, index) => (
    chartRange.tdbMin + ((chartRange.tdbMax - chartRange.tdbMin) * index) / (chartRange.tdbPoints - 1)
  ));

  const traces: PlotTraceDto[] = [];

  payload.rhCurves.forEach((relativeHumidity) => {
    const xValues: number[] = [];
    const yValues: number[] = [];

    temperatures.forEach((temperature) => {
      const humidityRatioSi = getHumidityRatioSi(temperature, relativeHumidity);
      const humidityRatio = convertHumidityRatioFromSi(humidityRatioSi, unitSystem);

      if (humidityRatioSi >= chartRange.humidityRatioMin && humidityRatioSi <= chartRange.humidityRatioMax) {
        xValues.push(roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, temperature, unitSystem)));
        yValues.push(roundValue(humidityRatio));
      }
    });

    if (xValues.length === 0) {
      return;
    }

    traces.push({
      type: "scatter",
      mode: "lines",
      name: `RH ${relativeHumidity}%`,
      x: xValues,
      y: yValues,
      showlegend: false,
      line: { color: "#94a3b8", width: 1.2 },
      marker: {},
      hovertemplate:
        `Tdb %{x:.1f} ${temperatureDisplayUnits}<br>` +
        `Humidity ratio %{y:.${humidityRatioMeta.decimals}f} ${humidityRatioMeta.displayUnits}<extra></extra>`,
    });
  });

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const comfortZone = getComfortZoneForInput(inputId, inputPayload, comfortZonesByInput);
    const polygon = [...comfortZone.coolEdge, ...[...comfortZone.warmEdge].reverse()];
    const inputStyle = inputChartStyleById[inputId];
    const inputLabel = inputDisplayMetaById[inputId].label;

    if (polygon.length > 0) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `${inputLabel} comfort zone`,
        x: polygon.map((point) => roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, point.tdb, unitSystem))),
        y: polygon.map((point) => roundValue(getHumidityRatioDisplayValue(point.tdb, point.rh, unitSystem))),
        showlegend: false,
        fill: "toself",
        fillcolor: inputStyle.fill,
        line: { color: inputStyle.line, width: 1.5 },
        marker: {},
        hovertemplate:
          `Tdb %{x:.1f} ${temperatureDisplayUnits}<br>` +
          `Humidity ratio %{y:.${humidityRatioMeta.decimals}f} ${humidityRatioMeta.displayUnits}<extra></extra>`,
      });
    }

    traces.push({
      type: "scatter",
      mode: "markers",
      name: inputLabel,
      x: [roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem))],
      y: [roundValue(getHumidityRatioDisplayValue(inputPayload.tdb, inputPayload.rh, unitSystem))],
      showlegend: showInputLegend,
      line: {},
      marker: { color: inputStyle.marker, size: 12 },
      hovertemplate:
        `${inputLabel}<br>Tdb %{x:.1f} ${temperatureDisplayUnits}<br>` +
        `Humidity ratio %{y:.${humidityRatioMeta.decimals}f} ${humidityRatioMeta.displayUnits}<extra></extra>`,
    });
  });

  return {
    traces,
    layout: {
      title: "Psychrometric chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showInputLegend,
      margin: { l: 56, r: 24, t: 48, b: 56 },
      xaxis: {
        title: `Dry bulb temperature (${temperatureDisplayUnits})`,
        range: [
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, chartRange.tdbMin, unitSystem),
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, chartRange.tdbMax, unitSystem),
        ],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: `Humidity ratio (${humidityRatioMeta.displayUnits})`,
        range: [
          convertHumidityRatioFromSi(chartRange.humidityRatioMin, unitSystem),
          convertHumidityRatioFromSi(chartRange.humidityRatioMax, unitSystem),
        ],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 440,
    },
    annotations: [],
    source: CalculationSource.FrontendGenerated,
  };
}
