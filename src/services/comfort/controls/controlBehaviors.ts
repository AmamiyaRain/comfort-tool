import { ChartId } from "../../../models/chartOptions";
import {
  DerivedInputId,
  FieldKey,
  type FieldKey as FieldKeyType,
} from "../../../models/fieldKeys";
import { fieldMetaByKey, type FieldMeta } from "../../../models/inputFieldsMeta";
import type {
  AdvancedOptionMenu,
  AdvancedOptionSection,
  InputControlId as InputControlIdType,
  PresetInputOption,
} from "../../../models/inputControls";
import {
  AirSpeedControlMode,
  AirSpeedInputMode,
  HumidityInputMode,
  OptionKey,
  TemperatureMode,
  type AirSpeedControlMode as AirSpeedControlModeType,
  type AirSpeedInputMode as AirSpeedInputModeType,
  type HumidityInputMode as HumidityInputModeType,
  type TemperatureMode as TemperatureModeType,
} from "../../../models/inputModes";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import {
  airSpeedControlMenuItems,
  airSpeedInputMenuItems,
  humidityMenuItems,
  temperatureMenuItems,
  type MenuItemDefinition,
} from "../../../models/controlMenuMeta";
import {
  convertFieldValueFromSi,
  convertFieldValueToSi,
  convertHumidityRatioFromSi,
  convertHumidityRatioToSi,
  convertVaporPressureFromSi,
  convertVaporPressureToSi,
  formatDisplayValue,
  getHumidityRatioDisplayMeta,
  getVaporPressureDisplayMeta,
} from "../../units";
import {
  applyOperativeTemperatureControlMode,
  normalizeControlOptions,
  synchronizeControlInputState,
} from "../syncState";
import type { BehaviorPatch, ControlBehaviorContext, InputControlBehavior } from "./types";
import { createSingleInputPatch } from "./types";

type PresentationMeta = {
  label: string;
  displayUnits: string;
  step: number;
  decimals: number;
  rangeText: string;
  minValue?: number;
  maxValue?: number;
};

type ControlBehaviorConfig = {
  controlId: InputControlIdType;
  fieldKey: FieldKeyType;
  getPresentation?: (context: ControlBehaviorContext, meta: FieldMeta) => PresentationMeta;
  hidden?: (context: ControlBehaviorContext) => boolean;
  getMenu?: (context: ControlBehaviorContext) => AdvancedOptionMenu;
  presetOptions?: PresetInputOption[];
  presetDecimals?: number;
  showClothingBuilder?: boolean;
  getDisplayValue?: (context: ControlBehaviorContext, inputId: InputIdType) => number;
  parseInput?: (context: ControlBehaviorContext, nextValue: number) => number | null;
  applyInput?: (
    context: ControlBehaviorContext,
    inputId: InputIdType,
    nextValue: number,
  ) => BehaviorPatch | null;
  applyOptionChange?: (
    context: ControlBehaviorContext,
    optionKey: typeof OptionKey[keyof typeof OptionKey],
    nextValue: string,
  ) => BehaviorPatch | null;
};

const temperatureModeValues = Object.values(TemperatureMode);
const airSpeedInputModeValues = Object.values(AirSpeedInputMode);
const airSpeedControlModeValues = Object.values(AirSpeedControlMode);
const humidityInputModeValues = Object.values(HumidityInputMode);

function isTemperatureMode(value: string): value is TemperatureModeType {
  return temperatureModeValues.includes(value as TemperatureModeType);
}

function isAirSpeedInputMode(value: string): value is AirSpeedInputModeType {
  return airSpeedInputModeValues.includes(value as AirSpeedInputModeType);
}

function isAirSpeedControlMode(value: string): value is AirSpeedControlModeType {
  return airSpeedControlModeValues.includes(value as AirSpeedControlModeType);
}

function isHumidityInputMode(value: string): value is HumidityInputModeType {
  return humidityInputModeValues.includes(value as HumidityInputModeType);
}

function buildRangeText(meta: FieldMeta, context: ControlBehaviorContext): string {
  const minimum = formatDisplayValue(
    convertFieldValueFromSi(meta.key, meta.minValue, context.unitSystem),
    meta.decimals,
  );
  const maximum = formatDisplayValue(
    convertFieldValueFromSi(meta.key, meta.maxValue, context.unitSystem),
    meta.decimals,
  );
  return `From ${minimum} to ${maximum}`;
}

