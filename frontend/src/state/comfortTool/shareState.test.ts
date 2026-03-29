import { describe, expect, it } from "vitest";

import { ChartId } from "../../models/chartOptions";
import { InputId } from "../../models/inputSlots";
import { ComfortModel } from "../../models/comfortModels";
import { FieldKey } from "../../models/fieldKeys";
import {
  AirSpeedControlMode,
  AirSpeedInputMode,
  HumidityInputMode,
  ModelOptionId,
  TemperatureInputMode,
} from "../../models/inputModes";
import { UnitSystem } from "../../models/units";
import {
  buildShareUrl,
  deserializeShareState,
  readShareStateFromUrl,
  serializeShareState,
  type ShareStateSnapshot,
} from "./shareState";

const snapshot: ShareStateSnapshot = {
  version: 5,
  selectedModel: ComfortModel.Pmv,
  models: {
    [ComfortModel.Pmv]: {
      selectedChart: ChartId.RelativeHumidity,
      options: {
        [ModelOptionId.TemperatureInputMode]: TemperatureInputMode.Operative,
        [ModelOptionId.AirSpeedControlMode]: AirSpeedControlMode.NoLocalControl,
        [ModelOptionId.AirSpeedInputMode]: AirSpeedInputMode.Measured,
        [ModelOptionId.HumidityInputMode]: HumidityInputMode.DewPoint,
      },
    },
    [ComfortModel.Utci]: {
      selectedChart: ChartId.AirTemperature,
      options: {},
    },
  },
  compareEnabled: true,
  compareInputIds: [InputId.Input1, InputId.Input3],
  activeInputId: InputId.Input3,
  unitSystem: UnitSystem.IP,
  inputsByInput: {
    [InputId.Input1]: {
      [FieldKey.DryBulbTemperature]: 25,
      [FieldKey.MeanRadiantTemperature]: 25,
      [FieldKey.RelativeAirSpeed]: 0.2,
      [FieldKey.WindSpeed]: 1.1,
      [FieldKey.RelativeHumidity]: 45,
      [FieldKey.MetabolicRate]: 1.1,
      [FieldKey.ClothingInsulation]: 0.6,
      [FieldKey.ExternalWork]: 0,
    },
    [InputId.Input2]: {
      [FieldKey.DryBulbTemperature]: 24,
      [FieldKey.MeanRadiantTemperature]: 24,
      [FieldKey.RelativeAirSpeed]: 0.2,
      [FieldKey.WindSpeed]: 1.1,
      [FieldKey.RelativeHumidity]: 46,
      [FieldKey.MetabolicRate]: 1.1,
      [FieldKey.ClothingInsulation]: 0.6,
      [FieldKey.ExternalWork]: 0,
    },
    [InputId.Input3]: {
      [FieldKey.DryBulbTemperature]: 23,
      [FieldKey.MeanRadiantTemperature]: 23,
      [FieldKey.RelativeAirSpeed]: 0.2,
      [FieldKey.WindSpeed]: 1.1,
      [FieldKey.RelativeHumidity]: 47,
      [FieldKey.MetabolicRate]: 1.1,
      [FieldKey.ClothingInsulation]: 0.6,
      [FieldKey.ExternalWork]: 0,
    },
  },
};

describe("comfortTool shareState", () => {
  it("round-trips version 5 snapshots", () => {
    const serialized = serializeShareState(snapshot);
    expect(deserializeShareState(serialized)).toEqual(snapshot);
  });

  it("reads snapshots from generated share urls", () => {
    const shareUrl = buildShareUrl(snapshot, "https://example.com/tool");
    expect(readShareStateFromUrl(shareUrl)).toEqual(snapshot);
  });

  it("rejects legacy snapshot versions", () => {
    const legacyEncoded = Buffer.from(JSON.stringify({ version: 2 }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    expect(deserializeShareState(legacyEncoded)).toBeNull();
  });

  it("rejects charts that are not registered for the model", () => {
    const invalidSnapshot = {
      ...snapshot,
      models: {
        ...snapshot.models,
        [ComfortModel.Utci]: {
          selectedChart: ChartId.Psychrometric,
          options: {},
        },
      },
    };

    expect(deserializeShareState(serializeShareState(invalidSnapshot as ShareStateSnapshot))).toBeNull();
  });
});
