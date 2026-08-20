"""
Guionbajo — Master Phonetic Mouth Anatomy Vector Graphic Generator & Synchronizer
Generates clean, high-resolution pedagogical SVG diagrams for Frontal Lips and
Lateral Tongue Sagittal Cross-Sections for all 44 English Phonemes.
"""
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
TARGET_DIR = backend_dir.parent / "frontend" / "public" / "images" / "phonemes"
TARGET_DIR.mkdir(parents=True, exist_ok=True)

# Frontal Lip SVG Templates
def generate_frontal_svg(shape_type: str, label: str) -> str:
    """Generates clean, dark-theme SVG illustration of frontal mouth/lips."""
    # Palette
    lip_outer = "#F43F5E"
    lip_inner = "#E11D48"
    lip_highlight = "#FDA4AF"
    teeth_color = "#F8FAFC"
    mouth_dark = "#0F172A"
    tongue_color = "#FB7185"

    content = ""
    if shape_type == "smile_spread":  # /iː/, /ɪ/, /e/, /s/, /z/
        content = f"""
        <!-- Smile Spread Lips -->
        <!-- Outer Lip Contour -->
        <path d="M 40 100 Q 100 65 160 100 Q 100 135 40 100 Z" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="2"/>
        <!-- Inner Oral Cavity -->
        <path d="M 55 100 Q 100 82 145 100 Q 100 118 55 100 Z" fill="{mouth_dark}"/>
        <!-- Upper Teeth -->
        <path d="M 65 92 Q 100 90 135 92 L 133 98 Q 100 97 67 98 Z" fill="{teeth_color}"/>
        <!-- Lower Teeth -->
        <path d="M 68 106 Q 100 105 132 106 L 130 102 Q 100 101 70 102 Z" fill="{teeth_color}"/>
        """
    elif shape_type == "wide_open":  # /æ/, /ɑː/, /ʌ/, /aɪ/
        content = f"""
        <!-- Wide Open Mouth -->
        <path d="M 45 100 Q 100 45 155 100 Q 100 155 45 100 Z" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="2"/>
        <!-- Oral Opening -->
        <path d="M 58 100 Q 100 65 142 100 Q 100 135 58 100 Z" fill="{mouth_dark}"/>
        <!-- Upper Teeth -->
        <path d="M 68 80 Q 100 78 132 80 L 130 87 Q 100 85 70 87 Z" fill="{teeth_color}"/>
        <!-- Tongue Floor -->
        <path d="M 72 120 Q 100 105 128 120 Q 100 130 72 120 Z" fill="{tongue_color}"/>
        <!-- Lower Teeth -->
        <path d="M 70 126 Q 100 124 130 126 L 128 122 Q 100 120 72 122 Z" fill="{teeth_color}"/>
        """
    elif shape_type == "round_large":  # /ɒ/, /ɔː/, /ɔɪ/
        content = f"""
        <!-- Large Rounded O -->
        <ellipse cx="100" cy="100" rx="45" ry="50" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="2"/>
        <ellipse cx="100" cy="100" rx="25" ry="32" fill="{mouth_dark}"/>
        <path d="M 85 82 Q 100 80 115 82 L 113 86 Q 100 85 87 86 Z" fill="{teeth_color}"/>
        <path d="M 85 118 Q 100 114 115 118 L 113 115 Q 100 112 87 115 Z" fill="{tongue_color}"/>
        """
    elif shape_type == "round_tight_small":  # /uː/, /ʊ/, /w/, /aʊ/
        content = f"""
        <!-- Small Tight Pursed Circle -->
        <ellipse cx="100" cy="100" rx="35" ry="35" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="3"/>
        <circle cx="100" cy="100" r="14" fill="{mouth_dark}"/>
        <!-- Protruding lip folds -->
        <path d="M 75 100 Q 100 90 125 100" stroke="{lip_highlight}" stroke-width="2" fill="none"/>
        <path d="M 75 100 Q 100 110 125 100" stroke="{lip_inner}" stroke-width="2" fill="none"/>
        """
    elif shape_type == "labiodental":  # /f/, /v/
        content = f"""
        <!-- Top Teeth on Lower Lip -->
        <path d="M 45 95 Q 100 70 155 95 Q 100 135 45 95 Z" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="2"/>
        <path d="M 60 95 Q 100 85 140 95 Q 100 115 60 95 Z" fill="{mouth_dark}"/>
        <!-- Upper Teeth clearly visible pressing down -->
        <path d="M 70 88 Q 100 86 130 88 L 128 104 Q 100 102 72 104 Z" fill="{teeth_color}" stroke="#CBD5E1" stroke-width="1.5"/>
        <!-- Bottom lip tucked slightly under teeth -->
        <path d="M 50 105 Q 100 115 150 105 Q 100 135 50 105 Z" fill="{lip_inner}"/>
        """
    elif shape_type == "dental_interdental":  # /θ/, /ð/
        content = f"""
        <!-- Tongue Tip Between Front Teeth -->
        <path d="M 45 100 Q 100 70 155 100 Q 100 130 45 100 Z" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="2"/>
        <path d="M 60 100 Q 100 85 140 100 Q 100 115 60 100 Z" fill="{mouth_dark}"/>
        <!-- Upper Teeth -->
        <path d="M 70 88 Q 100 86 130 88 L 128 97 Q 100 96 72 97 Z" fill="{teeth_color}"/>
        <!-- Tongue Tip protruding between upper and lower teeth -->
        <path d="M 80 97 Q 100 94 120 97 Q 100 108 80 97 Z" fill="{tongue_color}" stroke="#F43F5E" stroke-width="1.5"/>
        <!-- Lower Teeth -->
        <path d="M 75 107 Q 100 105 125 107 L 123 103 Q 100 101 77 103 Z" fill="{teeth_color}"/>
        """
    elif shape_type == "lips_sealed":  # /p/, /b/, /m/
        content = f"""
        <!-- Lips Closed Firmly (Bilabial) -->
        <path d="M 45 100 Q 100 75 155 100 Q 100 125 45 100 Z" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="2"/>
        <path d="M 48 100 Q 100 97 152 100 Q 100 103 48 100 Z" fill="{lip_inner}"/>
        <!-- Center contact seam -->
        <line x1="50" y1="100" x2="150" y2="100" stroke="{mouth_dark}" stroke-width="3" stroke-linecap="round"/>
        """
    elif shape_type == "flared_sh":  # /ʃ/, /ʒ/, /tʃ/, /dʒ/
        content = f"""
        <!-- Flared Protruded Lips ('Shhh' shape) -->
        <path d="M 45 100 Q 100 60 155 100 Q 100 140 45 100 Z" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="2"/>
        <ellipse cx="100" cy="100" rx="30" ry="20" fill="{mouth_dark}"/>
        <path d="M 75 92 Q 100 90 125 92 L 123 96 Q 100 95 77 96 Z" fill="{teeth_color}"/>
        <path d="M 75 108 Q 100 106 125 108 L 123 104 Q 100 103 77 104 Z" fill="{teeth_color}"/>
        """
    else:  # neutral / relaxed / schwa
        content = f"""
        <!-- Neutral Relaxed Lips (/ə/, /ɜː/) -->
        <path d="M 45 100 Q 100 78 155 100 Q 100 122 45 100 Z" fill="{lip_outer}" stroke="{lip_highlight}" stroke-width="2"/>
        <path d="M 60 100 Q 100 90 140 100 Q 100 110 60 100 Z" fill="{mouth_dark}"/>
        <path d="M 72 94 Q 100 93 128 94 L 126 97 Q 100 96 74 97 Z" fill="{teeth_color}"/>
        <path d="M 75 106 Q 100 105 125 106 L 123 103 Q 100 102 77 103 Z" fill="{teeth_color}"/>
        """

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#090D16" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="20" fill="#090D16"/>
  <circle cx="100" cy="100" r="85" fill="url(#bgGlow)"/>
  {content}
  <text x="100" y="180" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">{label}</text>
