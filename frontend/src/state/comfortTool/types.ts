import type { CompareCaseId as CompareCaseIdType } from "../../models/compareCases";
import type {
  PlotlyChartResponseDto,
  PmvResponseDto,
  UtciResponseDto,
} from "../../models/dto";
import type { FieldKey as FieldKeyType } from "../../models/fieldKeys";
import type {
  PmvAirSpeedControlMode as PmvAirSpeedControlModeType,
  PmvAirSpeedInputMode as PmvAirSpeedInputModeType,
  PmvHumidityInputMode as PmvHumidityInputModeType,
  PmvTemperatureInputMode as PmvTemperatureInputModeType,
} from "../../models/inputModes";
import type {
  ComfortModel as ComfortModelType,
} from "../../models/comfortModels";
import type {
  PmvChartId as PmvChartIdType,
  UtciChartId as UtciChartIdType,
} from "../../models/chartOptions";
import type { UnitSystem as UnitSystemType } from "../../models/units";
import type { ShareStateSnapshot } from "../../services/shareState";

export type CaseInputsState = Record<FieldKeyType, number>;
export type InputsByCaseState = Record<CompareCaseIdType, CaseInputsState>;
export type PmvResultsByCase = Record<CompareCaseIdType, PmvResponseDto | null>;
export type UtciResultsByCase = Record<CompareCaseIdType, UtciResponseDto | null>;
export type NumericByCaseState = Record<CompareCaseIdType, number>;

export type UiState = {
  selectedModel: ComfortModelType;
  selectedPmvChart: PmvChartIdType;
  selectedUtciChart: UtciChartIdType;
  pmvTemperatureInputMode: PmvTemperatureInputModeType;
  pmvAirSpeedControlMode: PmvAirSpeedControlModeType;
  pmvAirSpeedInputMode: PmvAirSpeedInputModeType;
  pmvHumidityInputMode: PmvHumidityInputModeType;
  compareEnabled: boolean;
  compareCaseIds: CompareCaseIdType[];
  activeCaseId: CompareCaseIdType;
  unitSystem: UnitSystemType;
  isLoading: boolean;
  errorMessage: string;
  calculationCount: number;
  lastCompletedAt: number;
  resultRevision: number;
  pmvResults: PmvResultsByCase;
  utciResults: UtciResultsByCase;
  psychrometricChart: PlotlyChartResponseDto | null;
  relativeHumidityChart: PlotlyChartResponseDto | null;
  utciStressChart: PlotlyChartResponseDto | null;
  utciTemperatureChart: PlotlyChartResponseDto | null;
};

export type ComfortToolStateSlice = {
  inputsByCase: InputsByCaseState;
  measuredAirSpeedByCase: NumericByCaseState;
  dewPointByCase: NumericByCaseState;
  humidityRatioByCase: NumericByCaseState;
  wetBulbByCase: NumericByCaseState;
  vaporPressureByCase: NumericByCaseState;
  ui: UiState;
};

export type ComfortToolActions = {
  setSelectedModel: (nextModel: ComfortModelType) => void;
  setSelectedPmvChart: (nextChart: PmvChartIdType) => void;
  setSelectedUtciChart: (nextChart: UtciChartIdType) => void;
  setPmvTemperatureInputMode: (nextMode: PmvTemperatureInputModeType) => void;
  setPmvAirSpeedControlMode: (nextMode: PmvAirSpeedControlModeType) => void;
  setPmvAirSpeedInputMode: (nextMode: PmvAirSpeedInputModeType) => void;
  setPmvHumidityInputMode: (nextMode: PmvHumidityInputModeType) => void;
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
