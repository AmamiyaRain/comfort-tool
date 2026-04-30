/**
 * Canonical comfort-tool state types.
 * `inputsByInput` stays canonical in SI units, while `ui` stores serializable selections,
 * chart state, and calculation lifecycle flags.
 */
import type { InputId as InputIdType } from "../../models/inputSlots";
import type { ComfortModel as ComfortModelType } from "../../models/comfortModels";
import type {
  PlotlyChartResponseDto,
  PmvChartSourceDto,
  PmvResponseDto,
  UtciChartSourceDto,
  UtciResponseDto,
  AdaptiveResponseDto,
  AdaptiveChartSourceDto,
  HeatIndexResponseDto,
  HeatIndexChartSourceDto,
} from "../../models/comfortDtos";
import type { FieldKey as FieldKeyType } from "../../models/fieldKeys";
import type { ChartId as ChartIdType } from "../../models/chartOptions";
import type { InputControlId as InputControlIdType, InputControlViewModel } from "../../models/inputControls";
import type { OptionKey as OptionKeyType } from "../../models/inputModes";
import type { UnitSystem as UnitSystemType } from "../../models/units";
import { ComfortModel } from "../../models/comfortModels";
import type { ShareStateSnapshot } from "./shareState";

export type InputState = Record<FieldKeyType, number>;
export type InputsByInputState = Record<InputIdType, InputState>;
export type ModelOptionsState = Partial<Record<OptionKeyType, string>>;
export type ModelOptionsByModelState = Record<ComfortModelType, ModelOptionsState>;
export type SelectedChartByModelState = Record<ComfortModelType, ChartIdType>;
export type ResultTone = "default" | "success" | "danger" | "warning" | "hiCaution" | "hiExtremeCaution" | "hiDanger" | "hiExtremeDanger";

export type ResultCellViewModel = {
  text: string;
  subtext?: string;
  tone?: ResultTone;
};

export type ResultSectionViewModel = {
  title: string;
  group?: string;
  valuesByInput: Partial<Record<InputIdType, ResultCellViewModel | null>>;
};

export type CalculationCacheStatus = "empty" | "stale" | "ready";
export type PmvResultsState = Record<InputIdType, PmvResponseDto | null>;
export type UtciResultsState = Record<InputIdType, UtciResponseDto | null>;

type ModelCalculationCacheBase = {
  status: CalculationCacheStatus;
  lastVisibleInputIds: InputIdType[];
};

export type PmvCalculationCache = ModelCalculationCacheBase & {
  resultsByInput: PmvResultsState;
  chartSource: PmvChartSourceDto | null;
};

export type UtciCalculationCache = ModelCalculationCacheBase & {
  resultsByInput: UtciResultsState;
  chartSource: UtciChartSourceDto | null;
};

export type AdaptiveResultsState = Record<InputIdType, AdaptiveResponseDto | null>;

export type AdaptiveCalculationCache = ModelCalculationCacheBase & {
  resultsByInput: AdaptiveResultsState;
  chartSource: AdaptiveChartSourceDto | null;
};

export type HeatIndexResultsState = Record<InputIdType, HeatIndexResponseDto | null>;

export type HeatIndexCalculationCache = ModelCalculationCacheBase & {
  resultsByInput: HeatIndexResultsState;
  chartSource: HeatIndexChartSourceDto | null;
};


export type ModelCalculationCacheByModelState = {
  [ComfortModel.Pmv]: PmvCalculationCache;
  [ComfortModel.Utci]: UtciCalculationCache;
  [ComfortModel.AdaptiveAshrae]: AdaptiveCalculationCache;
  [ComfortModel.AdaptiveEn]: AdaptiveCalculationCache;
  [ComfortModel.HeatIndex]: HeatIndexCalculationCache;
};

export type UiState = {
  selectedModel: ComfortModelType;
  selectedChartByModel: SelectedChartByModelState;
  modelOptionsByModel: ModelOptionsByModelState;
  compareEnabled: boolean;
  compareInputIds: InputIdType[];
  activeInputId: InputIdType;
  unitSystem: UnitSystemType;
  dynamicXAxis: FieldKeyType;
  dynamicYAxis: FieldKeyType;
  chartBaselineInputId: InputIdType;
  isLoading: boolean;
  errorMessage: string;
  calculationCacheByModel: ModelCalculationCacheByModelState;
};

export type ComfortToolStateSlice = {
  inputsByInput: InputsByInputState;
  ui: UiState;
};

export type ComfortToolActions = {
  setSelectedModel: (nextModel: ComfortModelType) => void;
  setSelectedChart: (nextChart: ChartIdType) => void;
  setModelOption: (optionKey: OptionKeyType, nextValue: string) => void;
  setCompareEnabled: (enabled: boolean) => void;
  setActiveInputId: (nextInputId: InputIdType) => void;
  toggleCompareInputVisibility: (inputId: InputIdType) => void;
  toggleUnitSystem: () => void;
  setDynamicXAxis: (fieldKey: FieldKeyType) => void;
  setDynamicYAxis: (fieldKey: FieldKeyType) => void;
  setChartBaselineInputId: (inputId: InputIdType) => void;
  exportShareSnapshot: () => ShareStateSnapshot;
  applyShareSnapshot: (snapshot: ShareStateSnapshot) => void;
  updateInput: (inputId: InputIdType, controlId: InputControlIdType, rawValue: string) => void;
  scheduleCalculation: (options?: { immediate?: boolean }) => void;
};

export type ComfortToolSelectors = {
  getVisibleInputIds: () => InputIdType[];
  getInputControls: () => InputControlViewModel[];
  getResultSections: () => ResultSectionViewModel[];
  getCurrentChartResult: () => PlotlyChartResponseDto | null;
  getCurrentChartEmptyMessage: () => string;
  getCurrentChartOptions: () => Array<{ name: string; value: ChartIdType }>;
  getCurrentSelectedChart: () => ChartIdType;
  getCurrentChartHeightClass: () => string;
  getCurrentCacheStatus: () => CalculationCacheStatus;
  getDynamicAxisOptions: () => FieldKeyType[];
};

export type ComfortToolController = {
  state: ComfortToolStateSlice;
  actions: ComfortToolActions;
  selectors: ComfortToolSelectors;
};
