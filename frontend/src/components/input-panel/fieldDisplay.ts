import type { ComfortToolState } from "../../state/comfortTool.svelte";

export function getDisplayValue(toolState: ComfortToolState, caseId, fieldKey) {
  return toolState.selectors.getFieldDisplayValue(caseId, fieldKey);
}

export function getFieldLabel(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).label;
}

export function getFieldDisplayUnits(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).displayUnits;
}

export function getFieldStep(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).step;
}

export function getFieldDecimals(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).decimals;
}

export function getFieldRange(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).rangeText;
}

export function showClothingBuilder(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).showClothingBuilder;
}

export function showPresetInput(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).showPresetInput;
}

export function getPresetInputOptions(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).presetOptions;
}

export function getPresetInputDecimals(toolState: ComfortToolState, fieldKey) {
  return toolState.selectors.getFieldPresentation(fieldKey).presetDecimals;
}
