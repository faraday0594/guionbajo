"""
Guionbajo — High-Quality Anatomical Phoneme Mouth SVG Generator v2.1
Specialized pedagogical updates for Fricatives & Affricates:
  • Frontal View: Realistic lips, individual teeth, tongue visibility, face context,
    voicing badges (SONORO / SORDO), acoustic vibration waves, and affricate burst sparks.
  • Sagittal View: Full vocal tract with palate, velum, uvula, pharynx, larynx,
    vocal folds, epiglottis, nasal cavity, airflow paths, focus markers.
  • Labiodental contact (/f/, /v/): Lower lip cushion firmly tucked under upper incisor in lateral view.
  • Flared protrusion (/ʃ/, /ʒ/, /tʃ/, /dʒ/): Flared protruded lips with visible incisors and air jet.
  • Affricates (/tʃ/, /dʒ/): Two-phase articulation with alveolar stop closure and explosive burst release.
  • Glottal (/h/): Relaxed open vocal tract without forced jaw drop.
"""
import os
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
TARGET_DIR = backend_dir.parent / "frontend" / "public" / "images" / "phonemes"
TARGET_DIR.mkdir(parents=True, exist_ok=True)

# ─── Color Palette ────────────────────────────────────────────────────────────
SKIN = "#ddb89a"
SKIN_DARK = "#c9956c"
LIP_TOP = "#e8788a"
LIP_BOT = "#b83b58"
LIP_DARK = "#731628"
LIP_LINE = "#8e243c"
LIP_CREASE = "#5a0e1e"
CAVITY = "#0a0103"
CAVITY_MID = "#1e060a"
TOOTH_LIGHT = "#f4f0eb"
TOOTH_DARK = "#e8e3dc"
TOOTH_STROKE = "#c4bcaf"
TONGUE_PINK = "#d4615a"
TONGUE_DARK = "#9e3b48"
TONGUE_HIGH = "#c45868"
BONE_LIGHT = "#d4c8b8"
BONE_DARK = "#a89880"
BONE_STROKE = "#8a7a65"
TISSUE_LIGHT = "#c2727e"
TISSUE_DARK = "#a35060"
TONGUE_SAG_LIGHT = "#e8856e"
TONGUE_SAG_DARK = "#c45a3c"
TONGUE_SAG_STROKE = "#9a4030"
PHARYNX = "#6a4a55"
PHARYNX_BG = "#1a1018"
NASAL_BG = "#1a1228"
NASAL_STROKE = "#4a3860"
WALL = "#7a6555"
VELUM_CLR = "#c87080"
VELUM_STROKE = "#a35060"
VOCAL_CLR = "#a878b8"
VOCAL_GLOW = "#c084fc"
VOCAL_PULSE = "#a855f7"
AIR_CYAN = "#22d3ee"
AIR_NASAL_CLR = "#f59e0b"
FOCUS_CLR = "#22d3ee"
LABEL_CLR = "#64748b"
BG_DARK = "#090D16"
BG_CARD = "#0b0f1a"


# ═══════════════════════════════════════════════════════════════════════════════
#  FRONTAL VIEW GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

def _frontal_defs(uid: str) -> str:
    return f'''  <defs>
    <linearGradient id="skinG-{uid}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="{SKIN}"/>
      <stop offset="100%" stop-color="{SKIN_DARK}"/>
    </linearGradient>
    <linearGradient id="lipG-{uid}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="{LIP_TOP}"/>
      <stop offset="100%" stop-color="{LIP_BOT}"/>
    </linearGradient>
    <radialGradient id="cavG-{uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="{CAVITY_MID}"/>
      <stop offset="100%" stop-color="{CAVITY}"/>
    </radialGradient>
  </defs>'''


def _face_context() -> str:
    """Subtle face, nostrils, and philtrum for all frontal views."""
    return f'''
  <!-- Face contour -->
  <ellipse cx="150" cy="140" rx="100" ry="120" fill="url(#skinG-{{uid}})" opacity="0.12"/>
  <!-- Nose base & nostrils -->
  <path d="M 136 72 Q 142 68 150 69 Q 158 68 164 72" fill="none" stroke="#966b4f" stroke-width="1.4" stroke-linecap="round" opacity="0.5"/>
  <ellipse cx="143" cy="73" rx="3.5" ry="1.8" fill="#2d170d" opacity="0.4"/>
  <ellipse cx="157" cy="73" rx="3.5" ry="1.8" fill="#2d170d" opacity="0.4"/>
  <!-- Philtrum -->
  <path d="M 147 75 Q 146 85 144 96" stroke="#8b5a38" stroke-width="1" stroke-linecap="round" opacity="0.3" fill="none"/>
  <path d="M 153 75 Q 154 85 156 96" stroke="#8b5a38" stroke-width="1" stroke-linecap="round" opacity="0.3" fill="none"/>'''


def _upper_teeth_row(y_top: int, count: int = 5, cx: int = 150, total_w: int = 60) -> str:
    """Generate individual upper teeth."""
    if count <= 0:
        return ""
    tooth_w = total_w / count
    start_x = cx - total_w / 2
    teeth = []
    for i in range(count):
        x = start_x + i * tooth_w
        teeth.append(
            f'    <rect x="{x:.1f}" y="{y_top}" width="{tooth_w - 1:.1f}" height="{tooth_w * 1.1:.1f}" '
            f'rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>'
        )
    return "\n".join(teeth)


def _lower_teeth_row(y_top: int, count: int = 4, cx: int = 150, total_w: int = 48) -> str:
    """Generate individual lower teeth."""
    if count <= 0:
        return ""
    tooth_w = total_w / count
    start_x = cx - total_w / 2
    teeth = []
    for i in range(count):
        x = start_x + i * tooth_w
        teeth.append(
            f'    <rect x="{x:.1f}" y="{y_top}" width="{tooth_w - 1:.1f}" height="{tooth_w * 0.85:.1f}" '
            f'rx="1.5" fill="{TOOTH_DARK}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>'
        )
    return "\n".join(teeth)


