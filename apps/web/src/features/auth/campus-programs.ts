/** Campus program labels for registration. Names must match `programs.program_name` seed rows. */
export const CAMPUS_PROGRAM_GROUPS = [
  {
    label: 'College',
    options: [
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Tourism Management',
      'Bachelor of Science in Hospitality Management',
    ],
  },
  {
    label: 'Senior High — Academic',
    options: ['STEM', 'ABM', 'HUMSS', 'General Academic'],
  },
  {
    label: 'Senior High — TechPro',
    options: [
      'IT in Mobile App and Web Development',
      'Computer and Communications Technology',
      'Tourism Operations',
      'Culinary Arts',
    ],
  },
] as const
