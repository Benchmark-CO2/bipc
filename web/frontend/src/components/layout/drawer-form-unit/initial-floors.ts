import { FloorFormInput } from "@/validators/unitForm.validator";

export const initialFloors: FloorFormInput[] = [
  {
    floor_group: "",
    area: "100",
    height: "2",
    category: "standard_floor",
    index: 0,
    repetition: 1,
  },
  {
    floor_group: "",
    area: "80",
    height: "2",
    category: "standard_floor",
    index: 1,
    repetition: 3,
  },
  {
    floor_group: "",
    area: "100",
    height: "2",
    category: "basement_floor",
    index: 2,
    repetition: 2,
  },
];
