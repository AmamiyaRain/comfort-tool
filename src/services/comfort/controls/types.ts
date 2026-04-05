import type { ChartId as ChartIdType } from "../../../models/chartOptions";
import type {
  DerivedInputId as DerivedInputIdType,
  FieldKey as FieldKeyType,
} from "../../../models/fieldKeys";
import type {
  InputControlViewModel,
  InputControlId as InputControlIdType,
} from "../../../models/inputControls";
import type { OptionKey as OptionKeyType } from "../../../models/inputModes";
import type { InputId as InputIdType } from "../../../models/inputSlots";
import type { UnitSystem as UnitSystemType } from "../../../models/units";

type InputsByInputRecord = Record<InputIdType, Record<FieldKeyType, number>>;
type DerivedByInputRecord = Record<InputIdType, Partial<Record<DerivedInputIdType, number>>>;
export type ModelOptionsRecord = Partial<Record<OptionKeyType, string>>;

export type BehaviorPatch = {
  inputsPatch?: Partial<Record<InputIdType, Record<FieldKeyType, number>>>;
  optionsPatch?: ModelOptionsRecord;
};

export type ControlBehaviorContext = {
  inputsByInput: InputsByInputRecord;
  derivedByInput: DerivedByInputRecord;
  options: ModelOptionsRecord;
  unitSystem: UnitSystemType;
  visibleInputIds: InputIdType[];
  selectedChartId: ChartIdType;
};

export interface InputControlBehavior {
  buildViewModel: (context: ControlBehaviorContext) => InputControlViewModel;
  applyInput?: (
    context: ControlBehaviorContext,
    inputId: InputIdType,
    rawValue: string,
  ) => BehaviorPatch | null;
  applyOptionChange?: (
    context: ControlBehaviorContext,
    optionKey: OptionKeyType,
    nextValue: string,
  ) => BehaviorPatch | null;
}

export type InputControlDefinition = {
  id: InputControlIdType;
  behavior: InputControlBehavior;
};

export function createSingleInputPatch(
  inputId: InputIdType,
  inputState: Record<FieldKeyType, number>,
): BehaviorPatch {
  return {
    inputsPatch: {
      [inputId]: inputState,
    },
  };
}
