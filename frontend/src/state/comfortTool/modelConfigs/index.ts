import { ComfortModel, type ComfortModel as ComfortModelType } from "../../../models/comfortModels";
import { pmvModelConfig } from "./pmv";
import { utciModelConfig } from "./utci";

export const comfortModelConfigs = {
  [ComfortModel.Pmv]: pmvModelConfig,
  [ComfortModel.Utci]: utciModelConfig,
} as const;

export function getComfortModelConfig(modelId: ComfortModelType) {
  return comfortModelConfigs[modelId];
}
