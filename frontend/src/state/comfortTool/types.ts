import type { CompareCaseId as CompareCaseIdType } from "../../models/compareCases";
import type { ComfortModel as ComfortModelType } from "../../models/comfortModels";
import type { DerivedFieldKey as DerivedFieldKeyType } from "../../models/derivedFieldKeys";
import type { PlotlyChartResponseDto, PmvResponseDto, UtciResponseDto } from "../../models/dto";
import type { FieldKey as FieldKeyType } from "../../models/fieldKeys";
import type { ChartId as ChartIdType } from "../../models/chartOptions";
import type { ModelOptionKey as ModelOptionKeyType } from "../../models/modelOptions";
import type { UnitSystem as UnitSystemType } from "../../models/units";
import type { ShareStateSnapshot } from "../../services/shareState";

export type CaseInputsState = Record<FieldKeyType, number>;
export type InputsByCaseState = Record<CompareCaseIdType, CaseInputsState>;
export type DerivedCaseState = Partial<Record<DerivedFieldKeyType, number>>;
export type DerivedByCaseState = Record<CompareCaseIdType, DerivedCaseState>;
export type ModelOptionsState = Partial<Record<ModelOptionKeyType, string>>;
export type ModelOptionsByModelState = Record<ComfortModelType, ModelOptionsState>;
export type SelectedChartByModelState = Record<ComfortModelType, ChartIdType>;

export type ResultsByModelState = {
  PMV: Record<CompareCaseIdType, PmvResponseDto | null>;
  UTCI: Record<CompareCaseIdType, UtciResponseDto | null>;
};

export type ChartResultsByModelState = Record<
  ComfortModelType,
  Partial<Record<ChartIdType, PlotlyChartResponseDto | null>>
>;

export type UiState = {
  selectedModel: ComfortModelType;
  selectedChartByModel: SelectedChartByModelState;
  modelOptionsByModel: ModelOptionsByModelState;
  compareEnabled: boolean;
  compareCaseIds: CompareCaseIdType[];
  activeCaseId: CompareCaseIdType;
  unitSystem: UnitSystemType;
  isLoading: boolean;
  errorMessage: string;
  calculationCount: number;
  lastCompletedAt: number;
  resultRevision: number;
  resultsByModel: ResultsByModelState;
  chartResultsByModel: ChartResultsByModelState;
};

export type ComfortToolStateSlice = {
  inputsByCase: InputsByCaseState;
  derivedByCase: DerivedByCaseState;
  ui: UiState;
};

export type PresetInputOption = {
  id: string;
  label: string;
  value: number;
};

export type FieldPresentation = {
  label: string;
  displayUnits: string;
  step: number;
  decimals: number;
  rangeText: string;
  hidden: boolean;
  showClothingBuilder: boolean;
  showPresetInput: boolean;
  presetOptions: PresetInputOption[];
  presetDecimals: number;
};

export type AdvancedOptionItem = {
  label: string;
  description: string;
  optionKey: ModelOptionKeyType;
  value: string;
  active: boolean;
};

export type AdvancedOptionMenu = {
  title: string;
  items: AdvancedOptionItem[];
} | null;

export type ResultCellPresentation = {
  text: string;
  toneClass?: string;
};

export type ResultSection = {
  title: string;
  valuesByCase: Partial<Record<CompareCaseIdType, ResultCellPresentation | null>>;
};

export type ComfortToolActions = {
  setSelectedModel: (nextModel: ComfortModelType) => void;
  setSelectedChart: (nextChart: ChartIdType) => void;
  setModelOption: (optionKey: ModelOptionKeyType, nextValue: string) => void;
  setCompareEnabled: (enabled: boolean) => void;
  setActiveCaseId: (nextCaseId: CompareCaseIdType) => void;
  toggleCompareCaseVisibility: (caseId: CompareCaseIdType) => void;
  setUnitSystem: (nextUnitSystem: UnitSystemType) => void;
  toggleUnitSystem: () => void;
  exportShareSnapshot: () => ShareStateSnapshot;
  applyShareSnapshot: (snapshot: ShareStateSnapshot) => void;
  updateInput: (caseId: CompareCaseIdType, fieldKey: FieldKeyType, rawValue: string) => void;
  scheduleCalculation: (options?: { immediate?: boolean }) => void;
};

export type ComfortToolSelectors = {
  getVisibleCaseIds: () => CompareCaseIdType[];
  getFieldOrder: () => FieldKeyType[];
  getFieldPresentation: (fieldKey: FieldKeyType) => FieldPresentation;
  getFieldDisplayValue: (caseId: CompareCaseIdType, fieldKey: FieldKeyType) => string;
  getAdvancedOptionMenu: (fieldKey: FieldKeyType) => AdvancedOptionMenu;
  getResultSections: () => ResultSection[];
  getCurrentChartResult: () => PlotlyChartResponseDto | null;
  getCurrentChartEmptyMessage: () => string;
  getCurrentChartOptions: () => Array<{ name: string; value: string }>;
  getCurrentSelectedChart: () => string;
  getCurrentChartHeightClass: () => string;
};

export type ComfortToolController = {
  state: ComfortToolStateSlice;
  actions: ComfortToolActions;
  selectors: ComfortToolSelectors;
};
