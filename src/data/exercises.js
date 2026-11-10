(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LiftoffExercises = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MUSCLE_GROUPS = [
    { id: 'upper_chest', view: 'front', group: 'chest', nameEn: 'Upper Chest', nameVi: 'Ngực trên' },
    { id: 'lower_chest', view: 'front', group: 'chest', nameEn: 'Mid & Lower Chest', nameVi: 'Ngực giữa & dưới' },
    { id: 'front_delts', view: 'front', group: 'shoulders', nameEn: 'Front Delts', nameVi: 'Vai trước' },
    { id: 'side_delts', view: 'front', group: 'shoulders', nameEn: 'Side Delts', nameVi: 'Vai ngang' },
    { id: 'biceps', view: 'front', group: 'arms', nameEn: 'Biceps', nameVi: 'Tay trước (Biceps)' },
    { id: 'forearms', view: 'front', group: 'arms', nameEn: 'Forearms', nameVi: 'Cẳng tay' },
    { id: 'abs', view: 'front', group: 'core', nameEn: 'Abs & Core', nameVi: 'Cơ bụng (Core)' },
    { id: 'quads', view: 'front', group: 'legs', nameEn: 'Quadriceps', nameVi: 'Đùi trước (Quads)' },
    { id: 'traps', view: 'back', group: 'back', nameEn: 'Traps & Upper Back', nameVi: 'Cầu vai & Lưng trên' },
    { id: 'lats', view: 'back', group: 'back', nameEn: 'Lats', nameVi: 'Cơ xô (Lats)' },
    { id: 'rear_delts', view: 'back', group: 'shoulders', nameEn: 'Rear Delts', nameVi: 'Vai sau' },
    { id: 'triceps', view: 'back', group: 'arms', nameEn: 'Triceps', nameVi: 'Tay sau (Triceps)' },
    { id: 'glutes', view: 'back', group: 'legs', nameEn: 'Glutes', nameVi: 'Cơ mông (Glutes)' },
    { id: 'hamstrings', view: 'back', group: 'legs', nameEn: 'Hamstrings', nameVi: 'Đùi sau' },
    { id: 'calves', view: 'back', group: 'legs', nameEn: 'Calves', nameVi: 'Bắp chuối' }
  ];

  const CATEGORY_FILTERS = [
    { id: 'all', nameEn: 'All', nameVi: 'Tất cả' },
    { id: 'chest', nameEn: 'Chest', nameVi: 'Ngực' },
    { id: 'back', nameEn: 'Back', nameVi: 'Lưng - Xô' },
    { id: 'legs', nameEn: 'Legs', nameVi: 'Chân - Mông' },
    { id: 'shoulders', nameEn: 'Shoulders', nameVi: 'Vai' },
    { id: 'arms', nameEn: 'Arms', nameVi: 'Tay' },
    { id: 'core', nameEn: 'Core', nameVi: 'Bụng' }
  ];

  // ref1RM70kgMale: Estimated 1RM (in kg) corresponding to Gold Floor (Rating 400) for a 70kg male lifter.
  // For dumbbell exercises, weight is logged per single dumbbell (1 hand).
  // For bodyweight exercises (isBodyweight: true), weight input represents ADDED external weight (0 kg = bodyweight only),
  // and effective load = bodyweightKg * bwLoadFactor + addedWeightKg.
  const EXERCISES = [
    // CHEST
    {
      id: 'bench_press',
      nameEn: 'Barbell Bench Press',
      nameVi: 'Đẩy ngực thanh đòn (Bench Press)',
      category: 'chest',
      equipment: 'barbell',
      ref1RM70kgMale: 72.5,
      primaryMuscles: ['lower_chest', 'upper_chest'],
      secondaryMuscles: ['triceps', 'front_delts'],
      cueEn: 'Log total barbell + plates weight',
      cueVi: 'Nhập tổng tạ đòn + bánh tạ hai bên'
    },
    {
      id: 'incline_bench_press',
      nameEn: 'Incline Barbell Bench Press',
      nameVi: 'Đẩy ngực trên thanh đòn',
      category: 'chest',
      equipment: 'barbell',
      ref1RM70kgMale: 60.0,
      primaryMuscles: ['upper_chest'],
      secondaryMuscles: ['front_delts', 'triceps'],
      cueEn: '30-45 degree bench angle, total bar weight',
      cueVi: 'Ghế dốc 30-45 độ, tính tổng thanh đòn + tạ'
    },
    {
      id: 'incline_db_press',
      nameEn: 'Incline Dumbbell Press',
      nameVi: 'Đẩy ngực trên tạ đơn (1 bên)',
      category: 'chest',
      equipment: 'dumbbell',
      ref1RM70kgMale: 26.0,
      primaryMuscles: ['upper_chest'],
      secondaryMuscles: ['lower_chest', 'front_delts', 'triceps'],
      cueEn: 'Log weight of ONE dumbbell',
      cueVi: 'Nhập khối lượng của 1 quả tạ đơn'
    },
    {
      id: 'db_bench_press',
      nameEn: 'Flat Dumbbell Bench Press',
      nameVi: 'Đẩy ngực phẳng tạ đơn (1 bên)',
      category: 'chest',
      equipment: 'dumbbell',
      ref1RM70kgMale: 30.0,
      primaryMuscles: ['lower_chest'],
      secondaryMuscles: ['upper_chest', 'triceps', 'front_delts'],
      cueEn: 'Log weight of ONE dumbbell',
      cueVi: 'Nhập khối lượng của 1 quả tạ đơn'
    },
    {
      id: 'pec_deck_fly',
      nameEn: 'Machine Chest Fly (Pec Deck)',
      nameVi: 'Ép ngực máy (Pec Deck)',
      category: 'chest',
      equipment: 'machine',
      ref1RM70kgMale: 58.0,
      primaryMuscles: ['lower_chest', 'upper_chest'],
      secondaryMuscles: ['front_delts'],
      cueEn: 'Controlled squeeze at peak contraction',
      cueVi: 'Ép sát có kiểm soát ở đỉnh biên độ'
    },
    {
      id: 'chest_dips',
      nameEn: 'Weighted Dips',
      nameVi: 'Xà kép (Dips + tạ đeo thêm)',
      category: 'chest',
      equipment: 'bodyweight',
      isBodyweight: true,
      bwLoadFactor: 0.92,
      ref1RM70kgMale: 84.0,
      primaryMuscles: ['lower_chest', 'triceps'],
      secondaryMuscles: ['front_delts'],
      cueEn: 'Enter 0 kg if bodyweight only, or added belt weight',
      cueVi: 'Nhập 0 nếu chỉ nâng người không, hoặc nhập số kg tạ đeo thêm'
    },

    // BACK
    {
      id: 'deadlift',
      nameEn: 'Barbell Deadlift',
      nameVi: 'Kéo lưng đùi thanh đòn (Deadlift)',
      category: 'back',
      equipment: 'barbell',
      ref1RM70kgMale: 120.0,
      primaryMuscles: ['hamstrings', 'glutes', 'traps'],
      secondaryMuscles: ['lats', 'forearms'],
      cueEn: 'Conventional or sumo total bar weight',
      cueVi: 'Tổng khối lượng thanh đòn + bánh tạ'
    },
    {
      id: 'pull_ups',
      nameEn: 'Pull-Ups (Weighted / BW)',
      nameVi: 'Kéo xà đơn (Pull-Up)',
      category: 'back',
      equipment: 'bodyweight',
      isBodyweight: true,
      bwLoadFactor: 0.95,
      ref1RM70kgMale: 82.0,
      primaryMuscles: ['lats'],
      secondaryMuscles: ['biceps', 'traps', 'forearms'],
      cueEn: 'Enter 0 kg for bodyweight or added belt weight',
      cueVi: 'Nhập 0 nếu kéo người không, hoặc số kg tạ đeo thêm'
    },
    {
      id: 'lat_pulldown',
      nameEn: 'Lat Pulldown (Cable)',
      nameVi: 'Kéo xô máy cáp (Lat Pulldown)',
      category: 'back',
      equipment: 'cable',
      ref1RM70kgMale: 64.0,
      primaryMuscles: ['lats'],
      secondaryMuscles: ['biceps', 'rear_delts'],
      cueEn: 'Pull bar to upper chest without excessive lean',
      cueVi: 'Kéo thanh cầm chạm ngực trên, giữ thân ổn định'
    },
    {
      id: 'barbell_row',
      nameEn: 'Bent-Over Barbell Row',
      nameVi: 'Gập người chèo tạ đòn (Barbell Row)',
      category: 'back',
      equipment: 'barbell',
      ref1RM70kgMale: 68.0,
      primaryMuscles: ['traps', 'lats'],
      secondaryMuscles: ['rear_delts', 'biceps', 'forearms'],
      cueEn: 'Log total barbell + plates weight',
      cueVi: 'Nhập tổng khối lượng thanh đòn + tạ'
    },
    {
      id: 'seated_cable_row',
      nameEn: 'Seated Cable Row',
      nameVi: 'Ngồi kéo cáp lưng giữa',
      category: 'back',
      equipment: 'cable',
      ref1RM70kgMale: 66.0,
      primaryMuscles: ['traps', 'lats'],
      secondaryMuscles: ['biceps', 'rear_delts'],
      cueEn: 'Drive elbows back and squeeze shoulder blades',
      cueVi: 'Kéo khuỷu tay ra sau, ép chặt bả vai'
    },
    {
      id: 'db_shrug',
      nameEn: 'Dumbbell Shrugs',
      nameVi: 'Nhún cầu vai tạ đơn (1 bên)',
      category: 'back',
      equipment: 'dumbbell',
      ref1RM70kgMale: 34.0,
      primaryMuscles: ['traps'],
      secondaryMuscles: ['forearms'],
      cueEn: 'Log weight of ONE dumbbell',
      cueVi: 'Nhập khối lượng của 1 quả tạ đơn'
    },

    // LEGS
    {
      id: 'barbell_squat',
      nameEn: 'Barbell Back Squat',
      nameVi: 'Gánh tạ đòn (Back Squat)',
      category: 'legs',
      equipment: 'barbell',
      ref1RM70kgMale: 97.5,
      primaryMuscles: ['quads', 'glutes'],
      secondaryMuscles: ['hamstrings', 'abs'],
      cueEn: 'Hip crease to parallel or below, total bar weight',
      cueVi: 'Xuống đùi song song sàn, nhập tổng tạ + đòn'
    },
    {
      id: 'leg_press',
      nameEn: '45° Leg Press',
      nameVi: 'Đạp đùi máy nghiêng (Leg Press)',
      category: 'legs',
      equipment: 'machine',
      ref1RM70kgMale: 185.0,
      primaryMuscles: ['quads'],
      secondaryMuscles: ['glutes', 'hamstrings'],
      cueEn: 'Log total plates loaded on sled',
      cueVi: 'Nhập tổng số kg bánh tạ lắp trên bàn đạp'
    },
    {
      id: 'romanian_deadlift',
      nameEn: 'Romanian Deadlift (RDL)',
      nameVi: 'Deadlift đùi sau (RDL thanh đòn)',
      category: 'legs',
      equipment: 'barbell',
      ref1RM70kgMale: 92.5,
      primaryMuscles: ['hamstrings', 'glutes'],
      secondaryMuscles: ['traps', 'forearms'],
      cueEn: 'Hinge hips back keeping shins vertical',
      cueVi: 'Đẩy hông ra sau, cảm nhận căng đùi sau'
    },
    {
      id: 'hip_thrust',
      nameEn: 'Barbell Hip Thrust',
      nameVi: 'Đẩy hông thanh đòn (Hip Thrust)',
      category: 'legs',
      equipment: 'barbell',
      ref1RM70kgMale: 115.0,
      primaryMuscles: ['glutes'],
      secondaryMuscles: ['hamstrings'],
      cueEn: 'Full hip lockout at top, total bar weight',
      cueVi: 'Siết mông khóa hông ở đỉnh, nhập tổng tạ'
    },
    {
      id: 'leg_extension',
      nameEn: 'Seated Leg Extension',
      nameVi: 'Đá đùi trước máy (Leg Extension)',
      category: 'legs',
      equipment: 'machine',
      ref1RM70kgMale: 62.0,
      primaryMuscles: ['quads'],
      secondaryMuscles: [],
      cueEn: 'Pause briefly at full knee extension',
      cueVi: 'Giữ nửa giây ở đỉnh khi duỗi thẳng gối'
    },
    {
      id: 'lying_leg_curl',
      nameEn: 'Seated / Lying Leg Curl',
      nameVi: 'Cuốn đùi sau máy (Leg Curl)',
      category: 'legs',
      equipment: 'machine',
      ref1RM70kgMale: 52.0,
      primaryMuscles: ['hamstrings'],
      secondaryMuscles: ['calves'],
      cueEn: 'Control eccentric phase without lifting hips',
      cueVi: 'Hạ tạ chậm, giữ hông áp sát đệm'
    },
    {
      id: 'bulgarian_split_squat',
      nameEn: 'Bulgarian Split Squat (DB)',
      nameVi: 'Chùng chân sau ghế tạ đơn (1 bên)',
      category: 'legs',
      equipment: 'dumbbell',
      ref1RM70kgMale: 22.0,
      primaryMuscles: ['quads', 'glutes'],
      secondaryMuscles: ['hamstrings'],
      cueEn: 'Log weight of ONE dumbbell',
      cueVi: 'Nhập khối lượng 1 quả tạ đơn cầm tay'
    },
    {
      id: 'standing_calf_raise',
      nameEn: 'Standing Calf Raise',
      nameVi: 'Nhón bắp chuối máy đứng',
      category: 'legs',
      equipment: 'machine',
      ref1RM70kgMale: 95.0,
      primaryMuscles: ['calves'],
      secondaryMuscles: [],
      cueEn: 'Full stretch at bottom, pause at top',
      cueVi: 'Hạ sâu hết biên độ gót chân rồi nhón cao'
    },
    {
      id: 'seated_calf_raise',
      nameEn: 'Seated Calf Raise',
      nameVi: 'Nhón bắp chuối máy ngồi',
      category: 'legs',
      equipment: 'machine',
      ref1RM70kgMale: 60.0,
      primaryMuscles: ['calves'],
      secondaryMuscles: [],
      cueEn: 'Targets soleus muscle with bent knees',
      cueVi: 'Tập trung cơ dép bắp chân dưới'
    },

    // SHOULDERS
    {
      id: 'overhead_press',
      nameEn: 'Barbell Overhead Press (OHP)',
      nameVi: 'Đẩy vai đứng thanh đòn (OHP)',
      category: 'shoulders',
      equipment: 'barbell',
      ref1RM70kgMale: 47.5,
      primaryMuscles: ['front_delts', 'side_delts'],
      secondaryMuscles: ['triceps', 'upper_chest'],
      cueEn: 'Strict standing press without leg drive',
      cueVi: 'Đứng đẩy nghiêm không nhún chân lấy đà'
    },
    {
      id: 'db_shoulder_press',
      nameEn: 'Seated Dumbbell Shoulder Press',
      nameVi: 'Ngồi đẩy vai tạ đơn (1 bên)',
      category: 'shoulders',
      equipment: 'dumbbell',
      ref1RM70kgMale: 22.0,
      primaryMuscles: ['front_delts', 'side_delts'],
      secondaryMuscles: ['triceps'],
      cueEn: 'Log weight of ONE dumbbell',
      cueVi: 'Nhập khối lượng của 1 quả tạ đơn'
    },
    {
      id: 'arnold_press',
      nameEn: 'Arnold Dumbbell Press',
      nameVi: 'Đẩy vai xoay cổ tay (Arnold Press)',
      category: 'shoulders',
      equipment: 'dumbbell',
      ref1RM70kgMale: 19.5,
      primaryMuscles: ['front_delts'],
      secondaryMuscles: ['side_delts', 'rear_delts', 'triceps'],
      cueEn: 'Log weight of ONE dumbbell',
      cueVi: 'Nhập khối lượng của 1 quả tạ đơn'
    },
    {
      id: 'db_lateral_raise',
      nameEn: 'Dumbbell Lateral Raise',
      nameVi: 'Dang vai ngang tạ đơn (1 bên)',
      category: 'shoulders',
      equipment: 'dumbbell',
      ref1RM70kgMale: 12.0,
      primaryMuscles: ['side_delts'],
      secondaryMuscles: ['traps'],
      cueEn: 'Lead with elbows, log ONE dumbbell weight',
      cueVi: 'Nâng ngang bằng khuỷu tay, nhập 1 quả tạ đơn'
    },
    {
      id: 'cable_lateral_raise',
      nameEn: 'Single-Arm Cable Lateral Raise',
      nameVi: 'Kéo cáp vai ngang 1 tay',
      category: 'shoulders',
      equipment: 'cable',
      ref1RM70kgMale: 11.0,
      primaryMuscles: ['side_delts'],
      secondaryMuscles: [],
      cueEn: 'Constant cable tension across body',
      cueVi: 'Giữ lực căng dây cáp liên tục'
    },
    {
      id: 'face_pull',
      nameEn: 'Rope Face Pull',
      nameVi: 'Kéo dây thừng vai sau (Face Pull)',
      category: 'shoulders',
      equipment: 'cable',
      ref1RM70kgMale: 32.0,
      primaryMuscles: ['rear_delts'],
      secondaryMuscles: ['traps'],
      cueEn: 'Pull rope toward forehead with external rotation',
      cueVi: 'Kéo dây về phía trán, mở rộng hai cẳng tay'
    },
    {
      id: 'reverse_pec_deck',
      nameEn: 'Reverse Pec Deck (Rear Delt Fly)',
      nameVi: 'Bay vai sau máy (Reverse Fly)',
      category: 'shoulders',
      equipment: 'machine',
      ref1RM70kgMale: 46.0,
      primaryMuscles: ['rear_delts'],
      secondaryMuscles: ['traps'],
      cueEn: 'Sweep arms wide targeting posterior delts',
      cueVi: 'Mở rộng cánh tay tập trung cơ vai sau'
    },

    // ARMS
    {
      id: 'barbell_curl',
      nameEn: 'Barbell / EZ-Bar Bicep Curl',
      nameVi: 'Cuốn tay trước thanh đòn / đòn EZ',
      category: 'arms',
      equipment: 'barbell',
      ref1RM70kgMale: 36.0,
      primaryMuscles: ['biceps'],
      secondaryMuscles: ['forearms'],
      cueEn: 'Keep elbows pinned at sides, total bar weight',
      cueVi: 'Giữ khuỷu tay cố định sát sườn, nhập tổng tạ'
    },
    {
      id: 'incline_db_curl',
      nameEn: 'Incline Dumbbell Curl',
      nameVi: 'Cuốn tay trước ghế dốc (1 bên)',
      category: 'arms',
      equipment: 'dumbbell',
      ref1RM70kgMale: 15.0,
      primaryMuscles: ['biceps'],
      secondaryMuscles: ['forearms'],
      cueEn: 'Log weight of ONE dumbbell',
      cueVi: 'Nhập khối lượng của 1 quả tạ đơn'
    },
    {
      id: 'hammer_curl',
      nameEn: 'Dumbbell Hammer Curl',
      nameVi: 'Cuốn tạ búa tay trước & cẳng tay (1 bên)',
      category: 'arms',
      equipment: 'dumbbell',
      ref1RM70kgMale: 17.5,
      primaryMuscles: ['forearms', 'biceps'],
      secondaryMuscles: [],
      cueEn: 'Neutral grip targeting brachialis & forearms',
      cueVi: 'Cầm dọc tạ ăn sâu vào cơ cánh tay quay & cẳng tay'
    },
    {
      id: 'barbell_wrist_curl',
      nameEn: 'Seated Barbell Wrist Curl',
      nameVi: 'Cuốn cổ tay thanh đòn (Forearms)',
      category: 'arms',
      equipment: 'barbell',
      ref1RM70kgMale: 32.0,
      primaryMuscles: ['forearms'],
      secondaryMuscles: [],
      cueEn: 'Forearms resting on bench/thighs',
      cueVi: 'Đặt cẳng tay cố định trên ghế để cuốn cổ tay'
    },
    {
      id: 'tricep_pushdown',
      nameEn: 'Cable Tricep Rope Pushdown',
      nameVi: 'Nhấn cáp tay sau (Tricep Pushdown)',
      category: 'arms',
      equipment: 'cable',
      ref1RM70kgMale: 34.0,
      primaryMuscles: ['triceps'],
      secondaryMuscles: [],
      cueEn: 'Split rope apart at bottom lockout',
      cueVi: 'Tách nhẹ hai đầu dây ở điểm khóa khớp đáy'
    },
    {
      id: 'skull_crusher',
      nameEn: 'EZ-Bar Skull Crusher',
      nameVi: 'Nằm duỗi tay sau đòn EZ (Skull Crusher)',
      category: 'arms',
      equipment: 'barbell',
      ref1RM70kgMale: 34.0,
      primaryMuscles: ['triceps'],
      secondaryMuscles: [],
      cueEn: 'Lower bar behind forehead for long-head stretch',
      cueVi: 'Hạ đòn qua đỉnh đầu để kéo giãn đầu dài tay sau'
    },

    // CORE
    {
      id: 'cable_crunch',
      nameEn: 'Kneeling Cable Crunch',
      nameVi: 'Quỳ gập bụng dây cáp (Cable Crunch)',
      category: 'core',
      equipment: 'cable',
      ref1RM70kgMale: 48.0,
      primaryMuscles: ['abs'],
      secondaryMuscles: [],
      cueEn: 'Curl ribcage toward pelvis using abs, not hips',
      cueVi: 'Cuộn lồng ngực về phía hông bằng cơ bụng'
    },
    {
      id: 'hanging_leg_raise',
      nameEn: 'Hanging Leg Raise',
      nameVi: 'Treo xà nâng chân tập bụng',
      category: 'core',
      equipment: 'bodyweight',
      isBodyweight: true,
      bwLoadFactor: 0.55,
      ref1RM70kgMale: 48.0,
      primaryMuscles: ['abs'],
      secondaryMuscles: ['forearms'],
      cueEn: 'Enter 0 kg for bodyweight or ankle/dumbbell load',
      cueVi: 'Nhập 0 nếu tập người không hoặc số kg tạ kẹp chân'
    }
  ];

  const WORKOUT_PRESETS = [
    {
      id: 'push_ranked',
      nameEn: 'Push Day (Chest, Shoulders, Triceps)',
      nameVi: 'Buổi Đẩy Push (Ngực - Vai - Tay sau)',
      exerciseIds: ['bench_press', 'incline_db_press', 'overhead_press', 'db_lateral_raise', 'tricep_pushdown']
    },
    {
      id: 'pull_ranked',
      nameEn: 'Pull Day (Back, Rear Delts, Biceps)',
      nameVi: 'Buổi Kéo Pull (Lưng xô - Vai sau - Tay trước)',
      exerciseIds: ['pull_ups', 'barbell_row', 'lat_pulldown', 'face_pull', 'barbell_curl', 'hammer_curl']
    },
    {
      id: 'legs_ranked',
      nameEn: 'Leg Day (Quads, Glutes, Hamstrings, Calves)',
      nameVi: 'Buổi Chân Legs (Đùi - Mông - Bắp chuối)',
      exerciseIds: ['barbell_squat', 'romanian_deadlift', 'hip_thrust', 'leg_extension', 'standing_calf_raise']
    },
    {
      id: 'fullbody_starter',
      nameEn: 'Welcome Ranked Calibration (Big 4)',
      nameVi: 'Định hạng Sức mạnh Nhanh (4 Bài Trụ Cột)',
      exerciseIds: ['bench_press', 'barbell_squat', 'deadlift', 'pull_ups', 'cable_crunch']
    }
  ];

  const EXERCISE_BY_ID = Object.create(null);
  for (let i = 0; i < EXERCISES.length; i += 1) {
    EXERCISE_BY_ID[EXERCISES[i].id] = EXERCISES[i];
  }

  const MUSCLE_BY_ID = Object.create(null);
  for (let i = 0; i < MUSCLE_GROUPS.length; i += 1) {
    MUSCLE_BY_ID[MUSCLE_GROUPS[i].id] = MUSCLE_GROUPS[i];
  }

  return {
    MUSCLE_GROUPS: MUSCLE_GROUPS,
    MUSCLE_BY_ID: MUSCLE_BY_ID,
    CATEGORY_FILTERS: CATEGORY_FILTERS,
    EXERCISES: EXERCISES,
    EXERCISE_BY_ID: EXERCISE_BY_ID,
    WORKOUT_PRESETS: WORKOUT_PRESETS
  };
});
