import { compareCaseOrder, CompareCaseId, type CompareCaseId as CompareCaseIdType } from "../models/compareCases";
import { ComfortModel, type ComfortModel as ComfortModelType } from "../models/comfortModels";
import { FieldKey, type FieldKey as FieldKeyType } from "../models/fieldKeys";
import {
  PmvChartId,
  UtciChartId,
  type PmvChartId as PmvChartIdType,
  type UtciChartId as UtciChartIdType,
} from "../models/chartOptions";
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
import { UnitSystem, type UnitSystem as UnitSystemType } from "../models/units";
import {
  deriveDewPointFromRelativeHumidity,
  deriveMeasuredAirSpeedFromRelative,
} from "./advancedPmvInputs";

export interface ShareStateSnapshot {
  version: 1;
  selectedModel: ComfortModelType;
  selectedPmvChart: PmvChartIdType;
  selectedUtciChart: UtciChartIdType;
  pmvTemperatureInputMode: PmvTemperatureInputModeType;
  pmvAirSpeedControlMode?: PmvAirSpeedControlModeType;
  pmvAirSpeedInputMode: PmvAirSpeedInputModeType;
  pmvHumidityInputMode: PmvHumidityInputModeType;
  compareEnabled: boolean;
  compareCaseIds: CompareCaseIdType[];
  activeCaseId: CompareCaseIdType;
  unitSystem: UnitSystemType;
  inputsByCase: Record<CompareCaseIdType, Record<FieldKeyType, number>>;
  measuredAirSpeedByCase: Record<CompareCaseIdType, number>;
  dewPointByCase: Record<CompareCaseIdType, number>;
}

const SHARE_STATE_VERSION = 1;
const SHARE_STATE_PARAM = "state";
const comfortModelValues = new Set<ComfortModelType>(Object.values(ComfortModel));
const pmvChartValues = new Set<PmvChartIdType>(Object.values(PmvChartId));
const utciChartValues = new Set<UtciChartIdType>(Object.values(UtciChartId));
const pmvTemperatureInputModeValues = new Set<PmvTemperatureInputModeType>(Object.values(PmvTemperatureInputMode));
const pmvAirSpeedControlModeValues = new Set<PmvAirSpeedControlModeType>(Object.values(PmvAirSpeedControlMode));
const pmvAirSpeedInputModeValues = new Set<PmvAirSpeedInputModeType>(Object.values(PmvAirSpeedInputMode));
const pmvHumidityInputModeValues = new Set<PmvHumidityInputModeType>(Object.values(PmvHumidityInputMode));
const compareCaseValues = new Set<CompareCaseIdType>(Object.values(CompareCaseId));
const unitSystemValues = new Set<UnitSystemType>(Object.values(UnitSystem));
const fieldKeyValues = Object.values(FieldKey);

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