def generate_frontal_svg(
    shape_type: str,
    label: str,
    uid: str = "ph",
    voiced: bool = False,
    is_affricate: bool = False
) -> str:
    """Generate a high-quality frontal mouth SVG for the given archetype."""

    face = _face_context().replace("{uid}", uid)
    content = ""

    # Voicing indicator badge & acoustic larynx vibration
    voicing_badge = ""
    if voiced:
        voicing_badge = f'''
  <!-- Voicing Status Badge: SONORO -->
  <g transform="translate(208, 14)">
    <rect width="78" height="20" rx="10" fill="#a855f7" fill-opacity="0.18" stroke="#c084fc" stroke-width="1"/>
    <circle cx="10" cy="10" r="3.5" fill="#c084fc">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="0.6s" repeatCount="indefinite"/>
    </circle>
    <text x="21" y="13.5" fill="#e9d5ff" font-family="system-ui, sans-serif" font-size="8" font-weight="bold">SONORO</text>
  </g>
  <!-- Larynx Acoustic Waves (Vocal Vibration) -->
  <g opacity="0.8">
    <path d="M 136 222 Q 150 226 164 222" fill="none" stroke="#c084fc" stroke-width="1.8" stroke-linecap="round">
      <animate attributeName="opacity" values="0.35;1;0.35" dur="0.45s" repeatCount="indefinite"/>
    </path>
    <path d="M 130 227 Q 150 232 170 227" fill="none" stroke="#a855f7" stroke-width="1.4" stroke-linecap="round" opacity="0.6">
      <animate attributeName="opacity" values="0.7;0.2;0.7" dur="0.45s" repeatCount="indefinite"/>
    </path>
  </g>'''
    else:
        voicing_badge = f'''
  <!-- Voicing Status Badge: SORDO -->
  <g transform="translate(216, 14)">
    <rect width="70" height="20" rx="10" fill="#334155" fill-opacity="0.25" stroke="#475569" stroke-width="1"/>
    <circle cx="10" cy="10" r="3" fill="#64748b"/>
    <text x="20" y="13.5" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="8" font-weight="bold">SORDO</text>
  </g>'''

    if shape_type == "rounded_o":
        # /ɔː/, /ɒ/, /ɔɪ/ — lips form a round O with vertical oval opening
        content = f'''
  {face}
  <!-- Oral cavity (round vertical oval) -->
  <ellipse cx="150" cy="136" rx="21" ry="26" fill="url(#cavG-{uid})" stroke="{CAVITY}" stroke-width="1"/>
  <!-- Interior: tongue floor -->
  <clipPath id="clip-o-{uid}"><ellipse cx="150" cy="136" rx="21" ry="26"/></clipPath>
  <g clip-path="url(#clip-o-{uid})">
    <ellipse cx="150" cy="114" rx="18" ry="6" fill="#060002" opacity="0.6"/>
    <path d="M 126 151 C 136 144, 164 144, 174 151 C 174 164, 126 164, 126 151 Z" fill="{TONGUE_DARK}" opacity="0.85"/>
    <ellipse cx="150" cy="151" rx="14" ry="2.8" fill="{TONGUE_HIGH}" opacity="0.4"/>
  </g>
  <!-- Fleshy lip ring (even-odd) -->
  <path d="
    M 150 97 C 142 97, 130 102, 120 114 C 114 121, 114 128, 114 136
    C 114 145, 115 154, 123 163 C 133 174, 142 176, 150 176
    C 158 176, 167 174, 177 163 C 185 154, 186 145, 186 136
    C 186 128, 186 121, 180 114 C 170 102, 158 97, 150 97 Z
    M 150 110 C 138.4 110, 129 121.6, 129 136 C 129 150.4, 138.4 162, 150 162
    C 161.6 162, 171 150.4, 171 136 C 171 121.6, 161.6 110, 150 110 Z"
    fill-rule="evenodd" fill="url(#lipG-{uid})" stroke="{LIP_DARK}" stroke-width="1.2"/>
  <!-- Cupid's bow -->
  <path d="M 144 97 Q 150 101 156 97" stroke="#681222" stroke-width="1.2" fill="none" opacity="0.65"/>
  <!-- Commissures -->
  <path d="M 114 136 Q 119 136 123 136" stroke="{LIP_CREASE}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M 186 136 Q 181 136 177 136" stroke="{LIP_CREASE}" stroke-width="1.6" stroke-linecap="round"/>
  <!-- Inner rim -->
  <ellipse cx="150" cy="136" rx="21" ry="26" fill="none" stroke="#480815" stroke-width="1.4" opacity="0.75"/>
  <!-- Pucker creases -->
  <path d="M 124 122 Q 128 125 132 128" stroke="#701528" stroke-width="1" opacity="0.5" fill="none" stroke-linecap="round"/>
  <path d="M 176 122 Q 172 125 168 128" stroke="#701528" stroke-width="1" opacity="0.5" fill="none" stroke-linecap="round"/>
  <path d="M 124 150 Q 128 147 132 144" stroke="#701528" stroke-width="1" opacity="0.5" fill="none" stroke-linecap="round"/>
  <path d="M 176 150 Q 172 147 168 144" stroke="#701528" stroke-width="1" opacity="0.5" fill="none" stroke-linecap="round"/>
  <!-- Highlights -->
  <ellipse cx="150" cy="168" rx="14" ry="3.5" fill="white" opacity="0.25"/>
  <ellipse cx="141" cy="104" rx="6" ry="2" fill="white" opacity="0.2" transform="rotate(-10 141 104)"/>
  <ellipse cx="159" cy="104" rx="6" ry="2" fill="white" opacity="0.2" transform="rotate(10 159 104)"/>'''

    elif shape_type == "rounded_tight":
        # /uː/, /ʊ/, /w/, /r/ — tight pursed circular lips
        content = f'''
  {face}
  <!-- Small circular aperture -->
  <ellipse cx="150" cy="136" rx="13" ry="15" fill="url(#cavG-{uid})" stroke="{CAVITY}" stroke-width="1"/>
  <!-- Puckered lip ring -->
  <path d="
    M 150 104 C 140 104, 126 112, 122 122 C 118 130, 118 142, 122 150
    C 126 158, 138 166, 150 166 C 162 166, 174 158, 178 150
    C 182 142, 182 130, 178 122 C 174 112, 160 104, 150 104 Z
    M 150 121 C 142.8 121, 137 127.7, 137 136 C 137 144.3, 142.8 151, 150 151
    C 157.2 151, 163 144.3, 163 136 C 163 127.7, 157.2 121, 150 121 Z"
    fill-rule="evenodd" fill="url(#lipG-{uid})" stroke="{LIP_DARK}" stroke-width="1.2"/>
  <!-- Inner rim -->
  <ellipse cx="150" cy="136" rx="13" ry="15" fill="none" stroke="#480815" stroke-width="1.4" opacity="0.75"/>
  <!-- Pucker lines -->
  <path d="M 128 125 L 133 129" stroke="#701528" stroke-width="1" opacity="0.55" stroke-linecap="round"/>
  <path d="M 172 125 L 167 129" stroke="#701528" stroke-width="1" opacity="0.55" stroke-linecap="round"/>
  <path d="M 128 147 L 133 143" stroke="#701528" stroke-width="1" opacity="0.55" stroke-linecap="round"/>
  <path d="M 172 147 L 167 143" stroke="#701528" stroke-width="1" opacity="0.55" stroke-linecap="round"/>
  <!-- Highlights -->
  <ellipse cx="150" cy="159" rx="10" ry="2.8" fill="white" opacity="0.25"/>
  <ellipse cx="150" cy="111" rx="8" ry="2" fill="white" opacity="0.18"/>'''

    elif shape_type == "spread":
        # /iː/, /ɪ/, /e/, /j/, /eɪ/, /ɪə/ — smile/spread lips
        content = f'''
  {face}
  <!-- Upper lip -->
  <path d="M 92 135 C 108 120, 130 118, 150 122 C 170 118, 192 120, 208 135 C 190 130, 170 129, 150 130 C 130 129, 110 130, 92 135 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Oral cavity -->
  <ellipse cx="150" cy="135" rx="55" ry="8" fill="url(#cavG-{uid})" stroke="#220306" stroke-width="1"/>
  <!-- Upper teeth (individual) -->
  <clipPath id="clip-sp-{uid}"><ellipse cx="150" cy="135" rx="55" ry="8"/></clipPath>
  <g clip-path="url(#clip-sp-{uid})">
{_upper_teeth_row(126, 5, 150, 64)}
{_lower_teeth_row(137, 4, 150, 48)}
  </g>
  <!-- Lower lip -->
  <path d="M 92 135 C 112 140, 132 141, 150 141 C 168 141, 188 140, 208 135 C 196 156, 176 162, 150 162 C 124 162, 104 156, 92 135 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Lower lip highlight -->
  <ellipse cx="150" cy="153" rx="20" ry="3.5" fill="white" opacity="0.22"/>'''

    elif shape_type == "spread_narrow":
        # /s/, /z/ — sibilant smile, incisors closely occluded, narrow high-frequency friction channel
        content = f'''
  {face}
  <!-- Upper lip in tense sibilant smile -->
  <path d="M 95 134 C 110 122, 132 120, 150 123 C 168 120, 190 122, 205 134 C 190 130, 170 129, 150 130 C 130 129, 110 130, 95 134 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Oral cavity with dental occlusion -->
  <ellipse cx="150" cy="135" rx="52" ry="7" fill="url(#cavG-{uid})" stroke="#220306" stroke-width="1"/>
  <clipPath id="clip-sn-{uid}"><ellipse cx="150" cy="135" rx="52" ry="7"/></clipPath>
  <g clip-path="url(#clip-sn-{uid})">
{_upper_teeth_row(127, 5, 150, 60)}
    <!-- Central sibilant jet groove indicator -->
    <line x1="140" y1="135" x2="160" y2="135" stroke="#38bdf8" stroke-width="1.4" stroke-dasharray="2 2" opacity="0.8"/>
{_lower_teeth_row(136, 4, 150, 48)}
  </g>
  <!-- Lower lip -->
  <path d="M 95 134 C 112 139, 132 140, 150 140 C 168 140, 188 139, 205 134 C 194 154, 174 160, 150 160 C 126 160, 106 154, 95 134 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Sibilant airflow highlight -->
  <ellipse cx="150" cy="152" rx="18" ry="3.2" fill="white" opacity="0.22"/>'''

    elif shape_type in ("flared_sh", "flared_affricate"):
        # /ʃ/, /ʒ/ (flared_sh) and /tʃ/, /dʒ/ (flared_affricate)
        # Flared protruded trumpet lips with visible, closely aligned incisors
        is_aff = shape_type == "flared_affricate" or is_affricate
        burst_effect = ""
        if is_aff:
            burst_effect = f'''
  <!-- Affricate Plosive-Fricative Release Burst Sparks -->
  <g stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" opacity="0.9">
    <line x1="116" y1="126" x2="106" y2="118"/>
    <line x1="112" y1="136" x2="100" y2="136"/>
    <line x1="116" y1="146" x2="106" y2="154"/>
    <line x1="184" y1="126" x2="194" y2="118"/>
    <line x1="188" y1="136" x2="200" y2="136"/>
    <line x1="184" y1="146" x2="194" y2="154"/>
  </g>
  <!-- Mini burst label -->
  <text x="150" y="88" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="8" font-weight="bold" text-anchor="middle" letter-spacing="1">EXPLOSION + SALIDA FRICATIVA</text>'''

        content = f'''
  {face}
  <!-- Oral cavity inside flared lips -->
  <ellipse cx="150" cy="136" rx="26" ry="18" fill="url(#cavG-{uid})" stroke="{CAVITY}" stroke-width="1"/>
  <clipPath id="clip-flared-{uid}"><ellipse cx="150" cy="136" rx="26" ry="18"/></clipPath>
  <g clip-path="url(#clip-flared-{uid})">
    <!-- Upper teeth closely aligned behind flared lips -->
    <rect x="127" y="123" width="10" height="12" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="138.5" y="122" width="11" height="13" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="151" y="122" width="11" height="13" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="163.5" y="123" width="10" height="12" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <!-- Narrow turbulent air jet slit between dental arches -->
    <line x1="125" y1="135.5" x2="175" y2="135.5" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.75"/>
    <!-- Lower teeth closely aligned -->
    <rect x="130" y="137" width="9.5" height="10" rx="1.5" fill="{TOOTH_DARK}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="140.5" y="136.5" width="10" height="10.5" rx="1.5" fill="{TOOTH_DARK}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="151.5" y="136.5" width="10" height="10.5" rx="1.5" fill="{TOOTH_DARK}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="162" y="137" width="9.5" height="10" rx="1.5" fill="{TOOTH_DARK}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
  </g>
  <!-- Flared protruded fleshy lips (trumpet-like protrusion) -->
  <path d="
    M 150 98 C 136 98, 118 106, 112 118 C 106 128, 106 144, 112 154
    C 118 166, 136 174, 150 174 C 164 174, 182 166, 188 154
    C 194 144, 194 128, 188 118 C 182 106, 164 98, 150 98 Z
    M 150 118 C 137 118, 126 126, 126 136 C 126 146, 137 154, 150 154
    C 163 154, 174 146, 174 136 C 174 126, 163 118, 150 118 Z"
    fill-rule="evenodd" fill="url(#lipG-{uid})" stroke="{LIP_DARK}" stroke-width="1.2"/>
  <!-- Rim highlight -->
  <ellipse cx="150" cy="136" rx="24" ry="18" fill="none" stroke="#480815" stroke-width="1.2" opacity="0.6"/>
  <!-- Protrusion radial creases -->
  <path d="M 120 120 Q 125 125 130 128" stroke="{LIP_CREASE}" stroke-width="1" opacity="0.6" fill="none" stroke-linecap="round"/>
  <path d="M 180 120 Q 175 125 170 128" stroke="{LIP_CREASE}" stroke-width="1" opacity="0.6" fill="none" stroke-linecap="round"/>
  <path d="M 120 152 Q 125 147 130 144" stroke="{LIP_CREASE}" stroke-width="1" opacity="0.6" fill="none" stroke-linecap="round"/>
  <path d="M 180 152 Q 175 147 170 144" stroke="{LIP_CREASE}" stroke-width="1" opacity="0.6" fill="none" stroke-linecap="round"/>
  <!-- Fleshy highlights -->
  <ellipse cx="150" cy="166" rx="14" ry="3.5" fill="white" opacity="0.25"/>
  <ellipse cx="150" cy="106" rx="10" ry="2.5" fill="white" opacity="0.2"/>
  {burst_effect}'''

    elif shape_type == "labiodental":
        # /f/, /v/ — upper incisors resting on inner cushion of lower lip
        content = f'''
  {face}
  <!-- Upper lip -->
  <path d="M 98 130 C 114 118, 132 116, 150 119 C 168 116, 186 118, 202 130 C 186 126, 168 125, 150 126 C 132 125, 114 126, 98 130 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Cavity behind teeth -->
  <ellipse cx="150" cy="132" rx="44" ry="10" fill="url(#cavG-{uid})"/>
  <!-- Upper teeth pressing on lower lip -->
  <g>
    <rect x="130" y="123" width="12" height="14" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.6"/>
    <rect x="144" y="122" width="13" height="15" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.6"/>
    <rect x="159" y="123" width="12" height="14" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.6"/>
  </g>
  <!-- Lower lip tucked under incisors -->
  <path d="M 98 133 C 118 139, 134 140, 150 140 C 166 140, 182 139, 202 133 C 190 158, 172 163, 150 163 C 128 163, 110 158, 98 133 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Friction contact line -->
  <path d="M 126 139 Q 150 141 174 139" stroke="#7a182c" stroke-width="1.2" fill="none"/>
  <ellipse cx="150" cy="154" rx="16" ry="3.5" fill="white" opacity="0.2"/>'''

    elif shape_type == "interdental":
        # /θ/, /ð/ — tongue tip visible between incisors
        content = f'''
  {face}
  <!-- Upper lip -->
  <path d="M 98 135 C 114 122, 132 120, 150 123 C 168 120, 186 122, 202 135 C 186 130, 168 128, 150 129 C 132 128, 114 130, 98 135 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Cavity -->
  <ellipse cx="150" cy="135" rx="44" ry="14" fill="url(#cavG-{uid})" stroke="#220306" stroke-width="1"/>
  <clipPath id="clip-id-{uid}"><ellipse cx="150" cy="135" rx="44" ry="14"/></clipPath>
  <g clip-path="url(#clip-id-{uid})">
    <!-- Upper teeth -->
    <rect x="130" y="124" width="12" height="13" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="144" y="123" width="13" height="14" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="159" y="124" width="12" height="13" rx="1.5" fill="{TOOTH_LIGHT}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <!-- TONGUE TIP visible protruding between teeth -->
    <ellipse cx="150" cy="135" rx="20" ry="8" fill="{TONGUE_PINK}" stroke="#b33d35" stroke-width="1"/>
    <!-- Lower teeth -->
    <rect x="135" y="141" width="11" height="9" rx="1.5" fill="{TOOTH_DARK}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="148" y="141" width="11" height="9" rx="1.5" fill="{TOOTH_DARK}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
    <rect x="161" y="141" width="11" height="9" rx="1.5" fill="{TOOTH_DARK}" stroke="{TOOTH_STROKE}" stroke-width="0.5"/>
  </g>
  <!-- Lower lip -->
  <path d="M 98 135 C 114 141, 132 143, 150 143 C 168 143, 186 141, 202 135 C 190 158, 172 163, 150 163 C 128 163, 110 158, 98 135 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <ellipse cx="150" cy="154" rx="16" ry="3.5" fill="white" opacity="0.2"/>'''

    elif shape_type == "neutral_open":
        # /h/ — Relaxed open vocal tract, air flowing freely without forced dropped jaw
        content = f'''
  {face}
  <!-- Relaxed open oral cavity -->
  <ellipse cx="150" cy="136" rx="36" ry="18" fill="url(#cavG-{uid})" stroke="#220306" stroke-width="1"/>
  <clipPath id="clip-no-{uid}"><ellipse cx="150" cy="136" rx="36" ry="18"/></clipPath>
  <g clip-path="url(#clip-no-{uid})">
{_upper_teeth_row(124, 4, 150, 48)}
    <!-- Resting flat tongue floor -->
    <path d="M 115 146 Q 150 143 185 146 L 185 160 L 115 160 Z" fill="{TONGUE_PINK}" opacity="0.8"/>
{_lower_teeth_row(142, 3, 150, 36)}
    <!-- Free glottal breath flow indicator -->
    <ellipse cx="150" cy="136" rx="14" ry="4" fill="#38bdf8" opacity="0.25"/>
  </g>
  <!-- Relaxed lips -->
  <path d="M 106 136 C 118 123, 134 121, 150 124 C 166 121, 182 123, 194 136 C 180 131, 166 129, 150 130 C 134 129, 120 131, 106 136 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <path d="M 106 136 C 118 143, 134 146, 150 146 C 166 146, 182 143, 194 136 C 184 156, 168 162, 150 162 C 132 162, 116 156, 106 136 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <ellipse cx="150" cy="154" rx="14" ry="3.5" fill="white" opacity="0.2"/>'''

    elif shape_type == "wide_open":
        # /ɑː/, /ʌ/, /aɪ/, /aʊ/ — jaw dropped, large opening
        content = f'''
  {face}
  <!-- Upper lip -->
  <path d="M 104 126 C 118 112, 134 110, 150 114 C 166 110, 182 112, 196 126 C 182 122, 168 120, 150 121 C 132 120, 118 122, 104 126 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Large oral cavity -->
  <ellipse cx="150" cy="140" rx="42" ry="28" fill="url(#cavG-{uid})" stroke="#220306" stroke-width="1.2"/>
  <!-- Teeth + tongue inside cavity -->
  <clipPath id="clip-w-{uid}"><ellipse cx="150" cy="140" rx="42" ry="28"/></clipPath>
  <g clip-path="url(#clip-w-{uid})">
{_upper_teeth_row(116, 4, 150, 56)}
    <!-- Tongue floor -->
    <path d="M 110 152 C 130 144, 170 144, 190 152 L 190 175 L 110 175 Z" fill="{TONGUE_PINK}"/>
{_lower_teeth_row(156, 2, 150, 26)}
  </g>
  <!-- Lower lip -->
  <path d="M 104 126 C 118 150, 134 162, 150 162 C 166 162, 182 150, 196 126 C 188 170, 174 182, 150 182 C 126 182, 112 170, 104 126 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <ellipse cx="150" cy="174" rx="16" ry="4" fill="white" opacity="0.22"/>'''

    elif shape_type == "wide_open_low":
        # /æ/ — wider and lower
        content = f'''
  {face}
  <!-- Upper lip -->
  <path d="M 100 124 C 116 108, 134 106, 150 110 C 166 106, 184 108, 200 124 C 184 120, 168 118, 150 119 C 132 118, 116 120, 100 124 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Extra-large oral cavity -->
  <ellipse cx="150" cy="142" rx="46" ry="32" fill="url(#cavG-{uid})" stroke="#220306" stroke-width="1.2"/>
  <clipPath id="clip-wl-{uid}"><ellipse cx="150" cy="142" rx="46" ry="32"/></clipPath>
  <g clip-path="url(#clip-wl-{uid})">
{_upper_teeth_row(114, 4, 150, 58)}
    <path d="M 106 156 C 126 146, 174 146, 194 156 L 194 180 L 106 180 Z" fill="{TONGUE_PINK}"/>
    <ellipse cx="150" cy="155" rx="22" ry="3" fill="{TONGUE_HIGH}" opacity="0.5"/>
{_lower_teeth_row(160, 2, 150, 28)}
  </g>
  <!-- Lower lip -->
  <path d="M 100 124 C 116 152, 134 166, 150 166 C 166 166, 184 152, 200 124 C 190 174, 174 188, 150 188 C 126 188, 110 174, 100 124 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <ellipse cx="150" cy="178" rx="16" ry="4" fill="white" opacity="0.22"/>'''

    elif shape_type == "closed":
        # /p/, /b/, /m/ — lips completely sealed
        content = f'''
  {face}
  <!-- Upper lip (sealed) -->
  <path d="M 98 135 C 114 122, 132 120, 150 123 C 168 120, 186 122, 202 135 C 188 136, 170 136, 150 136 C 130 136, 112 136, 98 135 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Sealed seam line -->
  <path d="M 98 135 Q 150 137 202 135" stroke="#541220" stroke-width="1.8" fill="none"/>
  <!-- Lower lip (sealed) -->
  <path d="M 98 135 C 112 136, 130 136, 150 136 C 170 136, 188 136, 202 135 C 192 158, 172 163, 150 163 C 128 163, 108 158, 98 135 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Highlight -->
  <ellipse cx="150" cy="153" rx="16" ry="3.5" fill="white" opacity="0.2"/>'''

    elif shape_type == "neutral":
        # /ə/, /ɜː/, /t/, /d/, /k/, /g/, /n/, /ŋ/, /l/, /eə/ — relaxed neutral
        content = f'''
  {face}
  <!-- Upper lip -->
  <path d="M 104 135 C 118 122, 134 120, 150 124 C 166 120, 182 122, 196 135 C 182 129, 166 127, 150 128 C 134 127, 118 129, 104 135 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <!-- Moderate cavity -->
  <ellipse cx="150" cy="135" rx="38" ry="12" fill="url(#cavG-{uid})" stroke="#220306" stroke-width="1"/>
  <clipPath id="clip-n-{uid}"><ellipse cx="150" cy="135" rx="38" ry="12"/></clipPath>
  <g clip-path="url(#clip-n-{uid})">
{_upper_teeth_row(125, 4, 150, 52)}
{_lower_teeth_row(137, 3, 150, 36)}
  </g>
  <!-- Lower lip -->
  <path d="M 104 135 C 118 141, 134 143, 150 143 C 166 143, 182 141, 196 135 C 186 158, 168 164, 150 164 C 132 164, 114 158, 104 135 Z"
    fill="url(#lipG-{uid})" stroke="{LIP_LINE}" stroke-width="1.2"/>
  <ellipse cx="150" cy="155" rx="15" ry="3.5" fill="white" opacity="0.2"/>'''

    else:
        # Fallback to neutral
        return generate_frontal_svg("neutral", label, uid, voiced, is_affricate)

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" width="100%" height="100%">
{_frontal_defs(uid)}
  <rect width="300" height="260" rx="16" fill="{BG_CARD}"/>
{voicing_badge}
{content}
  <text x="150" y="245" fill="{LABEL_CLR}" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">{label}</text>