</svg>"""
    return svg


# Lateral Sagittal SVG Templates
def generate_lateral_svg(sagittal_type: str, label: str) -> str:
    """Generates clean, dark-theme SVG sagittal profile showing tongue position and vocal tract."""
    wall_color = "#334155"
    palate_color = "#475569"
    teeth_color = "#F8FAFC"
    tongue_fill = "#FB7185"
    tongue_stroke = "#F43F5E"
    airflow_color = "#38BDF8"

    tongue_path = ""
    airflow_path = ""

    if sagittal_type == "tongue_high_front":  # /iː/, /ɪ/, /j/
        tongue_path = "M 45 155 Q 65 145 90 120 Q 115 80 135 85 Q 140 100 130 135 Q 110 155 45 155 Z"
        airflow_path = "M 130 72 Q 145 74 165 95"
    elif sagittal_type == "tongue_mid_front":  # /e/, /eɪ/
        tongue_path = "M 45 155 Q 65 145 85 130 Q 110 98 132 105 Q 138 120 125 140 Q 105 155 45 155 Z"
        airflow_path = "M 120 85 Q 145 90 165 95"
    elif sagittal_type == "tongue_low_front":  # /æ/, /aɪ/
        tongue_path = "M 45 155 Q 70 150 95 142 Q 118 130 138 135 Q 140 145 125 152 Q 100 158 45 155 Z"
        airflow_path = "M 100 85 Q 135 85 165 95"
    elif sagittal_type == "tongue_high_back":  # /uː/, /ʊ/, /w/
        tongue_path = "M 45 155 Q 60 110 82 78 Q 105 75 115 105 Q 125 135 135 140 Q 115 155 45 155 Z"
        airflow_path = "M 75 65 Q 115 70 165 95"
    elif sagittal_type == "tongue_low_back":  # /ɑː/, /ɒ/, /ɔː/
        tongue_path = "M 45 155 Q 58 130 75 120 Q 98 125 115 138 Q 130 145 135 145 Q 105 155 45 155 Z"
        airflow_path = "M 75 100 Q 120 90 165 95"
    elif sagittal_type == "tongue_dental":  # /θ/, /ð/
        tongue_path = "M 45 155 Q 70 140 100 125 Q 130 110 160 103 Q 155 120 130 140 Q 105 155 45 155 Z"
        airflow_path = "M 110 95 Q 140 92 170 98"
    elif sagittal_type == "tongue_alveolar":  # /t/, /d/, /s/, /z/, /n/, /l/
        tongue_path = "M 45 155 Q 70 140 95 125 Q 120 100 142 80 Q 140 105 128 135 Q 105 155 45 155 Z"
        airflow_path = "M 125 70 Q 145 72 165 90"
    elif sagittal_type == "tongue_postalveolar":  # /ʃ/, /ʒ/, /tʃ/, /dʒ/
        tongue_path = "M 45 155 Q 70 135 95 115 Q 122 88 136 88 Q 140 105 128 135 Q 105 155 45 155 Z"
        airflow_path = "M 118 78 Q 142 78 165 92"
    elif sagittal_type == "tongue_velar":  # /k/, /g/, /ŋ/
        tongue_path = "M 45 155 Q 58 115 78 75 Q 92 72 105 95 Q 120 130 135 140 Q 105 155 45 155 Z"
        airflow_path = "M 70 65 Q 85 62 100 70"
    elif sagittal_type == "tongue_retroflex":  # /r/
        tongue_path = "M 45 155 Q 70 135 95 115 Q 120 90 128 75 Q 135 90 125 130 Q 105 155 45 155 Z"
        airflow_path = "M 115 70 Q 140 75 165 92"
    elif sagittal_type == "labiodental":  # /f/, /v/
        tongue_path = "M 45 155 Q 70 145 95 135 Q 115 130 132 135 Q 135 145 125 150 Q 100 155 45 155 Z"
        airflow_path = "M 130 98 Q 150 96 168 102"
    else:  # neutral / central / schwa
        tongue_path = "M 45 155 Q 65 140 90 125 Q 110 115 132 125 Q 135 140 122 148 Q 100 155 45 155 Z"
        airflow_path = "M 100 95 Q 135 92 165 95"

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <radialGradient id="latGlow" cx="60%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#090D16" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="20" fill="#090D16"/>
  <circle cx="100" cy="100" r="85" fill="url(#latGlow)"/>

  <!-- Head / Pharynx Walls -->
  <!-- Posterior Pharyngeal Wall -->
  <path d="M 35 60 L 35 165" stroke="{wall_color}" stroke-width="4" stroke-linecap="round"/>
  <!-- Hard & Soft Palate / Uvula -->
  <path d="M 40 60 Q 60 55 95 55 Q 130 55 145 75" stroke="{palate_color}" stroke-width="5" stroke-linecap="round" fill="none"/>
  <!-- Upper Incisor -->
  <path d="M 148 76 L 152 92 L 145 92 Z" fill="{teeth_color}" stroke="#94A3B8" stroke-width="1"/>
  <!-- Lower Incisor -->
  <path d="M 148 125 L 152 108 L 145 108 Z" fill="{teeth_color}" stroke="#94A3B8" stroke-width="1"/>
  <!-- Upper Lip Contour -->
  <path d="M 152 75 Q 165 80 162 90" stroke="{palate_color}" stroke-width="4" stroke-linecap="round" fill="none"/>
  <!-- Lower Lip Contour -->
  <path d="M 152 125 Q 165 120 162 110" stroke="{palate_color}" stroke-width="4" stroke-linecap="round" fill="none"/>

  <!-- Tongue Body -->
  <path d="{tongue_path}" fill="{tongue_fill}" stroke="{tongue_stroke}" stroke-width="2.5"/>

  <!-- Airflow Stream Arrow -->
  <path d="{airflow_path}" stroke="{airflow_color}" stroke-width="2.5" stroke-dasharray="4,3" fill="none" stroke-linecap="round"/>

  <!-- Label -->
  <text x="100" y="180" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">{label}</text>
</svg>"""
    return svg


