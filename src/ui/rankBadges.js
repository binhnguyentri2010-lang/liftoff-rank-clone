(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LiftoffBadges = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TIER_PALETTES = {
    unranked: { top: '#DCE5F7', bot: '#8C9EC4', rim: '#FFFFFF', core: '#526080', accent: '#93C5FD', label: '?' },
    wood: { top: '#D49A6A', bot: '#7C4D2B', rim: '#F3CFA4', core: '#4A2C17', accent: '#E7B584', label: 'W' },
    bronze: { top: '#F09D63', bot: '#9A4E1C', rim: '#FFD0AD', core: '#5A2B0C', accent: '#FDBA8C', label: 'B' },
    silver: { top: '#F1F5F9', bot: '#8A99AD', rim: '#FFFFFF', core: '#3B4758', accent: '#E2E8F0', label: 'S' },
    gold: { top: '#FDE047', bot: '#CA8A04', rim: '#FEF9C3', core: '#6B4400', accent: '#FEF08A', label: 'G' },
    platinum: { top: '#5EEAD4', bot: '#0F766E', rim: '#CCFBF1', core: '#083D3A', accent: '#99F6E4', label: 'P' },
    diamond: { top: '#7DD3FC', bot: '#0284C7', rim: '#E0F2FE', core: '#082F49', accent: '#BAE6FD', label: 'D' },
    champion: { top: '#D8B4FE', bot: '#7E22CE', rim: '#F3E8FF', core: '#3B0764', accent: '#E9D5FF', label: 'C' },
    titan: { top: '#FDA4AF', bot: '#E11D48', rim: '#FFE4E6', core: '#4C0519', accent: '#FECDD3', label: 'T' },
    olympian: { top: '#FEF08A', bot: '#EA580C', rim: '#FFFFFF', core: '#431407', accent: '#FDE047', label: 'Ω' }
  };

  let uidCounter = 0;

  function renderRankHexBadge(tierId, sizePx) {
    const sz = Number(sizePx) || 44;
    const pal = TIER_PALETTES[tierId] || TIER_PALETTES.unranked;
    uidCounter = (uidCounter + 1) % 100000;
    const gid = 'rk_' + String(tierId) + '_' + String(uidCounter);
    const isHighTier = tierId === 'diamond' || tierId === 'champion' || tierId === 'titan' || tierId === 'olympian';
    const isCrown = tierId === 'champion' || tierId === 'titan' || tierId === 'olympian';

    let centerGlyph = '';
    if (tierId === 'unranked') {
      centerGlyph =
        '<text x="32" y="39" text-anchor="middle" fill="#64748B" font-size="23" font-weight="800" font-family="system-ui, -apple-system, sans-serif">?</text>' +
        '<path d="M18 47 L46 47" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>';
    } else if (isCrown) {
      centerGlyph =
        '<polygon points="21,39 24,25 32,31 40,25 43,39" fill="' + pal.rim + '" stroke="' + pal.core + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<circle cx="32" cy="22" r="2.3" fill="' + pal.accent + '"/>';
    } else if (isHighTier) {
      centerGlyph =
        '<polygon points="32,19 42,31 32,44 22,31" fill="' + pal.rim + '" opacity="0.92"/>' +
        '<polygon points="32,23 38,31 32,40 26,31" fill="' + pal.top + '"/>';
    } else {
      centerGlyph =
        '<polygon points="32,20 35.4,27.2 43.2,28.2 37.5,33.6 38.9,41.4 32,37.6 25.1,41.4 26.5,33.6 20.8,28.2 28.6,27.2" fill="' + pal.rim + '"/>';
    }

    const wingDecor = tierId === 'olympian' || tierId === 'titan'
      ? '<polygon points="4,24 12,20 12,34 6,31" fill="' + pal.top + '" opacity="0.9"/>' +
        '<polygon points="60,24 52,20 52,34 58,31" fill="' + pal.top + '" opacity="0.9"/>'
      : '';

    return (
      '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + gid + '" x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0%" stop-color="' + pal.top + '"/>' +
      '<stop offset="100%" stop-color="' + pal.bot + '"/>' +
      '</linearGradient>' +
      '</defs>' +
      wingDecor +
      '<polygon points="32,5 55,18.5 55,45.5 32,59 9,45.5 9,18.5" fill="url(#' + gid + ')" stroke="' + pal.rim + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<polygon points="32,11 49,21 49,43 32,53 15,43 15,21" fill="' + (tierId === 'unranked' ? '#E2E8F0' : pal.core) + '" fill-opacity="' + (tierId === 'unranked' ? '0.92' : '0.52') + '" stroke="' + pal.accent + '" stroke-width="1.2"/>' +
      centerGlyph +
      '</svg>'
    );
  }

  // Lifter holding loaded barbell illustration matching "Rank Your Workout -> Choose Exercises" crimson card
  function renderDeadliftIllustration() {
    return (
      '<svg width="58" height="58" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
      // Barbell shaft + plates
      '<line x1="6" y1="41" x2="58" y2="41" stroke="#CBD5E1" stroke-width="2.4" stroke-linecap="round"/>' +
      '<rect x="9" y="32" width="4" height="18" rx="1.5" fill="#1E293B" stroke="#64748B" stroke-width="1"/>' +
      '<rect x="14" y="34" width="3.2" height="14" rx="1" fill="#334155"/>' +
      '<rect x="51" y="32" width="4" height="18" rx="1.5" fill="#1E293B" stroke="#64748B" stroke-width="1"/>' +
      '<rect x="46.8" y="34" width="3.2" height="14" rx="1" fill="#334155"/>' +
      // Legs & Shoes
      '<path d="M28 36 L27 53" stroke="#FDBA74" stroke-width="4.2" stroke-linecap="round"/>' +
      '<path d="M36 36 L37 53" stroke="#FDBA74" stroke-width="4.2" stroke-linecap="round"/>' +
      '<rect x="24" y="52" width="6" height="3.5" rx="1.5" fill="#38BDF8"/>' +
      '<rect x="34" y="52" width="6" height="3.5" rx="1.5" fill="#38BDF8"/>' +
      // Shorts & Singlet
      '<path d="M25 22 C25 19 39 19 39 22 L38 38 L33 38 L32 33 L31 38 L26 38 Z" fill="#2563EB"/>' +
      // Arms reaching bar
      '<path d="M25 22 L22 40" stroke="#FDBA74" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path d="M39 22 L42 40" stroke="#FDBA74" stroke-width="3.6" stroke-linecap="round"/>' +
      // Head & Hair
      '<circle cx="32" cy="13.5" r="5" fill="#FDBA74"/>' +
      '<path d="M27 12.5 C27 8.5 37 8.5 37 12.5 C35 11 29 11 27 12.5 Z" fill="#1E1B4B"/>' +
      '</svg>'
    );
  }

  function renderAvatarSvg() {
    return (
      '<svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="18.5" fill="#1E293B" stroke="#60A5FA" stroke-width="2"/>' +
      '<path d="M10 35 C11 28 29 28 30 35" fill="#38BDF8"/>' +
      '<circle cx="20" cy="17" r="7" fill="#FDE68A"/>' +
      '<path d="M12.5 16 C12.5 9.5 27.5 9.5 27.5 16 C25 13 15 13 12.5 16 Z" fill="#312E81"/>' +
      '<circle cx="17.5" cy="17.5" r="1" fill="#0F172A"/>' +
      '<circle cx="22.5" cy="17.5" r="1" fill="#0F172A"/>' +
      '<path d="M18 20.5 Q20 22 22 20.5" stroke="#0F172A" stroke-width="1.2" stroke-linecap="round"/>' +
      '</svg>'
    );
  }

  function renderNavIcon(tabId, active) {
    switch (tabId) {
      case 'workout':
        return (
          '<svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
          '<g transform="rotate(-35 14 14)">' +
          '<rect x="4" y="10" width="3.5" height="8" rx="1.2" fill="#38BDF8"/>' +
          '<rect x="8" y="8" width="3.5" height="12" rx="1.2" fill="#60A5FA"/>' +
          '<rect x="11.5" y="12.5" width="5" height="3" rx="1" fill="#E2E8F0"/>' +
          '<rect x="16.5" y="8" width="3.5" height="12" rx="1.2" fill="#60A5FA"/>' +
          '<rect x="20.5" y="10" width="3.5" height="8" rx="1.2" fill="#38BDF8"/>' +
          '</g>' +
          '</svg>'
        );
      case 'home':
        return (
          '<svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
          '<path d="M5 13.2 L14 5.5 L23 13.2 V22.5 C23 23.3 22.3 24 21.5 24 H16.8 V17.5 H11.2 V24 H6.5 C5.7 24 5 23.3 5 22.5 Z" fill="' + (active ? '#60A5FA' : '#3B82F6') + '"/>' +
          '<path d="M3.5 14 L14 5 L24.5 14" stroke="#BAE6FD" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>'
        );
      case 'ranks':
        return (
          '<svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
          '<polygon points="14,3 23.5,8.5 23.5,19.5 14,25 4.5,19.5 4.5,8.5" fill="#F59E0B" stroke="#FDE68A" stroke-width="1.4"/>' +
          '<polygon points="14,8.2 15.8,11.9 19.9,12.5 16.9,15.3 17.6,19.4 14,17.5 10.4,19.4 11.1,15.3 8.1,12.5 12.2,11.9" fill="#FFFBEB"/>' +
          '</svg>'
        );
      case 'nutrition':
        return (
          '<svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
          '<path d="M14 8 C15 5 18 4 19.5 4.5 C19 6.8 17 8.2 14 8 Z" fill="#4ADE80"/>' +
          '<path d="M14 8.5 C10 8 6.5 11 6.5 15.8 C6.5 20.5 9.8 24 12.5 24 C13.5 24 14 23.4 15.5 23.4 C17 23.4 17.5 24 18.5 24 C21.2 24 23.5 20.2 23.5 15.8 C23.5 11 20 8 16 8.5 Z" fill="#EF4444"/>' +
          '<path d="M15 9.2 C18.8 9 21.8 11.6 21.8 15.8 C21.8 19.4 19.8 22.3 17.8 22.3 C16.8 22.3 16 21.8 15 21.8 Z" fill="#FDE68A" opacity="0.92"/>' +
          '</svg>'
        );
      case 'friends':
        return (
          '<svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
          '<circle cx="10.5" cy="10.5" r="3.6" fill="#60A5FA"/>' +
          '<path d="M4.5 21.5 C4.5 17.5 16.5 17.5 16.5 21.5 V23 H4.5 Z" fill="#3B82F6"/>' +
          '<circle cx="18.5" cy="11.5" r="3.1" fill="#93C5FD"/>' +
          '<path d="M14.5 21.5 C15 18.2 23.5 18.2 23.5 21.5 V23 H14.5 Z" fill="#2563EB"/>' +
          '</svg>'
        );
      case 'profile':
      default:
        return (
          '<svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
          '<circle cx="14" cy="14" r="10.5" fill="#9333EA"/>' +
          '<circle cx="14" cy="11.2" r="3.6" fill="#F3E8FF"/>' +
          '<path d="M7.8 21.2 C8.8 17.2 19.2 17.2 20.2 21.2 C18.5 23 16.4 24 14 24 C11.6 24 9.5 23 7.8 21.2 Z" fill="#E9D5FF"/>' +
          '</svg>'
        );
    }
  }

  return {
    TIER_PALETTES: TIER_PALETTES,
    renderRankHexBadge: renderRankHexBadge,
    renderDeadliftIllustration: renderDeadliftIllustration,
    renderAvatarSvg: renderAvatarSvg,
    renderNavIcon: renderNavIcon
  };
});
