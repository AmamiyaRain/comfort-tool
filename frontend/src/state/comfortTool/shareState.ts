/**
 * Serializable share-state snapshot helpers.
 * Snapshots only store canonical SI inputs plus UI selections that need to survive a reload or shared link.
 */
import { inputOrder, InputId, type InputId as InputIdType } from "../../models/inputSlots";
import type { ChartId as ChartIdType } from "../../models/chartOptions";
import { ComfortModel, comfortModelOrder, type ComfortModel as ComfortModelType } from "../../models/comfortModels";
import { FieldKey, type FieldKey as FieldKeyType } from "../../models/fieldKeys";
import type { OptionKey as OptionKeyType } from "../../models/inputModes";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../models/units";
import { getComfortModelConfig } from "./modelConfigs";

export interface ShareStateSnapshot {
  version: 6;
  selectedModel: ComfortModelType;
  models: Record<
    ComfortModelType,
    {
      selectedChart: ChartIdType;
      options: Partial<Record<OptionKeyType, string>>;
    }
  >;
  compareEnabled: boolean;
  compareInputIds: InputIdType[];
  activeInputId: InputIdType;
  unitSystem: UnitSystemType;
  inputsByInput: Record<InputIdType, Record<FieldKeyType, number>>;
}

const SHARE_STATE_VERSION = 6;
const SHARE_STATE_PARAM = "state";
const comfortModelValues = new Set<ComfortModelType>(Object.values(ComfortModel));
const inputIdValues = new Set<InputIdType>(Object.values(InputId));
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

function parseInputsByInput(value: unknown): ShareStateSnapshot["inputsByInput"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const inputsByInput = {} as ShareStateSnapshot["inputsByInput"];

  for (const inputId of inputOrder) {
    const inputValues = value[inputId];
    if (!isRecord(inputValues)) {
      return null;
    }

    const normalizedInputValues = {} as Record<FieldKeyType, number>;
    for (const fieldKey of fieldKeyValues) {
      const fieldValue = inputValues[fieldKey];
      if (!isFiniteNumber(fieldValue)) {
        return null;
      }
      normalizedInputValues[fieldKey] = fieldValue;
    }

    inputsByInput[inputId] = normalizedInputValues;
  }

  return inputsByInput;
}

function parseModelSnapshots(value: unknown): ShareStateSnapshot["models"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const parsed = {} as ShareStateSnapshot["models"];

  for (const modelId of comfortModelOrder) {
    const modelSnapshot = value[modelId];
    if (!isRecord(modelSnapshot)) {
      return null;
    }

    const selectedChart = modelSnapshot.selectedChart;
    if (typeof selectedChart !== "string") {
      return null;
    }

    const modelConfig = getComfortModelConfig(modelId);
    if (!modelConfig.chartIds.includes(selectedChart as ChartIdType)) {
      return null;
    }

    const options = modelConfig.normalizeOptions(modelSnapshot.options);
    if (!options) {
      return null;
    }

    parsed[modelId] = {
      selectedChart: selectedChart as ChartIdType,
      options,
    };
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
      !Array.isArray(parsed.compareInputIds) ||
      !parsed.compareInputIds.every((inputId) => inputIdValues.has(inputId as InputIdType)) ||
      !inputIdValues.has(parsed.activeInputId as InputIdType) ||
      !unitSystemValues.has(parsed.unitSystem as UnitSystemType)
    ) {
      return null;
    }

    const models = parseModelSnapshots(parsed.models);
    if (!models) {
      return null;
    }

    const inputsByInput = parseInputsByInput(parsed.inputsByInput);
    if (!inputsByInput) {
      return null;
    }

    return {
      version: SHARE_STATE_VERSION,
      selectedModel: parsed.selectedModel as ComfortModelType,
      models,
      compareEnabled: parsed.compareEnabled,
      compareInputIds: parsed.compareInputIds as InputIdType[],
      activeInputId: parsed.activeInputId as InputIdType,
      unitSystem: parsed.unitSystem as UnitSystemType,
      inputsByInput,
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
