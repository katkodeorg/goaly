import type { ExerciseType } from './types'

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Full body',
  'Cardio',
  'Mobility',
] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export interface LibraryExercise {
  name: string
  type: ExerciseType
  group: MuscleGroup
}

const W = 'weight' as const
const B = 'bodyweight' as const
const C = 'cardio' as const

function g(group: MuscleGroup, type: ExerciseType, names: string[]): LibraryExercise[] {
  return names.map((name) => ({ name, type, group }))
}

export const LIBRARY: LibraryExercise[] = [
  ...g('Chest', W, [
    'Bench press',
    'Incline bench press',
    'Decline bench press',
    'Close-grip bench press',
    'Dumbbell bench press',
    'Incline dumbbell press',
    'Decline dumbbell press',
    'Dumbbell fly',
    'Incline dumbbell fly',
    'Dumbbell pullover',
    'Cable fly',
    'Low-to-high cable fly',
    'High-to-low cable fly',
    'Machine chest press',
    'Incline machine press',
    'Pec deck',
    'Smith machine bench press',
    'Landmine press',
    'Weighted dip',
  ]),
  ...g('Chest', B, ['Push-up', 'Incline push-up', 'Decline push-up', 'Diamond push-up', 'Wide push-up', 'Chest dip']),

  ...g('Back', W, [
    'Deadlift',
    'Barbell row',
    'Pendlay row',
    'Dumbbell row',
    'Chest-supported dumbbell row',
    'Seal row',
    'T-bar row',
    'Seated cable row',
    'Single-arm cable row',
    'Lat pulldown',
    'Close-grip lat pulldown',
    'Single-arm lat pulldown',
    'Straight-arm pulldown',
    'Machine row',
    'Rack pull',
    'Barbell shrug',
    'Dumbbell shrug',
    'Back extension (weighted)',
    'Weighted pull-up',
    'Weighted chin-up',
    'Assisted pull-up machine',
    'Kettlebell row',
  ]),
  ...g('Back', B, ['Pull-up', 'Chin-up', 'Neutral-grip pull-up', 'Inverted row', 'Back extension', 'Superman']),

  ...g('Shoulders', W, [
    'Overhead press',
    'Seated barbell press',
    'Push press',
    'Dumbbell shoulder press',
    'Seated dumbbell press',
    'Arnold press',
    'Machine shoulder press',
    'Lateral raise',
    'Cable lateral raise',
    'Machine lateral raise',
    'Front raise',
    'Plate front raise',
    'Rear delt fly',
    'Reverse pec deck',
    'Face pull',
    'Upright row',
    'Dumbbell upright row',
    'Kettlebell press',
  ]),
  ...g('Shoulders', B, ['Pike push-up', 'Handstand push-up', 'Handstand hold']),

  ...g('Biceps', W, [
    'Barbell curl',
    'EZ-bar curl',
    'Dumbbell curl',
    'Alternating dumbbell curl',
    'Hammer curl',
    'Incline dumbbell curl',
    'Concentration curl',
    'Preacher curl',
    'Dumbbell preacher curl',
    'Cable curl',
    'Rope hammer curl',
    'Bayesian cable curl',
    'Spider curl',
    'Machine curl',
    'Reverse curl',
  ]),

  ...g('Triceps', W, [
    'Tricep pushdown',
    'Rope pushdown',
    'Overhead cable extension',
    'Overhead dumbbell extension',
    'Skull crusher',
    'Dumbbell skull crusher',
    'Dumbbell kickback',
    'Cable kickback',
    'JM press',
    'Machine dip',
  ]),
  ...g('Triceps', B, ['Bench dip', 'Tricep dip']),

  ...g('Forearms', W, ['Wrist curl', 'Reverse wrist curl', "Farmer's carry", 'Plate pinch', 'Dead hang (weighted)']),
  ...g('Forearms', B, ['Dead hang']),

  ...g('Quads', W, [
    'Squat',
    'Front squat',
    'High-bar squat',
    'Pause squat',
    'Goblet squat',
    'Dumbbell squat',
    'Hack squat',
    'Smith machine squat',
    'Leg press',
    'Single-leg leg press',
    'Leg extension',
    'Bulgarian split squat',
    'Dumbbell lunge',
    'Walking lunge (dumbbell)',
    'Barbell lunge',
    'Reverse lunge (dumbbell)',
    'Dumbbell step-up',
    'Belt squat',
    'Pendulum squat',
    'Kettlebell goblet squat',
  ]),
  ...g('Quads', B, ['Air squat', 'Lunge', 'Walking lunge', 'Jump squat', 'Pistol squat', 'Step-up', 'Wall sit', 'Sissy squat']),

  ...g('Hamstrings', W, [
    'Romanian deadlift',
    'Dumbbell Romanian deadlift',
    'Single-leg Romanian deadlift',
    'Stiff-leg deadlift',
    'Good morning',
    'Lying leg curl',
    'Seated leg curl',
    'Standing leg curl',
    'Kettlebell swing',
  ]),
  ...g('Hamstrings', B, ['Nordic curl', 'Glute-ham raise', 'Sliding leg curl']),

  ...g('Glutes', W, [
    'Hip thrust',
    'Dumbbell hip thrust',
    'Machine hip thrust',
    'Glute bridge (weighted)',
    'Sumo deadlift',
    'Cable kickback (glute)',
    'Hip abduction machine',
    'Hip adduction machine',
    'Cable pull-through',
  ]),
  ...g('Glutes', B, ['Glute bridge', 'Single-leg glute bridge', 'Donkey kick', 'Fire hydrant', 'Clamshell']),

  ...g('Calves', W, [
    'Standing calf raise',
    'Seated calf raise',
    'Dumbbell calf raise',
    'Leg press calf raise',
    'Smith machine calf raise',
  ]),
  ...g('Calves', B, ['Calf raise', 'Single-leg calf raise', 'Tibialis raise']),

  ...g('Core', W, [
    'Cable crunch',
    'Weighted crunch',
    'Ab crunch machine',
    'Russian twist (weighted)',
    'Woodchopper',
    'Pallof press',
    'Weighted decline sit-up',
    'Suitcase carry',
  ]),
  ...g('Core', B, [
    'Sit-up',
    'Crunch',
    'Bicycle crunch',
    'Hanging leg raise',
    'Hanging knee raise',
    'Lying leg raise',
    'Toes to bar',
    'Ab wheel rollout',
    'Russian twist',
    'Mountain climber',
    'V-up',
    'Flutter kick',
    'Dead bug',
    'Bird dog',
    'Hollow hold',
    'Plank',
    'Side plank',
  ]),

  ...g('Full body', W, [
    'Power clean',
    'Hang clean',
    'Clean and jerk',
    'Snatch',
    'Thruster',
    'Dumbbell thruster',
    'Dumbbell snatch',
    'Kettlebell clean',
    'Turkish get-up',
    'Man maker',
    'Sled push',
    'Sled pull',
  ]),
  ...g('Full body', B, ['Burpee', 'Jumping jack', 'Box jump', 'Bear crawl', 'Muscle-up', 'Broad jump']),

  ...g('Cardio', C, [
    'Running',
    'Treadmill',
    'Incline walk',
    'Walking',
    'Hiking',
    'Cycling',
    'Stationary bike',
    'Spin class',
    'Assault bike',
    'Rowing',
    'Elliptical',
    'Stair climber',
    'Swimming',
    'Jump rope',
    'Boxing',
    'HIIT',
    'Basketball',
    'Football',
    'Tennis',
    'Badminton',
    'Cricket',
  ]),

  ...g('Mobility', C, ['Yoga', 'Stretching', 'Pilates', 'Foam rolling']),
]

