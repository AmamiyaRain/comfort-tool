import {
  CompareCaseId,
  compareCaseDefaultsById,
  compareCaseOrder,
  type CompareCaseId as CompareCaseIdType,
} from "../../models/compareCases";
import { fieldMetaByKey, allFieldOrder } from "../../models/fieldMeta";
import { FieldKey } from "../../models/fieldKeys";
import {
  deriveDewPointFromRelativeHumidity,
  deriveHumidityRatioFromRelativeHumidity,
  deriveMeasuredAirSpeedFromRelative,
  deriveVaporPressureFromRelativeHumidity,
  deriveWetBulbFromRelativeHumidity,
} from "../../services/advancedPmvInputs";
import type {
  CaseInputsState,
  InputsByCaseState,
  NumericByCaseState,
  PmvResultsByCase,
  UtciResultsByCase,
} from "./types";

export function createCaseInputs(caseId: CompareCaseIdType): CaseInputsState {
  return allFieldOrder.reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = compareCaseDefaultsById[caseId][fieldKey] ?? fieldMetaByKey[fieldKey].defaultValue;
    return accumulator;
  }, {} as CaseInputsState);
}

export function createInputsByCase(): InputsByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = createCaseInputs(caseId);
    return accumulator;
  }, {} as InputsByCaseState);
}

export function createEmptyPmvResults(): PmvResultsByCase {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = null;
    return accumulator;
  }, {} as PmvResultsByCase);
}

export function createEmptyUtciResults(): UtciResultsByCase {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = null;
    return accumulator;
  }, {} as UtciResultsByCase);
}

export function createMeasuredAirSpeedByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveMeasuredAirSpeedFromRelative(
      inputsByCase[caseId][FieldKey.RelativeAirSpeed],
      inputsByCase[caseId][FieldKey.MetabolicRate],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

export function createDewPointByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveDewPointFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

export function createHumidityRatioByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveHumidityRatioFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

export function createWetBulbByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveWetBulbFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

export function createVaporPressureByCase(inputsByCase: InputsByCaseState): NumericByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = deriveVaporPressureFromRelativeHumidity(
      inputsByCase[caseId][FieldKey.DryBulbTemperature],
      inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    return accumulator;
  }, {} as NumericByCaseState);
}

export function createDefaultCompareCaseIds(): CompareCaseIdType[] {
  return [CompareCaseId.A, CompareCaseId.B];
}

export function normalizeCompareCaseIds(caseIds: CompareCaseIdType[]): CompareCaseIdType[] {
  return compareCaseOrder.filter((caseId) => caseId === CompareCaseId.A || caseIds.includes(caseId));
}

export function mapCaseResponses<T>(
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
