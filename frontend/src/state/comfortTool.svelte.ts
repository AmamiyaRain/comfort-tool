import { CompareCaseId, compareCaseOrder, type CompareCaseId as CompareCaseIdType } from "../models/compareCases";
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
  getHealthUrl,
  requestComparePsychrometricChart,
  requestPmv,
  requestRelativeHumidityChart,
  requestUtci,
  requestUtciStressChart,
} from "../services/comfortApi";
import { convertDisplayToSi } from "../services/unitConversion";

type CaseInputsState = Record<FieldKeyType, number>;
type InputsByCaseState = Record<CompareCaseIdType, CaseInputsState>;
type PmvResultsByCase = Record<CompareCaseIdType, PmvResponseDto | null>;
type UtciResultsByCase = Record<CompareCaseIdType, UtciResponseDto | null>;
type UiState = {
  selectedModel: ComfortModelType;
  selectedPmvChart: "psychrometric" | "relativeHumidity";
  compareEnabled: boolean;
  compareCaseIds: CompareCaseIdType[];
  activeCaseId: CompareCaseIdType;
  unitSystem: UnitSystemType;
  isLoading: boolean;
  errorMessage: string;
  requestCount: number;
  lastCompletedAt: number;
  resultRevision: number;
  pmvResults: PmvResultsByCase;
  utciResults: UtciResultsByCase;
  psychrometricChart: PlotlyChartResponseDto | null;
  relativeHumidityChart: PlotlyChartResponseDto | null;
  utciStressChart: PlotlyChartResponseDto | null;
};

function createCaseInputs(): CaseInputsState {
  return allFieldOrder.reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = fieldMetaByKey[fieldKey].defaultValue;
    return accumulator;
  }, {} as CaseInputsState);
}

function createInputsByCase(): InputsByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = createCaseInputs();
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
    selectedPmvChart: "psychrometric",
    compareEnabled: false,
    compareCaseIds: createDefaultCompareCaseIds(),
    activeCaseId: CompareCaseId.A,
    unitSystem: UnitSystem.SI,
    isLoading: false,
    errorMessage: "",
    requestCount: 0,
    lastCompletedAt: 0,
    resultRevision: 0,
    pmvResults: createEmptyPmvResults(),
    utciResults: createEmptyUtciResults(),
    psychrometricChart: null,
    relativeHumidityChart: null,
    utciStressChart: null,
  });

  let activeController = $state<AbortController | null>(null);
  let requestToken = $state(0);

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
      ui.selectedPmvChart = "psychrometric";
    }
    clearResults();
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
  }

  function setSelectedPmvChart(nextChart: "psychrometric" | "relativeHumidity") {
    ui.selectedPmvChart = nextChart;
  }

  function setActiveCaseId(nextCaseId: CompareCaseIdType) {
    ui.activeCaseId = nextCaseId;
  }

  function toggleCompareCaseVisibility(caseId: CompareCaseIdType) {
    if (!ui.compareEnabled) {
      return;
    }

    if (caseId === CompareCaseId.A) {
      ui.activeCaseId = CompareCaseId.A;
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
      ui.activeCaseId = caseId;
    }

    clearResults();
  }

  function setUnitSystem(nextUnitSystem: UnitSystemType) {
    ui.unitSystem = nextUnitSystem;
  }

  function updateInput(caseId: CompareCaseIdType, fieldKey: FieldKeyType, rawValue: string) {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }
    inputsByCase[caseId][fieldKey] = convertDisplayToSi(fieldKey, nextValue, ui.unitSystem);
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

  async function refresh() {
    if (activeController) {
      activeController.abort();
    }

    const controller = new AbortController();
    activeController = controller;
    const token = ++requestToken;
    const timeoutId = window.setTimeout(() => controller.abort("timeout"), 8000);

    ui.isLoading = true;
    ui.errorMessage = "";
    ui.requestCount += 1;

    try {
      const visibleCaseIds = getVisibleCaseIds();

      if (ui.selectedModel === ComfortModel.Pmv) {
        const compareChartRequest = toPmvCompareChartRequest();
        const [pmvResponses, psychrometricChart, relativeHumidityChart] = await Promise.all([
          Promise.all(visibleCaseIds.map((caseId) => requestPmv(toPmvRequest(caseId), controller.signal))),
          requestComparePsychrometricChart(compareChartRequest, controller.signal),
          requestRelativeHumidityChart(compareChartRequest, controller.signal),
        ]);

        if (token !== requestToken || activeController !== controller) {
          return;
        }

        ui.pmvResults = mapCaseResponses<PmvResponseDto>(visibleCaseIds, pmvResponses);
        ui.utciResults = createEmptyUtciResults();
        ui.psychrometricChart = psychrometricChart as PlotlyChartResponseDto;
        ui.relativeHumidityChart = relativeHumidityChart as PlotlyChartResponseDto;
        ui.utciStressChart = null;
      } else {
        const [utciResponses, utciStressChart] = await Promise.all([
          Promise.all(visibleCaseIds.map((caseId) => requestUtci(toUtciRequest(caseId), controller.signal))),
          requestUtciStressChart(toUtciStressChartRequest(), controller.signal),
        ]);

        if (token !== requestToken || activeController !== controller) {
          return;
        }

        ui.utciResults = mapCaseResponses<UtciResponseDto>(visibleCaseIds, utciResponses);
        ui.pmvResults = createEmptyPmvResults();
        ui.psychrometricChart = null;
        ui.relativeHumidityChart = null;
        ui.utciStressChart = utciStressChart as PlotlyChartResponseDto;
      }

      ui.lastCompletedAt = Date.now();
      ui.resultRevision += 1;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        const isTimeout = controller.signal.aborted && controller.signal.reason === "timeout";
        if (isTimeout && token === requestToken && activeController === controller) {
          ui.errorMessage = `Request timed out. Check backend status at ${getHealthUrl()}.`;
          clearResults({ keepErrorMessage: true });
        }
        return;
      }

      if (token !== requestToken || activeController !== controller) {
        return;
      }

      clearResults({ keepErrorMessage: true });
      ui.errorMessage = error instanceof Error ? error.message : "Backend request failed.";
    } finally {
      clearTimeout(timeoutId);
      if (token === requestToken && activeController === controller) {
        activeController = null;
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
    setCompareEnabled,
    setActiveCaseId,
    toggleCompareCaseVisibility,
    setUnitSystem,
    updateInput,
    refresh,
  };
}
