import { fieldMetaByKey, type FieldMeta } from "../../../models/fieldMeta";
import type { AdvancedOptionMenu, PresetInputOption } from "../../../models/inputControls";
import type { InputControlId as InputControlIdType } from "../../../models/inputControls";
import type { InputId as InputIdType } from "../../../models/inputSlots";
import { convertFieldValueFromSi, convertFieldValueToSi, formatDisplayValue } from "../../units";
import { deriveInputDerivedState } from "../inputDerivations";
import type { BehaviorPatch, ControlBehaviorContext, InputControlBehavior } from "./types";
import { createSingleInputPatch } from "./types";
import type { FieldKey as FieldKeyType } from "../../../models/fieldKeys";

type PresentationMeta = {
  label: string;
  displayUnits: string;
  step: number;
  decimals: number;
  rangeText: string;
};

type NumericControlBehaviorConfig = {
  controlId: InputControlIdType;
  fieldKey: FieldKeyType;
  getPresentation?: (context: ControlBehaviorContext, meta: FieldMeta) => PresentationMeta;
  hidden?: (context: ControlBehaviorContext) => boolean;
  getMenu?: (context: ControlBehaviorContext) => AdvancedOptionMenu;
  presetOptions?: PresetInputOption[];
  presetDecimals?: number;
  showClothingBuilder?: boolean;
  refreshDerived?: boolean;
  applyInput?: (
    context: ControlBehaviorContext,
    inputId: InputIdType,
    nextValueSi: number,
  ) => BehaviorPatch | null;
};

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
  };
}

export function createNumericControlBehavior(config: NumericControlBehaviorConfig): InputControlBehavior {
  const meta = fieldMetaByKey[config.fieldKey];

  return {
    buildViewModel: (context) => {
      const presentation = config.getPresentation?.(context, meta) ?? buildDefaultPresentation(context, meta);
      return {
        id: config.controlId,
        label: presentation.label,
        displayUnits: presentation.displayUnits,
        rangeText: presentation.rangeText,
        hidden: config.hidden?.(context) ?? false,
        editorKind: config.presetOptions?.length ? "preset" : "number",
        step: presentation.step,
        menu: config.getMenu?.(context) ?? null,
        presetOptions: config.presetOptions ?? [],
        presetDecimals: config.presetDecimals ?? presentation.decimals,
        showClothingBuilder: config.showClothingBuilder ?? false,
        displayValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          const value = convertFieldValueFromSi(
            config.fieldKey,
            context.inputsByInput[inputId][config.fieldKey],
            context.unitSystem,
          );
          accumulator[inputId] = formatDisplayValue(value, presentation.decimals);
          return accumulator;
        }, {} as Record<InputIdType, string>),
        numericValuesByInput: context.visibleInputIds.reduce((accumulator, inputId) => {
          accumulator[inputId] = convertFieldValueFromSi(
            config.fieldKey,
            context.inputsByInput[inputId][config.fieldKey],
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

      const nextValueSi = convertFieldValueToSi(config.fieldKey, nextValue, context.unitSystem);
      if (config.applyInput) {
        return config.applyInput(context, inputId, nextValueSi);
      }

      const nextInputState = {
        ...context.inputsByInput[inputId],
        [config.fieldKey]: nextValueSi,
      };

      return createSingleInputPatch(
        inputId,
        nextInputState,
        config.refreshDerived ? deriveInputDerivedState(nextInputState) : undefined,
      );
    },
  };
}
