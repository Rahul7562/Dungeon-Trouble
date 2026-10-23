import React from 'react';
import { CharacterClass } from '../engine/types';

/**
 * Renders the reference-accurate RPG Class Portrait (Swordsman, Archer, Mage, Necromancer)
 * for the Top-Left Hero Medallion (image_5f5e217c.png), Pause Menu Card (image_8e6ce0cb.png),
 * and Class Selection Screen (image_a1d00a81.png).
 */
export const ClassPortraitArt: React.FC<{
  heroClass: CharacterClass;
  size?: number;
  className?: string;
}> = ({ heroClass, size = 64, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id={`bg-${heroClass}`} cx="50%" cy="40%" r="60%">
          {heroClass === 'swordsman' && (
            <>
              <stop offset="0%" stopColor="#475569" />
              <stop offset="65%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </>
          )}
          {heroClass === 'archer' && (
            <>
              <stop offset="0%" stopColor="#166534" />
              <stop offset="65%" stopColor="#052e16" />
              <stop offset="100%" stopColor="#041309" />
            </>
          )}
          {heroClass === 'mage' && (
            <>
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="65%" stopColor="#172554" />
              <stop offset="100%" stopColor="#070c1e" />
            </>
          )}
          {heroClass === 'necromancer' && (
            <>
              <stop offset="0%" stopColor="#581c87" />
              <stop offset="65%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#070510" />
            </>
          )}
        </radialGradient>
        <linearGradient id="steel-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>

      {/* Portrait background */}
      <rect width="64" height="64" rx="8" fill={`url(#bg-${heroClass})`} />

      {heroClass === 'swordsman' && (
        <g>
          {/* Crimson Plume & Cape */}
          <path
            d="M32 10 C22 4, 12 10, 14 22 C18 16, 25 15, 32 16 Z"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="1.2"
          />
          <path d="M12 46 Q32 38 52 46 L56 64 L8 64 Z" fill="#991b1b" />
          {/* Silver Pauldrons & Cuirass */}
          <ellipse cx="15" cy="49" rx="11" ry="8" fill="url(#steel-grad)" stroke="#0f172a" strokeWidth="1.5" />
          <ellipse cx="49" cy="49" rx="11" ry="8" fill="url(#steel-grad)" stroke="#0f172a" strokeWidth="1.5" />
          <path
            d="M18 42 L46 42 L43 64 L21 64 Z"
            fill="url(#steel-grad)"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          {/* Golden Cross Emblem on Breastplate */}
          <path d="M32 45 L32 60 M26 51 L38 51" stroke="url(#gold-grad)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Knight Greathelm */}
          <path
            d="M20 24 C20 14, 44 14, 44 24 L43 39 L32 43 L21 39 Z"
            fill="url(#steel-grad)"
            stroke="#0f172a"
            strokeWidth="1.6"
          />
          {/* Gold Helmet Trim & Visor Slits */}
          <path d="M32 15 L32 30 M22 28 L42 28" stroke="url(#gold-grad)" strokeWidth="2" />
          <rect x="24" y="25" width="6" height="2.2" fill="#090d16" />
          <rect x="34" y="25" width="6" height="2.2" fill="#090d16" />
          {/* Breathing vents */}
          <path d="M27 33 L27 37 M30 34 L30 38 M34 34 L34 38 M37 33 L37 37" stroke="#1e293b" strokeWidth="1.3" />
        </g>
      )}

      {heroClass === 'archer' && (
        <g>
          {/* Quiver & Arrows behind shoulder */}
          <path d="M44 14 L52 17 L46 38 L39 35 Z" fill="#78350f" stroke="#451a03" strokeWidth="1.2" />
          <path d="M48 15 L53 8 M50 17 L56 11" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
          {/* Green Cloak & Shoulders */}
          <path d="M10 46 Q32 39 54 46 L58 64 L6 64 Z" fill="#14532d" stroke="#052e16" strokeWidth="1.5" />
          <path d="M18 44 L46 44 L42 64 L22 64 Z" fill="#15803d" />
          {/* Crossed Leather Straps */}
          <path d="M18 45 L44 62 M46 45 L20 62" stroke="#78350f" strokeWidth="3.5" />
          <circle cx="32" cy="53" r="3.5" fill="url(#gold-grad)" stroke="#451a03" strokeWidth="1" />
          {/* Hood & Face */}
          <path
            d="M17 36 C16 18, 26 11, 32 10 C38 11, 48 18, 47 36 L41 43 L23 43 Z"
            fill="#15803d"
            stroke="#052e16"
            strokeWidth="1.6"
          />
          <ellipse cx="32" cy="29" rx="9" ry="10" fill="#fdba74" />
          {/* Emerald Eyes */}
          <ellipse cx="28.5" cy="28" rx="1.8" ry="1.3" fill="#16a34a" />
          <ellipse cx="35.5" cy="28" rx="1.8" ry="1.3" fill="#16a34a" />
          {/* Hood Shadow */}
          <path d="M21 24 Q32 17 43 24 Q32 13 21 24 Z" fill="#052e16" opacity="0.55" />
        </g>
      )}

      {heroClass === 'mage' && (
        <g>
          {/* Glowing Staff Orb on Right */}
          <path d="M51 64 L54 32" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="54" cy="27" r="6.5" fill="#38bdf8" opacity="0.35" />
          <circle cx="54" cy="27" r="4" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" />
          {/* Royal Blue & Gold Trimmed Robes */}
          <path d="M10 46 Q32 39 54 46 L57 64 L7 64 Z" fill="#1e3a8a" stroke="url(#gold-grad)" strokeWidth="2" />
          <path d="M21 43 L32 54 L43 43" fill="none" stroke="url(#gold-grad)" strokeWidth="2.5" />
          <circle cx="32" cy="49" r="3.2" fill="#38bdf8" stroke="#fef08a" strokeWidth="1.2" />
          {/* Face */}
          <ellipse cx="31" cy="31" rx="8.5" ry="9.5" fill="#fdba74" />
          {/* Glowing Arcane Eyes */}
          <circle cx="27.5" cy="30" r="1.7" fill="#38bdf8" />
          <circle cx="34.5" cy="30" r="1.7" fill="#38bdf8" />
          {/* Pointed Wizard Hat with Gold Band */}
          <ellipse cx="31" cy="22" rx="19" ry="5.5" fill="#1d4ed8" stroke="#0f172a" strokeWidth="1.4" />
          <path
            d="M19 21 L29 4 L40 8 L43 21 Z"
            fill="#2563eb"
            stroke="#0f172a"
            strokeWidth="1.4"
          />
          <path d="M19 19 Q31 22 43 19" stroke="url(#gold-grad)" strokeWidth="3" />
        </g>
      )}

      {heroClass === 'necromancer' && (
        <g>
          {/* Skull Staff on Left */}
          <path d="M11 64 L11 28" stroke="#57534e" strokeWidth="3" />
          <circle cx="11" cy="24" r="5" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.2" />
          <circle cx="9.3" cy="23.5" r="1.2" fill="#090d16" />
          <circle cx="12.7" cy="23.5" r="1.2" fill="#090d16" />
          {/* Tattered Dark Robes & Horned Skull Pauldrons */}
          <path d="M10 47 Q32 40 54 47 L57 64 L7 64 Z" fill="#1e1b4b" stroke="#581c87" strokeWidth="1.5" />
          <circle cx="16" cy="47" r="6" fill="#e2e8f0" stroke="#334155" strokeWidth="1.2" />
          <path d="M13 43 L8 35 L17 42 Z" fill="#f8fafc" />
          <circle cx="48" cy="47" r="6" fill="#e2e8f0" stroke="#334155" strokeWidth="1.2" />
          <path d="M51 43 L56 35 L47 42 Z" fill="#f8fafc" />
          {/* Deep Hood & Shadowed Abyssal Face */}
          <path
            d="M17 38 C16 17, 25 10, 32 9 C39 10, 48 17, 47 38 L42 45 L22 45 Z"
            fill="#2e1065"
            stroke="#090d16"
            strokeWidth="1.6"
          />
          <ellipse cx="32" cy="29" rx="8.5" ry="9.5" fill="#090d16" />
          {/* Glowing Violet Eyes */}
          <ellipse cx="28.2" cy="28.5" rx="2.2" ry="1.4" fill="#e879f9" />
          <ellipse cx="35.8" cy="28.5" rx="2.2" ry="1.4" fill="#e879f9" />
        </g>
      )}
    </svg>
  );
};

