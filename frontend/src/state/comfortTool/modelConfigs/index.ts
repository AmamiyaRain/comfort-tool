/**
 * Registered comfort-model adapters.
 * Each model config owns field order, option handling, SI derived-state sync, calculations, chart assembly, and
 * UI presentation for that model.
 */
import type { InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel, type ComfortModel as ComfortModelType } from "../../../models/comfortModels";
import type { PlotlyChartResponseDto } from "../../../models/dto";
import type { FieldKey as FieldKeyType } from "../../../models/fieldKeys";
import type { ChartId as ChartIdType } from "../../../models/chartOptions";
import type { ModelOptionId as ModelOptionIdType } from "../../../models/inputModes";
import type {
  AdvancedOptionMenu,
  ComfortToolStateSlice,
  FieldPresentation,
  ResultSection,
} from "../types";
import { pmvModelConfig } from "./pmv";
import { utciModelConfig } from "./utci";

export type ModelCalculationOutputs<ResultType> = {
  resultsByInput: Record<InputIdType, ResultType | null>;
  chartResults: Partial<Record<ChartIdType, PlotlyChartResponseDto | null>>;
};

export interface ComfortModelConfig<ResultType> {
  id: ComfortModelType;
  chartIds: ChartIdType[];
  defaultChartId: ChartIdType;
  defaultOptions: Partial<Record<ModelOptionIdType, string>>;
  normalizeOptions: (value: unknown) => Partial<Record<ModelOptionIdType, string>> | null;
  getChartOptions: () => Array<{ name: string; value: ChartIdType }>;
  fieldOrder: FieldKeyType[];
  syncDerivedState: (state: ComfortToolStateSlice) => void;
  setOption: (state: ComfortToolStateSlice, optionKey: ModelOptionIdType, nextValue: string) => boolean;
  updateInput: (
    state: ComfortToolStateSlice,
    inputId: InputIdType,
    fieldKey: FieldKeyType,
    rawValue: string,
  ) => void;
  calculate: (
    state: ComfortToolStateSlice,
    visibleInputIds: InputIdType[],
  ) => ModelCalculationOutputs<ResultType>;
  getFieldPresentation: (state: ComfortToolStateSlice, fieldKey: FieldKeyType) => FieldPresentation;
  getDisplayValue: (
    state: ComfortToolStateSlice,
    inputId: InputIdType,
    fieldKey: FieldKeyType,
  ) => string;
  getAdvancedOptionMenu: (state: ComfortToolStateSlice, fieldKey: FieldKeyType) => AdvancedOptionMenu;
  getResultSections: (
    state: ComfortToolStateSlice,
    visibleInputIds: InputIdType[],
  ) => ResultSection[];
}

export const comfortModelConfigs = {
  [ComfortModel.Pmv]: pmvModelConfig,
  [ComfortModel.Utci]: utciModelConfig,
} as const;

export function getComfortModelConfig(modelId: ComfortModelType) {
  return comfortModelConfigs[modelId];
}