const BY_NAME = new Map(LIBRARY.map((e) => [e.name.toLowerCase(), e]))

export function libraryGroup(name: string): MuscleGroup | undefined {
  return BY_NAME.get(name.trim().toLowerCase())?.group
}

/** The go-to picks for each muscle, used when a whole muscle group is imported into a plan. */
export const STAPLES: Record<MuscleGroup, string[]> = {
  Chest: ['Bench press', 'Incline dumbbell press', 'Cable fly', 'Chest dip'],
  Back: ['Pull-up', 'Barbell row', 'Lat pulldown', 'Seated cable row'],
  Shoulders: ['Overhead press', 'Dumbbell shoulder press', 'Lateral raise', 'Face pull'],
  Biceps: ['Barbell curl', 'Hammer curl', 'Incline dumbbell curl', 'Cable curl'],
  Triceps: ['Tricep pushdown', 'Overhead dumbbell extension', 'Skull crusher', 'Tricep dip'],
  Forearms: ['Wrist curl', 'Reverse wrist curl', "Farmer's carry", 'Dead hang'],
  Quads: ['Squat', 'Leg press', 'Bulgarian split squat', 'Leg extension'],
  Hamstrings: ['Romanian deadlift', 'Lying leg curl', 'Seated leg curl', 'Nordic curl'],
  Glutes: ['Hip thrust', 'Cable kickback (glute)', 'Hip abduction machine', 'Glute bridge'],
  Calves: ['Standing calf raise', 'Seated calf raise', 'Leg press calf raise'],
  Core: ['Hanging leg raise', 'Cable crunch', 'Ab wheel rollout', 'Plank'],
  'Full body': ['Power clean', 'Kettlebell swing', 'Burpee', 'Thruster'],
  Cardio: ['Running', 'Cycling', 'Rowing', 'Stair climber'],
  Mobility: ['Stretching', 'Yoga', 'Foam rolling'],
}

