import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import type { ResultSectionViewModel, ResultTone, ModelOptionsState } from "../types";
import type { ComfortModelDefinition, ModelOptionChangeHandler } from "./index";
import type { ComfortModel as ComfortModelType } from "../../../models/comfortModels";
import type { ChartId as ChartIdType } from "../../../models/chartOptions";
import type { OptionKey as OptionKeyType } from "../../../models/inputModes";
import type { InputControlDefinition } from "../../../services/comfort/controls/types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createEmptyResults<T>(): Record<InputIdType, T | null> {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = null;
    return accumulator;
  }, {} as Record<InputIdType, T | null>);
}

export function buildResultSection<T>(
  title: string,
  results: Record<InputIdType, T | null>,
  visibleInputIds: InputIdType[],
  formatter: (result: T) => { text: string; tone: ResultTone }
): ResultSectionViewModel {
  return {
    title,
    valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
      const result = results[inputId];
      accumulator[inputId] = result ? formatter(result) : null;
      return accumulator;
    }, {}),
  };
}

export class ComfortModelBuilder<ResultType, ChartSourceType> {
  private config: Partial<ComfortModelDefinition<ResultType, ChartSourceType>> = {
    controls: [],
    optionHandlersByKey: {},
  };

  constructor(id: ComfortModelType) {
    this.config.id = id;
  }

  addControl(definition: InputControlDefinition): this {
    this.config.controls!.push(definition);
    return this;
  }

  addOptionHandler(optionKey: OptionKeyType, handler: ModelOptionChangeHandler): this {
    this.config.optionHandlersByKey![optionKey] = handler;
    return this;
  }

  setDefaultChart(chartId: ChartIdType, allChartIds: ChartIdType[]): this {
    this.config.defaultChartId = chartId;
    this.config.chartIds = allChartIds;
    return this;
  }

  setDefaultOptions(options: Partial<Record<OptionKeyType, string>>): this {
    this.config.defaultOptions = options;
    return this;
  }

  setOptionNormalizer(normalizer: (value: unknown) => ModelOptionsState | null): this {
    this.config.normalizeOptions = normalizer;
    return this;
  }

  setCalculator(calculator: ComfortModelDefinition<ResultType, ChartSourceType>["calculate"]): this {
    this.config.calculate = calculator;
    return this;
  }

  setResultBuilder(builder: ComfortModelDefinition<ResultType, ChartSourceType>["buildResultSections"]): this {
    this.config.buildResultSections = builder;
    return this;
  }

  setChartBuilder(builder: ComfortModelDefinition<ResultType, ChartSourceType>["buildChartResult"]): this {
    this.config.buildChartResult = builder;
    return this;
  }

  build(): ComfortModelDefinition<ResultType, ChartSourceType> {
    return this.config as ComfortModelDefinition<ResultType, ChartSourceType>;
  }
}