# Mapping for all 44 English Phonemes -> Frontal & Sagittal Shape Keys
PHONEME_MAP = {
    # ─── SHORT VOWELS ─────────────────────────────────────────────────────────────
    "/ɪ/":  {"frontal": "smile_spread",       "sagittal": "tongue_high_front",   "file": "vowel_short_i",       "f_lbl": "Labios Relajados Sonrientes", "s_lbl": "Lengua Alta Anterior (Laxa)"},
    "/e/":  {"frontal": "smile_spread",       "sagittal": "tongue_mid_front",    "file": "vowel_short_e",       "f_lbl": "Labios Abiertos Medios",      "s_lbl": "Lengua Media Anterior"},
    "/æ/":  {"frontal": "wide_open",          "sagittal": "tongue_low_front",    "file": "vowel_short_ae",      "f_lbl": "Mandíbula Abierta Baja",      "s_lbl": "Lengua Plana y Baja"},
    "/ʌ/":  {"frontal": "wide_open",          "sagittal": "tongue_central",      "file": "vowel_short_wedge",   "f_lbl": "Boca Neutra Abierta",         "s_lbl": "Lengua Media Central"},
    "/ɒ/":  {"frontal": "round_large",        "sagittal": "tongue_low_back",     "file": "vowel_short_o",       "f_lbl": "Labios Ovalados Redondos",    "s_lbl": "Lengua Baja Posterior"},
    "/ʊ/":  {"frontal": "round_tight_small",  "sagittal": "tongue_high_back",    "file": "vowel_short_upsilon", "f_lbl": "Labios Redondeados Suaves",   "s_lbl": "Lengua Casi Alta Posterior"},
    "/ə/":  {"frontal": "neutral_schwa",      "sagittal": "tongue_central",      "file": "vowel_schwa",         "f_lbl": "Boca Relajada Total (Schwa)", "s_lbl": "Lengua en Reposo Central"},

    # ─── LONG VOWELS ──────────────────────────────────────────────────────────────
    "/iː/": {"frontal": "smile_spread",       "sagittal": "tongue_high_front",   "file": "vowel_long_i",        "f_lbl": "Sonrisa Amplia y Tensa",      "s_lbl": "Lengua Alta Frontal Tensa"},
    "/ɑː/": {"frontal": "wide_open",          "sagittal": "tongue_low_back",     "file": "vowel_long_a",        "f_lbl": "Boca Abierta ('Ah')",         "s_lbl": "Lengua Retraída en Fondo"},
    "/ɔː/": {"frontal": "round_large",        "sagittal": "tongue_low_back",     "file": "vowel_long_o",        "f_lbl": "Labios en Círculo 'O'",       "s_lbl": "Lengua Media-Baja Fondo"},
    "/uː/": {"frontal": "round_tight_small",  "sagittal": "tongue_high_back",    "file": "vowel_long_u",        "f_lbl": "Labios Tubulares Cerrados",   "s_lbl": "Lengua Elevada al Velo"},
    "/ɜː/": {"frontal": "neutral_schwa",      "sagittal": "tongue_central",      "file": "vowel_long_er",       "f_lbl": "Labios Neutros Medios",       "s_lbl": "Lengua Compacta Central"},

    # ─── DIPHTHONGS ───────────────────────────────────────────────────────────────
    "/eɪ/": {"frontal": "smile_spread",       "sagittal": "tongue_mid_front",    "file": "diphthong_ei",        "f_lbl": "Desliza a Sonrisa",           "s_lbl": "Lengua Sube a Frontal"},
    "/aɪ/": {"frontal": "wide_open",          "sagittal": "tongue_high_front",   "file": "diphthong_ai",        "f_lbl": "Abierta a Sonrisa",           "s_lbl": "Sube de Piso a Paladar"},
    "/ɔɪ/": {"frontal": "round_large",        "sagittal": "tongue_high_front",   "file": "diphthong_oi",        "f_lbl": "Redonda a Sonrisa Plana",     "s_lbl": "Fondo hacia Techo Anterior"},
    "/aʊ/": {"frontal": "wide_open",          "sagittal": "tongue_high_back",    "file": "diphthong_au",        "f_lbl": "Abierta a Círculo Pequeño",   "s_lbl": "Sube y Retrocede al Velo"},
    "/əʊ/": {"frontal": "round_tight_small",  "sagittal": "tongue_high_back",    "file": "diphthong_ou",        "f_lbl": "Neutra a Redondeada",         "s_lbl": "Centro hacia Posterior"},
    "/ɪə/": {"frontal": "smile_spread",       "sagittal": "tongue_central",      "file": "diphthong_ia",        "f_lbl": "Sonrisa a Neutra",            "s_lbl": "Alta Frontal a Centro"},
    "/eə/": {"frontal": "smile_spread",       "sagittal": "tongue_central",      "file": "diphthong_ea",        "f_lbl": "Media Abierta a Neutra",      "s_lbl": "Media Frontal a Centro"},
    "/ʊə/": {"frontal": "round_tight_small",  "sagittal": "tongue_central",      "file": "diphthong_ua",        "f_lbl": "Redondeada a Relajada",       "s_lbl": "Alta Posterior a Centro"},

    # ─── FRICATIVES & AFFRICATES ──────────────────────────────────────────────────
    "/f/":  {"frontal": "labiodental",        "sagittal": "labiodental",         "file": "fricative_f",         "f_lbl": "Dientes en Labio Inferior",   "s_lbl": "Fricción Labiodental Sorda"},
    "/v/":  {"frontal": "labiodental",        "sagittal": "labiodental",         "file": "fricative_v",         "f_lbl": "Dientes en Labio + Vibración", "s_lbl": "Fricción Labiodental Sonora"},
    "/θ/":  {"frontal": "dental_interdental", "sagittal": "tongue_dental",       "file": "fricative_th_voiceless", "f_lbl": "Lengua Entre Dientes (Sorda)", "s_lbl": "Aire Suave Interdental"},
    "/ð/":  {"frontal": "dental_interdental", "sagittal": "tongue_dental",       "file": "fricative_th_voiced",    "f_lbl": "Lengua Entre Dientes (Voz)",   "s_lbl": "Zumbido Interdental Sonoro"},
    "/s/":  {"frontal": "smile_spread",       "sagittal": "tongue_alveolar",     "file": "fricative_s",         "f_lbl": "Dientes Juntos Sonrientes",   "s_lbl": "Canal Estrecho Alveolar"},
    "/z/":  {"frontal": "smile_spread",       "sagittal": "tongue_alveolar",     "file": "fricative_z",         "f_lbl": "Dientes Juntos + Zumbido",    "s_lbl": "Alveolar Sonoro Vibrante"},
    "/ʃ/":  {"frontal": "flared_sh",          "sagittal": "tongue_postalveolar", "file": "fricative_sh",        "f_lbl": "Labios Salientes ('Shhh')",   "s_lbl": "Dorso Elevado Posalveolar"},
    "/ʒ/":  {"frontal": "flared_sh",          "sagittal": "tongue_postalveolar", "file": "fricative_zh",        "f_lbl": "Labios 'Sh' + Cuerdas Voz",   "s_lbl": "Posalveolar Sonoro Suave"},
    "/h/":  {"frontal": "neutral_schwa",      "sagittal": "tongue_central",      "file": "fricative_h",         "f_lbl": "Boca Abierta Relajada",       "s_lbl": "Aliento Glotal Libre"},
    "/tʃ/": {"frontal": "flared_sh",          "sagittal": "tongue_postalveolar", "file": "affricate_ch",        "f_lbl": "Explosión Rápida 'CH'",       "s_lbl": "Cierre Alveolar + Salida Sh"},
    "/dʒ/": {"frontal": "flared_sh",          "sagittal": "tongue_postalveolar", "file": "affricate_j",         "f_lbl": "Explosión Sonora 'J'",        "s_lbl": "Cierre Alveolar + Voz Zh"},

    # ─── PLOSIVES ─────────────────────────────────────────────────────────────────
    "/p/":  {"frontal": "lips_sealed",        "sagittal": "tongue_central",      "file": "plosive_p",           "f_lbl": "Labios Sellados (Sordo)",     "s_lbl": "Explosión de Aire P"},
    "/b/":  {"frontal": "lips_sealed",        "sagittal": "tongue_central",      "file": "plosive_b",           "f_lbl": "Labios Sellados + Voz",       "s_lbl": "Explosión Vocalizada B"},
    "/t/":  {"frontal": "smile_spread",       "sagittal": "tongue_alveolar",     "file": "plosive_t",           "f_lbl": "Dientes Entreabiertos",       "s_lbl": "Punta Sella Encía Superior"},
    "/d/":  {"frontal": "smile_spread",       "sagittal": "tongue_alveolar",     "file": "plosive_d",           "f_lbl": "Dientes Entreabiertos + Voz",  "s_lbl": "Toque Alveolar Sonoro"},
    "/k/":  {"frontal": "wide_open",          "sagittal": "tongue_velar",        "file": "plosive_k",           "f_lbl": "Mandíbula Media Abierta",     "s_lbl": "Dorso Sella Velo del Paladar"},
    "/g/":  {"frontal": "wide_open",          "sagittal": "tongue_velar",        "file": "plosive_g",           "f_lbl": "Mandíbula Media + Voz",       "s_lbl": "Cierre Velar Sonoro"},

    # ─── NASALS & APPROXIMANTS ────────────────────────────────────────────────────
    "/m/":  {"frontal": "lips_sealed",        "sagittal": "tongue_central",      "file": "nasal_m",             "f_lbl": "Labios Cerrados (Nasal)",     "s_lbl": "Resonancia 100% Nasal"},
    "/n/":  {"frontal": "smile_spread",       "sagittal": "tongue_alveolar",     "file": "nasal_n",             "f_lbl": "Boca Ligeramente Abierta",    "s_lbl": "Punta Sella Encía (Nasal)"},
    "/ŋ/":  {"frontal": "wide_open",          "sagittal": "tongue_velar",        "file": "nasal_ng",            "f_lbl": "Boca Abierta Relajada",       "s_lbl": "Sello Velar sin 'G' dura"},
    "/l/":  {"frontal": "smile_spread",       "sagittal": "tongue_alveolar",     "file": "approximant_l",       "f_lbl": "Boca Entreabierta",           "s_lbl": "Punta en Encía, Aire por Lados"},
    "/r/":  {"frontal": "round_tight_small",  "sagittal": "tongue_retroflex",    "file": "approximant_r",       "f_lbl": "Labios Salientes Suaves",     "s_lbl": "Lengua Curvada sin Tocar"},
    "/j/":  {"frontal": "smile_spread",       "sagittal": "tongue_high_front",   "file": "approximant_j",       "f_lbl": "Sonrisa Suave (Y)",           "s_lbl": "Deslizamiento Palatal"},
    "/w/":  {"frontal": "round_tight_small",  "sagittal": "tongue_high_back",    "file": "approximant_w",       "f_lbl": "Labios en O Apretada (Silbido)", "s_lbl": "Elevación Posterior Rápida"},
}

def main():
    print("=================================================================")
    print("Guionbajo: Generating 44 Anatomical Mouth & Tongue SVG Diagrams")
    print(f"Target Directory: {TARGET_DIR}")
    print("=================================================================")

    count = 0
    for ipa, data in PHONEME_MAP.items():
        base = data["file"]
        f_svg = generate_frontal_svg(data["frontal"], data["f_lbl"])
        l_svg = generate_lateral_svg(data["sagittal"], data["s_lbl"])

        (TARGET_DIR / f"{base}_frontal.svg").write_text(f_svg, encoding="utf-8")
        (TARGET_DIR / f"{base}_lateral.svg").write_text(l_svg, encoding="utf-8")
        count += 1

    print(f"Success: Generated {count * 2} high-definition mouth diagrams for all 44 phonemes.")
    print("=================================================================")

if __name__ == "__main__":
    main()