</svg>'''
    return svg


# ═══════════════════════════════════════════════════════════════════════════════
#  SAGITTAL / LATERAL VIEW GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

VELUM_RAISED = "M 215 95 Q 228 108 232 122 Q 234 132 230 142"
VELUM_LOWERED = "M 215 95 Q 222 115 218 140 Q 215 158 210 170"

def generate_lateral_svg(
    tongue_path: str,
    air_path: str,
    label: str,
    uid: str = "ph",
    voiced: bool = False,
    nasal: bool = False,
    focus_x: int = 100,
    focus_y: int = 100,
    velum: str = VELUM_RAISED,
    uvula_y: int = 150,
    jaw_drop: int = 0,
    lip_closed: bool = False,
    is_labiodental: bool = False,
    is_protruded_lips: bool = False,
    is_affricate: bool = False,
    tex1: str = "",
    tex2: str = "",
) -> str:
    """Generate a detailed sagittal/lateral vocal tract SVG."""

    # Vocal folds rendering
    if voiced:
        vocal_folds = f'''
      <circle cx="0" cy="0" r="5" fill="none" stroke="{VOCAL_GLOW}" stroke-width="1.5" opacity="0.9">
        <animate attributeName="r" values="5;18;5" dur="0.9s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.9;0;0.9" dur="0.9s" repeatCount="indefinite"/>
      </circle>
      <circle cx="0" cy="0" r="3.5" fill="{VOCAL_PULSE}">
        <animate attributeName="opacity" values="0.35;1;0.35" dur="0.45s" repeatCount="indefinite"/>
      </circle>'''
    else:
        vocal_folds = f'<circle cx="0" cy="0" r="2.5" fill="#475569" opacity="0.5"/>'

    # Nasal airflow
    nasal_air = ""
    if nasal:
        nasal_air = f'''
    <path d="M 218 120 Q 180 65 120 55 Q 100 55 75 70" fill="none" stroke="{AIR_NASAL_CLR}"
      stroke-width="2.2" stroke-linecap="round" stroke-dasharray="6 6" opacity="0.85">
      <animate attributeName="stroke-dashoffset" values="40;0" dur="0.85s" repeatCount="indefinite"/>
    </path>'''

    # Lip contour adjustments
    if lip_closed:
        # Bilabial stop / nasal (/p/, /b/, /m/)
        upper_lip = f'<path d="M 68 125 Q 60 128 58 132 Q 56 128 60 122 Q 65 118 72 120" fill="{VELUM_CLR}" stroke="{VELUM_STROKE}" stroke-width="1.5" opacity="0.85"/>'
        lower_lip = f'<path d="M 68 {133 + jaw_drop} Q 60 {130 + jaw_drop} 58 {132} Q 56 {136} 60 {140 + jaw_drop} Q 65 {145 + jaw_drop} 72 {142 + jaw_drop}" fill="{VELUM_CLR}" stroke="#b07060" stroke-width="1.5" opacity="0.85"/>'
        lip_seal = f'<line x1="56" y1="132" x2="72" y2="132" stroke="{LIP_DARK}" stroke-width="2.5" stroke-linecap="round"/>'
    elif is_labiodental:
        # Labiodental fricative (/f/, /v/): lower lip cushion tucked under upper incisor at (78, 130)
        upper_lip = f'<path d="M 68 125 Q 60 128 58 132 Q 60 135 68 138" fill="{VELUM_CLR}" stroke="{VELUM_STROKE}" stroke-width="1.5" opacity="0.85"/>'
        lower_lip = f'''<!-- Lower lip tucked under upper incisor (Labiodental Contact) -->
  <path d="M 82 133 Q 76 130 68 135 Q 60 143 62 165 Q 66 185 78 198"
    fill="none" stroke="#b07060" stroke-width="2.8" stroke-linecap="round" opacity="0.85"/>
  <ellipse cx="78" cy="132" rx="5" ry="4" fill="{VELUM_CLR}" stroke="{VELUM_STROKE}" stroke-width="1" opacity="0.9"/>
  <line x1="72" y1="130" x2="84" y2="130" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2 2"/>'''
        lip_seal = ""
    elif is_protruded_lips:
        # Protruded trumpet lips (/ʃ/, /ʒ/, /tʃ/, /dʒ/)
        upper_lip = f'''<!-- Upper lip protruded forward -->
  <path d="M 70 120 Q 52 122 50 128 Q 52 133 66 135" fill="{VELUM_CLR}" stroke="{VELUM_STROKE}" stroke-width="1.8" opacity="0.9"/>'''
        lower_lip = f'''<!-- Lower lip protruded forward -->
  <path d="M 68 138 Q 52 140 50 146 Q 52 154 62 170 Q 68 188 78 198"
    fill="none" stroke="#b07060" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
  <path d="M 68 138 Q 52 140 50 146 Q 52 152 64 152 Z" fill="{VELUM_CLR}" opacity="0.85"/>'''
        lip_seal = ""
    else:
        upper_lip = f'<path d="M 68 125 Q 60 128 58 132 Q 60 135 68 138" fill="{VELUM_CLR}" stroke="{VELUM_STROKE}" stroke-width="1.5" opacity="0.85"/>'
        lower_lip = f'''<path d="M 68 {155 + jaw_drop} Q 60 {165 + jaw_drop} 62 {178 + jaw_drop} Q 68 {192 + jaw_drop} 78 {198 + jaw_drop}"
      fill="none" stroke="#b07060" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>'''
        lip_seal = ""

    # Affricate burst effect marker in sagittal profile
    affricate_burst = ""
    if is_affricate:
        affricate_burst = f'''
  <!-- Affricate Stop-Release Burst Symbol -->
  <g transform="translate({focus_x}, {focus_y})">
    <circle cx="0" cy="0" r="4" fill="#38bdf8">
      <animate attributeName="r" values="3;9;3" dur="0.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.8s" repeatCount="indefinite"/>
    </circle>
    <path d="M -6 -6 L -11 -11 M 6 -6 L 11 -11 M 0 -7 L 0 -13 M 7 0 L 13 0 M -7 0 L -13 0"
      stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
  </g>'''

    # Tongue texture
    tex_content = ""
    if tex1:
        tex_content += f'\n    <path d="{tex1}" fill="none" stroke="#b86855" stroke-width="0.8" opacity="0.4"/>'
    if tex2:
        tex_content += f'\n    <path d="{tex2}" fill="none" stroke="#b86855" stroke-width="0.6" opacity="0.3"/>'

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 340" width="100%" height="100%">
  <defs>
    <linearGradient id="tngG-{uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{TONGUE_SAG_LIGHT}"/>
      <stop offset="100%" stop-color="{TONGUE_SAG_DARK}"/>
    </linearGradient>
    <linearGradient id="boneG-{uid}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="{BONE_LIGHT}"/>
      <stop offset="100%" stop-color="{BONE_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="340" rx="16" fill="{BG_CARD}"/>

  <!-- Outer face profile -->
  <path d="M 130 20 Q 115 30 110 50 Q 108 70 95 85 Q 80 95 72 100 Q 78 108 82 112 Q 72 118 68 125"
    fill="none" stroke="{WALL}" stroke-width="2" opacity="0.65"/>
  <path d="M 68 160 Q 65 180 72 200 Q 85 225 110 240"
    fill="none" stroke="{WALL}" stroke-width="2" opacity="0.65"/>

  <!-- Nasal Cavity -->
  <path d="M 95 55 Q 105 45 180 48 Q 215 50 225 65 L 220 75 Q 200 62 140 60 Q 105 62 95 70 Z"
    fill="{NASAL_BG}" stroke="{NASAL_STROKE}" stroke-width="1.2" opacity="0.85"/>

  <!-- Hard Palate -->
  <path d="M 95 75 Q 100 90 140 98 Q 180 105 215 95 Q 220 85 220 75"
    fill="url(#boneG-{uid})" stroke="{BONE_STROKE}" stroke-width="1.8" opacity="0.9"/>
  <!-- Alveolar Ridge -->
  <circle cx="98" cy="88" r="5" fill="#c4b49a" stroke="{BONE_STROKE}" stroke-width="1" opacity="0.65"/>

  <!-- Upper Incisor -->
  <path d="M 78 108 L 82 108 L 84 130 L 76 130 Z" fill="#f0ebe4" stroke="#b8ad9a" stroke-width="1"/>

  <!-- Upper Lip -->
  {upper_lip}
  {lip_seal}

  <!-- Lower Teeth (with jaw drop) -->
  <g transform="translate(0, {jaw_drop})">
    <path d="M 76 146 L 84 146 L 82 162 L 78 162 Z" fill="{TOOTH_DARK}" stroke="#b8ad9a" stroke-width="1"/>
  </g>

  <!-- Lower Lip -->
  {lower_lip}

  <!-- Pharynx -->
  <path d="M 240 75 Q 248 100 252 140 Q 255 180 255 220 Q 252 260 248 290"
    fill="none" stroke="{PHARYNX}" stroke-width="2.5" opacity="0.6"/>
  <path d="M 220 75 Q 240 75 248 100 Q 252 140 255 180 Q 255 220 252 260 L 235 280
    Q 230 250 228 220 Q 225 180 222 140 Q 220 100 220 75 Z"
    fill="{PHARYNX_BG}" opacity="0.5"/>

  <!-- Velum (Soft Palate) & Uvula -->
  <path d="{velum}" fill="none" stroke="{VELUM_CLR}" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="230" cy="{uvula_y}" rx="5" ry="8" fill="{VELUM_CLR}" stroke="{VELUM_STROKE}" stroke-width="1"/>

  <!-- Epiglottis -->
  <path d="M 230 225 Q 225 210 228 195 Q 232 185 238 180" fill="none" stroke="#8a7050" stroke-width="3" stroke-linecap="round" opacity="0.65"/>

  <!-- Larynx / Trachea -->
  <path d="M 222 260 Q 218 275 220 295 Q 222 310 225 325" fill="none" stroke="#5a4a55" stroke-width="2" opacity="0.5"/>
  <path d="M 248 260 Q 252 275 250 295 Q 248 310 245 325" fill="none" stroke="#5a4a55" stroke-width="2" opacity="0.5"/>
  <line x1="224" y1="280" x2="246" y2="280" stroke="#4a3a45" stroke-width="1.5" opacity="0.4"/>
  <line x1="223" y1="295" x2="247" y2="295" stroke="#4a3a45" stroke-width="1.5" opacity="0.4"/>
  <line x1="224" y1="310" x2="246" y2="310" stroke="#4a3a45" stroke-width="1.5" opacity="0.4"/>

  <!-- Vocal Folds -->
  <g transform="translate(235, 255)">
    <line x1="-8" y1="-3" x2="0" y2="0" stroke="{VOCAL_CLR}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="8" y1="-3" x2="0" y2="0" stroke="{VOCAL_CLR}" stroke-width="2.5" stroke-linecap="round"/>
    {vocal_folds}
  </g>

  <!-- Floor of mouth -->
  <path d="M 78 165 Q 100 185 140 200 Q 180 210 210 225 Q 225 235 235 250" fill="none" stroke="#6a4a50" stroke-width="1.5" opacity="0.4"/>

  <!-- Tongue Body -->
  <path d="{tongue_path}" fill="url(#tngG-{uid})" stroke="{TONGUE_SAG_STROKE}" stroke-width="1.8"/>
  {tex_content}

  <!-- Articulatory Focus Marker -->
  <circle cx="{focus_x}" cy="{focus_y}" r="6" fill="{FOCUS_CLR}" opacity="0.75"/>
  <circle cx="{focus_x}" cy="{focus_y}" r="10" fill="none" stroke="{FOCUS_CLR}" stroke-width="1.2" opacity="0.35"/>

  <!-- Oral Airflow -->
  <path d="{air_path}" fill="none" stroke="{AIR_CYAN}" stroke-width="2.2" stroke-linecap="round"
    stroke-dasharray="6 6" opacity="0.85">
    <animate attributeName="stroke-dashoffset" values="40;0" dur="0.85s" repeatCount="indefinite"/>
  </path>

  {affricate_burst}
  {nasal_air}

  <!-- Anatomical Labels -->
  <g font-size="8" fill="{LABEL_CLR}" font-family="monospace" opacity="0.7">
    <text x="130" y="50">C. Nasal</text>
    <text x="130" y="108">Paladar Duro</text>
    <text x="250" y="120">Velo</text>
    <text x="260" y="200">Faringe</text>
    <text x="252" y="252">Laringe</text>
  </g>

  <text x="200" y="330" fill="{LABEL_CLR}" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">{label}</text>
