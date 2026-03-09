import { fieldMetaByKey, fieldOrder } from "../models/fieldMeta";
import { type FieldKey } from "../models/fieldKeys";
import type {
  ComfortZoneRequestDto,
  ComfortZoneResponseDto,
  PmvRequestDto,
  PmvResponseDto,
  PsychrometricChartRequestDto,
  PsychrometricChartResponseDto,
} from "../models/dto";
import { UnitSystem } from "../models/units";
import { getHealthUrl, requestComfortZone, requestPsychrometricChart, requestPmv } from "../services/comfortApi";
import { convertDisplayToSi } from "../services/unitConversion";

type InputsState = Record<FieldKey, number>;

function createInitialInputs(): InputsState {
  return fieldOrder.reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = fieldMetaByKey[fieldKey].defaultValue;
    return accumulator;
  }, {} as InputsState);
}

export function createComfortToolState() {
  const inputs = $state<InputsState>(createInitialInputs());
  const ui = $state({
    unitSystem: UnitSystem.SI,
    isLoading: false,
    errorMessage: "",
    requestCount: 0,
    lastCompletedAt: 0,
    resultRevision: 0,
    pmvResult: null as PmvResponseDto | null,
    comfortZoneResult: null as ComfortZoneResponseDto | null,
    chartResult: null as PsychrometricChartResponseDto | null,
  });

  let activeController = $state<AbortController | null>(null);
  let requestToken = $state(0);

  function setUnitSystem(nextUnitSystem: (typeof UnitSystem)[keyof typeof UnitSystem]) {
    ui.unitSystem = nextUnitSystem;
  }

  function updateInput(fieldKey: FieldKey, rawValue: string) {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }
    inputs[fieldKey] = convertDisplayToSi(fieldKey, nextValue, ui.unitSystem);
  }

  function toPmvRequest(): PmvRequestDto {
    return {
      tdb: Number(inputs.tdb),
      tr: Number(inputs.tr),
      vr: Number(inputs.vr),
      rh: Number(inputs.rh),
      met: Number(inputs.met),
      clo: Number(inputs.clo),
      wme: Number(inputs.wme),
      units: UnitSystem.SI,
    };
  }

  function toComfortZoneRequest(): ComfortZoneRequestDto {
    return {
      ...toPmvRequest(),
      rh_min: 0,
      rh_max: 100,
      rh_points: 31,
    };
  }

  function toChartRequest(): PsychrometricChartRequestDto {
    return {
      ...toComfortZoneRequest(),
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
      const [pmvResult, comfortZoneResult, chartResult] = await Promise.all([
        requestPmv(toPmvRequest(), controller.signal),
        requestComfortZone(toComfortZoneRequest(), controller.signal),
        requestPsychrometricChart(toChartRequest(), controller.signal),
      ]);

      if (token !== requestToken || activeController !== controller) {
        return;
      }
      ui.pmvResult = { ...pmvResult };
      ui.comfortZoneResult = structuredClone(comfortZoneResult);
      ui.chartResult = structuredClone(chartResult);
      ui.lastCompletedAt = Date.now();
      ui.resultRevision += 1;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        const isTimeout = controller.signal.aborted && controller.signal.reason === "timeout";
        if (isTimeout && token === requestToken && activeController === controller) {
          ui.errorMessage = `Request timed out. Check backend status at ${getHealthUrl()}.`;
          ui.pmvResult = null;
          ui.comfortZoneResult = null;
          ui.chartResult = null;
        }
        return;
      }

      if (token !== requestToken || activeController !== controller) {
        return;
      }

      ui.errorMessage = error instanceof Error ? error.message : "Backend request failed.";
      ui.pmvResult = null;
      ui.comfortZoneResult = null;
      ui.chartResult = null;
    } finally {
      clearTimeout(timeoutId);
      if (token === requestToken && activeController === controller) {
        activeController = null;
        ui.isLoading = false;
      }
    }
  }

  return {
    fieldOrder,
    inputs,
    ui,
    setUnitSystem,
    updateInput,
    refresh,
  };
}
