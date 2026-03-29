/**
 * Canonical comfort-tool state types.
 * `inputsByInput` and `derivedByInput` are SI-based domain records, while `ui` stores serializable UI selections,
 * chart state, and calculation lifecycle flags.
 */
import type { InputId as InputIdType } from "../../models/inputSlots";
import type { ComfortModel as ComfortModelType } from "../../models/comfortModels";
import type { PlotlyChartResponseDto } from "../../models/dto";
import type { DerivedInputId as DerivedInputIdType, FieldKey as FieldKeyType } from "../../models/fieldKeys";
import type { ChartId as ChartIdType } from "../../models/chartOptions";
import type { InputControlId as InputControlIdType, InputControlViewModel } from "../../models/inputControls";
import type { OptionKey as OptionKeyType } from "../../models/inputModes";
import type { UnitSystem as UnitSystemType } from "../../models/units";
import type { ShareStateSnapshot } from "./shareState";

export type InputState = Record<FieldKeyType, number>;
export type InputsByInputState = Record<InputIdType, InputState>;
export type DerivedInputState = Partial<Record<DerivedInputIdType, number>>;
export type DerivedByInputState = Record<InputIdType, DerivedInputState>;
export type ModelOptionsState = Partial<Record<OptionKeyType, string>>;
export type ModelOptionsByModelState = Record<ComfortModelType, ModelOptionsState>;
export type SelectedChartByModelState = Record<ComfortModelType, ChartIdType>;
export type ModelResultsState = Record<InputIdType, unknown | null>;
export type ResultsByModelState = Record<ComfortModelType, ModelResultsState>;
export type ResultSectionsByModelState = Record<ComfortModelType, ResultSection[]>;

export type ChartResultsByModelState = Record<
  ComfortModelType,
  Partial<Record<ChartIdType, PlotlyChartResponseDto | null>>
>;

export type UiState = {
  selectedModel: ComfortModelType;
  selectedChartByModel: SelectedChartByModelState;
  modelOptionsByModel: ModelOptionsByModelState;
  compareEnabled: boolean;
  compareInputIds: InputIdType[];
  activeInputId: InputIdType;
  unitSystem: UnitSystemType;
  isLoading: boolean;
  errorMessage: string;
  resultsByModel: ResultsByModelState;
  resultSectionsByModel: ResultSectionsByModelState;
  chartResultsByModel: ChartResultsByModelState;
};

export type ComfortToolStateSlice = {
  inputsByInput: InputsByInputState;
  derivedByInput: DerivedByInputState;
  ui: UiState;
};

export type ResultCellPresentation = {
  text: string;
  toneClass?: string;
};

export type ResultSection = {
  title: string;
  valuesByInput: Partial<Record<InputIdType, ResultCellPresentation | null>>;
};

export type ComfortToolActions = {
  setSelectedModel: (nextModel: ComfortModelType) => void;
  setSelectedChart: (nextChart: ChartIdType) => void;
  setModelOption: (optionKey: OptionKeyType, nextValue: string) => void;
  setCompareEnabled: (enabled: boolean) => void;
  setActiveInputId: (nextInputId: InputIdType) => void;
  toggleCompareInputVisibility: (inputId: InputIdType) => void;
  toggleUnitSystem: () => void;
  exportShareSnapshot: () => ShareStateSnapshot;
  applyShareSnapshot: (snapshot: ShareStateSnapshot) => void;
  updateInput: (inputId: InputIdType, controlId: InputControlIdType, rawValue: string) => void;
  scheduleCalculation: (options?: { immediate?: boolean }) => void;
};

export type ComfortToolSelectors = {
  getVisibleInputIds: () => InputIdType[];
  getInputControls: () => InputControlViewModel[];
  getResultSections: () => ResultSection[];
  getCurrentChartResult: () => PlotlyChartResponseDto | null;
  getCurrentChartEmptyMessage: () => string;
  getCurrentChartOptions: () => Array<{ name: string; value: ChartIdType }>;
  getCurrentSelectedChart: () => ChartIdType;
  getCurrentChartHeightClass: () => string;
};

export type ComfortToolController = {
  state: ComfortToolStateSlice;
  actions: ComfortToolActions;
  selectors: ComfortToolSelectors;
};
