/** Campus program labels accepted for research/thesis department fields. Must match web registration seeds. */
export const RESEARCH_PROGRAM_OPTIONS = [
  'Bachelor of Science in Information Technology',
  'Bachelor of Science in Tourism Management',
  'Bachelor of Science in Hospitality Management',
  'STEM',
  'ABM',
  'HUMSS',
  'General Academic',
  'IT in Mobile App and Web Development',
  'Computer and Communications Technology',
  'Tourism Operations',
  'Culinary Arts',
] as const

export function normalizeResearchProgram(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function resolveAllowedResearchProgram(value: string) {
  const normalized = normalizeResearchProgram(value)
  return RESEARCH_PROGRAM_OPTIONS.find((option) => normalizeResearchProgram(option) === normalized) ?? null
}
