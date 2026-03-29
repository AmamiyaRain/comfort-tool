import type { CompareCaseId as CompareCaseIdType } from "../../../models/compareCases";
import type { ComfortModel as ComfortModelType } from "../../../models/comfortModels";
import type { PlotlyChartResponseDto } from "../../../models/dto";
import type { FieldKey as FieldKeyType } from "../../../models/fieldKeys";
import type { ChartId as ChartIdType } from "../../../models/chartOptions";
import type { ModelOptionKey as ModelOptionKeyType } from "../../../models/modelOptions";
import type {
  AdvancedOptionMenu,
  ComfortToolStateSlice,
  FieldPresentation,
  ResultSection,
} from "../types";

export type ModelCalculationOutputs<ResultType> = {
  resultsByCase: Record<CompareCaseIdType, ResultType | null>;
  chartResults: Partial<Record<ChartIdType, PlotlyChartResponseDto | null>>;
};

export interface ComfortModelConfig<ResultType> {
  id: ComfortModelType;
  fieldOrder: FieldKeyType[];
  defaultChartId: ChartIdType;
  defaultOptions: Partial<Record<ModelOptionKeyType, string>>;
  syncDerivedState: (state: ComfortToolStateSlice) => void;
  setOption: (state: ComfortToolStateSlice, optionKey: ModelOptionKeyType, nextValue: string) => boolean;
  updateInput: (
    state: ComfortToolStateSlice,
    caseId: CompareCaseIdType,
    fieldKey: FieldKeyType,
    rawValue: string,
  ) => void;
  calculate: (
    state: ComfortToolStateSlice,
    visibleCaseIds: CompareCaseIdType[],
  ) => ModelCalculationOutputs<ResultType>;
  getFieldPresentation: (state: ComfortToolStateSlice, fieldKey: FieldKeyType) => FieldPresentation;
  getDisplayValue: (
    state: ComfortToolStateSlice,
    caseId: CompareCaseIdType,
    fieldKey: FieldKeyType,
  ) => string;
  getAdvancedOptionMenu: (state: ComfortToolStateSlice, fieldKey: FieldKeyType) => AdvancedOptionMenu;
  getResultSections: (
    state: ComfortToolStateSlice,
    visibleCaseIds: CompareCaseIdType[],
  ) => ResultSection[];
}
