/**
 * Registered comfort-model definitions.
 * Definitions declare reusable input controls plus the calculation entrypoint for each model.
 */
import type { InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel, type ComfortModel as ComfortModelType } from "../../../models/comfortModels";
import type { PlotlyChartResponseDto } from "../../../models/dto";
import type { ChartId as ChartIdType } from "../../../models/chartOptions";
import type { OptionKey as OptionKeyType } from "../../../models/inputModes";
import type { InputControlDefinition } from "../../../services/comfort/controls/types";
import type { ComfortToolStateSlice, ModelOptionsState, ResultSection } from "../types";
import { pmvModelConfig } from "./pmv";
import { utciModelConfig } from "./utci";

export type ModelCalculationOutputs<ResultType> = {
  resultsByInput: Record<InputIdType, ResultType | null>;
  chartResults: Partial<Record<ChartIdType, PlotlyChartResponseDto | null>>;
  resultSections: ResultSection[];
};

export interface ComfortModelDefinition<ResultType> {
  id: ComfortModelType;
  controls: InputControlDefinition[];
  chartIds: ChartIdType[];
  defaultChartId: ChartIdType;
  defaultOptions: Partial<Record<OptionKeyType, string>>;
  normalizeOptions: (value: unknown) => ModelOptionsState | null;
  calculate: (
    state: ComfortToolStateSlice,
    visibleInputIds: InputIdType[],
  ) => ModelCalculationOutputs<ResultType>;
}

export const comfortModelConfigs = {
  [ComfortModel.Pmv]: pmvModelConfig,
  [ComfortModel.Utci]: utciModelConfig,
} as const;

export function getComfortModelConfig(modelId: ComfortModelType) {
  return comfortModelConfigs[modelId];
}
