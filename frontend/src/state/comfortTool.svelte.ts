import {
  CompareCaseId,
  compareCaseDefaultsById,
  compareCaseOrder,
  type CompareCaseId as CompareCaseIdType,
} from "../models/compareCases";
import { ComfortModel, type ComfortModel as ComfortModelType } from "../models/comfortModels";
import { allFieldOrder, fieldMetaByKey, fieldOrderByModel } from "../models/fieldMeta";
import { FieldKey, type FieldKey as FieldKeyType } from "../models/fieldKeys";
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

type CaseInputsState = Record<FieldKeyType, number>;
type InputsByCaseState = Record<CompareCaseIdType, CaseInputsState>;
type PmvResultsByCase = Record<CompareCaseIdType, PmvResponseDto | null>;
type UtciResultsByCase = Record<CompareCaseIdType, UtciResponseDto | null>;
type UiState = {
  selectedModel: ComfortModelType;
  selectedPmvChart: PmvChartIdType;
  selectedUtciChart: UtciChartIdType;
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
  const inputsByCase = $state<InputsByCaseState>(createInputsByCase());
  const ui = $state<UiState>({
    selectedModel: ComfortModel.Pmv,
    selectedPmvChart: PmvChartId.Psychrometric,
    selectedUtciChart: UtciChartId.Stress,
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

  function exportShareSnapshot(): ShareStateSnapshot {
    return {
      version: 1,
      selectedModel: ui.selectedModel,
      selectedPmvChart: ui.selectedPmvChart,
      selectedUtciChart: ui.selectedUtciChart,
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
    };
  }

  function applyShareSnapshot(snapshot: ShareStateSnapshot) {
    ui.selectedModel = snapshot.selectedModel;
    ui.selectedPmvChart = snapshot.selectedPmvChart;
    ui.selectedUtciChart = snapshot.selectedUtciChart;
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
    });

    clearResults();
    scheduleCalculation({ immediate: true });
  }

  function updateInput(caseId: CompareCaseIdType, fieldKey: FieldKeyType, rawValue: string) {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }
    inputsByCase[caseId][fieldKey] = convertDisplayToSi(fieldKey, nextValue, ui.unitSystem);
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
    ui,
    getVisibleCaseIds,
    getFieldOrder,
    setSelectedModel,
    setSelectedPmvChart,
    setSelectedUtciChart,
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