function buildDefaultPresentation(context: ControlBehaviorContext, meta: FieldMeta): PresentationMeta {
  return {
    label: meta.label,
    displayUnits: meta.displayUnits[context.unitSystem],
    step: meta.step,
    decimals: meta.decimals,
    rangeText: buildRangeText(meta, context),
    minValue: convertFieldValueFromSi(meta.key, meta.minValue, context.unitSystem),
    maxValue: convertFieldValueFromSi(meta.key, meta.maxValue, context.unitSystem),
  };
}

function buildAdvancedOptionSection<Value extends string>(
  title: string | undefined,
  optionKey: typeof OptionKey[keyof typeof OptionKey],
  activeValue: string,
  items: MenuItemDefinition<Value>[],
): AdvancedOptionSection {
  return {
    title,
    items: items.map((item) => ({
      ...item,
      optionKey,
      active: activeValue === item.value,
    })),
  };
}

function buildAdvancedOptionMenu(title: string, sections: AdvancedOptionSection[]): AdvancedOptionMenu {
  return {
    title,
    sections,
  };
}

function buildCanonicalInputSyncPatch(
  targetInputIds: InputIdType[],
  optionsPatch: Partial<Record<typeof OptionKey[keyof typeof OptionKey], string>>,
  updater: (
    inputId: InputIdType,
  ) => { inputState: Record<typeof FieldKey[keyof typeof FieldKey], number> },
): BehaviorPatch {
  const inputsPatch = {} as BehaviorPatch["inputsPatch"];

  targetInputIds.forEach((inputId) => {
    const nextState = updater(inputId);
    inputsPatch[inputId] = nextState.inputState;
  });

  return {
    inputsPatch,
    optionsPatch,
  };
}

function buildDerivedInputOverrides(
  context: ControlBehaviorContext,
  inputId: InputIdType,
  overrides?: Partial<Record<typeof DerivedInputId[keyof typeof DerivedInputId], number>>,
) {
  return {
    ...context.derivedByInput[inputId],
    ...overrides,
  };
}

function getDefaultDisplayValue(
  context: ControlBehaviorContext,
  inputId: InputIdType,
  fieldKey: FieldKeyType,
): number {
  return convertFieldValueFromSi(fieldKey, context.inputsByInput[inputId][fieldKey], context.unitSystem);
}

export function createControlBehavior(config: ControlBehaviorConfig): InputControlBehavior {
  const meta = fieldMetaByKey[config.fieldKey];

  return {
    buildViewModel: (context) => {
      const presentation = config.getPresentation?.(context, meta) ?? buildDefaultPresentation(context, meta);
      return {
        id: config.controlId,
        label: presentation.label,
        displayUnits: presentation.displayUnits,
        rangeText: presentation.rangeText,
        minValue: presentation.minValue,
        maxValue: presentation.maxValue,
        hidden: config.hidden?.(context) ?? false,
        editorKind: config.presetOptions?.length ? "preset" : "number",
        step: presentation.step,
        menu: config.getMenu?.(context) ?? null,
        presetOptions: config.presetOptions ?? [],
        presetDecimals: config.presetDecimals ?? presentation.decimals,
        showClothingBuilder: config.showClothingBuilder ?? false,
        displayValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          const value = config.getDisplayValue?.(context, inputId) ??
            getDefaultDisplayValue(context, inputId, config.fieldKey);
          accumulator[inputId] = formatDisplayValue(value, presentation.decimals);
          return accumulator;
        }, {} as Record<InputIdType, string>),
        numericValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          accumulator[inputId] = config.getDisplayValue?.(context, inputId) ??
            getDefaultDisplayValue(context, inputId, config.fieldKey);
          return accumulator;
        }, {} as Record<InputIdType, number>),
      };
    },
    applyInput: (context, inputId, rawValue) => {
      if (!rawValue.trim()) {
        return null;
      }

      const parsedValue = Number(rawValue);
      if (Number.isNaN(parsedValue)) {
        return null;
      }

      const nextValue = config.parseInput?.(context, parsedValue) ??
        convertFieldValueToSi(config.fieldKey, parsedValue, context.unitSystem);

      if (nextValue === null) {
        return null;
      }

      if (config.applyInput) {
        return config.applyInput(context, inputId, nextValue);
      }

      const nextInputState = {
        ...context.inputsByInput[inputId],
        [config.fieldKey]: nextValue,
      };

      return createSingleInputPatch(inputId, nextInputState);
    },
    applyOptionChange: config.applyOptionChange,
  };
}

