import { ChartId } from "../../../models/chartOptions";
import { DerivedInputId, FieldKey, type DerivedInputId as DerivedInputIdType } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/fieldMeta";
import type {
  AdvancedOptionMenu,
  AdvancedOptionSection,
  InputControlId as InputControlIdType,
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
  applyOperativeTemperatureMode,
  normalizePmvOptions,
  synchronizePmvInputState,
} from "../inputDerivations";
import type { BehaviorPatch, ControlBehaviorContext, InputControlBehavior } from "./types";
import { createSingleInputPatch, mergeBehaviorPatches } from "./types";

type MenuItemDefinition<Value extends string> = {
  label: string;
  description: string;
  value: Value;
};

const temperatureModeValues = Object.values(TemperatureMode);
const airSpeedInputModeValues = Object.values(AirSpeedInputMode);
const airSpeedControlModeValues = Object.values(AirSpeedControlMode);
const humidityInputModeValues = Object.values(HumidityInputMode);

const temperatureMenuItems: MenuItemDefinition<TemperatureModeType>[] = [
  {
    label: "Air temperature",
    description: "Use dry-bulb air temperature and keep radiant temperature separate.",
    value: TemperatureMode.Air,
  },
  {
    label: "Operative temp",
    description: "Treat operative temperature as the single temperature input.",
    value: TemperatureMode.Operative,
  },
];

const airSpeedInputMenuItems: MenuItemDefinition<AirSpeedInputModeType>[] = [
  {
    label: "Relative air speed",
    description: "Use the PMV relative air speed value directly.",
    value: AirSpeedInputMode.Relative,
  },
  {
    label: "Measured air speed",
    description: "Enter measured air speed and derive PMV relative air speed from activity.",
    value: AirSpeedInputMode.Measured,
  },
];

const airSpeedControlMenuItems: MenuItemDefinition<AirSpeedControlModeType>[] = [
  {
    label: "No local control",
    description: "Assume occupants do not have local control over elevated air speed.",
    value: AirSpeedControlMode.NoLocalControl,
  },
  {
    label: "With local control",
    description: "Assume occupants can locally control elevated air speed.",
    value: AirSpeedControlMode.WithLocalControl,
  },
];

const humidityMenuItems: MenuItemDefinition<HumidityInputModeType>[] = [
  {
    label: "Relative humidity",
    description: "Input relative humidity as a percentage.",
    value: HumidityInputMode.RelativeHumidity,
  },
  {
    label: "Humidity ratio",
    description: "Hold absolute moisture content constant.",
    value: HumidityInputMode.HumidityRatio,
  },
  {
    label: "Dew point",
    description: "Keep dew point fixed and derive relative humidity from dry-bulb temperature.",
    value: HumidityInputMode.DewPoint,
  },
  {
    label: "Wet bulb",
    description: "Input wet-bulb temperature instead of relative humidity.",
    value: HumidityInputMode.WetBulb,
  },
  {
    label: "Vapor pressure",
    description: "Input vapor pressure directly.",
    value: HumidityInputMode.VaporPressure,
  },
];

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

