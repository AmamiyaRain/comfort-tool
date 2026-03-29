import { getComfortModelConfig } from "./modelConfigs";
import type { ComfortToolStateSlice } from "./types";

type ScheduleCalculation = (options?: { immediate?: boolean }) => void;

export function createComfortToolInputActions(
  state: ComfortToolStateSlice,
  scheduleCalculation: ScheduleCalculation,
) {
  function setModelOption(optionKey, nextValue: string) {
    const modelConfig = getComfortModelConfig(state.ui.selectedModel);
    if (!modelConfig.setOption(state, optionKey, nextValue)) {
      return;
    }

    scheduleCalculation({ immediate: true });
  }

  function updateInput(caseId, fieldKey, rawValue: string) {
    const modelConfig = getComfortModelConfig(state.ui.selectedModel);
    modelConfig.updateInput(state, caseId, fieldKey, rawValue);
    scheduleCalculation();
  }

  return {
    setModelOption,
    updateInput,
  };
}
