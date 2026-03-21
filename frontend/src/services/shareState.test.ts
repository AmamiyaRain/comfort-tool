import { describe, expect, it } from "vitest";

import { CompareCaseId } from "../models/compareCases";
import { PmvChartId, UtciChartId } from "../models/chartOptions";
import { ComfortModel } from "../models/comfortModels";
import { FieldKey } from "../models/fieldKeys";
import {
  PmvAirSpeedControlMode,
  PmvAirSpeedInputMode,
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
} from "../models/inputModes";
import { UnitSystem } from "../models/units";
import { buildShareUrl, deserializeShareState, readShareStateFromUrl, serializeShareState } from "./shareState";

const snapshot = {
  version: 1 as const,
  selectedModel: ComfortModel.Utci,
  selectedPmvChart: PmvChartId.RelativeHumidity,
  selectedUtciChart: UtciChartId.AirTemperature,
  pmvTemperatureInputMode: PmvTemperatureInputMode.Operative,
  pmvAirSpeedControlMode: PmvAirSpeedControlMode.NoLocalControl,
  pmvAirSpeedInputMode: PmvAirSpeedInputMode.Measured,
  pmvHumidityInputMode: PmvHumidityInputMode.DewPoint,
  compareEnabled: true,
  compareCaseIds: [CompareCaseId.A, CompareCaseId.B],
  activeCaseId: CompareCaseId.B,
  unitSystem: UnitSystem.IP,
  inputsByCase: {
    [CompareCaseId.A]: {
      [FieldKey.DryBulbTemperature]: 25,
      [FieldKey.MeanRadiantTemperature]: 26,
      [FieldKey.RelativeAirSpeed]: 0.1,
      [FieldKey.WindSpeed]: 1.2,
      [FieldKey.RelativeHumidity]: 50,
      [FieldKey.MetabolicRate]: 1.1,
      [FieldKey.ClothingInsulation]: 0.5,
      [FieldKey.ExternalWork]: 0,
    },
    [CompareCaseId.B]: {
      [FieldKey.DryBulbTemperature]: 30,
      [FieldKey.MeanRadiantTemperature]: 32,
      [FieldKey.RelativeAirSpeed]: 0.1,
      [FieldKey.WindSpeed]: 0.9,
      [FieldKey.RelativeHumidity]: 60,
      [FieldKey.MetabolicRate]: 1.2,
      [FieldKey.ClothingInsulation]: 0.6,
      [FieldKey.ExternalWork]: 0,
    },
    [CompareCaseId.C]: {
      [FieldKey.DryBulbTemperature]: 22,
      [FieldKey.MeanRadiantTemperature]: 22,
      [FieldKey.RelativeAirSpeed]: 0.1,
      [FieldKey.WindSpeed]: 0.3,
      [FieldKey.RelativeHumidity]: 45,
      [FieldKey.MetabolicRate]: 1,
      [FieldKey.ClothingInsulation]: 0.7,
      [FieldKey.ExternalWork]: 0,
    },
  },
  measuredAirSpeedByCase: {
    [CompareCaseId.A]: 0.1,
    [CompareCaseId.B]: 0.2,
    [CompareCaseId.C]: 0.3,
  },
  dewPointByCase: {
    [CompareCaseId.A]: 12,
    [CompareCaseId.B]: 18,
    [CompareCaseId.C]: 10,
  },
};

describe("shareState", () => {
  it("serializes and deserializes a snapshot", () => {
    const encoded = serializeShareState(snapshot);
    expect(deserializeShareState(encoded)).toEqual(snapshot);
  });

  it("builds and reads a share url", () => {
    const shareUrl = buildShareUrl(snapshot, "https://example.com/tool");
    const restoredSnapshot = readShareStateFromUrl(shareUrl);

    expect(shareUrl).toContain("state=");
    expect(restoredSnapshot).toEqual(snapshot);
  });

  it("rejects invalid state payloads", () => {
    expect(deserializeShareState("invalid-state")).toBeNull();
  });
});