function buildRangeText(context: ControlBehaviorContext, fieldKey: FieldKey): string {
  const meta = fieldMetaByKey[fieldKey];
  const minimum = formatDisplayValue(
    convertFieldValueFromSi(fieldKey, meta.minValue, context.unitSystem),
    meta.decimals,
  );
  const maximum = formatDisplayValue(
    convertFieldValueFromSi(fieldKey, meta.maxValue, context.unitSystem),
    meta.decimals,
  );
  return `From ${minimum} to ${maximum}`;
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

function buildAllInputSyncPatch(
  context: ControlBehaviorContext,
  optionsPatch: Partial<Record<typeof OptionKey[keyof typeof OptionKey], string>>,
  updater: (
    inputId: InputIdType,
  ) => {
    inputState: Record<typeof FieldKey[keyof typeof FieldKey], number>;
    derivedState: Partial<Record<DerivedInputIdType, number>>;
  },
): BehaviorPatch {
  const inputsPatch = {} as BehaviorPatch["inputsPatch"];
  const derivedPatch = {} as BehaviorPatch["derivedPatch"];

  inputOrder.forEach((inputId) => {
    const nextState = updater(inputId);
    inputsPatch[inputId] = nextState.inputState;
    derivedPatch[inputId] = nextState.derivedState;
  });

  return {
    inputsPatch,
    derivedPatch,
    optionsPatch,
  };
}

export function createPmvTemperatureControlBehavior(controlId: InputControlIdType): InputControlBehavior {
  const temperatureMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];

  return {
    buildViewModel: (context) => {
      const options = normalizePmvOptions(context.options);
      const temperatureMode = options[OptionKey.TemperatureMode];
      return {
        id: controlId,
        label: temperatureMode === TemperatureMode.Operative ? "Operative temperature" : temperatureMeta.label,
        displayUnits: temperatureMeta.displayUnits[context.unitSystem],
        rangeText: buildRangeText(context, FieldKey.DryBulbTemperature),
        hidden: false,
        editorKind: "number",
        step: temperatureMeta.step,
        menu: (
          context.selectedChartId === ChartId.Psychrometric ||
          temperatureMode === TemperatureMode.Operative
        )
          ? buildAdvancedOptionMenu("Temperature input", [
              buildAdvancedOptionSection(
                undefined,
                OptionKey.TemperatureMode,
                temperatureMode,
                temperatureMenuItems,
              ),
            ])
          : null,
        presetOptions: [],
        presetDecimals: temperatureMeta.decimals,
        showClothingBuilder: false,
        displayValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          const value = convertFieldValueFromSi(
            FieldKey.DryBulbTemperature,
            context.inputsByInput[inputId][FieldKey.DryBulbTemperature],
            context.unitSystem,
          );
          accumulator[inputId] = formatDisplayValue(value, temperatureMeta.decimals);
          return accumulator;
        }, {} as Record<InputIdType, string>),
        numericValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          accumulator[inputId] = convertFieldValueFromSi(
            FieldKey.DryBulbTemperature,
            context.inputsByInput[inputId][FieldKey.DryBulbTemperature],
            context.unitSystem,
          );
          return accumulator;
        }, {} as Record<InputIdType, number>),
      };
    },
    applyInput: (context, inputId, rawValue) => {
      const nextValue = Number(rawValue);
      if (Number.isNaN(nextValue)) {
        return null;
      }

      const nextValueSi = convertFieldValueToSi(FieldKey.DryBulbTemperature, nextValue, context.unitSystem);
      const options = normalizePmvOptions(context.options);
      const nextInputState = {
        ...context.inputsByInput[inputId],
        [FieldKey.DryBulbTemperature]: nextValueSi,
        ...(options[OptionKey.TemperatureMode] === TemperatureMode.Operative ? {
          [FieldKey.MeanRadiantTemperature]: nextValueSi,
        } : {}),
      };
      const synchronizedState = synchronizePmvInputState(nextInputState, context.derivedByInput[inputId], context.options);
      return createSingleInputPatch(inputId, synchronizedState.inputState, synchronizedState.derivedState);
    },
    applyOptionChange: (context, optionKey, nextValue) => {
      if (optionKey !== OptionKey.TemperatureMode || !isTemperatureMode(nextValue)) {
        return null;
      }

      const currentOptions = normalizePmvOptions(context.options);
      if (currentOptions[optionKey] === nextValue) {
        return null;
      }

      const nextOptions = {
        ...context.options,
        [optionKey]: nextValue,
      };

      return buildAllInputSyncPatch(
        context,
        { [optionKey]: nextValue },
        (inputId) => (
          nextValue === TemperatureMode.Operative
            ? applyOperativeTemperatureMode(context.inputsByInput[inputId], context.derivedByInput[inputId], nextOptions)
            : synchronizePmvInputState(context.inputsByInput[inputId], context.derivedByInput[inputId], nextOptions)
        ),
      );
    },
  };
}

