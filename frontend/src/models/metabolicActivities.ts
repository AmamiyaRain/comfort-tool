export interface MetabolicActivityOption {
  id: string;
  label: string;
  met: number;
}

function createMetabolicActivityId(label: string, met: number): string {
  const normalizedLabel = label
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalizedLabel}-${met.toFixed(1).replace(".", "-")}`;
}

const metabolicActivitySource = [
  { label: "Seated, quiet", met: 1.0 },
  { label: "Reading, seated", met: 1.0 },
  { label: "Writing", met: 1.0 },
  { label: "Typing", met: 1.1 },
  { label: "Standing, relaxed", met: 1.2 },
  { label: "Filing, seated", met: 1.2 },
  { label: "Flying aircraft, routine", met: 1.2 },
  { label: "Filing, standing", met: 1.4 },
  { label: "Driving a car", met: 1.5 },
  { label: "Walking about", met: 1.7 },
  { label: "Cooking", met: 1.8 },
  { label: "Table sawing", met: 1.8 },
  { label: "Walking 2 mph (3.2 km/h)", met: 2.0 },
  { label: "Lifting / packing", met: 2.1 },
  { label: "Seated, heavy limb movement", met: 2.2 },
  { label: "Light machine work", met: 2.2 },
  { label: "Flying aircraft, combat", met: 2.4 },
  { label: "Walking 3 mph (4.8 km/h)", met: 2.6 },
  { label: "House cleaning", met: 2.7 },
  { label: "Driving, heavy vehicle", met: 3.2 },
  { label: "Dancing", met: 3.4 },
  { label: "Calisthenics", met: 3.5 },
  { label: "Walking 4 mph (6.4 km/h)", met: 3.8 },
  { label: "Tennis", met: 3.8 },
  { label: "Heavy machine work", met: 4.0 },
  { label: "Handling 100 lb (45 kg) bags", met: 4.0 },
] as const;

export const metabolicActivityOptions: MetabolicActivityOption[] = metabolicActivitySource.map((option) => ({
  id: createMetabolicActivityId(option.label, option.met),
  label: option.label,
  met: option.met,
}));
