import { inputOrder, type InputId as InputIdType } from "../../models/inputSlots";
import { deriveInputDerivedState } from "../../services/comfort/inputDerivations";
import type { DerivedByInputState, ComfortToolStateSlice } from "./types";

/**
 * Creates an initial empty record for all derived input values.
 * @returns An empty DerivedByInputState object.
 */
export function createEmptyDerivedByInput(): DerivedByInputState {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = {};
    return accumulator;
  }, {} as DerivedByInputState);
}

/**
 * Re-calculates and updates the derived values for a single input slot.
 * @param state The current tool state slice.
 * @param inputId The ID of the input slot to refresh.
 */
export function refreshDerivedStateForInput(state: ComfortToolStateSlice, inputId: InputIdType) {
  state.derivedByInput[inputId] = deriveInputDerivedState(state.inputsByInput[inputId]);
}

/**
 * Re-calculates and updates derived values for all input slots.
 * @param state The current tool state slice.
 */
export function refreshAllDerivedState(state: ComfortToolStateSlice) {
  inputOrder.forEach((inputId) => {
    refreshDerivedStateForInput(state, inputId);
  });
}