/** Ready-made workout days to start a plan from. */
export const PRESETS: { name: string; exercises: string[] }[] = [
  {
    name: 'Chest day',
    exercises: ['Bench press', 'Incline dumbbell press', 'Dumbbell fly', 'Cable fly', 'Machine chest press', 'Chest dip'],
  },
  {
    name: 'Back day',
    exercises: ['Deadlift', 'Pull-up', 'Barbell row', 'Lat pulldown', 'Seated cable row', 'Dumbbell shrug'],
  },
  {
    name: 'Leg day',
    exercises: ['Squat', 'Romanian deadlift', 'Leg press', 'Leg extension', 'Lying leg curl', 'Standing calf raise'],
  },
  {
    name: 'Shoulder day',
    exercises: ['Overhead press', 'Dumbbell shoulder press', 'Lateral raise', 'Rear delt fly', 'Face pull', 'Dumbbell shrug'],
  },
  {
    name: 'Arm day',
    exercises: ['Barbell curl', 'Hammer curl', 'Incline dumbbell curl', 'Tricep pushdown', 'Overhead dumbbell extension', 'Skull crusher'],
  },
  {
    name: 'Push',
    exercises: ['Bench press', 'Overhead press', 'Incline dumbbell press', 'Lateral raise', 'Tricep pushdown', 'Overhead cable extension'],
  },
  {
    name: 'Pull',
    exercises: ['Deadlift', 'Pull-up', 'Barbell row', 'Lat pulldown', 'Face pull', 'Hammer curl'],
  },
  {
    name: 'Upper body',
    exercises: ['Bench press', 'Barbell row', 'Overhead press', 'Lat pulldown', 'Dumbbell curl', 'Tricep pushdown'],
  },
  {
    name: 'Lower body',
    exercises: ['Squat', 'Romanian deadlift', 'Bulgarian split squat', 'Lying leg curl', 'Standing calf raise', 'Hanging leg raise'],
  },
  {
    name: 'Full body',
    exercises: ['Squat', 'Bench press', 'Barbell row', 'Overhead press', 'Romanian deadlift', 'Plank'],
  },
  {
    name: 'Dumbbells only',
    exercises: [
      'Dumbbell bench press',
      'Dumbbell row',
      'Dumbbell shoulder press',
      'Goblet squat',
      'Dumbbell Romanian deadlift',
      'Dumbbell curl',
      'Overhead dumbbell extension',
    ],
  },
  {
    name: 'Core',
    exercises: ['Hanging leg raise', 'Cable crunch', 'Ab wheel rollout', 'Russian twist', 'Plank', 'Dead bug'],
  },
  { name: 'Cardio', exercises: ['Running', 'Cycling', 'Rowing', 'Jump rope'] },
]

export function libraryEntry(name: string): LibraryExercise | undefined {
  return BY_NAME.get(name.trim().toLowerCase())
}
