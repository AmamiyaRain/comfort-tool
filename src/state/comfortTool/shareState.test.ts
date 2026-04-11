import { describe, expect, it } from "vitest";

import { ComfortModel } from "../../models/comfortModels";
import { InputControlId } from "../../models/inputControls";
import { HumidityInputMode, OptionKey, TemperatureMode } from "../../models/inputModes";
import { UnitSystem } from "../../models/units";
import { createComfortToolState } from "./createComfortToolState.svelte";
import {
  applyShareSnapshotToState,
  createShareStateSnapshot,
  deserializeShareState,
  parseShareStateSnapshot,
  serializeShareState,
} from "./shareState";

describe("shareState", () => {
  it("round-trips the current share snapshot format", () => {
    const toolState = createComfortToolState();
    toolState.state.ui.selectedModel = ComfortModel.Utci;
    toolState.state.ui.unitSystem = UnitSystem.IP;
    toolState.state.ui.modelOptionsByModel[ComfortModel.Pmv][OptionKey.TemperatureMode] = TemperatureMode.Operative;

    const snapshot = createShareStateSnapshot(toolState.state);
    const encodedSnapshot = serializeShareState(snapshot);

    expect(deserializeShareState(encodedSnapshot)).toEqual(snapshot);
  });

  it("applies a snapshot through the centralized codec helpers", () => {
    const originalState = createComfortToolState();
    originalState.state.ui.selectedModel = ComfortModel.Utci;
    originalState.state.ui.compareEnabled = true;
    originalState.state.ui.compareInputIds = ["input1", "input3"];
    originalState.state.ui.unitSystem = UnitSystem.IP;

    const snapshot = createShareStateSnapshot(originalState.state);
    const restoredState = createComfortToolState();

    applyShareSnapshotToState(restoredState.state, snapshot);

    expect(createShareStateSnapshot(restoredState.state)).toEqual(snapshot);
  });

  it("rejects unsupported snapshot versions through the version-dispatch entrypoint", () => {
    expect(parseShareStateSnapshot({ version: 999 })).toBeNull();
  });

  it("recomputes derived control displays after applying a snapshot", () => {
    const originalState = createComfortToolState();
    originalState.actions.setModelOption(OptionKey.HumidityInputMode, HumidityInputMode.DewPoint);
    originalState.actions.updateInput(originalState.state.ui.activeInputId, InputControlId.Humidity, "10");

    const snapshot = createShareStateSnapshot(originalState.state);
    const restoredState = createComfortToolState();

    applyShareSnapshotToState(restoredState.state, snapshot);

    const humidityControl = restoredState.selectors.getInputControls()
      .find((control) => control.id === InputControlId.Humidity);

    expect(humidityControl?.numericValuesByInput.input1).toBeCloseTo(10, 6);
  });
});
