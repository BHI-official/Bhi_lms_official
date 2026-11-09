import courseList from "../../data/bhi-courses.json";

/** Course names from data/bhi-courses.json (names only, no prices), used in the public structured data. */
export const BHI_COURSE_NAMES: string[] = courseList.courses.map((c) => c.name);