export function createTemperatureControlBehavior(controlId: InputControlIdType): InputControlBehavior {
  const temperatureMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];

  return createControlBehavior({
    controlId,
    fieldKey: FieldKey.DryBulbTemperature,
    getPresentation: (context) => {
      const temperatureMode = normalizeControlOptions(context.options)[OptionKey.TemperatureMode];
      return {
        label: temperatureMode === TemperatureMode.Operative ? "Operative temperature" : temperatureMeta.label,
        displayUnits: temperatureMeta.displayUnits[context.unitSystem],
        step: temperatureMeta.step,
        decimals: temperatureMeta.decimals,
        rangeText: buildRangeText(temperatureMeta, context),
        minValue: convertFieldValueFromSi(
          temperatureMeta.key,
          temperatureMeta.minValue,
          context.unitSystem,
        ),
        maxValue: convertFieldValueFromSi(
          temperatureMeta.key,
          temperatureMeta.maxValue,
          context.unitSystem,
        ),
      };
    },
    getMenu: (context) => {
      const temperatureMode = normalizeControlOptions(context.options)[OptionKey.TemperatureMode];
      if (
        context.selectedChartId !== ChartId.Psychrometric &&
        temperatureMode !== TemperatureMode.Operative
      ) {
        return null;
      }

      return buildAdvancedOptionMenu("Temperature input", [
        buildAdvancedOptionSection(
          undefined,
          OptionKey.TemperatureMode,
          temperatureMode,
          temperatureMenuItems,
        ),
      ]);
    },
    applyInput: (context, inputId, nextValueSi) => {
      const options = normalizeControlOptions(context.options);
      const nextInputState = {
        ...context.inputsByInput[inputId],
        [FieldKey.DryBulbTemperature]: nextValueSi,
        ...(options[OptionKey.TemperatureMode] === TemperatureMode.Operative ? {
          [FieldKey.MeanRadiantTemperature]: nextValueSi,
        } : {}),
      };
      const synchronizedState = synchronizeControlInputState(
        nextInputState,
        context.options,
        context.derivedByInput[inputId],
      );
      return createSingleInputPatch(inputId, synchronizedState.inputState);
    },
    applyOptionChange: (context, optionKey, nextValue) => {
      if (optionKey !== OptionKey.TemperatureMode || !isTemperatureMode(nextValue)) {
        return null;
      }

      const currentOptions = normalizeControlOptions(context.options);
      if (currentOptions[optionKey] === nextValue) {
        return null;
      }

      const nextOptions = {
        ...context.options,
        [optionKey]: nextValue,
      };

      return buildCanonicalInputSyncPatch(
        inputOrder,
        { [optionKey]: nextValue },
        (inputId) => (
          nextValue === TemperatureMode.Operative
            ? applyOperativeTemperatureControlMode(
                context.inputsByInput[inputId],
                nextOptions,
                context.derivedByInput[inputId],
              )
            : synchronizeControlInputState(
                context.inputsByInput[inputId],
                nextOptions,
                context.derivedByInput[inputId],
              )
        ),
      );
    },
  });
}

