export const CompareCaseId = {
  A: "A",
  B: "B",
  C: "C",
} as const;

export type CompareCaseId = (typeof CompareCaseId)[keyof typeof CompareCaseId];

export const compareCaseOrder: CompareCaseId[] = [CompareCaseId.A, CompareCaseId.B, CompareCaseId.C];

export const compareCaseMetaById: Record<
  CompareCaseId,
  {
    label: string;
    shortLabel: string;
    accentClass: string;
    badgeColor: "green" | "yellow" | "blue";
  }
> = {
  [CompareCaseId.A]: {
    label: "Case A",
    shortLabel: "A",
    accentClass: "text-teal-700",
    badgeColor: "green",
  },
  [CompareCaseId.B]: {
    label: "Case B",
    shortLabel: "B",
    accentClass: "text-amber-700",
    badgeColor: "yellow",
  },
  [CompareCaseId.C]: {
    label: "Case C",
    shortLabel: "C",
    accentClass: "text-sky-700",
    badgeColor: "blue",
  },
};