</svg>'''
    return svg


# ═══════════════════════════════════════════════════════════════════════════════
#  PHONEME MAP — 44 English Phonemes with Unique Parameters
# ═══════════════════════════════════════════════════════════════════════════════

PHONEME_MAP = {
    # ─── SHORT VOWELS ─────────────────────────────────────────────────────────
    "/ɪ/": {
        "file": "vowel_short_i",
        "frontal": "spread", "f_lbl": "Labios Relajados Sonrientes",
        "tongue": "M 86 145 Q 100 108 135 100 Q 165 102 190 130 Q 208 162 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 155 Z",
        "tex1": "M 105 130 Q 140 112 170 125", "tex2": "M 112 152 Q 145 138 172 150",
        "air": "M 235 235 C 235 185, 230 140, 218 126 C 200 108, 168 106, 138 108 C 105 110, 75 125, 50 134",
        "s_lbl": "Lengua Alta Anterior (Laxa)", "voiced": True, "nasal": False,
        "focus_x": 138, "focus_y": 102, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/e/": {
        "file": "vowel_short_e",
        "frontal": "spread", "f_lbl": "Labios Abiertos Medios",
        "tongue": "M 85 152 Q 102 128 130 125 Q 162 128 190 148 Q 208 170 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 85 152 Z",
        "tex1": "M 102 142 Q 132 130 165 140", "tex2": "M 110 160 Q 140 148 168 158",
        "air": "M 230 185 Q 165 125 50 134",
        "s_lbl": "Lengua Media Anterior", "voiced": True, "nasal": False,
        "focus_x": 122, "focus_y": 126, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/æ/": {
        "file": "vowel_short_ae",
        "frontal": "wide_open_low", "f_lbl": "Mandíbula Abierta Baja",
        "tongue": "M 84 156 Q 100 142 125 140 Q 155 148 185 168 Q 205 188 218 210 Q 212 230 182 232 Q 142 226 112 210 Q 86 188 84 156 Z",
        "tex1": "M 102 152 Q 130 145 162 158", "tex2": "M 108 170 Q 138 162 168 172",
        "air": "M 230 190 Q 165 140 50 142",
        "s_lbl": "Lengua Plana y Baja", "voiced": True, "nasal": False,
        "focus_x": 118, "focus_y": 140, "velum": VELUM_RAISED, "uvula_y": 150,
        "jaw_drop": 8,
    },
    "/ʌ/": {
        "file": "vowel_short_wedge",
        "frontal": "wide_open", "f_lbl": "Boca Neutra Abierta",
        "tongue": "M 85 155 Q 100 145 130 145 Q 160 150 185 165 Q 205 185 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 172 Z",
        "tex1": "M 102 155 Q 135 150 165 158", "tex2": "M 108 172 Q 140 165 170 172",
        "air": "M 230 190 Q 160 145 50 145",
        "s_lbl": "Lengua Media Central", "voiced": True, "nasal": False,
        "focus_x": 140, "focus_y": 148, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ɒ/": {
        "file": "vowel_short_o",
        "frontal": "rounded_o", "f_lbl": "Labios Ovalados Redondos",
        "tongue": "M 85 158 Q 98 155 125 155 Q 160 158 188 168 Q 208 190 218 212 Q 212 232 182 234 Q 142 228 112 212 Q 86 192 85 172 Z",
        "tex1": "M 102 165 Q 135 160 168 165", "tex2": "M 110 180 Q 142 175 172 180",
        "air": "M 230 192 Q 175 158 50 146",
        "s_lbl": "Lengua Baja Posterior", "voiced": True, "nasal": False,
        "focus_x": 175, "focus_y": 158, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ʊ/": {
        "file": "vowel_short_upsilon",
        "frontal": "rounded_tight", "f_lbl": "Labios Redondeados Suaves",
        "tongue": "M 84 155 Q 105 150 135 142 Q 170 120 198 122 Q 215 155 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 84 158 Z",
        "tex1": "M 105 155 Q 138 145 168 135", "tex2": "M 112 170 Q 145 158 175 150",
        "air": "M 230 188 Q 168 122 50 132",
        "s_lbl": "Lengua Casi Alta Posterior", "voiced": True, "nasal": False,
        "focus_x": 185, "focus_y": 122, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ə/": {
        "file": "vowel_schwa",
        "frontal": "neutral", "f_lbl": "Boca Relajada Total (Schwa)",
        "tongue": "M 85 152 Q 105 142 135 140 Q 165 142 190 155 Q 210 175 218 205 Q 212 228 182 230 Q 142 224 112 206 Q 86 185 85 160 Z",
        "tex1": "M 105 148 Q 135 142 165 148", "tex2": "M 110 165 Q 140 158 168 165",
        "air": "M 230 188 Q 165 140 50 134",
        "s_lbl": "Lengua en Reposo Central", "voiced": True, "nasal": False,
        "focus_x": 140, "focus_y": 142, "velum": VELUM_RAISED, "uvula_y": 150,
    },

    # ─── LONG VOWELS ──────────────────────────────────────────────────────────
    "/iː/": {
        "file": "vowel_long_i",
        "frontal": "spread", "f_lbl": "Sonrisa Amplia y Tensa",
        "tongue": "M 86 145 Q 100 108 135 100 Q 165 102 190 130 Q 208 162 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 155 Z",
        "tex1": "M 105 130 Q 140 112 170 125", "tex2": "M 112 152 Q 145 138 172 150",
        "air": "M 230 180 Q 170 100 50 128",
        "s_lbl": "Lengua Alta Frontal Tensa", "voiced": True, "nasal": False,
        "focus_x": 125, "focus_y": 102, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ɑː/": {
        "file": "vowel_long_a",
        "frontal": "wide_open", "f_lbl": "Boca Abierta ('Ah')",
        "tongue": "M 85 158 Q 95 155 120 158 Q 155 165 185 178 Q 205 195 218 215 Q 212 232 182 234 Q 142 228 112 212 Q 86 192 85 172 Z",
        "tex1": "M 100 165 Q 135 158 165 168", "tex2": "M 108 180 Q 142 172 172 180",
        "air": "M 232 195 Q 180 155 50 148",
        "s_lbl": "Lengua Retraída en Fondo", "voiced": True, "nasal": False,
        "focus_x": 140, "focus_y": 162, "velum": VELUM_RAISED, "uvula_y": 150,
        "jaw_drop": 10,
    },
    "/ɔː/": {
        "file": "vowel_long_o",
        "frontal": "rounded_o", "f_lbl": "Labios en Círculo 'O'",
        "tongue": "M 84 158 Q 105 155 135 148 Q 172 118 198 122 Q 215 155 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 84 158 Z",
        "tex1": "M 105 152 Q 138 140 168 135", "tex2": "M 112 168 Q 142 155 175 152",
        "air": "M 230 190 Q 170 125 50 135",
        "s_lbl": "Lengua Media-Baja Fondo", "voiced": True, "nasal": False,
        "focus_x": 185, "focus_y": 120, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/uː/": {
        "file": "vowel_long_u",
        "frontal": "rounded_tight", "f_lbl": "Labios Tubulares Cerrados",
        "tongue": "M 84 158 Q 105 155 132 145 Q 170 110 200 112 Q 216 150 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 84 158 Z",
        "tex1": "M 105 150 Q 140 132 172 125", "tex2": "M 112 165 Q 145 150 176 142",
        "air": "M 230 190 Q 165 118 50 132",
        "s_lbl": "Lengua Elevada al Velo", "voiced": True, "nasal": False,
        "focus_x": 195, "focus_y": 112, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ɜː/": {
        "file": "vowel_long_er",
        "frontal": "neutral", "f_lbl": "Labios Neutros Medios",
        "tongue": "M 85 150 Q 105 135 135 130 Q 165 132 192 145 Q 210 168 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 180 85 150 Z",
        "tex1": "M 105 142 Q 135 135 165 140", "tex2": "M 112 160 Q 140 152 170 158",
        "air": "M 230 185 Q 165 130 50 132",
        "s_lbl": "Lengua Compacta Central", "voiced": True, "nasal": False,
        "focus_x": 145, "focus_y": 132, "velum": VELUM_RAISED, "uvula_y": 150,
    },

    # ─── DIPHTHONGS ───────────────────────────────────────────────────────────
    "/eɪ/": {
        "file": "diphthong_ei",
        "frontal": "spread", "f_lbl": "Desliza a Sonrisa",
        "tongue": "M 85 150 Q 102 122 132 118 Q 162 122 190 142 Q 208 168 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 180 85 150 Z",
        "tex1": "M 102 138 Q 135 125 168 135", "tex2": "M 110 158 Q 140 145 170 155",
        "air": "M 230 184 Q 168 118 50 130",
        "s_lbl": "Lengua Sube a Frontal", "voiced": True, "nasal": False,
        "focus_x": 125, "focus_y": 118, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/aɪ/": {
        "file": "diphthong_ai",
        "frontal": "wide_open", "f_lbl": "Abierta a Sonrisa",
        "tongue": "M 85 156 Q 100 138 128 132 Q 158 140 186 160 Q 206 182 218 205 Q 212 228 182 230 Q 142 225 112 210 Q 86 188 85 162 Z",
        "tex1": "M 102 148 Q 132 140 165 150", "tex2": "M 108 168 Q 138 158 168 168",
        "air": "M 230 188 Q 165 132 50 136",
        "s_lbl": "Sube de Piso a Paladar", "voiced": True, "nasal": False,
        "focus_x": 125, "focus_y": 130, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ɔɪ/": {
        "file": "diphthong_oi",
        "frontal": "rounded_o", "f_lbl": "Redonda a Sonrisa Plana",
        "tongue": "M 85 155 Q 105 148 135 138 Q 168 122 195 125 Q 212 155 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 85 158 Z",
        "tex1": "M 105 150 Q 138 138 168 132", "tex2": "M 112 168 Q 142 155 172 150",
        "air": "M 230 188 Q 168 128 50 134",
        "s_lbl": "Fondo hacia Techo Anterior", "voiced": True, "nasal": False,
        "focus_x": 165, "focus_y": 128, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/aʊ/": {
        "file": "diphthong_au",
        "frontal": "wide_open", "f_lbl": "Abierta a Círculo Pequeño",
        "tongue": "M 85 156 Q 102 145 132 140 Q 165 130 195 128 Q 214 158 218 205 Q 212 228 182 230 Q 142 225 112 210 Q 86 188 85 162 Z",
        "tex1": "M 102 152 Q 135 145 165 140", "tex2": "M 108 170 Q 140 162 170 158",
        "air": "M 230 190 Q 165 138 50 138",
        "s_lbl": "Sube y Retrocede al Velo", "voiced": True, "nasal": False,
        "focus_x": 155, "focus_y": 140, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/əʊ/": {
        "file": "diphthong_ou",
        "frontal": "rounded_tight", "f_lbl": "Neutra a Redondeada",
        "tongue": "M 85 152 Q 105 145 135 138 Q 168 125 196 122 Q 214 155 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 85 158 Z",
        "tex1": "M 105 148 Q 138 138 168 132", "tex2": "M 112 165 Q 142 155 172 150",
        "air": "M 230 188 Q 165 132 50 134",
        "s_lbl": "Centro hacia Posterior", "voiced": True, "nasal": False,
        "focus_x": 160, "focus_y": 135, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ɪə/": {
        "file": "diphthong_ia",
        "frontal": "spread", "f_lbl": "Sonrisa a Neutra",
        "tongue": "M 85 150 Q 102 120 132 116 Q 165 125 190 145 Q 208 170 218 202 Q 212 226 182 228 Q 142 222 112 202 Q 86 180 85 150 Z",
        "tex1": "M 102 138 Q 135 125 168 135", "tex2": "M 110 158 Q 140 145 170 155",
        "air": "M 230 184 Q 168 120 50 132",
        "s_lbl": "Alta Frontal a Centro", "voiced": True, "nasal": False,
        "focus_x": 130, "focus_y": 120, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/eə/": {
        "file": "diphthong_ea",
        "frontal": "neutral", "f_lbl": "Media Abierta a Neutra",
        "tongue": "M 85 152 Q 102 130 132 128 Q 165 135 190 150 Q 208 172 218 204 Q 212 228 182 230 Q 142 224 112 204 Q 86 182 85 152 Z",
        "tex1": "M 102 142 Q 132 132 165 140", "tex2": "M 110 162 Q 140 150 168 160",
        "air": "M 230 186 Q 165 130 50 134",
        "s_lbl": "Media Frontal a Centro", "voiced": True, "nasal": False,
        "focus_x": 130, "focus_y": 130, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ʊə/": {
        "file": "diphthong_ua",
        "frontal": "rounded_tight", "f_lbl": "Redondeada a Relajada",
        "tongue": "M 85 155 Q 105 148 135 140 Q 170 122 198 125 Q 215 155 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 85 158 Z",
        "tex1": "M 105 152 Q 138 142 168 135", "tex2": "M 112 168 Q 142 155 172 150",
        "air": "M 230 188 Q 168 128 50 134",
        "s_lbl": "Alta Posterior a Centro", "voiced": True, "nasal": False,
        "focus_x": 170, "focus_y": 130, "velum": VELUM_RAISED, "uvula_y": 150,
    },

    # ─── FRICATIVES ───────────────────────────────────────────────────────────
    "/f/": {
        "file": "fricative_f",
        "frontal": "labiodental", "f_lbl": "Dientes en Labio Inferior",
        "tongue": "M 82 155 Q 100 148 130 150 Q 165 158 195 178 Q 210 198 218 218 Q 212 232 182 232 Q 142 226 112 208 Q 86 188 82 165 Z",
        "tex1": "M 102 160 Q 135 155 165 165", "tex2": "M 108 175 Q 142 170 172 180",
        "air": "M 230 185 Q 160 140 65 132",
        "s_lbl": "Fricción Labiodental Sorda", "voiced": False, "nasal": False,
        "focus_x": 78, "focus_y": 132, "velum": VELUM_RAISED, "uvula_y": 150,
        "is_labiodental": True,
    },
    "/v/": {
        "file": "fricative_v",
        "frontal": "labiodental", "f_lbl": "Dientes en Labio + Vibración",
        "tongue": "M 82 155 Q 100 148 130 150 Q 165 158 195 178 Q 210 198 218 218 Q 212 232 182 232 Q 142 226 112 208 Q 86 188 82 165 Z",
        "tex1": "M 102 160 Q 135 155 165 165", "tex2": "M 108 175 Q 142 170 172 180",
        "air": "M 230 185 Q 160 140 65 132",
        "s_lbl": "Fricción Labiodental Sonora", "voiced": True, "nasal": False,
        "focus_x": 78, "focus_y": 132, "velum": VELUM_RAISED, "uvula_y": 150,
        "is_labiodental": True,
    },
    "/θ/": {
        "file": "fricative_th_voiceless",
        "frontal": "interdental", "f_lbl": "Lengua Entre Dientes (Sorda)",
        "tongue": "M 78 138 Q 88 128 108 126 Q 140 130 170 148 Q 200 168 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 78 162 Z",
        "tex1": "M 98 148 Q 128 138 155 150", "tex2": "M 108 165 Q 138 155 168 165",
        "air": "M 230 190 Q 170 135 55 132",
        "s_lbl": "Aire Suave Interdental", "voiced": False, "nasal": False,
        "focus_x": 78, "focus_y": 132, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ð/": {
        "file": "fricative_th_voiced",
        "frontal": "interdental", "f_lbl": "Lengua Entre Dientes (Voz)",
        "tongue": "M 78 138 Q 88 128 108 126 Q 140 130 170 148 Q 200 168 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 78 162 Z",
        "tex1": "M 98 148 Q 128 138 155 150", "tex2": "M 108 165 Q 138 155 168 165",
        "air": "M 230 190 Q 170 135 55 132",
        "s_lbl": "Zumbido Interdental Sonoro", "voiced": True, "nasal": False,
        "focus_x": 78, "focus_y": 132, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/s/": {
        "file": "fricative_s",
        "frontal": "spread_narrow", "f_lbl": "Dientes Juntos Sonrientes (Sorda)",
        "tongue": "M 84 140 Q 92 128 115 125 Q 145 132 175 155 Q 200 172 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 84 160 Z",
        "tex1": "M 100 150 Q 130 140 158 150", "tex2": "M 108 165 Q 138 156 168 165",
        "air": "M 230 185 Q 160 128 50 132",
        "s_lbl": "Canal Estrecho Alveolar", "voiced": False, "nasal": False,
        "focus_x": 92, "focus_y": 126, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/z/": {
        "file": "fricative_z",
        "frontal": "spread_narrow", "f_lbl": "Dientes Juntos + Zumbido (Voz)",
        "tongue": "M 84 140 Q 92 128 115 125 Q 145 132 175 155 Q 200 172 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 84 160 Z",
        "tex1": "M 100 150 Q 130 140 158 150", "tex2": "M 108 165 Q 138 156 168 165",
        "air": "M 230 185 Q 160 128 50 132",
        "s_lbl": "Alveolar Sonoro Vibrante", "voiced": True, "nasal": False,
        "focus_x": 92, "focus_y": 126, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/ʃ/": {
        "file": "fricative_sh",
        "frontal": "flared_sh", "f_lbl": "Labios Abocinados ('Shhh')",
        "tongue": "M 85 148 Q 100 118 130 110 Q 160 108 185 130 Q 205 160 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 85 148 Z",
        "tex1": "M 105 138 Q 135 122 165 130", "tex2": "M 110 158 Q 140 145 170 155",
        "air": "M 230 180 Q 160 108 50 130",
        "s_lbl": "Dorso Elevado Posalveolar", "voiced": False, "nasal": False,
        "focus_x": 118, "focus_y": 112, "velum": VELUM_RAISED, "uvula_y": 150,
        "is_protruded_lips": True,
    },
    "/ʒ/": {
        "file": "fricative_zh",
        "frontal": "flared_sh", "f_lbl": "Labios 'Sh' + Cuerdas Voz",
        "tongue": "M 85 148 Q 100 118 130 110 Q 160 108 185 130 Q 205 160 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 85 148 Z",
        "tex1": "M 105 138 Q 135 122 165 130", "tex2": "M 110 158 Q 140 145 170 155",
        "air": "M 230 180 Q 160 108 50 130",
        "s_lbl": "Posalveolar Sonoro Suave", "voiced": True, "nasal": False,
        "focus_x": 118, "focus_y": 112, "velum": VELUM_RAISED, "uvula_y": 150,
        "is_protruded_lips": True,
    },
    "/h/": {
        "file": "fricative_h",
        "frontal": "neutral_open", "f_lbl": "Boca Relajada (Aliento Glotal)",
        "tongue": "M 85 158 Q 100 152 130 150 Q 165 158 195 178 Q 210 198 218 218 Q 212 232 182 232 Q 142 226 112 208 Q 86 188 85 170 Z",
        "tex1": "M 102 162 Q 135 158 165 165", "tex2": "M 108 178 Q 142 172 172 180",
        "air": "M 235 255 Q 170 145 50 140",
        "s_lbl": "Aliento Glotal Libre", "voiced": False, "nasal": False,
        "focus_x": 235, "focus_y": 255, "velum": VELUM_RAISED, "uvula_y": 150,
    },

    # ─── AFFRICATES ───────────────────────────────────────────────────────────
    "/tʃ/": {
        "file": "affricate_ch",
        "frontal": "flared_affricate", "f_lbl": "Explosión Rápida 'CH' (Sorda)",
        "tongue": "M 85 145 Q 95 115 125 105 Q 155 100 185 125 Q 205 158 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 85 148 Z",
        "tex1": "M 102 132 Q 132 115 162 125", "tex2": "M 110 155 Q 140 142 168 152",
        "air": "M 230 175 Q 155 102 50 128",
        "s_lbl": "Cierre Alveolar + Salida Sh", "voiced": False, "nasal": False,
        "focus_x": 108, "focus_y": 105, "velum": VELUM_RAISED, "uvula_y": 150,
        "is_protruded_lips": True,
        "is_affricate": True,
    },
    "/dʒ/": {
        "file": "affricate_j",
        "frontal": "flared_affricate", "f_lbl": "Explosión Sonora 'J' (Voz)",
        "tongue": "M 85 145 Q 95 115 125 105 Q 155 100 185 125 Q 205 158 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 85 148 Z",
        "tex1": "M 102 132 Q 132 115 162 125", "tex2": "M 110 155 Q 140 142 168 152",
        "air": "M 230 175 Q 155 102 50 128",
        "s_lbl": "Cierre Alveolar + Voz Zh", "voiced": True, "nasal": False,
        "focus_x": 108, "focus_y": 105, "velum": VELUM_RAISED, "uvula_y": 150,
        "is_protruded_lips": True,
        "is_affricate": True,
    },

    # ─── PLOSIVES ─────────────────────────────────────────────────────────────
    "/p/": {
        "file": "plosive_p",
        "frontal": "closed", "f_lbl": "Labios Sellados (Sordo)",
        "tongue": "M 85 155 Q 100 150 130 150 Q 165 158 195 178 Q 210 198 218 218 Q 212 232 182 232 Q 142 226 112 208 Q 86 188 85 170 Z",
        "tex1": "M 102 162 Q 135 155 165 165", "tex2": "M 108 178 Q 142 170 172 180",
        "air": "M 230 190 Q 160 138 70 138",
        "s_lbl": "Explosión de Aire P", "voiced": False, "nasal": False,
        "focus_x": 70, "focus_y": 138, "velum": VELUM_RAISED, "uvula_y": 150,
        "lip_closed": True,
    },
    "/b/": {
        "file": "plosive_b",
        "frontal": "closed", "f_lbl": "Labios Sellados + Voz",
        "tongue": "M 85 155 Q 100 150 130 150 Q 165 158 195 178 Q 210 198 218 218 Q 212 232 182 232 Q 142 226 112 208 Q 86 188 85 170 Z",
        "tex1": "M 102 162 Q 135 155 165 165", "tex2": "M 108 178 Q 142 170 172 180",
        "air": "M 230 190 Q 160 138 70 138",
        "s_lbl": "Explosión Vocalizada B", "voiced": True, "nasal": False,
        "focus_x": 70, "focus_y": 138, "velum": VELUM_RAISED, "uvula_y": 150,
        "lip_closed": True,
    },
    "/t/": {
        "file": "plosive_t",
        "frontal": "neutral", "f_lbl": "Dientes Entreabiertos",
        "tongue": "M 80 120 Q 95 98 120 120 Q 150 135 180 155 Q 205 175 218 205 Q 212 228 182 230 Q 142 225 112 208 Q 86 188 80 150 Z",
        "tex1": "M 102 135 Q 132 135 165 148", "tex2": "M 108 155 Q 140 150 170 162",
        "air": "M 230 185 Q 155 120 95 100",
        "s_lbl": "Punta Sella Encía Superior", "voiced": False, "nasal": False,
        "focus_x": 95, "focus_y": 100, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/d/": {
        "file": "plosive_d",
        "frontal": "neutral", "f_lbl": "Dientes Entreabiertos + Voz",
        "tongue": "M 80 120 Q 95 98 120 120 Q 150 135 180 155 Q 205 175 218 205 Q 212 228 182 230 Q 142 225 112 208 Q 86 188 80 150 Z",
        "tex1": "M 102 135 Q 132 135 165 148", "tex2": "M 108 155 Q 140 150 170 162",
        "air": "M 230 185 Q 155 120 95 100",
        "s_lbl": "Toque Alveolar Sonoro", "voiced": True, "nasal": False,
        "focus_x": 95, "focus_y": 100, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/k/": {
        "file": "plosive_k",
        "frontal": "neutral", "f_lbl": "Mandíbula Media Abierta",
        "tongue": "M 84 158 Q 110 150 145 140 Q 185 108 210 110 Q 218 145 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 84 158 Z",
        "tex1": "M 108 152 Q 140 142 175 128", "tex2": "M 115 168 Q 145 158 178 145",
        "air": "M 230 185 Q 185 130 50 136",
        "s_lbl": "Dorso Sella Velo del Paladar", "voiced": False, "nasal": False,
        "focus_x": 195, "focus_y": 110, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/g/": {
        "file": "plosive_g",
        "frontal": "neutral", "f_lbl": "Mandíbula Media + Voz",
        "tongue": "M 84 158 Q 110 150 145 140 Q 185 108 210 110 Q 218 145 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 84 158 Z",
        "tex1": "M 108 152 Q 140 142 175 128", "tex2": "M 115 168 Q 145 158 178 145",
        "air": "M 230 185 Q 185 130 50 136",
        "s_lbl": "Cierre Velar Sonoro", "voiced": True, "nasal": False,
        "focus_x": 195, "focus_y": 110, "velum": VELUM_RAISED, "uvula_y": 150,
    },

    # ─── NASALS ───────────────────────────────────────────────────────────────
    "/m/": {
        "file": "nasal_m",
        "frontal": "closed", "f_lbl": "Labios Cerrados (Nasal)",
        "tongue": "M 85 155 Q 100 148 130 150 Q 165 158 195 178 Q 210 198 218 218 Q 212 232 182 232 Q 142 226 112 208 Q 86 188 85 170 Z",
        "tex1": "M 102 162 Q 135 155 165 165", "tex2": "M 108 178 Q 142 170 172 180",
        "air": "",  # Pure nasal
        "s_lbl": "Resonancia 100% Nasal", "voiced": True, "nasal": True,
        "focus_x": 70, "focus_y": 138, "velum": VELUM_LOWERED, "uvula_y": 178,
        "lip_closed": True,
    },
    "/n/": {
        "file": "nasal_n",
        "frontal": "neutral", "f_lbl": "Boca Ligeramente Abierta",
        "tongue": "M 80 120 Q 95 98 120 120 Q 150 135 180 155 Q 205 175 218 205 Q 212 228 182 230 Q 142 225 112 208 Q 86 188 80 150 Z",
        "tex1": "M 102 135 Q 132 135 165 148", "tex2": "M 108 155 Q 140 150 170 162",
        "air": "",  # Pure nasal
        "s_lbl": "Punta Sella Encía (Nasal)", "voiced": True, "nasal": True,
        "focus_x": 95, "focus_y": 100, "velum": VELUM_LOWERED, "uvula_y": 178,
    },
    "/ŋ/": {
        "file": "nasal_ng",
        "frontal": "neutral", "f_lbl": "Boca Abierta Relajada",
        "tongue": "M 84 158 Q 110 150 145 140 Q 185 108 210 110 Q 218 145 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 84 158 Z",
        "tex1": "M 108 152 Q 140 142 175 128", "tex2": "M 115 168 Q 145 158 178 145",
        "air": "",  # Pure nasal
        "s_lbl": "Sello Velar sin 'G' dura", "voiced": True, "nasal": True,
        "focus_x": 195, "focus_y": 115, "velum": VELUM_LOWERED, "uvula_y": 178,
    },

    # ─── APPROXIMANTS / LIQUIDS / GLIDES ──────────────────────────────────────
    "/l/": {
        "file": "approximant_l",
        "frontal": "neutral", "f_lbl": "Boca Entreabierta",
        "tongue": "M 80 122 Q 95 102 120 125 Q 150 140 180 160 Q 205 180 218 205 Q 212 228 182 230 Q 142 225 112 208 Q 86 188 80 152 Z",
        "tex1": "M 102 138 Q 132 135 165 150", "tex2": "M 108 158 Q 140 150 170 165",
        "air": "M 230 185 Q 160 135 50 134",
        "s_lbl": "Punta en Encía, Aire por Lados", "voiced": True, "nasal": False,
        "focus_x": 95, "focus_y": 104, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/r/": {
        "file": "approximant_r",
        "frontal": "rounded_tight", "f_lbl": "Labios Salientes Suaves",
        "tongue": "M 86 148 Q 105 115 125 112 Q 155 130 185 150 Q 208 175 218 205 Q 212 228 182 230 Q 142 225 112 208 Q 86 185 86 155 Z",
        "tex1": "M 108 135 Q 135 130 165 142", "tex2": "M 112 155 Q 140 148 170 158",
        "air": "M 230 185 Q 160 128 50 134",
        "s_lbl": "Lengua Curvada sin Tocar", "voiced": True, "nasal": False,
        "focus_x": 110, "focus_y": 112, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/j/": {
        "file": "approximant_j",
        "frontal": "spread", "f_lbl": "Sonrisa Suave (Y)",
        "tongue": "M 86 145 Q 100 108 135 104 Q 165 110 190 135 Q 208 165 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 155 Z",
        "tex1": "M 105 132 Q 138 115 168 128", "tex2": "M 112 152 Q 145 140 172 150",
        "air": "M 230 180 Q 168 104 50 130",
        "s_lbl": "Deslizamiento Palatal", "voiced": True, "nasal": False,
        "focus_x": 130, "focus_y": 104, "velum": VELUM_RAISED, "uvula_y": 150,
    },
    "/w/": {
        "file": "approximant_w",
        "frontal": "rounded_tight", "f_lbl": "Labios en O Apretada",
        "tongue": "M 84 158 Q 105 155 132 145 Q 170 110 200 112 Q 216 150 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 84 158 Z",
        "tex1": "M 105 150 Q 140 132 172 125", "tex2": "M 112 165 Q 145 150 176 142",
        "air": "M 230 190 Q 165 118 50 134",
        "s_lbl": "Elevación Posterior Rápida", "voiced": True, "nasal": False,
        "focus_x": 65, "focus_y": 138, "velum": VELUM_RAISED, "uvula_y": 150,
    },
}


def main():
    print("=================================================================")
    print("Guionbajo v2.1: Generating 88 High-Quality Anatomical SVG Diagrams")
    print("Pedagogical Focus: Accurate Fricatives & Affricates")
    print(f"Target Directory: {TARGET_DIR}")
    print("=================================================================")

    count = 0
    for ipa, data in PHONEME_MAP.items():
        base = data["file"]
        uid = base.replace("/", "").replace(" ", "")

        # ── FRONTAL SVG ──
        f_svg = generate_frontal_svg(
            shape_type=data["frontal"],
            label=data["f_lbl"],
            uid=uid + "f",
            voiced=data.get("voiced", False),
            is_affricate=data.get("is_affricate", False)
        )
        (TARGET_DIR / f"{base}_frontal.svg").write_text(f_svg, encoding="utf-8")

        # ── LATERAL / SAGITTAL SVG ──
        air = data.get("air", "")
        if not air and not data.get("nasal", False):
            air = "M 230 188 Q 165 140 50 134"

        l_svg = generate_lateral_svg(
            tongue_path=data["tongue"],
            air_path=air,
            label=data["s_lbl"],
            uid=uid + "l",
            voiced=data.get("voiced", False),
            nasal=data.get("nasal", False),
            focus_x=data.get("focus_x", 100),
            focus_y=data.get("focus_y", 100),
            velum=data.get("velum", VELUM_RAISED),
            uvula_y=data.get("uvula_y", 150),
            jaw_drop=data.get("jaw_drop", 0),
            lip_closed=data.get("lip_closed", False),
            is_labiodental=data.get("is_labiodental", False),
            is_protruded_lips=data.get("is_protruded_lips", False),
            is_affricate=data.get("is_affricate", False),
            tex1=data.get("tex1", ""),
            tex2=data.get("tex2", ""),
        )
        (TARGET_DIR / f"{base}_lateral.svg").write_text(l_svg, encoding="utf-8")
        count += 1

    print(f"\n[OK] Success: Generated {count * 2} high-definition mouth diagrams for all {count} phonemes.")
    print("=================================================================")


if __name__ == "__main__":
    main()
