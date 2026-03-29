import { compareCaseOrder, CompareCaseId, type CompareCaseId as CompareCaseIdType } from "../models/compareCases";
import {
  chartIdsByModel,
  ChartId,
  type ChartId as ChartIdType,
} from "../models/chartOptions";
import { ComfortModel, comfortModelOrder, type ComfortModel as ComfortModelType } from "../models/comfortModels";
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
import {
  ModelOptionKey,
  type ModelOptionKey as ModelOptionKeyType,
} from "../models/modelOptions";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../models/units";

export interface ShareStateSnapshot {
  version: 2;
  selectedModel: ComfortModelType;
  selectedChartByModel: Record<ComfortModelType, ChartIdType>;
  modelOptionsByModel: Record<ComfortModelType, Partial<Record<ModelOptionKeyType, string>>>;
  compareEnabled: boolean;
  compareCaseIds: CompareCaseIdType[];
  activeCaseId: CompareCaseIdType;
  unitSystem: UnitSystemType;
  inputsByCase: Record<CompareCaseIdType, Record<FieldKeyType, number>>;
}

const SHARE_STATE_VERSION = 2;
const SHARE_STATE_PARAM = "state";
const comfortModelValues = new Set<ComfortModelType>(Object.values(ComfortModel));
const compareCaseValues = new Set<CompareCaseIdType>(Object.values(CompareCaseId));
const unitSystemValues = new Set<UnitSystemType>(Object.values(UnitSystem));
const fieldKeyValues = Object.values(FieldKey);
const chartValues = new Set<ChartIdType>(Object.values(ChartId));
const pmvTemperatureInputModeValues = new Set<PmvTemperatureInputModeType>(Object.values(PmvTemperatureInputMode));
const pmvAirSpeedControlModeValues = new Set<PmvAirSpeedControlModeType>(Object.values(PmvAirSpeedControlMode));
const pmvAirSpeedInputModeValues = new Set<PmvAirSpeedInputModeType>(Object.values(PmvAirSpeedInputMode));
const pmvHumidityInputModeValues = new Set<PmvHumidityInputModeType>(Object.values(PmvHumidityInputMode));

function toUrl(source: URL | Location | string): URL {
  if (source instanceof URL) {
    return new URL(source.toString());
  }

  if (typeof source === "string") {
    return new URL(source);
  }

  return new URL(source.href);
}

