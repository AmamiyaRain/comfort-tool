import { describe, expect, it } from "vitest";

import { ChartId } from "../../models/chartOptions";
import { CompareCaseId } from "../../models/compareCases";
import { ComfortModel } from "../../models/comfortModels";
import { DerivedFieldKey } from "../../models/derivedFieldKeys";
import { FieldKey } from "../../models/fieldKeys";
import {
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
} from "../../models/inputModes";
import { ModelOptionKey } from "../../models/modelOptions";
import { createComfortToolState } from "./createComfortToolState.svelte";

describe("createComfortToolState", () => {
  it("retains the selected chart for each model", () => {
    const toolState = createComfortToolState();

    toolState.actions.setSelectedChart(ChartId.RelativeHumidity);
    toolState.actions.setSelectedModel(ComfortModel.Utci);
    toolState.actions.setSelectedChart(ChartId.AirTemperature);
    toolState.actions.setSelectedModel(ComfortModel.Pmv);

    expect(toolState.state.ui.selectedChartByModel[ComfortModel.Pmv]).toBe(ChartId.RelativeHumidity);
    expect(toolState.state.ui.selectedChartByModel[ComfortModel.Utci]).toBe(ChartId.AirTemperature);
    expect(toolState.selectors.getCurrentSelectedChart()).toBe(ChartId.RelativeHumidity);
  });

  it("preserves dew point when dry-bulb temperature changes in dew-point mode", () => {
    const toolState = createComfortToolState();
    const initialDewPoint = toolState.state.derivedByCase[CompareCaseId.A][DerivedFieldKey.DewPoint] ?? 0;

    toolState.actions.setModelOption(ModelOptionKey.PmvHumidityInputMode, PmvHumidityInputMode.DewPoint);
    toolState.actions.updateInput(CompareCaseId.A, FieldKey.DryBulbTemperature, "28");

    const updatedDewPoint = toolState.state.derivedByCase[CompareCaseId.A][DerivedFieldKey.DewPoint] ?? 0;
    expect(updatedDewPoint).toBeCloseTo(initialDewPoint, 2);
    expect(toolState.state.inputsByCase[CompareCaseId.A][FieldKey.RelativeHumidity]).not.toBe(50);
  });

  it("hides MRT when operative temperature mode is enabled", () => {
    const toolState = createComfortToolState();

    toolState.actions.setModelOption(ModelOptionKey.PmvTemperatureInputMode, PmvTemperatureInputMode.Operative);

    expect(toolState.selectors.getFieldPresentation(FieldKey.MeanRadiantTemperature).hidden).toBe(true);
    expect(toolState.selectors.getFieldPresentation(FieldKey.DryBulbTemperature).label).toBe("Operative temperature");
  });
});
