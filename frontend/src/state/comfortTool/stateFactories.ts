import {
  CompareCaseId,
  compareCaseDefaultsById,
  compareCaseOrder,
  type CompareCaseId as CompareCaseIdType,
} from "../../models/compareCases";
import { defaultChartByModel, chartIdsByModel } from "../../models/chartOptions";
import { ComfortModel, comfortModelOrder, type ComfortModel as ComfortModelType } from "../../models/comfortModels";
import { fieldMetaByKey, allFieldOrder } from "../../models/fieldMeta";
import type { FieldKey as FieldKeyType } from "../../models/fieldKeys";
import { createEmptyDerivedByCase } from "./derivedState";
import { comfortModelConfigs } from "./modelConfigs";
import type {
  CaseInputsState,
  ChartResultsByModelState,
  InputsByCaseState,
  ModelOptionsByModelState,
  ResultsByModelState,
  SelectedChartByModelState,
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

export function createDerivedByCase() {
  return createEmptyDerivedByCase();
}

export function createDefaultCompareCaseIds(): CompareCaseIdType[] {
  return [CompareCaseId.A, CompareCaseId.B];
}

export function normalizeCompareCaseIds(caseIds: CompareCaseIdType[]): CompareCaseIdType[] {
  return compareCaseOrder.filter((caseId) => caseId === CompareCaseId.A || caseIds.includes(caseId));
}

export function createSelectedChartByModel(): SelectedChartByModelState {
  return comfortModelOrder.reduce((accumulator, modelId) => {
    accumulator[modelId] = defaultChartByModel[modelId];
    return accumulator;
  }, {} as SelectedChartByModelState);
}

export function createModelOptionsByModel(): ModelOptionsByModelState {
  return comfortModelOrder.reduce((accumulator, modelId) => {
    accumulator[modelId] = { ...comfortModelConfigs[modelId].defaultOptions };
    return accumulator;
  }, {} as ModelOptionsByModelState);
}

function createEmptyCaseResultRecord<T>(): Record<CompareCaseIdType, T | null> {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = null;
    return accumulator;
  }, {} as Record<CompareCaseIdType, T | null>);
}

export function createResultsByModel(): ResultsByModelState {
  return {
    [ComfortModel.Pmv]: createEmptyCaseResultRecord(),
    [ComfortModel.Utci]: createEmptyCaseResultRecord(),
  };
}

export function createChartResultsByModel(): ChartResultsByModelState {
  return comfortModelOrder.reduce((accumulator, modelId) => {
    accumulator[modelId] = chartIdsByModel[modelId].reduce((chartAccumulator, chartId) => {
      chartAccumulator[chartId] = null;
      return chartAccumulator;
    }, {} as ChartResultsByModelState[ComfortModelType]);
    return accumulator;
  }, {} as ChartResultsByModelState);
}