export function createPmvAirSpeedControlBehavior(controlId: InputControlIdType): InputControlBehavior {
  const airSpeedMeta = fieldMetaByKey[FieldKey.RelativeAirSpeed];

  return {
    buildViewModel: (context) => {
      const options = normalizePmvOptions(context.options);
      const airSpeedMode = options[OptionKey.AirSpeedInputMode];
      return {
        id: controlId,
        label: airSpeedMode === AirSpeedInputMode.Measured ? "Measured air speed" : "Relative air speed",
        displayUnits: airSpeedMeta.displayUnits[context.unitSystem],
        rangeText: buildRangeText(context, FieldKey.RelativeAirSpeed),
        hidden: false,
        editorKind: "number",
        step: airSpeedMeta.step,
        menu: buildAdvancedOptionMenu("Air speed options", [
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
        ]),
        presetOptions: [],
        presetDecimals: airSpeedMeta.decimals,
        showClothingBuilder: false,
        displayValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          const sourceValue = airSpeedMode === AirSpeedInputMode.Measured
            ? context.derivedByInput[inputId][DerivedInputId.MeasuredAirSpeed] ?? 0
            : context.inputsByInput[inputId][FieldKey.RelativeAirSpeed];
          const value = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, sourceValue, context.unitSystem);
          accumulator[inputId] = formatDisplayValue(value, airSpeedMeta.decimals);
          return accumulator;
        }, {} as Record<InputIdType, string>),
        numericValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          const sourceValue = airSpeedMode === AirSpeedInputMode.Measured
            ? context.derivedByInput[inputId][DerivedInputId.MeasuredAirSpeed] ?? 0
            : context.inputsByInput[inputId][FieldKey.RelativeAirSpeed];
          accumulator[inputId] = convertFieldValueFromSi(FieldKey.RelativeAirSpeed, sourceValue, context.unitSystem);
          return accumulator;
        }, {} as Record<InputIdType, number>),
      };
    },
    applyInput: (context, inputId, rawValue) => {
      const nextValue = Number(rawValue);
      if (Number.isNaN(nextValue)) {
        return null;
      }

      const nextValueSi = convertFieldValueToSi(FieldKey.RelativeAirSpeed, nextValue, context.unitSystem);
      const options = normalizePmvOptions(context.options);
      const nextInputState = {
        ...context.inputsByInput[inputId],
      };
      const nextDerivedState = {
        ...context.derivedByInput[inputId],
      };

      if (options[OptionKey.AirSpeedInputMode] === AirSpeedInputMode.Measured) {
        nextDerivedState[DerivedInputId.MeasuredAirSpeed] = nextValueSi;
      } else {
        nextInputState[FieldKey.RelativeAirSpeed] = nextValueSi;
      }

      const synchronizedState = synchronizePmvInputState(nextInputState, nextDerivedState, context.options);
      return createSingleInputPatch(inputId, synchronizedState.inputState, synchronizedState.derivedState);
    },
    applyOptionChange: (context, optionKey, nextValue) => {
      if (optionKey === OptionKey.AirSpeedControlMode) {
        if (!isAirSpeedControlMode(nextValue)) {
          return null;
        }

        const currentOptions = normalizePmvOptions(context.options);
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

      const currentOptions = normalizePmvOptions(context.options);
      if (currentOptions[optionKey] === nextValue) {
        return null;
      }

      const nextOptions = {
        ...context.options,
        [optionKey]: nextValue,
      };

      return buildAllInputSyncPatch(
        context,
        { [optionKey]: nextValue },
        (inputId) => synchronizePmvInputState(context.inputsByInput[inputId], context.derivedByInput[inputId], nextOptions),
      );
    },
  };
}