function encodeBase64Url(value: string): string {
  const encoded = typeof globalThis.btoa === "function"
    ? globalThis.btoa(value)
    : Buffer.from(value, "utf8").toString("base64");

  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${"=".repeat(paddingLength)}`;

  return typeof globalThis.atob === "function"
    ? globalThis.atob(padded)
    : Buffer.from(padded, "base64").toString("utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseInputsByCase(value: unknown): ShareStateSnapshot["inputsByCase"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const inputsByCase = {} as ShareStateSnapshot["inputsByCase"];

  for (const caseId of compareCaseOrder) {
    const caseInputs = value[caseId];
    if (!isRecord(caseInputs)) {
      return null;
    }

    const normalizedCaseInputs = {} as Record<FieldKeyType, number>;
    for (const fieldKey of fieldKeyValues) {
      const fieldValue = caseInputs[fieldKey];
      if (!isFiniteNumber(fieldValue)) {
        return null;
      }
      normalizedCaseInputs[fieldKey] = fieldValue;
    }

    inputsByCase[caseId] = normalizedCaseInputs;
  }

  return inputsByCase;
}

function parseSelectedChartByModel(value: unknown): ShareStateSnapshot["selectedChartByModel"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const selectedChartByModel = {} as ShareStateSnapshot["selectedChartByModel"];

  for (const modelId of comfortModelOrder) {
    const chartId = value[modelId];
    if (typeof chartId !== "string" || !chartValues.has(chartId as ChartIdType)) {
      return null;
    }
    if (!chartIdsByModel[modelId].includes(chartId as ChartIdType)) {
      return null;
    }
    selectedChartByModel[modelId] = chartId as ChartIdType;
  }

  return selectedChartByModel;
}

function parseModelOptionsByModel(value: unknown): ShareStateSnapshot["modelOptionsByModel"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const parsed = {
    [ComfortModel.Pmv]: {
      [ModelOptionKey.PmvTemperatureInputMode]: PmvTemperatureInputMode.Air,
      [ModelOptionKey.PmvAirSpeedControlMode]: PmvAirSpeedControlMode.WithLocalControl,
      [ModelOptionKey.PmvAirSpeedInputMode]: PmvAirSpeedInputMode.Relative,
      [ModelOptionKey.PmvHumidityInputMode]: PmvHumidityInputMode.RelativeHumidity,
    },
    [ComfortModel.Utci]: {},
  } as ShareStateSnapshot["modelOptionsByModel"];

  for (const modelId of comfortModelOrder) {
    const modelOptions = value[modelId];
    if (!isRecord(modelOptions)) {
      return null;
    }

    if (modelId === ComfortModel.Pmv) {
      const temperatureMode = modelOptions[ModelOptionKey.PmvTemperatureInputMode];
      const airSpeedControlMode = modelOptions[ModelOptionKey.PmvAirSpeedControlMode];
      const airSpeedInputMode = modelOptions[ModelOptionKey.PmvAirSpeedInputMode];
      const humidityInputMode = modelOptions[ModelOptionKey.PmvHumidityInputMode];

      if (
        temperatureMode !== undefined &&
        (!pmvTemperatureInputModeValues.has(temperatureMode as PmvTemperatureInputModeType))
      ) {
        return null;
      }

      if (
        airSpeedControlMode !== undefined &&
        (!pmvAirSpeedControlModeValues.has(airSpeedControlMode as PmvAirSpeedControlModeType))
      ) {
        return null;
      }

      if (
        airSpeedInputMode !== undefined &&
        (!pmvAirSpeedInputModeValues.has(airSpeedInputMode as PmvAirSpeedInputModeType))
      ) {
        return null;
      }

      if (
        humidityInputMode !== undefined &&
        (!pmvHumidityInputModeValues.has(humidityInputMode as PmvHumidityInputModeType))
      ) {
        return null;
      }

      parsed[ComfortModel.Pmv] = {
        [ModelOptionKey.PmvTemperatureInputMode]:
          (temperatureMode as PmvTemperatureInputModeType) ?? PmvTemperatureInputMode.Air,
        [ModelOptionKey.PmvAirSpeedControlMode]:
          (airSpeedControlMode as PmvAirSpeedControlModeType) ?? PmvAirSpeedControlMode.WithLocalControl,
        [ModelOptionKey.PmvAirSpeedInputMode]:
          (airSpeedInputMode as PmvAirSpeedInputModeType) ?? PmvAirSpeedInputMode.Relative,
        [ModelOptionKey.PmvHumidityInputMode]:
          (humidityInputMode as PmvHumidityInputModeType) ?? PmvHumidityInputMode.RelativeHumidity,
      };
    }
  }

  return parsed;
}

export function serializeShareState(snapshot: ShareStateSnapshot): string {
  return encodeBase64Url(JSON.stringify(snapshot));
}

export function deserializeShareState(encodedSnapshot: string): ShareStateSnapshot | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(encodedSnapshot));
    if (!isRecord(parsed)) {
      return null;
    }

    if (parsed.version !== SHARE_STATE_VERSION) {
      return null;
    }

    if (
      !comfortModelValues.has(parsed.selectedModel as ComfortModelType) ||
      typeof parsed.compareEnabled !== "boolean" ||
      !Array.isArray(parsed.compareCaseIds) ||
      !parsed.compareCaseIds.every((caseId) => compareCaseValues.has(caseId as CompareCaseIdType)) ||
      !compareCaseValues.has(parsed.activeCaseId as CompareCaseIdType) ||
      !unitSystemValues.has(parsed.unitSystem as UnitSystemType)
    ) {
      return null;
    }

    const selectedChartByModel = parseSelectedChartByModel(parsed.selectedChartByModel);
    if (!selectedChartByModel) {
      return null;
    }

    const modelOptionsByModel = parseModelOptionsByModel(parsed.modelOptionsByModel);
    if (!modelOptionsByModel) {
      return null;
    }

    const inputsByCase = parseInputsByCase(parsed.inputsByCase);
    if (!inputsByCase) {
      return null;
    }

    return {
      version: SHARE_STATE_VERSION,
      selectedModel: parsed.selectedModel as ComfortModelType,
      selectedChartByModel,
      modelOptionsByModel,
      compareEnabled: parsed.compareEnabled,
      compareCaseIds: parsed.compareCaseIds as CompareCaseIdType[],
      activeCaseId: parsed.activeCaseId as CompareCaseIdType,
      unitSystem: parsed.unitSystem as UnitSystemType,
      inputsByCase,
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(snapshot: ShareStateSnapshot, locationSource: URL | Location | string): string {
  const url = toUrl(locationSource);
  url.searchParams.set(SHARE_STATE_PARAM, serializeShareState(snapshot));
  return url.toString();
}

export function readShareStateFromUrl(locationSource: URL | Location | string): ShareStateSnapshot | null {
  const url = toUrl(locationSource);
  const encodedSnapshot = url.searchParams.get(SHARE_STATE_PARAM);
  if (!encodedSnapshot) {
    return null;
  }

  return deserializeShareState(encodedSnapshot);
}