/**
 * Ornate Painted Skill & Action Bar Slot Icon (Matching image_5f5e217c.png)
 */
export const ActionSlotArtwork: React.FC<{
  kind:
    | 'slash'
    | 'shield'
    | 'whirlwind'
    | 'fire'
    | 'arcane'
    | 'frost'
    | 'arrow'
    | 'multishot'
    | 'rain'
    | 'dash'
    | 'skull'
    | 'scythe'
    | 'hp_potion'
    | 'mp_potion'
    | 'town_scroll'
    | 'char_tome'
    | 'backpack'
    | 'quest_scroll'
    | 'settings_gear';
  size?: number;
}> = ({ kind, size = 38 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {kind === 'slash' && (
        <g>
          <path d="M6 34 L28 12" stroke="#f97316" strokeWidth="6" strokeLinecap="round" opacity="0.45" />
          <path d="M8 32 L33 7 L35 13 L13 35 Z" fill="#f8fafc" stroke="#475569" strokeWidth="1.2" />
          <path d="M10 30 L32 8" stroke="#fef08a" strokeWidth="1.8" />
          <path d="M7 24 L16 33" stroke="#f59e0b" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M5 35 L10 30" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}
      {kind === 'shield' && (
        <g>
          <path
            d="M20 5 L32 9 L30 23 L20 35 L10 23 L8 9 Z"
            fill="#334155"
            stroke="#fbbf24"
            strokeWidth="2.4"
          />
          <path d="M20 9 L20 31 M12 17 L28 17" stroke="#fef08a" strokeWidth="2.2" />
        </g>
      )}
      {(kind === 'whirlwind' || kind === 'frost') && (
        <g>
          <path
            d="M8 14 C16 8, 28 8, 33 14 C28 19, 12 19, 10 24 C14 29, 26 29, 31 25"
            stroke="#7dd3fc"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M12 19 C20 15, 28 17, 29 21 C25 25, 15 26, 17 32"
            stroke="#e0f2fe"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      )}
      {kind === 'fire' && (
        <g>
          <circle cx="20" cy="22" r="12" fill="#ea580c" opacity="0.35" />
          <path
            d="M20 5 C26 13, 32 17, 30 26 C28 33, 19 36, 13 32 C8 28, 9 19, 15 14 C14 19, 18 18, 20 5 Z"
            fill="#f97316"
            stroke="#fef08a"
            strokeWidth="1.4"
          />
          <path d="M20 14 C23 19, 25 23, 23 28 C21 31, 16 31, 15 27 C14 23, 18 20, 20 14 Z" fill="#fef08a" />
        </g>
      )}
      {(kind === 'arcane' || kind === 'dash') && (
        <g>
          <circle cx="20" cy="20" r="13" fill="#0284c7" opacity="0.35" />
          <path d="M20 4 L23 16 L35 20 L23 24 L20 36 L17 24 L5 20 L17 16 Z" fill="#38bdf8" />
          <circle cx="20" cy="20" r="5" fill="#e0f2fe" />
        </g>
      )}
      {(kind === 'arrow' || kind === 'multishot' || kind === 'rain') && (
        <g>
          <path d="M10 8 C26 10, 28 28, 12 32" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
          <path d="M11 9 L11 31" stroke="#e2e8f0" strokeWidth="1.2" />
          <path d="M8 20 L33 20" stroke="#fde047" strokeWidth="2.4" />
          <path d="M35 20 L28 16 L29 20 L28 24 Z" fill="#4ade80" />
        </g>
      )}
      {(kind === 'skull' || kind === 'scythe') && (
        <g>
          <circle cx="20" cy="18" r="10" fill="#e2e8f0" stroke="#581c87" strokeWidth="1.8" />
          <rect x="15" y="25" width="10" height="6" rx="1.5" fill="#cbd5e1" />
          <circle cx="16.5" cy="18" r="2.5" fill="#a855f7" />
          <circle cx="23.5" cy="18" r="2.5" fill="#a855f7" />
        </g>
      )}
      {kind === 'hp_potion' && (
        <g>
          <rect x="16" y="6" width="8" height="4" rx="1" fill="#b45309" stroke="#fde047" strokeWidth="1" />
          <path d="M17 10 L17 14 L10 22 C8 26, 11 33, 20 33 C29 33, 32 26, 30 22 L23 14 L23 10 Z" fill="#be123c" stroke="#fda4af" strokeWidth="1.5" />
          <ellipse cx="16" cy="24" rx="2.5" ry="4" transform="rotate(-20 16 24)" fill="#fecdd3" opacity="0.65" />
        </g>
      )}
      {kind === 'mp_potion' && (
        <g>
          <rect x="16" y="6" width="8" height="4" rx="1" fill="#b45309" stroke="#fde047" strokeWidth="1" />
          <path d="M17 10 L17 14 L10 22 C8 26, 11 33, 20 33 C29 33, 32 26, 30 22 L23 14 L23 10 Z" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.5" />
          <ellipse cx="16" cy="24" rx="2.5" ry="4" transform="rotate(-20 16 24)" fill="#e0f2fe" opacity="0.65" />
        </g>
      )}
      {kind === 'town_scroll' && (
        <g>
          <circle cx="20" cy="20" r="13" fill="#7e22ce" opacity="0.35" />
          <path d="M13 8 L29 8 L26 32 L10 32 Z" fill="#fef3c7" stroke="#b45309" strokeWidth="1.6" />
          <ellipse cx="21" cy="8" rx="8" ry="2.2" fill="#d97706" />
          <ellipse cx="18" cy="32" rx="8" ry="2.2" fill="#d97706" />
          <path d="M16 15 L23 15 M15 20 L22 20 M14 25 L21 25" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {kind === 'backpack' && (
        <g>
          <path d="M15 9 C15 5, 25 5, 25 9" stroke="#fbbf24" strokeWidth="2.2" fill="none" />
          <rect x="9" y="10" width="22" height="23" rx="5" fill="#92400e" stroke="#451a03" strokeWidth="1.8" />
          <path d="M9 18 Q20 22 31 18" stroke="#fbbf24" strokeWidth="1.8" fill="none" />
          <rect x="17" y="16" width="6" height="7" rx="1.5" fill="#fbbf24" stroke="#451a03" strokeWidth="1" />
        </g>
      )}
      {kind === 'char_tome' && (
        <g>
          <rect x="9" y="7" width="22" height="26" rx="2.5" fill="#991b1b" stroke="#fbbf24" strokeWidth="2" />
          <path d="M13 7 L13 33" stroke="#fbbf24" strokeWidth="1.6" />
          <circle cx="22" cy="20" r="5" fill="#fbbf24" />
          <circle cx="22" cy="20" r="2.2" fill="#38bdf8" />
        </g>
      )}
      {kind === 'quest_scroll' && (
        <g>
          <path d="M11 8 L29 8 L27 32 L9 32 Z" fill="#fde68a" stroke="#92400e" strokeWidth="1.8" />
          <rect x="8" y="6" width="24" height="4" rx="2" fill="#b45309" />
          <rect x="6" y="30" width="24" height="4" rx="2" fill="#b45309" />
          <path d="M14 15 L24 15 M14 20 L23 20 M13 25 L20 25" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {kind === 'settings_gear' && (
        <g>
          <circle cx="20" cy="20" r="10" stroke="#fbbf24" strokeWidth="4" fill="#451a03" />
          <circle cx="20" cy="20" r="4.5" fill="#fef08a" />
          <path
            d="M20 4 L20 9 M20 31 L20 36 M4 20 L9 20 M31 20 L36 20 M8.5 8.5 L12.5 12.5 M27.5 27.5 L31.5 31.5 M31.5 8.5 L27.5 12.5 M12.5 27.5 L8.5 31.5"
            stroke="#fbbf24"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
};

/**
 * Sculpted Stone Gargoyle Guardian for the Left/Right Ends of the Bottom HUD Skill Bar (Matching image_5f5e217c.png)
 */
export const GargoyleStatuette: React.FC<{ flip?: boolean; className?: string }> = ({
  flip = false,
  className = '',
}) => (
  <svg
    width="68"
    height="86"
    viewBox="0 0 68 86"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${flip ? '-scale-x-100' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="stone-garg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
    </defs>
    {/* Bat Wing Arch */}
    <path
      d="M32 32 C14 6, 2 14, 4 46 C10 40, 18 44, 22 54 Z"
      fill="url(#stone-garg)"
      stroke="#0f172a"
      strokeWidth="2"
    />
    <path
      d="M38 32 C54 8, 66 16, 64 46 C58 40, 50 44, 46 54 Z"
      fill="url(#stone-garg)"
      stroke="#0f172a"
      strokeWidth="2"
    />
    {/* Muscular crouched stone torso & claws */}
    <path
      d="M20 36 L48 36 L52 68 L16 68 Z"
      fill="url(#stone-garg)"
      stroke="#0f172a"
      strokeWidth="2"
    />
    {/* Gargoyle Horned Head */}
    <path d="M23 18 L15 7 L28 15 Z" fill="#64748b" stroke="#0f172a" strokeWidth="1.5" />
    <path d="M45 18 L53 7 L40 15 Z" fill="#64748b" stroke="#0f172a" strokeWidth="1.5" />
    <circle cx="34" cy="24" r="10.5" fill="url(#stone-garg)" stroke="#0f172a" strokeWidth="2" />
    {/* Glowing amber/stone eyes & snarl */}
    <circle cx="30" cy="23" r="1.8" fill="#fbbf24" />
    <circle cx="38" cy="23" r="1.8" fill="#fbbf24" />
    <path d="M29 29 L39 29" stroke="#0f172a" strokeWidth="2" />
    {/* Stone pedestal base & claws */}
    <rect x="10" y="68" width="48" height="14" rx="3" fill="#334155" stroke="#0f172a" strokeWidth="2" />
    <circle cx="22" cy="67" r="4.5" fill="#64748b" stroke="#0f172a" strokeWidth="1.5" />
    <circle cx="46" cy="67" r="4.5" fill="#64748b" stroke="#0f172a" strokeWidth="1.5" />
  </svg>
);
