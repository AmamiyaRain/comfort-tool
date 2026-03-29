import { describe, expect, it } from "vitest";

import { ChartId } from "../../models/chartOptions";
import { InputId } from "../../models/inputSlots";
import { ComfortModel } from "../../models/comfortModels";
import { DerivedFieldKey, FieldKey } from "../../models/fieldKeys";
import {
  HumidityInputMode,
  ModelOptionId,
  TemperatureInputMode,
} from "../../models/inputModes";
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
    expect(toolState.actions.exportShareSnapshot()).toMatchObject({
      version: 5,
      models: {
        [ComfortModel.Pmv]: {
          selectedChart: ChartId.RelativeHumidity,
        },
        [ComfortModel.Utci]: {
          selectedChart: ChartId.AirTemperature,
        },
      },
    });
  });

  it("preserves dew point when dry-bulb temperature changes in dew-point mode", () => {
    const toolState = createComfortToolState();
    const initialDewPoint = toolState.state.derivedByInput[InputId.Input1][DerivedFieldKey.DewPoint] ?? 0;

    toolState.actions.setModelOption(ModelOptionId.HumidityInputMode, HumidityInputMode.DewPoint);
    toolState.actions.updateInput(InputId.Input1, FieldKey.DryBulbTemperature, "28");

    const updatedDewPoint = toolState.state.derivedByInput[InputId.Input1][DerivedFieldKey.DewPoint] ?? 0;
    expect(updatedDewPoint).toBeCloseTo(initialDewPoint, 2);
    expect(toolState.state.inputsByInput[InputId.Input1][FieldKey.RelativeHumidity]).not.toBe(50);
  });

  it("hides MRT when operative temperature mode is enabled", () => {
    const toolState = createComfortToolState();

    toolState.actions.setModelOption(ModelOptionId.TemperatureInputMode, TemperatureInputMode.Operative);

    expect(toolState.selectors.getFieldPresentation(FieldKey.MeanRadiantTemperature).hidden).toBe(true);
    expect(toolState.selectors.getFieldPresentation(FieldKey.DryBulbTemperature).label).toBe("Operative temperature");
  });
});