export function createPmvHumidityControlBehavior(controlId: InputControlIdType): InputControlBehavior {
  const relativeHumidityMeta = fieldMetaByKey[FieldKey.RelativeHumidity];
  const temperatureMeta = fieldMetaByKey[FieldKey.DryBulbTemperature];

  return {
    buildViewModel: (context) => {
      const options = normalizePmvOptions(context.options);
      const humidityMode = options[OptionKey.HumidityInputMode];

      const presentation = (() => {
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
          rangeText: buildRangeText(context, FieldKey.RelativeHumidity),
        };
      })();

      return {
        id: controlId,
        label: presentation.label,
        displayUnits: presentation.displayUnits,
        rangeText: presentation.rangeText,
        hidden: false,
        editorKind: "number",
        step: presentation.step,
        menu: buildAdvancedOptionMenu("Humidity input", [
          buildAdvancedOptionSection(
            undefined,
            OptionKey.HumidityInputMode,
            humidityMode,
            humidityMenuItems,
          ),
        ]),
        presetOptions: [],
        presetDecimals: presentation.decimals,
        showClothingBuilder: false,
        displayValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          const derivedState = context.derivedByInput[inputId];
          const value = (() => {
            if (humidityMode === HumidityInputMode.DewPoint) {
              return convertFieldValueFromSi(
                FieldKey.DryBulbTemperature,
                derivedState[DerivedInputId.DewPoint] ?? 0,
                context.unitSystem,
              );
            }

            if (humidityMode === HumidityInputMode.HumidityRatio) {
              return convertHumidityRatioFromSi(
                derivedState[DerivedInputId.HumidityRatio] ?? 0,
                context.unitSystem,
              );
            }

            if (humidityMode === HumidityInputMode.WetBulb) {
              return convertFieldValueFromSi(
                FieldKey.DryBulbTemperature,
                derivedState[DerivedInputId.WetBulb] ?? 0,
                context.unitSystem,
              );
            }

            if (humidityMode === HumidityInputMode.VaporPressure) {
              return convertVaporPressureFromSi(
                derivedState[DerivedInputId.VaporPressure] ?? 0,
                context.unitSystem,
              );
            }

            return context.inputsByInput[inputId][FieldKey.RelativeHumidity];
          })();

          accumulator[inputId] = formatDisplayValue(value, presentation.decimals);
          return accumulator;
        }, {} as Record<InputIdType, string>),
        numericValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          const derivedState = context.derivedByInput[inputId];
          accumulator[inputId] = (() => {
            if (humidityMode === HumidityInputMode.DewPoint) {
              return convertFieldValueFromSi(
                FieldKey.DryBulbTemperature,
                derivedState[DerivedInputId.DewPoint] ?? 0,
                context.unitSystem,
              );
            }

            if (humidityMode === HumidityInputMode.HumidityRatio) {
              return convertHumidityRatioFromSi(
                derivedState[DerivedInputId.HumidityRatio] ?? 0,
                context.unitSystem,
              );
            }

            if (humidityMode === HumidityInputMode.WetBulb) {
              return convertFieldValueFromSi(
                FieldKey.DryBulbTemperature,
                derivedState[DerivedInputId.WetBulb] ?? 0,
                context.unitSystem,
              );
            }

            if (humidityMode === HumidityInputMode.VaporPressure) {
              return convertVaporPressureFromSi(
                derivedState[DerivedInputId.VaporPressure] ?? 0,
                context.unitSystem,
              );
            }

            return context.inputsByInput[inputId][FieldKey.RelativeHumidity];
          })();
          return accumulator;
        }, {} as Record<InputIdType, number>),
      };
    },
    applyInput: (context, inputId, rawValue) => {
      const nextValue = Number(rawValue);
      if (Number.isNaN(nextValue)) {
        return null;
      }

      const options = normalizePmvOptions(context.options);
      const humidityMode = options[OptionKey.HumidityInputMode];
      const nextInputState = {
        ...context.inputsByInput[inputId],
      };
      const nextDerivedState = {
        ...context.derivedByInput[inputId],
      };

      if (humidityMode === HumidityInputMode.DewPoint) {
        nextDerivedState[DerivedInputId.DewPoint] = convertFieldValueToSi(
          FieldKey.DryBulbTemperature,
          nextValue,
          context.unitSystem,
        );
      } else if (humidityMode === HumidityInputMode.HumidityRatio) {
        nextDerivedState[DerivedInputId.HumidityRatio] = convertHumidityRatioToSi(nextValue, context.unitSystem);
      } else if (humidityMode === HumidityInputMode.WetBulb) {
        nextDerivedState[DerivedInputId.WetBulb] = convertFieldValueToSi(
          FieldKey.DryBulbTemperature,
          nextValue,
          context.unitSystem,
        );
      } else if (humidityMode === HumidityInputMode.VaporPressure) {
        nextDerivedState[DerivedInputId.VaporPressure] = convertVaporPressureToSi(nextValue, context.unitSystem);
      } else {
        nextInputState[FieldKey.RelativeHumidity] = nextValue;
      }

      const synchronizedState = synchronizePmvInputState(nextInputState, nextDerivedState, context.options);
      return createSingleInputPatch(inputId, synchronizedState.inputState, synchronizedState.derivedState);
    },
    applyOptionChange: (context, optionKey, nextValue) => {
      if (optionKey !== OptionKey.HumidityInputMode || !isHumidityInputMode(nextValue)) {
        return null;
      }

      const currentOptions = normalizePmvOptions(context.options);
      if (currentOptions[optionKey] === nextValue) {
        return null;
      }

      const nextOptions = {
        ...context.options,
        [optionKey]: nextValue,
      };

      return buildAllInputSyncPatch(
        context,
        { [optionKey]: nextValue },
        (inputId) => synchronizePmvInputState(context.inputsByInput[inputId], context.derivedByInput[inputId], nextOptions),
      );
    },
  };
}
