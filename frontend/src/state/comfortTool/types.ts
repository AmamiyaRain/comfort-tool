/**
 * Canonical comfort-tool state types.
 * `inputsByInput` and `derivedByInput` are SI-based domain records, while `ui` stores serializable UI selections,
 * chart state, and calculation lifecycle flags.
 */
import type { InputId as InputIdType } from "../../models/inputSlots";
import { ComfortModel, type ComfortModel as ComfortModelType } from "../../models/comfortModels";
import type { PlotlyChartResponseDto, PmvResponseDto, UtciResponseDto } from "../../models/dto";
import type { DerivedFieldKey as DerivedFieldKeyType, FieldKey as FieldKeyType } from "../../models/fieldKeys";
import type { ChartId as ChartIdType } from "../../models/chartOptions";
import type { ModelOptionId as ModelOptionIdType } from "../../models/inputModes";
import type { UnitSystem as UnitSystemType } from "../../models/units";
import type { ShareStateSnapshot } from "./shareState";

export type InputState = Record<FieldKeyType, number>;
export type InputsByInputState = Record<InputIdType, InputState>;
export type DerivedInputState = Partial<Record<DerivedFieldKeyType, number>>;
export type DerivedByInputState = Record<InputIdType, DerivedInputState>;
export type ModelOptionsState = Partial<Record<ModelOptionIdType, string>>;
export type ModelOptionsByModelState = Record<ComfortModelType, ModelOptionsState>;
export type SelectedChartByModelState = Record<ComfortModelType, ChartIdType>;

export type ModelResultDtoByModel = {
  [ComfortModel.Pmv]: PmvResponseDto;
  [ComfortModel.Utci]: UtciResponseDto;
};

export type ResultsByModelState = {
  [ModelId in ComfortModelType]: Record<InputIdType, ModelResultDtoByModel[ModelId] | null>;
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
  compareInputIds: InputIdType[];
  activeInputId: InputIdType;
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
  inputsByInput: InputsByInputState;
  derivedByInput: DerivedByInputState;
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
  optionKey: ModelOptionIdType;
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
  valuesByInput: Partial<Record<InputIdType, ResultCellPresentation | null>>;
};

export type ComfortToolActions = {
  setSelectedModel: (nextModel: ComfortModelType) => void;
  setSelectedChart: (nextChart: ChartIdType) => void;
  setModelOption: (optionKey: ModelOptionIdType, nextValue: string) => void;
  setCompareEnabled: (enabled: boolean) => void;
  setActiveInputId: (nextInputId: InputIdType) => void;
  toggleCompareInputVisibility: (inputId: InputIdType) => void;
  setUnitSystem: (nextUnitSystem: UnitSystemType) => void;
  toggleUnitSystem: () => void;
  exportShareSnapshot: () => ShareStateSnapshot;
  applyShareSnapshot: (snapshot: ShareStateSnapshot) => void;
  updateInput: (inputId: InputIdType, fieldKey: FieldKeyType, rawValue: string) => void;
  scheduleCalculation: (options?: { immediate?: boolean }) => void;
};

export type ComfortToolSelectors = {
  getVisibleInputIds: () => InputIdType[];
  getFieldOrder: () => FieldKeyType[];
  getFieldPresentation: (fieldKey: FieldKeyType) => FieldPresentation;
  getFieldDisplayValue: (inputId: InputIdType, fieldKey: FieldKeyType) => string;
  getAdvancedOptionMenu: (fieldKey: FieldKeyType) => AdvancedOptionMenu;
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