function parseNumericCaseRecord(value: unknown): Record<CompareCaseIdType, number> | null {
  if (!isRecord(value)) {
    return null;
  }

  const parsedRecord = {} as Record<CompareCaseIdType, number>;
  for (const caseId of compareCaseOrder) {
    const caseValue = value[caseId];
    if (!isFiniteNumber(caseValue)) {
      return null;
    }
    parsedRecord[caseId] = caseValue;
  }

  return parsedRecord;
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
      !pmvChartValues.has(parsed.selectedPmvChart as PmvChartIdType) ||
      !utciChartValues.has(parsed.selectedUtciChart as UtciChartIdType) ||
      (parsed.pmvTemperatureInputMode !== undefined &&
        !pmvTemperatureInputModeValues.has(parsed.pmvTemperatureInputMode as PmvTemperatureInputModeType)) ||
      (parsed.pmvAirSpeedControlMode !== undefined &&
        !pmvAirSpeedControlModeValues.has(parsed.pmvAirSpeedControlMode as PmvAirSpeedControlModeType)) ||
      (parsed.pmvAirSpeedInputMode !== undefined &&
        !pmvAirSpeedInputModeValues.has(parsed.pmvAirSpeedInputMode as PmvAirSpeedInputModeType)) ||
      (parsed.pmvHumidityInputMode !== undefined &&
        !pmvHumidityInputModeValues.has(parsed.pmvHumidityInputMode as PmvHumidityInputModeType)) ||
      typeof parsed.compareEnabled !== "boolean" ||
      !Array.isArray(parsed.compareCaseIds) ||
      !parsed.compareCaseIds.every((caseId) => compareCaseValues.has(caseId as CompareCaseIdType)) ||
      !compareCaseValues.has(parsed.activeCaseId as CompareCaseIdType) ||
      !unitSystemValues.has(parsed.unitSystem as UnitSystemType)
    ) {
      return null;
    }

    const inputsByCase = parseInputsByCase(parsed.inputsByCase);
    if (!inputsByCase) {
      return null;
    }

    const measuredAirSpeedByCase = parsed.measuredAirSpeedByCase === undefined
      ? {
          [CompareCaseId.A]: deriveMeasuredAirSpeedFromRelative(
            inputsByCase[CompareCaseId.A][FieldKey.RelativeAirSpeed],
            inputsByCase[CompareCaseId.A][FieldKey.MetabolicRate],
          ),
          [CompareCaseId.B]: deriveMeasuredAirSpeedFromRelative(
            inputsByCase[CompareCaseId.B][FieldKey.RelativeAirSpeed],
            inputsByCase[CompareCaseId.B][FieldKey.MetabolicRate],
          ),
          [CompareCaseId.C]: deriveMeasuredAirSpeedFromRelative(
            inputsByCase[CompareCaseId.C][FieldKey.RelativeAirSpeed],
            inputsByCase[CompareCaseId.C][FieldKey.MetabolicRate],
          ),
        }
      : parseNumericCaseRecord(parsed.measuredAirSpeedByCase);

    const dewPointByCase = parsed.dewPointByCase === undefined
      ? {
          [CompareCaseId.A]: deriveDewPointFromRelativeHumidity(
            inputsByCase[CompareCaseId.A][FieldKey.DryBulbTemperature],
            inputsByCase[CompareCaseId.A][FieldKey.RelativeHumidity],
          ),
          [CompareCaseId.B]: deriveDewPointFromRelativeHumidity(
            inputsByCase[CompareCaseId.B][FieldKey.DryBulbTemperature],
            inputsByCase[CompareCaseId.B][FieldKey.RelativeHumidity],
          ),
          [CompareCaseId.C]: deriveDewPointFromRelativeHumidity(
            inputsByCase[CompareCaseId.C][FieldKey.DryBulbTemperature],
            inputsByCase[CompareCaseId.C][FieldKey.RelativeHumidity],
          ),
        }
      : parseNumericCaseRecord(parsed.dewPointByCase);

    if (!measuredAirSpeedByCase || !dewPointByCase) {
      return null;
    }

    return {
      version: SHARE_STATE_VERSION,
      selectedModel: parsed.selectedModel as ComfortModelType,
      selectedPmvChart: parsed.selectedPmvChart as PmvChartIdType,
      selectedUtciChart: parsed.selectedUtciChart as UtciChartIdType,
      pmvTemperatureInputMode: (parsed.pmvTemperatureInputMode as PmvTemperatureInputModeType) ?? PmvTemperatureInputMode.Air,
      pmvAirSpeedControlMode: (parsed.pmvAirSpeedControlMode as PmvAirSpeedControlModeType) ?? PmvAirSpeedControlMode.WithLocalControl,
      pmvAirSpeedInputMode: (parsed.pmvAirSpeedInputMode as PmvAirSpeedInputModeType) ?? PmvAirSpeedInputMode.Relative,
      pmvHumidityInputMode: (parsed.pmvHumidityInputMode as PmvHumidityInputModeType) ?? PmvHumidityInputMode.RelativeHumidity,
      compareEnabled: parsed.compareEnabled,
      compareCaseIds: parsed.compareCaseIds as CompareCaseIdType[],
      activeCaseId: parsed.activeCaseId as CompareCaseIdType,
      unitSystem: parsed.unitSystem as UnitSystemType,
      inputsByCase,
      measuredAirSpeedByCase,
      dewPointByCase,
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
