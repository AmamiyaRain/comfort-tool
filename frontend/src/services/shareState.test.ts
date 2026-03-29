import { describe, expect, it } from "vitest";

import { ChartId } from "../models/chartOptions";
import { CompareCaseId } from "../models/compareCases";
import { ComfortModel } from "../models/comfortModels";
import { FieldKey } from "../models/fieldKeys";
import {
  PmvAirSpeedControlMode,
  PmvAirSpeedInputMode,
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
} from "../models/inputModes";
import { ModelOptionKey } from "../models/modelOptions";
import { UnitSystem } from "../models/units";
import {
  buildShareUrl,
  deserializeShareState,
  readShareStateFromUrl,
  serializeShareState,
  type ShareStateSnapshot,
} from "./shareState";

const snapshot: ShareStateSnapshot = {
  version: 2,
  selectedModel: ComfortModel.Pmv,
  selectedChartByModel: {
    [ComfortModel.Pmv]: ChartId.RelativeHumidity,
    [ComfortModel.Utci]: ChartId.AirTemperature,
  },
  modelOptionsByModel: {
    [ComfortModel.Pmv]: {
      [ModelOptionKey.PmvTemperatureInputMode]: PmvTemperatureInputMode.Operative,
      [ModelOptionKey.PmvAirSpeedControlMode]: PmvAirSpeedControlMode.NoLocalControl,
      [ModelOptionKey.PmvAirSpeedInputMode]: PmvAirSpeedInputMode.Measured,
      [ModelOptionKey.PmvHumidityInputMode]: PmvHumidityInputMode.DewPoint,
    },
    [ComfortModel.Utci]: {},
  },
  compareEnabled: true,
  compareCaseIds: [CompareCaseId.A, CompareCaseId.C],
  activeCaseId: CompareCaseId.C,
  unitSystem: UnitSystem.IP,
  inputsByCase: {
    [CompareCaseId.A]: {
      [FieldKey.DryBulbTemperature]: 25,
      [FieldKey.MeanRadiantTemperature]: 25,
      [FieldKey.RelativeAirSpeed]: 0.2,
      [FieldKey.WindSpeed]: 1.1,
      [FieldKey.RelativeHumidity]: 45,
      [FieldKey.MetabolicRate]: 1.1,
      [FieldKey.ClothingInsulation]: 0.6,
      [FieldKey.ExternalWork]: 0,
    },
    [CompareCaseId.B]: {
      [FieldKey.DryBulbTemperature]: 24,
      [FieldKey.MeanRadiantTemperature]: 24,
      [FieldKey.RelativeAirSpeed]: 0.2,
      [FieldKey.WindSpeed]: 1.1,
      [FieldKey.RelativeHumidity]: 46,
      [FieldKey.MetabolicRate]: 1.1,
      [FieldKey.ClothingInsulation]: 0.6,
      [FieldKey.ExternalWork]: 0,
    },
    [CompareCaseId.C]: {
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

describe("shareState", () => {
  it("round-trips version 2 snapshots", () => {
    const serialized = serializeShareState(snapshot);
    expect(deserializeShareState(serialized)).toEqual(snapshot);
  });

  it("reads snapshots from generated share urls", () => {
    const shareUrl = buildShareUrl(snapshot, "https://example.com/tool");
    expect(readShareStateFromUrl(shareUrl)).toEqual(snapshot);
  });

  it("rejects legacy snapshot versions", () => {
    const legacyEncoded = Buffer.from(JSON.stringify({ version: 1 }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    expect(deserializeShareState(legacyEncoded)).toBeNull();
  });
});
