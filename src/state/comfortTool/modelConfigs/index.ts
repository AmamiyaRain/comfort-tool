/**
 * Registered comfort-model definitions.
 * Definitions declare reusable input controls plus the calculation entrypoint for each model.
 */
import type { InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel, type ComfortModel as ComfortModelType } from "../../../models/comfortModels";
import type { PlotlyChartResponseDto } from "../../../models/comfortDtos";
import type { ChartId as ChartIdType } from "../../../models/chartOptions";
import type { OptionKey as OptionKeyType } from "../../../models/inputModes";
import type {
  BehaviorPatch,
  ControlBehaviorContext,
  InputControlDefinition,
} from "../../../services/comfort/controls/types";
import type { UnitSystem as UnitSystemType } from "../../../models/units";
import type { ComfortToolStateSlice, ModelOptionsState, ResultSectionViewModel } from "../types";
import { pmvModelConfig } from "./pmv";
import { utciModelConfig } from "./utci";
import { adaptiveAshraeModelConfig, adaptiveEnModelConfig } from "./adaptive";

export type ModelCalculationOutputs<ResultType, ChartSourceType> = {
  resultsByInput: Record<InputIdType, ResultType | null>;
  chartSource: ChartSourceType;
};

export type ModelOptionChangeHandler = (
  context: ControlBehaviorContext,
  nextValue: string,
) => BehaviorPatch | null;

export interface ComfortModelDefinition<ResultType, ChartSourceType> {
  id: ComfortModelType;
  controls: InputControlDefinition[];
  optionHandlersByKey: Partial<Record<OptionKeyType, ModelOptionChangeHandler>>;
  chartIds: ChartIdType[];
  defaultChartId: ChartIdType;
  defaultOptions: Partial<Record<OptionKeyType, string>>;
  normalizeOptions: (value: unknown) => ModelOptionsState | null;
  calculate: (
    state: ComfortToolStateSlice,
    visibleInputIds: InputIdType[],
  ) => ModelCalculationOutputs<ResultType, ChartSourceType>;
  buildResultSections: (
    resultsByInput: Record<InputIdType, ResultType | null>,
    visibleInputIds: InputIdType[],
    unitSystem: UnitSystemType,
  ) => ResultSectionViewModel[];
  buildChartResult: (
    chartId: ChartIdType,
    chartSource: ChartSourceType | null,
    resultsByInput: Record<InputIdType, ResultType | null>,
    unitSystem: UnitSystemType,
  ) => PlotlyChartResponseDto | null;
}

export const comfortModelConfigs = {
  [ComfortModel.Pmv]: pmvModelConfig,
  [ComfortModel.Utci]: utciModelConfig,
  [ComfortModel.AdaptiveAshrae]: adaptiveAshraeModelConfig,
  [ComfortModel.AdaptiveEn]: adaptiveEnModelConfig,
} as const;

export function getComfortModelConfig(modelId: ComfortModelType) {
  return comfortModelConfigs[modelId];
}