export function createAirSpeedControlBehavior(controlId: InputControlIdType): InputControlBehavior {
  const airSpeedMeta = fieldMetaByKey[FieldKey.RelativeAirSpeed];

  return createControlBehavior({
    controlId,
    fieldKey: FieldKey.RelativeAirSpeed,
    getPresentation: (context) => {
      const airSpeedMode = normalizeControlOptions(context.options)[OptionKey.AirSpeedInputMode];
      return {
        label: airSpeedMode === AirSpeedInputMode.Measured ? "Measured air speed" : "Relative air speed",
        displayUnits: airSpeedMeta.displayUnits[context.unitSystem],
        step: airSpeedMeta.step,
        decimals: airSpeedMeta.decimals,
        rangeText: buildRangeText(airSpeedMeta, context),
        minValue: convertFieldValueFromSi(
          airSpeedMeta.key,
          airSpeedMeta.minValue,
          context.unitSystem,
        ),
        maxValue: convertFieldValueFromSi(
          airSpeedMeta.key,
          airSpeedMeta.maxValue,
          context.unitSystem,
        ),
      };
    },
    getMenu: (context) => {
      const options = normalizeControlOptions(context.options);
      return buildAdvancedOptionMenu("Air speed options", [
        buildAdvancedOptionSection(
          "Input mode",
          OptionKey.AirSpeedInputMode,
          options[OptionKey.AirSpeedInputMode],
          airSpeedInputMenuItems,
        ),
        buildAdvancedOptionSection(
          "Occupant control",
          OptionKey.AirSpeedControlMode,
          options[OptionKey.AirSpeedControlMode],
          airSpeedControlMenuItems,
        ),
      ]);
    },
    getDisplayValue: (context, inputId) => {
      const airSpeedMode = normalizeControlOptions(context.options)[OptionKey.AirSpeedInputMode];
      const sourceValue = airSpeedMode === AirSpeedInputMode.Measured
        ? context.derivedByInput[inputId][DerivedInputId.MeasuredAirSpeed] ?? 0
        : context.inputsByInput[inputId][FieldKey.RelativeAirSpeed];

      return convertFieldValueFromSi(FieldKey.RelativeAirSpeed, sourceValue, context.unitSystem);
    },
    applyInput: (context, inputId, nextValueSi) => {
      const airSpeedMode = normalizeControlOptions(context.options)[OptionKey.AirSpeedInputMode];
      const nextInputState = {
        ...context.inputsByInput[inputId],
      };
      const derivedInputOverrides = buildDerivedInputOverrides(context, inputId);

      if (airSpeedMode === AirSpeedInputMode.Measured) {
        derivedInputOverrides[DerivedInputId.MeasuredAirSpeed] = nextValueSi;
      } else {
        nextInputState[FieldKey.RelativeAirSpeed] = nextValueSi;
      }

      const synchronizedState = synchronizeControlInputState(nextInputState, context.options, derivedInputOverrides);
      return createSingleInputPatch(inputId, synchronizedState.inputState);
    },
    applyOptionChange: (context, optionKey, nextValue) => {
      if (optionKey === OptionKey.AirSpeedControlMode) {
        if (!isAirSpeedControlMode(nextValue)) {
          return null;
        }

        const currentOptions = normalizeControlOptions(context.options);
        if (currentOptions[optionKey] === nextValue) {
          return null;
        }

        return {
          optionsPatch: {
            [optionKey]: nextValue,
          },
        };
      }

      if (optionKey !== OptionKey.AirSpeedInputMode || !isAirSpeedInputMode(nextValue)) {
        return null;
      }

      const currentOptions = normalizeControlOptions(context.options);
      if (currentOptions[optionKey] === nextValue) {
        return null;
      }

      const nextOptions = {
        ...context.options,
        [optionKey]: nextValue,
      };

      return buildCanonicalInputSyncPatch(
        inputOrder,
        { [optionKey]: nextValue },
        (inputId) => synchronizeControlInputState(
          context.inputsByInput[inputId],
          nextOptions,
          context.derivedByInput[inputId],
        ),
      );
    },
  });
}

