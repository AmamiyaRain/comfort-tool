import { ComfortModel, type ComfortModel as ComfortModelType } from "./comfortModels";
import { FieldKey, type FieldKey as FieldKeyType } from "./fieldKeys";

export interface FieldMeta {
  key: FieldKeyType;
  label: string;
  units: {
    SI: string;
    IP: string;
  };
  step: number;
  decimals: number;
  defaultValue: number;
}

export const fieldMetaByKey: Record<FieldKeyType, FieldMeta> = {
  [FieldKey.DryBulbTemperature]: {
    key: FieldKey.DryBulbTemperature,
    label: "Air temperature",
    units: { SI: "degC", IP: "degF" },
    step: 0.1,
    decimals: 1,
    defaultValue: 25,
  },
  [FieldKey.MeanRadiantTemperature]: {
    key: FieldKey.MeanRadiantTemperature,
    label: "Radiant temperature",
    units: { SI: "degC", IP: "degF" },
    step: 0.1,
    decimals: 1,
    defaultValue: 25,
  },
  [FieldKey.RelativeAirSpeed]: {
    key: FieldKey.RelativeAirSpeed,
    label: "Air speed",
    units: { SI: "m/s", IP: "ft/s" },
    step: 0.01,
    decimals: 2,
    defaultValue: 0.1,
  },
  [FieldKey.WindSpeed]: {
    key: FieldKey.WindSpeed,
    label: "Wind speed",
    units: { SI: "m/s", IP: "ft/s" },
    step: 0.1,
    decimals: 1,
    defaultValue: 1,
  },
  [FieldKey.RelativeHumidity]: {
    key: FieldKey.RelativeHumidity,
    label: "Relative humidity",
    units: { SI: "%", IP: "%" },
    step: 1,
    decimals: 0,
    defaultValue: 50,
  },
  [FieldKey.MetabolicRate]: {
    key: FieldKey.MetabolicRate,
    label: "Metabolic rate",
    units: { SI: "met", IP: "met" },
    step: 0.1,
    decimals: 1,
    defaultValue: 1.2,
  },
  [FieldKey.ClothingInsulation]: {
    key: FieldKey.ClothingInsulation,
    label: "Clothing insulation",
    units: { SI: "clo", IP: "clo" },
    step: 0.1,
    decimals: 1,
    defaultValue: 0.5,
  },
  [FieldKey.ExternalWork]: {
    key: FieldKey.ExternalWork,
    label: "External work",
    units: { SI: "met", IP: "met" },
    step: 0.1,
    decimals: 1,
    defaultValue: 0,
  },
};

export const fieldOrderByModel: Record<ComfortModelType, FieldKeyType[]> = {
  [ComfortModel.Pmv]: [
    FieldKey.DryBulbTemperature,
    FieldKey.MeanRadiantTemperature,
    FieldKey.RelativeAirSpeed,
    FieldKey.RelativeHumidity,
    FieldKey.MetabolicRate,
    FieldKey.ClothingInsulation,
    FieldKey.ExternalWork,
  ],
  [ComfortModel.Utci]: [
    FieldKey.DryBulbTemperature,
    FieldKey.MeanRadiantTemperature,
    FieldKey.WindSpeed,
    FieldKey.RelativeHumidity,
  ],
};

export const allFieldOrder: FieldKeyType[] = [
  FieldKey.DryBulbTemperature,
  FieldKey.MeanRadiantTemperature,
  FieldKey.RelativeAirSpeed,
  FieldKey.WindSpeed,
  FieldKey.RelativeHumidity,
  FieldKey.MetabolicRate,
  FieldKey.ClothingInsulation,
  FieldKey.ExternalWork,
];
