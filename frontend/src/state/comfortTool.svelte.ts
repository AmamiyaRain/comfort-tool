import {
  CompareCaseId,
  compareCaseDefaultsById,
  compareCaseOrder,
  type CompareCaseId as CompareCaseIdType,
} from "../models/compareCases";
import { ComfortModel, type ComfortModel as ComfortModelType } from "../models/comfortModels";
import { allFieldOrder, fieldMetaByKey, fieldOrderByModel } from "../models/fieldMeta";
import { FieldKey, type FieldKey as FieldKeyType } from "../models/fieldKeys";
import {
  PmvAirSpeedControlMode,
  PmvAirSpeedInputMode,
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
  type PmvAirSpeedControlMode as PmvAirSpeedControlModeType,
  type PmvAirSpeedInputMode as PmvAirSpeedInputModeType,
  type PmvHumidityInputMode as PmvHumidityInputModeType,
  type PmvTemperatureInputMode as PmvTemperatureInputModeType,
} from "../models/inputModes";
import type {
  ComfortZoneRequestDto,
  PlotlyChartResponseDto,
  PmvCompareChartRequestDto,
  PmvRequestDto,
  PmvResponseDto,
  UtciRequestDto,
  UtciResponseDto,
  UtciStressChartRequestDto,
} from "../models/dto";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../models/units";
import {
  buildComparePsychrometricChart,
  buildRelativeHumidityChart,
  buildUtciStressChart,
  buildUtciTemperatureChart,
  calculateComfortZone,
  calculatePmv,
  calculateUtci,
  type ComfortZonesByCase,
  type UtciChartResultsByCase,
} from "../services/comfortService";
import { convertDisplayToSi } from "../services/unitConversion";
import {
  PmvChartId,
  UtciChartId,
  type PmvChartId as PmvChartIdType,
  type UtciChartId as UtciChartIdType,
} from "../models/chartOptions";
import type { ShareStateSnapshot } from "../services/shareState";
import {
  convertHumidityRatioDisplayToSi,
  deriveDewPointFromRelativeHumidity,
  deriveHumidityRatioFromRelativeHumidity,
  deriveMeasuredAirSpeedFromRelative,
  deriveOperativeTemperature,
  deriveRelativeAirSpeedFromMeasured,
  deriveRelativeHumidityFromDewPoint,
  deriveRelativeHumidityFromHumidityRatio,
  deriveRelativeHumidityFromVaporPressure,
  deriveRelativeHumidityFromWetBulb,
  convertVaporPressureDisplayToSi,
  deriveVaporPressureFromRelativeHumidity,
  deriveWetBulbFromRelativeHumidity,
} from "../services/advancedPmvInputs";

type CaseInputsState = Record<FieldKeyType, number>;
type InputsByCaseState = Record<CompareCaseIdType, CaseInputsState>;
type PmvResultsByCase = Record<CompareCaseIdType, PmvResponseDto | null>;
type UtciResultsByCase = Record<CompareCaseIdType, UtciResponseDto | null>;
type NumericByCaseState = Record<CompareCaseIdType, number>;
type UiState = {
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

function createCaseInputs(caseId: CompareCaseIdType): CaseInputsState {
  return allFieldOrder.reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = compareCaseDefaultsById[caseId][fieldKey] ?? fieldMetaByKey[fieldKey].defaultValue;
    return accumulator;
  }, {} as CaseInputsState);
}

function createInputsByCase(): InputsByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = createCaseInputs(caseId);
    return accumulator;
  }, {} as InputsByCaseState);
}

function createEmptyPmvResults(): PmvResultsByCase {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = null;
    return accumulator;
  }, {} as PmvResultsByCase);
}

function createEmptyUtciResults(): UtciResultsByCase {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = null;
    return accumulator;
  }, {} as UtciResultsByCase);
}

function createMeasuredAirSpeedByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveMeasuredAirSpeedFromRelative(
      inputsByCase[caseId][FieldKey.RelativeAirSpeed],
      inputsByCase[caseId][FieldKey.MetabolicRate],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

function createDewPointByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveDewPointFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

function createHumidityRatioByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveHumidityRatioFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

function createWetBulbByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveWetBulbFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

function createVaporPressureByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveVaporPressureFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

function createDefaultCompareCaseIds(): CompareCaseIdType[] {
  return [CompareCaseId.A, CompareCaseId.B];
}

function normalizeCompareCaseIds(caseIds: CompareCaseIdType[]): CompareCaseIdType[] {
  return compareCaseOrder.filter((caseId) => caseId === CompareCaseId.A || caseIds.includes(caseId));
}

function mapCaseResponses<T>(
  visibleCaseIds: CompareCaseIdType[],
  responses: T[],
): Record<CompareCaseIdType, T | null> {
  const mappedResults = compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = null;
    return accumulator;
  }, {} as Record<CompareCaseIdType, T | null>);

  visibleCaseIds.forEach((caseId, index) => {
    mappedResults[caseId] = responses[index] ?? null;
  });

  return mappedResults;
}

export function createComfortToolState() {
  const initialInputsByCase = createInputsByCase();
  const inputsByCase = $state<InputsByCaseState>(initialInputsByCase);
  const measuredAirSpeedByCase = $state<NumericByCaseState>(createMeasuredAirSpeedByCase(initialInputsByCase));
  const dewPointByCase = $state<NumericByCaseState>(createDewPointByCase(initialInputsByCase));
  const humidityRatioByCase = $state<NumericByCaseState>(createHumidityRatioByCase(initialInputsByCase));
  const wetBulbByCase = $state<NumericByCaseState>(createWetBulbByCase(initialInputsByCase));
  const vaporPressureByCase = $state<NumericByCaseState>(createVaporPressureByCase(initialInputsByCase));
  const ui = $state<UiState>({
    selectedModel: ComfortModel.Pmv,
    selectedPmvChart: PmvChartId.Psychrometric,
    selectedUtciChart: UtciChartId.Stress,
    pmvTemperatureInputMode: PmvTemperatureInputMode.Air,
    pmvAirSpeedControlMode: PmvAirSpeedControlMode.WithLocalControl,
    pmvAirSpeedInputMode: PmvAirSpeedInputMode.Relative,
    pmvHumidityInputMode: PmvHumidityInputMode.RelativeHumidity,
    compareEnabled: false,
    compareCaseIds: createDefaultCompareCaseIds(),
    activeCaseId: CompareCaseId.A,
    unitSystem: UnitSystem.SI,
    isLoading: false,
    errorMessage: "",
    calculationCount: 0,
    lastCompletedAt: 0,
    resultRevision: 0,
    pmvResults: createEmptyPmvResults(),
    utciResults: createEmptyUtciResults(),
    psychrometricChart: null,
    relativeHumidityChart: null,
    utciStressChart: null,
    utciTemperatureChart: null,
  });
  let calculationTimerId: number | null = null;
  let latestCalculationToken = 0;

  function clearResults(options?: { keepErrorMessage?: boolean }) {
    if (!options?.keepErrorMessage) {
      ui.errorMessage = "";
    }
    ui.lastCompletedAt = 0;
    ui.pmvResults = createEmptyPmvResults();
    ui.utciResults = createEmptyUtciResults();
    ui.psychrometricChart = null;
    ui.relativeHumidityChart = null;
    ui.utciStressChart = null;
    ui.utciTemperatureChart = null;
    ui.resultRevision += 1;
  }

  function getVisibleCaseIds(): CompareCaseIdType[] {
    if (!ui.compareEnabled) {
      return [CompareCaseId.A];
    }
    return normalizeCompareCaseIds(ui.compareCaseIds);
  }

  function getFieldOrder(): FieldKeyType[] {
    return fieldOrderByModel[ui.selectedModel];
  }

  function setSelectedModel(nextModel: ComfortModelType) {
    ui.selectedModel = nextModel;
    if (nextModel === ComfortModel.Pmv) {
      ui.selectedPmvChart = PmvChartId.Psychrometric;
    } else {
      ui.selectedUtciChart = UtciChartId.Stress;
    }
    clearResults();
    scheduleCalculation({ immediate: true });
  }

  function setCompareEnabled(enabled: boolean) {
    ui.compareEnabled = enabled;
    if (enabled) {
      ui.compareCaseIds = normalizeCompareCaseIds(ui.compareCaseIds);
      if (ui.compareCaseIds.length < 2) {
        ui.compareCaseIds = createDefaultCompareCaseIds();
      }
      if (!ui.compareCaseIds.includes(ui.activeCaseId)) {
        ui.activeCaseId = ui.compareCaseIds[0] ?? CompareCaseId.A;
      }
    } else {
      ui.activeCaseId = CompareCaseId.A;
    }
    clearResults();
    scheduleCalculation({ immediate: true });
  }

  function setSelectedPmvChart(nextChart: PmvChartIdType) {
    ui.selectedPmvChart = nextChart;
  }

  function setSelectedUtciChart(nextChart: UtciChartIdType) {
    ui.selectedUtciChart = nextChart;
  }

  function setActiveCaseId(nextCaseId: CompareCaseIdType) {
    ui.activeCaseId = nextCaseId;
  }

  function toggleCompareCaseVisibility(caseId: CompareCaseIdType) {
    if (!ui.compareEnabled) {
      return;
    }

    if (caseId === CompareCaseId.A) {
      return;
    }

    if (ui.compareCaseIds.includes(caseId)) {
      ui.compareCaseIds = ui.compareCaseIds.filter((visibleCaseId) => visibleCaseId !== caseId);
      if (ui.activeCaseId === caseId) {
        ui.activeCaseId = ui.compareCaseIds[0] ?? CompareCaseId.A;
      }
    } else {
      ui.compareCaseIds = normalizeCompareCaseIds(compareCaseOrder.filter(
        (compareCaseId) => compareCaseId === caseId || ui.compareCaseIds.includes(compareCaseId),
      ));
    }

    clearResults();
    scheduleCalculation({ immediate: true });
  }

  function setUnitSystem(nextUnitSystem: UnitSystemType) {
    ui.unitSystem = nextUnitSystem;
  }

  function refreshHumidityDerivedValues(caseId: CompareCaseIdType) {
    dewPointByCase[caseId] = deriveDewPointFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    humidityRatioByCase[caseId] = deriveHumidityRatioFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    wetBulbByCase[caseId] = deriveWetBulbFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    vaporPressureByCase[caseId] = deriveVaporPressureFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
  }

  function syncDerivedPmvInputs(caseId: CompareCaseIdType) {
    if (ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured) {
      inputsByCase[caseId][FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
        measuredAirSpeedByCase[caseId],
        inputsByCase[caseId][FieldKey.MetabolicRate],
      );
    }

    if (ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint) {
      inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
        inputsByCase[caseId][FieldKey.DryBulbTemperature],
        dewPointByCase[caseId],
      );
    } else if (ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio) {
      inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
        inputsByCase[caseId][FieldKey.DryBulbTemperature],
        humidityRatioByCase[caseId],
      );
    } else if (ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb) {
      inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
        inputsByCase[caseId][FieldKey.DryBulbTemperature],
        wetBulbByCase[caseId],
      );
    } else if (ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure) {
      inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
        inputsByCase[caseId][FieldKey.DryBulbTemperature],
        vaporPressureByCase[caseId],
      );
    }

    refreshHumidityDerivedValues(caseId);
  }

  function setPmvTemperatureInputMode(nextMode: PmvTemperatureInputModeType) {
    if (ui.pmvTemperatureInputMode === nextMode) {
      return;
    }

    ui.pmvTemperatureInputMode = nextMode;

    if (nextMode === PmvTemperatureInputMode.Operative) {
      compareCaseOrder.forEach((caseId) => {
        const operativeTemperature = deriveOperativeTemperature(
          inputsByCase[caseId][FieldKey.DryBulbTemperature],
          inputsByCase[caseId][FieldKey.MeanRadiantTemperature],
          ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured
            ? measuredAirSpeedByCase[caseId]
            : inputsByCase[caseId][FieldKey.RelativeAirSpeed],
        );
        inputsByCase[caseId][FieldKey.DryBulbTemperature] = operativeTemperature;
        inputsByCase[caseId][FieldKey.MeanRadiantTemperature] = operativeTemperature;
        syncDerivedPmvInputs(caseId);
      });
    }

    scheduleCalculation({ immediate: true });
  }

  function setPmvAirSpeedInputMode(nextMode: PmvAirSpeedInputModeType) {
    if (ui.pmvAirSpeedInputMode === nextMode) {
      return;
    }

    ui.pmvAirSpeedInputMode = nextMode;

    if (nextMode === PmvAirSpeedInputMode.Measured) {
      compareCaseOrder.forEach((caseId) => {
        measuredAirSpeedByCase[caseId] = deriveMeasuredAirSpeedFromRelative(
          inputsByCase[caseId][FieldKey.RelativeAirSpeed],
          inputsByCase[caseId][FieldKey.MetabolicRate],
        );
      });
    }

    scheduleCalculation({ immediate: true });
  }

  function setPmvAirSpeedControlMode(nextMode: PmvAirSpeedControlModeType) {
    if (ui.pmvAirSpeedControlMode === nextMode) {
      return;
    }

    ui.pmvAirSpeedControlMode = nextMode;
    scheduleCalculation({ immediate: true });
  }

  function setPmvHumidityInputMode(nextMode: PmvHumidityInputModeType) {
    if (ui.pmvHumidityInputMode === nextMode) {
      return;
    }

    ui.pmvHumidityInputMode = nextMode;

    if (nextMode === PmvHumidityInputMode.DewPoint) {
      compareCaseOrder.forEach((caseId) => {
        dewPointByCase[caseId] = deriveDewPointFromRelativeHumidity(
          inputsByCase[caseId][FieldKey.DryBulbTemperature],
          inputsByCase[caseId][FieldKey.RelativeHumidity],
        );
      });
    } else if (nextMode === PmvHumidityInputMode.HumidityRatio) {
      compareCaseOrder.forEach((caseId) => {
        humidityRatioByCase[caseId] = deriveHumidityRatioFromRelativeHumidity(
          inputsByCase[caseId][FieldKey.DryBulbTemperature],
          inputsByCase[caseId][FieldKey.RelativeHumidity],
        );
      });
    } else if (nextMode === PmvHumidityInputMode.WetBulb) {
      compareCaseOrder.forEach((caseId) => {
        wetBulbByCase[caseId] = deriveWetBulbFromRelativeHumidity(
          inputsByCase[caseId][FieldKey.DryBulbTemperature],
          inputsByCase[caseId][FieldKey.RelativeHumidity],
        );
      });
    } else if (nextMode === PmvHumidityInputMode.VaporPressure) {
      compareCaseOrder.forEach((caseId) => {
        vaporPressureByCase[caseId] = deriveVaporPressureFromRelativeHumidity(
          inputsByCase[caseId][FieldKey.DryBulbTemperature],
          inputsByCase[caseId][FieldKey.RelativeHumidity],
        );
      });
    }

    scheduleCalculation({ immediate: true });
  }

  function exportShareSnapshot(): ShareStateSnapshot {
    return {
      version: 1,
      selectedModel: ui.selectedModel,
      selectedPmvChart: ui.selectedPmvChart,
      selectedUtciChart: ui.selectedUtciChart,
      pmvTemperatureInputMode: ui.pmvTemperatureInputMode,
      pmvAirSpeedControlMode: ui.pmvAirSpeedControlMode,
      pmvAirSpeedInputMode: ui.pmvAirSpeedInputMode,
      pmvHumidityInputMode: ui.pmvHumidityInputMode,
      compareEnabled: ui.compareEnabled,
      compareCaseIds: [...ui.compareCaseIds],
      activeCaseId: ui.activeCaseId,
      unitSystem: ui.unitSystem,
      inputsByCase: compareCaseOrder.reduce((accumulator, caseId) => {
        accumulator[caseId] = allFieldOrder.reduce((caseAccumulator, fieldKey) => {
          caseAccumulator[fieldKey] = inputsByCase[caseId][fieldKey];
          return caseAccumulator;
        }, {} as Record<FieldKeyType, number>);
        return accumulator;
      }, {} as ShareStateSnapshot["inputsByCase"]),
      measuredAirSpeedByCase: compareCaseOrder.reduce((accumulator, caseId) => {
        accumulator[caseId] = measuredAirSpeedByCase[caseId];
        return accumulator;
      }, {} as NumericByCaseState),
      dewPointByCase: compareCaseOrder.reduce((accumulator, caseId) => {
        accumulator[caseId] = dewPointByCase[caseId];
        return accumulator;
      }, {} as NumericByCaseState),
    };
  }

  function applyShareSnapshot(snapshot: ShareStateSnapshot) {
    ui.selectedModel = snapshot.selectedModel;
    ui.selectedPmvChart = snapshot.selectedPmvChart;
    ui.selectedUtciChart = snapshot.selectedUtciChart;
    ui.pmvTemperatureInputMode = snapshot.pmvTemperatureInputMode;
    ui.pmvAirSpeedControlMode = snapshot.pmvAirSpeedControlMode ?? PmvAirSpeedControlMode.WithLocalControl;
    ui.pmvAirSpeedInputMode = snapshot.pmvAirSpeedInputMode;
    ui.pmvHumidityInputMode = snapshot.pmvHumidityInputMode;
    ui.compareEnabled = snapshot.compareEnabled;
    ui.compareCaseIds = normalizeCompareCaseIds(snapshot.compareCaseIds);
    ui.activeCaseId = snapshot.compareEnabled && ui.compareCaseIds.includes(snapshot.activeCaseId)
      ? snapshot.activeCaseId
      : CompareCaseId.A;
    ui.unitSystem = snapshot.unitSystem;

    compareCaseOrder.forEach((caseId) => {
      allFieldOrder.forEach((fieldKey) => {
        inputsByCase[caseId][fieldKey] = snapshot.inputsByCase[caseId][fieldKey];
      });
      measuredAirSpeedByCase[caseId] = snapshot.measuredAirSpeedByCase[caseId];
      dewPointByCase[caseId] = snapshot.dewPointByCase[caseId];
    });

    clearResults();
    scheduleCalculation({ immediate: true });
  }

  function updateInput(caseId: CompareCaseIdType, fieldKey: FieldKeyType, rawValue: string) {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }

    if (
      ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.DryBulbTemperature &&
      ui.pmvTemperatureInputMode === PmvTemperatureInputMode.Operative
    ) {
      const operativeTemperature = convertDisplayToSi(FieldKey.DryBulbTemperature, nextValue, ui.unitSystem);
      inputsByCase[caseId][FieldKey.DryBulbTemperature] = operativeTemperature;
      inputsByCase[caseId][FieldKey.MeanRadiantTemperature] = operativeTemperature;
      syncDerivedPmvInputs(caseId);
      scheduleCalculation();
      return;
    }

    if (
      ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeAirSpeed &&
      ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured
    ) {
      measuredAirSpeedByCase[caseId] = convertDisplayToSi(FieldKey.RelativeAirSpeed, nextValue, ui.unitSystem);
      inputsByCase[caseId][FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
        measuredAirSpeedByCase[caseId],
        inputsByCase[caseId][FieldKey.MetabolicRate],
      );
      scheduleCalculation();
      return;
    }

    if (
      ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint
    ) {
      dewPointByCase[caseId] = convertDisplayToSi(FieldKey.DryBulbTemperature, nextValue, ui.unitSystem);
      inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
        inputsByCase[caseId][FieldKey.DryBulbTemperature],
        dewPointByCase[caseId],
      );
      scheduleCalculation();
      return;
    }

    if (
      ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio
    ) {
      humidityRatioByCase[caseId] = convertHumidityRatioDisplayToSi(nextValue, ui.unitSystem);
      inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
        inputsByCase[caseId][FieldKey.DryBulbTemperature],
        humidityRatioByCase[caseId],
      );
      refreshHumidityDerivedValues(caseId);
      scheduleCalculation();
      return;
    }

    if (
      ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb
    ) {
      wetBulbByCase[caseId] = convertDisplayToSi(FieldKey.DryBulbTemperature, nextValue, ui.unitSystem);
      inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
        inputsByCase[caseId][FieldKey.DryBulbTemperature],
        wetBulbByCase[caseId],
      );
      refreshHumidityDerivedValues(caseId);
      scheduleCalculation();
      return;
    }

    if (
      ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure
    ) {
      vaporPressureByCase[caseId] = convertVaporPressureDisplayToSi(nextValue, ui.unitSystem);
      inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
        inputsByCase[caseId][FieldKey.DryBulbTemperature],
        vaporPressureByCase[caseId],
      );
      refreshHumidityDerivedValues(caseId);
      scheduleCalculation();
      return;
    }

    inputsByCase[caseId][fieldKey] = convertDisplayToSi(fieldKey, nextValue, ui.unitSystem);

    if (ui.selectedModel === ComfortModel.Pmv) {
      if (fieldKey === FieldKey.DryBulbTemperature || fieldKey === FieldKey.RelativeHumidity) {
        refreshHumidityDerivedValues(caseId);
      }

      if (fieldKey === FieldKey.MetabolicRate && ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured) {
        inputsByCase[caseId][FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
          measuredAirSpeedByCase[caseId],
          inputsByCase[caseId][FieldKey.MetabolicRate],
        );
      }

      if (fieldKey === FieldKey.DryBulbTemperature && ui.pmvHumidityInputMode !== PmvHumidityInputMode.RelativeHumidity) {
        syncDerivedPmvInputs(caseId);
      }
    }

    scheduleCalculation();
  }

  function toPmvRequest(caseId: CompareCaseIdType): PmvRequestDto {
    const inputs = inputsByCase[caseId];
    return {
      tdb: Number(inputs[FieldKey.DryBulbTemperature]),
      tr: Number(inputs[FieldKey.MeanRadiantTemperature]),
      vr: Number(inputs[FieldKey.RelativeAirSpeed]),
      rh: Number(inputs[FieldKey.RelativeHumidity]),
      met: Number(inputs[FieldKey.MetabolicRate]),
      clo: Number(inputs[FieldKey.ClothingInsulation]),
      wme: Number(inputs[FieldKey.ExternalWork]),
      units: UnitSystem.SI,
    };
  }

  function toComfortZoneRequest(caseId: CompareCaseIdType): ComfortZoneRequestDto {
    return {
      ...toPmvRequest(caseId),
      rh_min: 0,
      rh_max: 100,
      rh_points: 31,
    };
  }

  function toPmvCompareChartRequest(): PmvCompareChartRequestDto {
    const visibleCaseIds = getVisibleCaseIds();
    return {
      case_a: toComfortZoneRequest(CompareCaseId.A),
      case_b: visibleCaseIds.includes(CompareCaseId.B) ? toComfortZoneRequest(CompareCaseId.B) : null,
      case_c: visibleCaseIds.includes(CompareCaseId.C) ? toComfortZoneRequest(CompareCaseId.C) : null,
      chart_range: {
        tdb_min: 10,
        tdb_max: 40,
        tdb_points: 121,
        humidity_ratio_min: 0,
        humidity_ratio_max: 30,
      },
      rh_curves: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    };
  }

  function toUtciRequest(caseId: CompareCaseIdType): UtciRequestDto {
    const inputs = inputsByCase[caseId];
    return {
      tdb: Number(inputs[FieldKey.DryBulbTemperature]),
      tr: Number(inputs[FieldKey.MeanRadiantTemperature]),
      v: Number(inputs[FieldKey.WindSpeed]),
      rh: Number(inputs[FieldKey.RelativeHumidity]),
      units: UnitSystem.SI,
    };
  }

  function toUtciStressChartRequest(): UtciStressChartRequestDto {
    const visibleCaseIds = getVisibleCaseIds();
    return {
      case_a: toUtciRequest(CompareCaseId.A),
      case_b: visibleCaseIds.includes(CompareCaseId.B) ? toUtciRequest(CompareCaseId.B) : null,
      case_c: visibleCaseIds.includes(CompareCaseId.C) ? toUtciRequest(CompareCaseId.C) : null,
    };
  }

  async function yieldToNextFrame() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      await Promise.resolve();
      return;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  function clearScheduledCalculation() {
    if (calculationTimerId !== null && typeof window !== "undefined") {
      window.clearTimeout(calculationTimerId);
      calculationTimerId = null;
    }
  }

  function scheduleCalculation(options?: { immediate?: boolean }) {
    if (typeof window === "undefined") {
      return;
    }

    const runCalculation = () => {
      calculationTimerId = null;
      latestCalculationToken += 1;
      void calculate(latestCalculationToken);
    };

    clearScheduledCalculation();

    if (options?.immediate) {
      runCalculation();
      return;
    }

    calculationTimerId = window.setTimeout(runCalculation, 180);
  }

  async function calculate(calculationToken: number) {
    ui.isLoading = true;
    ui.errorMessage = "";
    ui.calculationCount += 1;

    await yieldToNextFrame();

    if (calculationToken !== latestCalculationToken) {
      return;
    }

    try {
      const visibleCaseIds = getVisibleCaseIds();

      if (ui.selectedModel === ComfortModel.Pmv) {
        const compareChartRequest = toPmvCompareChartRequest();
        const pmvResponses = visibleCaseIds.map((caseId) => calculatePmv(toPmvRequest(caseId)));
        const comfortZonesByCase = visibleCaseIds.reduce((accumulator, caseId) => {
          accumulator[caseId] = calculateComfortZone(toComfortZoneRequest(caseId));
          return accumulator;
        }, {} as ComfortZonesByCase);

        ui.pmvResults = mapCaseResponses<PmvResponseDto>(visibleCaseIds, pmvResponses);
        ui.utciResults = createEmptyUtciResults();
        ui.psychrometricChart = buildComparePsychrometricChart(compareChartRequest, comfortZonesByCase) as PlotlyChartResponseDto;
        ui.relativeHumidityChart = buildRelativeHumidityChart(compareChartRequest, comfortZonesByCase) as PlotlyChartResponseDto;
        ui.utciStressChart = null;
        ui.utciTemperatureChart = null;
      } else {
        const utciResponses = visibleCaseIds.map((caseId) => calculateUtci(toUtciRequest(caseId)));
        const utciResultsByCase = visibleCaseIds.reduce((accumulator, caseId) => {
          accumulator[caseId] = utciResponses[visibleCaseIds.indexOf(caseId)] ?? null;
          return accumulator;
        }, {} as UtciChartResultsByCase);

        ui.utciResults = mapCaseResponses<UtciResponseDto>(visibleCaseIds, utciResponses);
        ui.pmvResults = createEmptyPmvResults();
        ui.psychrometricChart = null;
        ui.relativeHumidityChart = null;
        ui.utciStressChart = buildUtciStressChart(toUtciStressChartRequest(), utciResultsByCase) as PlotlyChartResponseDto;
        ui.utciTemperatureChart = buildUtciTemperatureChart(toUtciStressChartRequest(), utciResultsByCase) as PlotlyChartResponseDto;
      }

      if (calculationToken !== latestCalculationToken) {
        return;
      }

      ui.lastCompletedAt = Date.now();
      ui.resultRevision += 1;
    } catch (error) {
      if (calculationToken !== latestCalculationToken) {
        return;
      }

      clearResults({ keepErrorMessage: true });
      ui.errorMessage = error instanceof Error ? error.message : "Calculation failed.";
    } finally {
      if (calculationToken === latestCalculationToken) {
        ui.isLoading = false;
      }
    }
  }

  return {
    inputsByCase,
    measuredAirSpeedByCase,
    dewPointByCase,
    humidityRatioByCase,
    wetBulbByCase,
    vaporPressureByCase,
    ui,
    getVisibleCaseIds,
    getFieldOrder,
    setSelectedModel,
    setSelectedPmvChart,
    setSelectedUtciChart,
    setPmvTemperatureInputMode,
    setPmvAirSpeedControlMode,
    setPmvAirSpeedInputMode,
    setPmvHumidityInputMode,
    setCompareEnabled,
    setActiveCaseId,
    toggleCompareCaseVisibility,
    setUnitSystem,
    exportShareSnapshot,
    applyShareSnapshot,
    updateInput,
    scheduleCalculation,
  };
}

export type ComfortToolState = ReturnType<typeof createComfortToolState>;