export function createHumidityControlBehavior(controlId: InputControlIdType): InputControlBehavior {
  const relativeHumidityMeta = fieldMetaByKey[FieldKey.RelativeHumidity];
  const temperatureMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];

  return createControlBehavior({
    controlId,
    fieldKey: FieldKey.RelativeHumidity,
    getPresentation: (context) => {
      const humidityMode = normalizeControlOptions(context.options)[OptionKey.HumidityInputMode];

      if (humidityMode === HumidityInputMode.DewPoint) {
        return {
          label: "Dew point",
          displayUnits: temperatureMeta.displayUnits[context.unitSystem],
          step: temperatureMeta.step,
          decimals: temperatureMeta.decimals,
          rangeText: "",
        };
      }

      if (humidityMode === HumidityInputMode.HumidityRatio) {
        return {
          label: "Humidity ratio",
          ...getHumidityRatioDisplayMeta(context.unitSystem),
          rangeText: "",
        };
      }

      if (humidityMode === HumidityInputMode.WetBulb) {
        return {
          label: "Wet-bulb temperature",
          displayUnits: temperatureMeta.displayUnits[context.unitSystem],
          step: temperatureMeta.step,
          decimals: temperatureMeta.decimals,
          rangeText: "",
        };
      }

      if (humidityMode === HumidityInputMode.VaporPressure) {
        return {
          label: "Vapor pressure",
          ...getVaporPressureDisplayMeta(context.unitSystem),
          rangeText: "",
        };
      }

      return {
        label: relativeHumidityMeta.label,
        displayUnits: relativeHumidityMeta.displayUnits[context.unitSystem],
        step: relativeHumidityMeta.step,
        decimals: relativeHumidityMeta.decimals,
        rangeText: buildRangeText(relativeHumidityMeta, context),
        minValue: convertFieldValueFromSi(
          relativeHumidityMeta.key,
          relativeHumidityMeta.minValue,
          context.unitSystem,
        ),
        maxValue: convertFieldValueFromSi(
          relativeHumidityMeta.key,
          relativeHumidityMeta.maxValue,
          context.unitSystem,
        ),
      };
    },
    getMenu: (context) => buildAdvancedOptionMenu("Humidity input", [
      buildAdvancedOptionSection(
        undefined,
        OptionKey.HumidityInputMode,
        normalizeControlOptions(context.options)[OptionKey.HumidityInputMode],
        humidityMenuItems,
      ),
    ]),
    getDisplayValue: (context, inputId) => {
      const humidityMode = normalizeControlOptions(context.options)[OptionKey.HumidityInputMode];
      const derivedState = context.derivedByInput[inputId];

      if (humidityMode === HumidityInputMode.DewPoint) {
        return convertFieldValueFromSi(
          FieldKey.DryBulbTemperature,
          derivedState[DerivedInputId.DewPoint] ?? 0,
          context.unitSystem,
        );
      }

      if (humidityMode === HumidityInputMode.HumidityRatio) {
        return convertHumidityRatioFromSi(derivedState[DerivedInputId.HumidityRatio] ?? 0, context.unitSystem);
      }

      if (humidityMode === HumidityInputMode.WetBulb) {
        return convertFieldValueFromSi(
          FieldKey.DryBulbTemperature,
          derivedState[DerivedInputId.WetBulb] ?? 0,
          context.unitSystem,
        );
      }

      if (humidityMode === HumidityInputMode.VaporPressure) {
        return convertVaporPressureFromSi(derivedState[DerivedInputId.VaporPressure] ?? 0, context.unitSystem);
      }

      return convertFieldValueFromSi(
        FieldKey.RelativeHumidity,
        context.inputsByInput[inputId][FieldKey.RelativeHumidity],
        context.unitSystem,
      );
    },
    parseInput: (context, nextValue) => {
      const humidityMode = normalizeControlOptions(context.options)[OptionKey.HumidityInputMode];

      if (humidityMode === HumidityInputMode.DewPoint) {
        return convertFieldValueToSi(FieldKey.DryBulbTemperature, nextValue, context.unitSystem);
      }

      if (humidityMode === HumidityInputMode.HumidityRatio) {
        return convertHumidityRatioToSi(nextValue, context.unitSystem);
      }

      if (humidityMode === HumidityInputMode.WetBulb) {
        return convertFieldValueToSi(FieldKey.DryBulbTemperature, nextValue, context.unitSystem);
      }

      if (humidityMode === HumidityInputMode.VaporPressure) {
        return convertVaporPressureToSi(nextValue, context.unitSystem);
      }

      return convertFieldValueToSi(FieldKey.RelativeHumidity, nextValue, context.unitSystem);
    },
    applyInput: (context, inputId, nextValue) => {
      const humidityMode = normalizeControlOptions(context.options)[OptionKey.HumidityInputMode];
      const nextInputState = {
        ...context.inputsByInput[inputId],
      };
      const derivedInputOverrides = buildDerivedInputOverrides(context, inputId);

      if (humidityMode === HumidityInputMode.DewPoint) {
        derivedInputOverrides[DerivedInputId.DewPoint] = nextValue;
      } else if (humidityMode === HumidityInputMode.HumidityRatio) {
        derivedInputOverrides[DerivedInputId.HumidityRatio] = nextValue;
      } else if (humidityMode === HumidityInputMode.WetBulb) {
        derivedInputOverrides[DerivedInputId.WetBulb] = nextValue;
      } else if (humidityMode === HumidityInputMode.VaporPressure) {
        derivedInputOverrides[DerivedInputId.VaporPressure] = nextValue;
      } else {
        nextInputState[FieldKey.RelativeHumidity] = nextValue;
      }

      const synchronizedState = synchronizeControlInputState(nextInputState, context.options, derivedInputOverrides);
      return createSingleInputPatch(inputId, synchronizedState.inputState);
    },
    applyOptionChange: (context, optionKey, nextValue) => {
      if (optionKey !== OptionKey.HumidityInputMode || !isHumidityInputMode(nextValue)) {
        return null;
      }

      const currentOptions = normalizeControlOptions(context.options);
      if (currentOptions[optionKey] === nextValue) {
        return null;
      }

      const nextOptions = {
        ...context.options,
        [optionKey]: nextValue,
      };

      return buildCanonicalInputSyncPatch(
        inputOrder,
        { [optionKey]: nextValue },
        (inputId) => synchronizeControlInputState(
          context.inputsByInput[inputId],
          nextOptions,
          context.derivedByInput[inputId],
        ),
      );
    },
  });
}
