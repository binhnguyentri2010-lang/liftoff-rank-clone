(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LiftoffBodygraph = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getMuscleFill(muscleRanks, muscleId, previewMode) {
    const info = muscleRanks && muscleRanks[muscleId];
    if (info && info.rating > 0 && info.tierInfo && info.tierInfo.tier) {
      return info.tierInfo.tier.color;
    }
    if (previewMode) {
      const previewPalette = {
        upper_chest: '#6374FF',
        lower_chest: '#4C5EF0',
        front_delts: '#8E62FF',
        side_delts: '#7B5CFA',
        biceps: '#5B6CFA',
        forearms: '#4958DC',
        abs: '#5171FF',
        quads: '#445CE6',
        traps: '#735FF5',
        lats: '#4B60EB',
        rear_delts: '#825FFA',
        triceps: '#5D6DFB',
        glutes: '#4658DC',
        hamstrings: '#3E51CF',
        calves: '#394BC2'
      };
      return previewPalette[muscleId] || '#4C5EF0';
    }
    return '#222844';
  }

  function buildAnteriorPaths(muscleRanks, selectedMuscleId, previewMode, interactive) {
    function attrs(mId) {
      const fill = getMuscleFill(muscleRanks, mId, previewMode);
      const isSelected = selectedMuscleId === mId;
      const stroke = isSelected ? '#FFFFFF' : '#A5C4FF';
      const strokeWidth = isSelected ? '2.2' : '0.95';
      const strokeOpacity = isSelected ? '1' : (previewMode ? '0.72' : '0.45');
      const cls = interactive ? ' class="muscle-region" data-muscle="' + mId + '"' : '';
      return cls + ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" stroke-linejoin="round" stroke-opacity="' + strokeOpacity + '"';
    }

    return (
      // Sculpted Head & Neck silhouette
      '<ellipse cx="100" cy="22" rx="11.5" ry="13.5" fill="#2A3254" stroke="#64748B" stroke-width="1"/>' +
      '<path d="M93 34 Q100 37 107 34 L109 43 Q100 45 91 43 Z" fill="#2A3254"/>' +

      // Traps (Organic sloping collar)
      '<path d="M77 46 Q86 41 92 42 L100 44 L108 42 Q114 41 123 46 L116 50 Q100 48 84 50 Z"' + attrs('traps') + '/>' +

      // Upper Chest (Clavicular pec sweep)
      '<path d="M73 50 Q86 48 99 50 L99 61 Q84 61 72 58 Z"' + attrs('upper_chest') + '/>' +
      '<path d="M101 50 Q114 48 127 50 L128 58 Q116 61 101 61 Z"' + attrs('upper_chest') + '/>' +

      // Mid & Lower Chest (Sculpted pectoral curve)
      '<path d="M72 59 Q85 62 99 62 L99 77 Q84 79 75 73 Q71 67 72 59 Z"' + attrs('lower_chest') + '/>' +
      '<path d="M101 62 Q115 62 128 59 Q129 67 125 73 Q116 79 101 77 Z"' + attrs('lower_chest') + '/>' +

      // Front Delts (Teardrop anterior shoulder cap)
      '<path d="M62 49 Q67 45 73 50 L71 66 Q63 63 62 49 Z"' + attrs('front_delts') + '/>' +
      '<path d="M138 49 Q133 45 127 50 L129 66 Q137 63 138 49 Z"' + attrs('front_delts') + '/>' +

      // Side Delts (Rounded lateral deltoid cap)
      '<path d="M55 58 Q56 48 62 49 Q63 61 62 68 Q55 65 55 58 Z"' + attrs('side_delts') + '/>' +
      '<path d="M145 58 Q144 48 138 49 Q137 61 138 68 Q145 65 145 58 Z"' + attrs('side_delts') + '/>' +

      // Lats (Anterior V-taper flare under chest)
      '<path d="M75 74 L82 78 L83 102 Q76 94 75 74 Z"' + attrs('lats') + '/>' +
      '<path d="M125 74 L118 78 L117 102 Q124 94 125 74 Z"' + attrs('lats') + '/>' +

      // Abs & Core (Anatomical 6-pack + lower V-taper)
      '<path d="M84 78 Q91 77 99 78 L99 90 L84 90 Q83 84 84 78 Z"' + attrs('abs') + '/>' +
      '<path d="M101 78 Q109 77 116 78 Q117 84 116 90 L101 90 Z"' + attrs('abs') + '/>' +
      '<path d="M84 92 L99 92 L99 104 L85 104 Q84 98 84 92 Z"' + attrs('abs') + '/>' +
      '<path d="M101 92 L116 92 Q116 98 115 104 L101 104 Z"' + attrs('abs') + '/>' +
      '<path d="M86 106 L99 106 L99 124 Q91 122 87 118 Z"' + attrs('abs') + '/>' +
      '<path d="M101 106 L114 106 L113 118 Q109 122 101 124 Z"' + attrs('abs') + '/>' +

      // Biceps (Curved fusiform belly)
      '<path d="M55 69 Q62 66 69 68 Q70 81 66 93 Q58 95 54 91 Q52 80 55 69 Z"' + attrs('biceps') + '/>' +
      '<path d="M131 68 Q138 66 145 69 Q148 80 146 91 Q142 95 134 93 Q130 81 131 68 Z"' + attrs('biceps') + '/>' +

      // Forearms (Brachioradialis taper to wrist)
      '<path d="M53 93 Q60 95 65 95 Q63 110 57 123 L50 121 Q48 106 53 93 Z"' + attrs('forearms') + '/>' +
      '<path d="M135 95 Q140 95 147 93 Q152 106 150 121 L143 123 Q137 110 135 95 Z"' + attrs('forearms') + '/>' +

      // Quadriceps (Outer vastus lateralis sweep + inner teardrop VMO)
      '<path d="M77 121 Q89 124 98 126 Q98 154 94 178 Q83 180 75 175 Q69 150 77 121 Z"' + attrs('quads') + '/>' +
      '<path d="M102 126 Q111 124 123 121 Q131 150 125 175 Q117 180 106 178 Q102 154 102 126 Z"' + attrs('quads') + '/>' +
      // Subtle anatomical quad feather lines
      '<path d="M86 132 Q84 154 87 174 M114 132 Q116 154 113 174" stroke="#E0F2FE" stroke-width="0.7" opacity="0.32" pointer-events="none"/>' +

      // Calves (Curved gastroc/tibialis contour)
      '<path d="M75 182 Q84 180 93 183 Q95 200 88 226 L79 226 Q72 202 75 182 Z"' + attrs('calves') + '/>' +
      '<path d="M107 183 Q116 180 125 182 Q128 202 121 226 L112 226 Q105 200 107 183 Z"' + attrs('calves') + '/>'
    );
  }

  function buildPosteriorPaths(muscleRanks, selectedMuscleId, previewMode, interactive) {
    function attrs(mId) {
      const fill = getMuscleFill(muscleRanks, mId, previewMode);
      const isSelected = selectedMuscleId === mId;
      const stroke = isSelected ? '#FFFFFF' : '#A5C4FF';
      const strokeWidth = isSelected ? '2.2' : '0.95';
      const strokeOpacity = isSelected ? '1' : (previewMode ? '0.72' : '0.45');
      const cls = interactive ? ' class="muscle-region" data-muscle="' + mId + '"' : '';
      return cls + ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" stroke-linejoin="round" stroke-opacity="' + strokeOpacity + '"';
    }

    return (
      '<ellipse cx="100" cy="22" rx="11.5" ry="13.5" fill="#2A3254" stroke="#64748B" stroke-width="1"/>' +
      '<path d="M93 34 L107 34 L109 43 L91 43 Z" fill="#2A3254"/>' +

      // Traps & Mid-Back kite
      '<path d="M76 46 Q100 39 124 46 L113 76 L100 90 L87 76 Z"' + attrs('traps') + '/>' +

      // Rear Delts
      '<path d="M56 52 Q63 45 75 48 L72 66 Q58 64 56 52 Z"' + attrs('rear_delts') + '/>' +
      '<path d="M144 52 Q137 45 125 48 L128 66 Q142 64 144 52 Z"' + attrs('rear_delts') + '/>' +

      // Lats (Sweeping Cobra V-Taper)
      '<path d="M72 66 L87 77 L99 113 L81 112 Q72 92 72 66 Z"' + attrs('lats') + '/>' +
      '<path d="M128 66 L113 77 L101 113 L119 112 Q128 92 128 66 Z"' + attrs('lats') + '/>' +

      // Triceps (Horseshoe)
      '<path d="M55 68 Q62 66 69 68 Q69 82 65 94 Q57 95 53 91 Q52 79 55 68 Z"' + attrs('triceps') + '/>' +
      '<path d="M131 68 Q138 66 145 68 Q148 79 147 91 Q143 95 135 94 Q131 82 131 68 Z"' + attrs('triceps') + '/>' +

      // Forearms
      '<path d="M53 93 Q60 95 65 96 Q62 110 57 123 L50 121 Q48 106 53 93 Z"' + attrs('forearms') + '/>' +
      '<path d="M135 96 Q140 95 147 93 Q152 106 150 121 L143 123 Q138 110 135 96 Z"' + attrs('forearms') + '/>' +

      // Glutes (Rounded anatomical gluteus maximus)
      '<path d="M79 114 Q90 113 99 116 L99 143 Q83 145 75 137 Q73 125 79 114 Z"' + attrs('glutes') + '/>' +
      '<path d="M101 116 Q110 113 121 114 Q127 125 125 137 Q117 145 101 143 Z"' + attrs('glutes') + '/>' +

      // Hamstrings (Biceps femoris & semitendinosus sweep)
      '<path d="M75 140 Q87 145 97 145 Q97 165 93 181 Q82 182 75 178 Q71 160 75 140 Z"' + attrs('hamstrings') + '/>' +
      '<path d="M103 145 Q113 145 125 140 Q129 160 125 178 Q118 182 107 181 Q103 165 103 145 Z"' + attrs('hamstrings') + '/>' +

      // Calves (Diamond gastrocnemius)
      '<path d="M75 184 Q85 181 94 184 Q97 199 89 227 L79 227 Q71 201 75 184 Z"' + attrs('calves') + '/>' +
      '<path d="M106 184 Q115 181 125 184 Q129 201 121 227 L111 227 Q103 199 106 184 Z"' + attrs('calves') + '/>'
    );
  }

  function renderHeroTwinBodygraph(muscleRanks, hasAnyRank) {
    const preview = !hasAnyRank;
    return (
      '<svg width="140" height="130" viewBox="28 32 180 132" fill="none" aria-hidden="true">' +
      '<g transform="translate(36, 4) scale(0.88)" opacity="0.48">' +
      buildPosteriorPaths(muscleRanks, null, preview, false) +
      '</g>' +
      '<g transform="translate(-4, 0) scale(0.95)">' +
      buildAnteriorPaths(muscleRanks, null, preview, false) +
      '</g>' +
      '</svg>'
    );
  }

  function renderInteractiveBodygraph(muscleRanks, viewMode, selectedMuscleId) {
    const isBack = viewMode === 'back';
    const inner = isBack
      ? buildPosteriorPaths(muscleRanks, selectedMuscleId, false, true)
      : buildAnteriorPaths(muscleRanks, selectedMuscleId, false, true);

    return (
      '<svg class="bodygraph-interactive-svg" viewBox="36 4 128 232" fill="none" role="img" aria-label="Anatomical Muscle Strength Rank Map">' +
      inner +
      '</svg>'
    );
  }

  return {
    renderHeroTwinBodygraph: renderHeroTwinBodygraph,
    renderInteractiveBodygraph: renderInteractiveBodygraph
  };
});
