import { inputOrder, type InputId as InputIdType } from "../../models/inputSlots";
import { deriveInputDerivedState } from "../../services/comfort/inputDerivations";
import type { DerivedByInputState, ComfortToolStateSlice } from "./types";

export function createEmptyDerivedByInput(): DerivedByInputState {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = {};
    return accumulator;
  }, {} as DerivedByInputState);
}

export function refreshDerivedStateForInput(state: ComfortToolStateSlice, inputId: InputIdType) {
  state.derivedByInput[inputId] = deriveInputDerivedState(state.inputsByInput[inputId]);
}

export function refreshAllDerivedState(state: ComfortToolStateSlice) {
  inputOrder.forEach((inputId) => {
    refreshDerivedStateForInput(state, inputId);
  });
}
