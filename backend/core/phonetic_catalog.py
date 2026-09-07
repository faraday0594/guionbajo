"""
Guionbajo — Comprehensive English Phonetic Catalog (44 Phonemes)
Includes IPA symbols, articulatory anatomy instructions in Spanish, contrast pairs, and example words.
"""
from typing import Dict, List, Optional, Any

# 44 English Phonemes Catalog
PHONETIC_CATALOG: Dict[str, Dict[str, Any]] = {
    "/iː/": {
        "ipa": "/iː/",
        "name": "Long E",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "High front, tense",
        "mouth_aperture": "Close, smiling lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Labios estirados ampliamente hacia los lados en una sonrisa tensa; dientes superiores e inferiores muy juntos.",
            "lateral": "El dorso de la lengua se arquea alto muy cerca del paladar duro; la punta reposa detrás de los dientes inferiores."
        },
        "mouth_guide_es": {
            "frontal": "Labios estirados ampliamente hacia los lados en una sonrisa tensa; dientes superiores e inferiores muy juntos.",
            "lateral": "El dorso de la lengua se arquea alto muy cerca del paladar duro; la punta reposa detrás de los dientes inferiores."
        },
        "examples": ['sheep', 'feel', 'see', 'tree', 'read'],
        "contrast_with": "/ɪ/",
        "contrast_pairs": [['sheep', 'ship'], ['feel', 'fill'], ['leave', 'live'], ['seat', 'sit']],
        "introduced_at": "A1.1",
        "drill_sentence": "She sees three green trees near the beach.",
        "svg_params": {
            "lip_width": 62,
            "lip_drop": 2,
            "tongue_visible": False,
            "tongue_path": "M 86 145 Q 100 108 135 100 Q 165 102 190 130 Q 208 162 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 155 Z",
            "focus_x": 125,
            "focus_y": 102,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 180 Q 170 100 50 128"
        }
    },
    "/ɪ/": {
        "ipa": "/ɪ/",
        "name": "Short I",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Near-high front, relaxed/lax",
        "mouth_aperture": "Slightly open, relaxed lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Labios relajados y ligeramente entreabiertos; mandíbula suelta sin la tensión de sonrisa de /iː/.",
            "lateral": "La lengua se sitúa en posición media-alta, más baja, retrasada y relajada que en /iː/."
        },
        "mouth_guide_es": {
            "frontal": "Labios relajados y ligeramente entreabiertos; mandíbula suelta sin la tensión de sonrisa de /iː/.",
            "lateral": "La lengua se sitúa en posición media-alta, más baja, retrasada y relajada que en /iː/."
        },
        "examples": ['ship', 'fill', 'sit', 'hit', 'big'],
        "contrast_with": "/iː/",
        "contrast_pairs": [['ship', 'sheep'], ['fill', 'feel'], ['live', 'leave'], ['sit', 'seat']],
        "introduced_at": "A1.1",
        "drill_sentence": "Tim bit a big piece of crisp biscuit.",
        "svg_params": {
            "lip_width": 52,
            "lip_drop": 8,
            "tongue_visible": False,
            "tongue_path": "M 85 150 Q 102 132 138 122 Q 170 125 186 142 Q 202 165 204 195 Q 200 222 172 226 Q 135 224 108 205 Q 86 182 85 150 Z",
            "focus_x": 138,
            "focus_y": 120,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 235 235 C 235 185, 230 140, 218 126 C 200 108, 168 106, 138 108 C 105 110, 75 125, 50 134",
            "tex1": "M 104 144 Q 138 134 170 146",
            "tex2": "M 112 164 Q 142 152 172 166"
        }
    },
    "/e/": {
        "ipa": "/e/",
        "name": "Short E (Dress)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Mid-front, relaxed",
        "mouth_aperture": "Medium open, unrounded lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Boca medianamente abierta con labios relajados; la mandíbula desciende un poco más que en /ɪ/.",
            "lateral": "La parte frontal de la lengua se eleva a altura media en la cavidad oral sin tocar el paladar."
        },
        "mouth_guide_es": {
            "frontal": "Boca medianamente abierta con labios relajados; la mandíbula desciende un poco más que en /ɪ/.",
            "lateral": "La parte frontal de la lengua se eleva a altura media en la cavidad oral sin tocar el paladar."
        },
        "examples": ['bed', 'ten', 'red', 'head', 'send'],
        "contrast_with": "/æ/",
        "contrast_pairs": [['bed', 'bad'], ['pen', 'pan'], ['men', 'man'], ['ten', 'tan']],
        "introduced_at": "A1.2",
        "drill_sentence": "Ten red pens were sent on Wednesday.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 8,
            "tongue_visible": False,
            "tongue_path": "M 86 150 Q 100 125 135 120 Q 165 125 190 145 Q 208 170 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 160 Z",
            "focus_x": 125,
            "focus_y": 125,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 180 Q 170 120 50 135"
        }
    },
    "/æ/": {
        "ipa": "/æ/",
        "name": "Short A (Trap / Cat)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Low-front, open",
        "mouth_aperture": "Wide open, jaw dropped",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Boca muy abierta en sentido vertical y horizontal con la mandíbula caída de par en par.",
            "lateral": "La lengua reposa plana y baja en el suelo de la boca, con la punta tocando los incisivos inferiores."
        },
        "mouth_guide_es": {
            "frontal": "Boca muy abierta en sentido vertical y horizontal con la mandíbula caída de par en par.",
            "lateral": "La lengua reposa plana y baja en el suelo de la boca, con la punta tocando los incisivos inferiores."
        },
        "examples": ['cat', 'bad', 'apple', 'hand', 'black'],
        "contrast_with": "/ʌ/",
        "contrast_pairs": [['cat', 'cut'], ['hat', 'hut'], ['bat', 'but'], ['bad', 'bed']],
        "introduced_at": "A1.2",
        "drill_sentence": "That black cat sat on the fat man's hat.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 22,
            "tongue_visible": False,
            "tongue_path": "M 84 158 Q 95 145 125 145 Q 155 150 185 165 Q 205 185 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 84 175 Z",
            "focus_x": 125,
            "focus_y": 145,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 170 145 50 150"
        }
    },
    "/ʌ/": {
        "ipa": "/ʌ/",
        "name": "Short U (Strut / Cup)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Mid-central to back-low, lax",
        "mouth_aperture": "Relaxed open, unrounded",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Boca neutra y relajada; apertura vertical corta sin redondear los labios.",
            "lateral": "La lengua descansa plana en el centro bajo de la cavidad bucal, con el tracto vocal relajado."
        },
        "mouth_guide_es": {
            "frontal": "Boca neutra y relajada; apertura vertical corta sin redondear los labios.",
            "lateral": "La lengua descansa plana en el centro bajo de la cavidad bucal, con el tracto vocal relajado."
        },
        "examples": ['cup', 'bus', 'run', 'sun', 'luck'],
        "contrast_with": "/æ/",
        "contrast_pairs": [['cut', 'cat'], ['hut', 'hat'], ['luck', 'lack'], ['cup', 'cap']],
        "introduced_at": "A1.3",
        "drill_sentence": "The funny puppy jumped into the muddy puddle.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 16,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 100 145 130 145 Q 160 150 185 165 Q 205 185 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 172 Z",
            "focus_x": 140,
            "focus_y": 148,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 145 50 145"
        }
    },
    "/ɑː/": {
        "ipa": "/ɑː/",
        "name": "Long A (Palm / Car)",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "Low back, open",
        "mouth_aperture": "Very open, relaxed lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Boca muy abierta como diciendo 'ah' en el médico; labios completamente relajados y separados.",
            "lateral": "La lengua se retrae hacia el fondo de la garganta en posición baja y plana."
        },
        "mouth_guide_es": {
            "frontal": "Boca muy abierta como diciendo 'ah' en el médico; labios completamente relajados y separados.",
            "lateral": "La lengua se retrae hacia el fondo de la garganta en posición baja y plana."
        },
        "examples": ['car', 'park', 'heart', 'father', 'smart'],
        "contrast_with": "/æ/",
        "contrast_pairs": [['car', 'cat'], ['park', 'pack'], ['heart', 'hat']],
        "introduced_at": "A1.3",
        "drill_sentence": "Park the dark car far in the farm garden.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 28,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 95 152 120 155 Q 155 162 185 178 Q 205 195 218 215 Q 212 232 182 234 Q 142 228 112 212 Q 86 192 85 172 Z",
            "focus_x": 140,
            "focus_y": 155,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 232 195 Q 180 155 50 148"
        }
    },
    "/ɒ/": {
        "ipa": "/ɒ/",
        "name": "Short O (Lot / Hot)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Low back, open",
        "mouth_aperture": "Open, slightly rounded lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Labios ligeramente ovalados y redondeados en forma de 'O' abierta; mandíbula descendida.",
            "lateral": "La parte posterior de la lengua desciende hacia el fondo de la cavidad oral."
        },
        "mouth_guide_es": {
            "frontal": "Labios ligeramente ovalados y redondeados en forma de 'O' abierta; mandíbula descendida.",
            "lateral": "La parte posterior de la lengua desciende hacia el fondo de la cavidad oral."
        },
        "examples": ['hot', 'box', 'dog', 'coffee', 'clock'],
        "contrast_with": "/ɔː/",
        "contrast_pairs": [['spot', 'sport'], ['shot', 'short'], ['cot', 'caught']],
        "introduced_at": "A1.4",
        "drill_sentence": "Tom got a lot of hot coffee in the pot.",
        "svg_params": {
            "lip_width": 36,
            "lip_drop": 22,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 95 152 120 155 Q 155 162 185 178 Q 205 195 218 215 Q 212 232 182 234 Q 142 228 112 212 Q 86 192 85 172 Z",
            "focus_x": 160,
            "focus_y": 160,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 232 195 Q 180 160 50 148"
        }
    },
    "/ɔː/": {
        "ipa": "/ɔː/",
        "name": "Long O (Thought / Door)",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "Mid-low back, tense",
        "mouth_aperture": "Medium rounded lips (O-shape)",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Labios fruncidos hacia adelante en un círculo definido y tenso de tamaño medio.",
            "lateral": "La parte posterior de la lengua se arquea alto hacia el velo del paladar (paladar blando)."
        },
        "mouth_guide_es": {
            "frontal": "Labios fruncidos hacia adelante en un círculo definido y tenso de tamaño medio.",
            "lateral": "La parte posterior de la lengua se arquea alto hacia el velo del paladar (paladar blando)."
        },
        "examples": ['door', 'water', 'call', 'four', 'board'],
        "contrast_with": "/ɒ/",
        "contrast_pairs": [['sport', 'spot'], ['short', 'shot'], ['port', 'pot']],
        "introduced_at": "A1.4",
        "drill_sentence": "Paul saw four tall horses walking on the lawn.",
        "svg_params": {
            "lip_width": 24,
            "lip_drop": 20,
            "tongue_visible": False,
            "tongue_path": "M 84 158 Q 105 155 135 148 Q 172 118 198 122 Q 215 155 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 182 84 158 Z",
            "focus_x": 185,
            "focus_y": 120,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 170 125 50 135"
        }
    },
    "/ʊ/": {
        "ipa": "/ʊ/",
        "name": "Short OO (Foot / Put)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Near-high back, lax",
        "mouth_aperture": "Slightly rounded, relaxed",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Labios suavemente redondeados hacia adelante, sin tensión excesiva.",
            "lateral": "La lengua se retrae ligeramente hacia atrás a una altura media-alta relajada."
        },
        "mouth_guide_es": {
            "frontal": "Labios suavemente redondeados hacia adelante, sin tensión excesiva.",
            "lateral": "La lengua se retrae ligeramente hacia atrás a una altura media-alta relajada."
        },
        "examples": ['book', 'look', 'good', 'put', 'foot'],
        "contrast_with": "/uː/",
        "contrast_pairs": [['look', 'Luke'], ['pull', 'pool'], ['full', 'fool'], ['foot', 'food']],
        "introduced_at": "A2.1",
        "drill_sentence": "Look at the good cookbook full of pudding recipes.",
        "svg_params": {
            "lip_width": 32,
            "lip_drop": 6,
            "tongue_visible": False,
            "tongue_path": "M 86 150 Q 105 140 140 135 Q 175 125 200 145 Q 210 165 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 185 86 165 Z",
            "focus_x": 175,
            "focus_y": 125,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 175 125 50 135"
        }
    },
    "/uː/": {
        "ipa": "/uː/",
        "name": "Long OO (Goose / Food)",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "High back, tense",
        "mouth_aperture": "Tight small circle lips (pursed)",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Labios proyectados hacia adelante formando un círculo pequeño, tenso y cerrado en forma de tubo.",
            "lateral": "La parte posterior de la lengua sube muy alto cerca del velo del paladar; paso de aire estrecho."
        },
        "mouth_guide_es": {
            "frontal": "Labios proyectados hacia adelante formando un círculo pequeño, tenso y cerrado en forma de tubo.",
            "lateral": "La parte posterior de la lengua sube muy alto cerca del velo del paladar; paso de aire estrecho."
        },
        "examples": ['food', 'blue', 'moon', 'choose', 'shoe'],
        "contrast_with": "/ʊ/",
        "contrast_pairs": [['pool', 'pull'], ['fool', 'full'], ['suit', 'soot']],
        "introduced_at": "A2.1",
        "drill_sentence": "Sue chose blue shoes for the cool swimming pool.",
        "svg_params": {
            "lip_width": 28,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 86 150 Q 110 135 150 120 Q 185 105 205 135 Q 212 165 218 200 Q 212 225 182 228 Q 142 222 112 205 Q 86 185 86 165 Z",
            "focus_x": 185,
            "focus_y": 108,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 185 105 50 135"
        }
    },
    "/ɜː/": {
        "ipa": "/ɜː/",
        "name": "Long ER (Nurse / Bird)",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "Mid-central, tense",
        "mouth_aperture": "Neutral, medium unrounded",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Labios en posición neutra y relajada, apenas entreabiertos sin redondeo.",
            "lateral": "La lengua se agrupa en el centro de la boca a media altura; los laterales tocan los molares superiores."
        },
        "mouth_guide_es": {
            "frontal": "Labios en posición neutra y relajada, apenas entreabiertos sin redondeo.",
            "lateral": "La lengua se agrupa en el centro de la boca a media altura; los laterales tocan los molares superiores."
        },
        "examples": ['bird', 'work', 'learn', 'girl', 'first'],
        "contrast_with": "/ə/",
        "contrast_pairs": [['word', 'ward'], ['burn', 'barn'], ['first', 'fast']],
        "introduced_at": "A2.2",
        "drill_sentence": "The early bird works hard to learn words first.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 10,
            "tongue_visible": False,
            "tongue_path": "M 85 148 Q 100 135 130 135 Q 160 140 185 155 Q 205 175 215 200 Q 212 225 182 228 Q 142 222 112 205 Q 86 185 85 165 Z",
            "focus_x": 130,
            "focus_y": 135,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 160 135 50 140"
        }
    },
    "/ə/": {
        "ipa": "/ə/",
        "name": "Schwa (About / Teacher)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Pure center, completely relaxed/unstressed",
        "mouth_aperture": "Relaxed neutral opening",
        "airflow": "Continuous vocalized lax",
        "mouth_guide": {
            "frontal": "Boca completamente relajada y perezosa, sin ningún esfuerzo ni tensión en labios o mandíbula.",
            "lateral": "La lengua reposa en el centro exacto de la boca en estado de reposo absoluto."
        },
        "mouth_guide_es": {
            "frontal": "Boca completamente relajada y perezosa, sin ningún esfuerzo ni tensión en labios o mandíbula.",
            "lateral": "La lengua reposa en el centro exacto de la boca en estado de reposo absoluto."
        },
        "examples": ['about', 'banana', 'teacher', 'police', 'sofa'],
        "contrast_with": "/ʌ/",
        "contrast_pairs": [['sofa', 'cup'], ['teacher', 'church']],
        "introduced_at": "A1.1",
        "drill_sentence": "A doctor and a teacher arrived about eleven o'clock.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 10,
            "tongue_visible": False,
            "tongue_path": "M 85 150 Q 100 140 130 140 Q 160 145 185 160 Q 205 180 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 170 Z",
            "focus_x": 130,
            "focus_y": 140,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 50 140"
        }
    },
    "/eɪ/": {
        "ipa": "/eɪ/",
        "name": "Face Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /e/ to /ɪ/",
        "mouth_aperture": "Medium open to smiling close",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Comienza con la boca medianamente abierta y se estira hacia los lados en una sonrisa suave.",
            "lateral": "La lengua inicia en posición media-frontal y se desliza hacia arriba hacia el paladar."
        },
        "mouth_guide_es": {
            "frontal": "Comienza con la boca medianamente abierta y se estira hacia los lados en una sonrisa suave.",
            "lateral": "La lengua inicia en posición media-frontal y se desliza hacia arriba hacia el paladar."
        },
        "examples": ['day', 'make', 'game', 'train', 'say'],
        "contrast_with": "/e/",
        "contrast_pairs": [['taste', 'test'], ['late', 'let'], ['mate', 'met'], ['paper', 'pepper']],
        "introduced_at": "A1.2",
        "drill_sentence": "They gave great praise to the brave player today.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 8,
            "tongue_visible": False,
            "tongue_path": "M 86 150 Q 100 125 135 120 Q 165 125 190 145 Q 208 170 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 160 Z",
            "focus_x": 125,
            "focus_y": 125,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 180 Q 170 120 50 135"
        }
    },
    "/aɪ/": {
        "ipa": "/aɪ/",
        "name": "Price Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /a/ to /ɪ/",
        "mouth_aperture": "Wide open to smiling close",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Inicia con la boca muy abierta y pasa fluidamente a una posición entreabierta sonriente.",
            "lateral": "La lengua sube desde el suelo bucal bajo hasta arquearse cerca del paladar duro."
        },
        "mouth_guide_es": {
            "frontal": "Inicia con la boca muy abierta y pasa fluidamente a una posición entreabierta sonriente.",
            "lateral": "La lengua sube desde el suelo bucal bajo hasta arquearse cerca del paladar duro."
        },
        "examples": ['time', 'sky', 'like', 'night', 'fly'],
        "contrast_with": "/ɔɪ/",
        "contrast_pairs": [['tie', 'toy'], ['buy', 'boy'], ['point', 'pint']],
        "introduced_at": "A1.3",
        "drill_sentence": "Mike likes flying kites high in the night sky.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 22,
            "tongue_visible": False,
            "tongue_path": "M 84 158 Q 95 145 125 145 Q 155 150 185 165 Q 205 185 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 84 175 Z",
            "focus_x": 125,
            "focus_y": 145,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 170 145 50 150"
        }
    },
    "/ɔɪ/": {
        "ipa": "/ɔɪ/",
        "name": "Choice Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /ɔː/ to /ɪ/",
        "mouth_aperture": "Rounded open to unrounded close",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Inicia con labios redondeados en círculo ('O') y se abre deslizándose a una sonrisa relajada.",
            "lateral": "La lengua comienza arqueada atrás y se proyecta hacia arriba y hacia adelante."
        },
        "mouth_guide_es": {
            "frontal": "Inicia con labios redondeados en círculo ('O') y se abre deslizándose a una sonrisa relajada.",
            "lateral": "La lengua comienza arqueada atrás y se proyecta hacia arriba y hacia adelante."
        },
        "examples": ['boy', 'voice', 'choice', 'coin', 'enjoy'],
        "contrast_with": "/aɪ/",
        "contrast_pairs": [['boy', 'buy'], ['toy', 'tie'], ['noise', 'nice']],
        "introduced_at": "A2.2",
        "drill_sentence": "The joyful boy destroyed the noisy toy coin.",
        "svg_params": {
            "lip_width": 34,
            "lip_drop": 18,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 105 145 140 145 Q 175 135 200 155 Q 210 175 218 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 172 Z",
            "focus_x": 175,
            "focus_y": 135,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 175 135 50 145"
        }
    },
    "/aʊ/": {
        "ipa": "/aʊ/",
        "name": "Mouth Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /a/ to /ʊ/",
        "mouth_aperture": "Wide open to small rounded circle",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Comienza con la boca ampliamente abierta y se cierra en un círculo pequeño redondeado.",
            "lateral": "La lengua sube desde el fondo bajo hasta elevar su parte posterior hacia el velo del paladar."
        },
        "mouth_guide_es": {
            "frontal": "Comienza con la boca ampliamente abierta y se cierra en un círculo pequeño redondeado.",
            "lateral": "La lengua sube desde el fondo bajo hasta elevar su parte posterior hacia el velo del paladar."
        },
        "examples": ['now', 'house', 'brown', 'cloud', 'sound'],
        "contrast_with": "/əʊ/",
        "contrast_pairs": [['now', 'no'], ['town', 'tone'], ['shout', 'show']],
        "introduced_at": "A1.4",
        "drill_sentence": "How now brown cow walks around the sound town.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 22,
            "tongue_visible": False,
            "tongue_path": "M 84 158 Q 95 145 125 145 Q 155 150 185 165 Q 205 185 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 84 175 Z",
            "focus_x": 125,
            "focus_y": 145,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 170 145 50 150"
        }
    },
    "/əʊ/": {
        "ipa": "/əʊ/",
        "name": "Goat Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /ə/ to /ʊ/",
        "mouth_aperture": "Neutral relaxed to rounded circle",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Inicia con labios en postura neutra relajada y se contrae hacia adelante en un círculo redondeado.",
            "lateral": "La lengua parte del centro neutro y desliza su dorso hacia el paladar blando posterior."
        },
        "mouth_guide_es": {
            "frontal": "Inicia con labios en postura neutra relajada y se contrae hacia adelante en un círculo redondeado.",
            "lateral": "La lengua parte del centro neutro y desliza su dorso hacia el paladar blando posterior."
        },
        "examples": ['go', 'home', 'cold', 'boat', 'know'],
        "contrast_with": "/ɔː/",
        "contrast_pairs": [['boat', 'bought'], ['coat', 'caught'], ['low', 'law']],
        "introduced_at": "A1.3",
        "drill_sentence": "Joe rode home alone slowly through the cold snow.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 10,
            "tongue_visible": False,
            "tongue_path": "M 85 150 Q 100 140 130 140 Q 160 145 185 160 Q 205 180 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 170 Z",
            "focus_x": 130,
            "focus_y": 140,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 50 140"
        }
    },
    "/ɪə/": {
        "ipa": "/ɪə/",
        "name": "Near Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /ɪ/ to /ə/",
        "mouth_aperture": "Close to neutral relaxation",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Inicia con labios levemente sonrientes y se relaja hacia una apertura neutra central.",
            "lateral": "La lengua comienza alta al frente y desciende suavemente al centro neutro de reposo."
        },
        "mouth_guide_es": {
            "frontal": "Inicia con labios levemente sonrientes y se relaja hacia una apertura neutra central.",
            "lateral": "La lengua comienza alta al frente y desciende suavemente al centro neutro de reposo."
        },
        "examples": ['ear', 'here', 'near', 'clear', 'beer'],
        "contrast_with": "/eə/",
        "contrast_pairs": [['hear', 'hair'], ['fear', 'fair'], ['peer', 'pair']],
        "introduced_at": "A2.3",
        "drill_sentence": "It is clear that dear peers hear near here.",
        "svg_params": {
            "lip_width": 60,
            "lip_drop": 6,
            "tongue_visible": False,
            "tongue_path": "M 86 148 Q 100 115 135 110 Q 165 112 190 135 Q 208 162 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 155 Z",
            "focus_x": 125,
            "focus_y": 112,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 180 Q 170 110 50 135"
        }
    },
    "/eə/": {
        "ipa": "/eə/",
        "name": "Square Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /e/ to /ə/",
        "mouth_aperture": "Medium open to neutral",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Inicia con la boca abierta a nivel medio y relaja los labios a posición neutral.",
            "lateral": "La lengua inicia en posición media-alta y se desliza hacia el centro de la cavidad bucal."
        },
        "mouth_guide_es": {
            "frontal": "Inicia con la boca abierta a nivel medio y relaja los labios a posición neutral.",
            "lateral": "La lengua inicia en posición media-alta y se desliza hacia el centro de la cavidad bucal."
        },
        "examples": ['air', 'care', 'chair', 'where', 'wear'],
        "contrast_with": "/ɪə/",
        "contrast_pairs": [['hair', 'hear'], ['fair', 'fear'], ['bear', 'beer']],
        "introduced_at": "A2.3",
        "drill_sentence": "Careful where you wear rare chairs over there.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 8,
            "tongue_visible": False,
            "tongue_path": "M 86 150 Q 100 125 135 120 Q 165 125 190 145 Q 208 170 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 160 Z",
            "focus_x": 125,
            "focus_y": 125,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 180 Q 170 120 50 135"
        }
    },
    "/ʊə/": {
        "ipa": "/ʊə/",
        "name": "Cure Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /ʊ/ to /ə/",
        "mouth_aperture": "Rounded close to neutral",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Inicia con labios redondeados en anillo y se distiende hacia una posición neutra abierta.",
            "lateral": "La lengua se desliza desde la parte posterior alta hacia el centro de la cavidad oral."
        },
        "mouth_guide_es": {
            "frontal": "Inicia con labios redondeados en anillo y se distiende hacia una posición neutra abierta.",
            "lateral": "La lengua se desliza desde la parte posterior alta hacia el centro de la cavidad oral."
        },
        "examples": ['pure', 'tour', 'sure', 'cure', 'mature'],
        "contrast_with": "/ɔː/",
        "contrast_pairs": [['tour', 'tore'], ['sure', 'shore'], ['cure', 'core']],
        "introduced_at": "B1.1",
        "drill_sentence": "I am sure the tourist tour will cure your boredom.",
        "svg_params": {
            "lip_width": 32,
            "lip_drop": 6,
            "tongue_visible": False,
            "tongue_path": "M 86 150 Q 105 140 140 135 Q 175 125 200 145 Q 210 165 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 185 86 165 Z",
            "focus_x": 175,
            "focus_y": 125,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 175 125 50 135"
        }
    },
    "/θ/": {
        "ipa": "/θ/",
        "name": "Voiceless TH",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Tip between upper and lower teeth",
        "mouth_aperture": "Slightly open, teeth visible",
        "airflow": "Continuous friction without vocal cord vibration",
        "mouth_guide": {
            "frontal": "La punta de la lengua se asoma suavemente entre los dientes incisivos superiores e inferiores.",
            "lateral": "El flujo de aire continuo y suave pasa sobre la punta de la lengua sin vibración vocal (sordo)."
        },
        "mouth_guide_es": {
            "frontal": "La punta de la lengua se asoma suavemente entre los dientes incisivos superiores e inferiores.",
            "lateral": "El flujo de aire continuo y suave pasa sobre la punta de la lengua sin vibración vocal (sordo)."
        },
        "examples": ['think', 'three', 'thank', 'month', 'math'],
        "contrast_with": "/ð/",
        "contrast_pairs": [['thigh', 'thy'], ['teeth', 'teethe'], ['ether', 'either'], ['think', 'sink']],
        "introduced_at": "A1.4",
        "drill_sentence": "I think the three healthy thieves ran north.",
        "svg_params": {
            "lip_width": 46,
            "lip_drop": 8,
            "tongue_visible": True,
            "tongue_path": "M 78 138 Q 88 128 108 126 Q 140 130 170 148 Q 200 168 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 78 162 Z",
            "focus_x": 78,
            "focus_y": 132,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 170 135 55 132"
        }
    },
    "/ð/": {
        "ipa": "/ð/",
        "name": "Voiced TH",
        "category": "consonant_fricative",
        "voicing": "voiced",
        "tongue_position": "Tip between upper and lower teeth",
        "mouth_aperture": "Slightly open, teeth visible",
        "airflow": "Continuous friction WITH vocal cord vibration (buzzing)",
        "mouth_guide": {
            "frontal": "Punta de la lengua visible entre los dientes frontales superior e inferior, idéntico a /θ/.",
            "lateral": "El aire fluye entre la lengua y los dientes con vibración activa de las cuerdas vocales (sonoro)."
        },
        "mouth_guide_es": {
            "frontal": "Punta de la lengua visible entre los dientes frontales superior e inferior, idéntico a /θ/.",
            "lateral": "El aire fluye entre la lengua y los dientes con vibración activa de las cuerdas vocales (sonoro)."
        },
        "examples": ['this', 'that', 'brother', 'they', 'father'],
        "contrast_with": "/θ/",
        "contrast_pairs": [['this', 'think'], ['they', 'day'], ['breathe', 'breath'], ['then', 'den']],
        "introduced_at": "A1.4",
        "drill_sentence": "They gather with their mother and brother together.",
        "svg_params": {
            "lip_width": 46,
            "lip_drop": 8,
            "tongue_visible": True,
            "tongue_path": "M 78 138 Q 88 128 108 126 Q 140 130 170 148 Q 200 168 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 78 162 Z",
            "focus_x": 78,
            "focus_y": 132,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 170 135 55 132"
        }
    },
    "/s/": {
        "ipa": "/s/",
        "name": "Voiceless S",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Alveolar ridge, narrow air channel",
        "mouth_aperture": "Teeth close together, smiling",
        "airflow": "Sharp hissing friction, voiceless",
        "mouth_guide": {
            "frontal": "Labios ligeramente estirados en sonrisa; dientes superiores e inferiores casi en contacto.",
            "lateral": "La punta de la lengua se acerca a los alvéolos superiores creando un canal estrecho para un silbido de aire sordo."
        },
        "mouth_guide_es": {
            "frontal": "Labios ligeramente estirados en sonrisa; dientes superiores e inferiores casi en contacto.",
            "lateral": "La punta de la lengua se acerca a los alvéolos superiores creando un canal estrecho para un silbido de aire sordo."
        },
        "examples": ['sun', 'see', 'city', 'glass', 'smile'],
        "contrast_with": "/z/",
        "contrast_pairs": [['sue', 'zoo'], ['peace', 'peas'], ['price', 'prize'], ['bus', 'buzz']],
        "introduced_at": "A1.1",
        "drill_sentence": "Seven sweet sisters sat silently beside six dogs.",
        "svg_params": {
            "lip_width": 55,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 84 140 Q 92 128 115 125 Q 145 132 175 155 Q 200 172 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 84 160 Z",
            "focus_x": 92,
            "focus_y": 126,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 160 128 50 132"
        }
    },
    "/z/": {
        "ipa": "/z/",
        "name": "Voiced Z",
        "category": "consonant_fricative",
        "voicing": "voiced",
        "tongue_position": "Alveolar ridge, narrow channel",
        "mouth_aperture": "Teeth close together",
        "airflow": "Buzzing friction, voiced",
        "mouth_guide": {
            "frontal": "Dientes juntos y labios entreabiertos en postura similar a /s/.",
            "lateral": "La punta de la lengua roza los alvéolos produciendo un zumbido continuo con vibración vocal."
        },
        "mouth_guide_es": {
            "frontal": "Dientes juntos y labios entreabiertos en postura similar a /s/.",
            "lateral": "La punta de la lengua roza los alvéolos produciendo un zumbido continuo con vibración vocal."
        },
        "examples": ['zoo', 'zero', 'music', 'easy', 'has'],
        "contrast_with": "/s/",
        "contrast_pairs": [['zoo', 'sue'], ['buzz', 'bus'], ['eyes', 'ice'], ['rise', 'rice']],
        "introduced_at": "A1.1",
        "drill_sentence": "Zoe visits zebras in busy crazy zoos.",
        "svg_params": {
            "lip_width": 55,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 84 140 Q 92 128 115 125 Q 145 132 175 155 Q 200 172 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 84 160 Z",
            "focus_x": 92,
            "focus_y": 126,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 160 128 50 132"
        }
    },
    "/ʃ/": {
        "ipa": "/ʃ/",
        "name": "SH sound (Shoe)",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Post-alveolar / palate, broad blade",
        "mouth_aperture": "Lips pushed forward and flared (shhh gesture)",
        "airflow": "Soft rushing friction, voiceless",
        "mouth_guide": {
            "frontal": "Labios proyectados hacia afuera en forma de trompeta o 'shhh' acampanado.",
            "lateral": "El dorso de la lengua se eleva ampliamente hacia la zona postalveolar canalizando un flujo turbulento sordo."
        },
        "mouth_guide_es": {
            "frontal": "Labios proyectados hacia afuera en forma de trompeta o 'shhh' acampanado.",
            "lateral": "El dorso de la lengua se eleva ampliamente hacia la zona postalveolar canalizando un flujo turbulento sordo."
        },
        "examples": ['shoe', 'fish', 'wash', 'national', 'ocean'],
        "contrast_with": "/tʃ/",
        "contrast_pairs": [['share', 'chair'], ['sheet', 'cheat'], ['shoe', 'chew'], ['wash', 'watch']],
        "introduced_at": "A1.2",
        "drill_sentence": "She wished she washed shiny short shoes.",
        "svg_params": {
            "lip_width": 34,
            "lip_drop": 14,
            "tongue_visible": False,
            "tongue_path": "M 85 148 Q 100 118 130 110 Q 160 108 185 130 Q 205 160 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 85 148 Z",
            "focus_x": 118,
            "focus_y": 112,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 180 Q 160 108 50 130"
        }
    },
    "/ʒ/": {
        "ipa": "/ʒ/",
        "name": "ZH sound (Vision / Measure)",
        "category": "consonant_fricative",
        "voicing": "voiced",
        "tongue_position": "Post-alveolar / palate",
        "mouth_aperture": "Lips protruded and flared",
        "airflow": "Buzzing soft friction, voiced",
        "mouth_guide": {
            "frontal": "Labios acampanados proyectados hacia adelante en forma idéntica a /ʃ/.",
            "lateral": "Lengua ancha contra la zona postalveolar con vibración intensa en las cuerdas vocales (sonoro como 'vision')."
        },
        "mouth_guide_es": {
            "frontal": "Labios acampanados proyectados hacia adelante en forma idéntica a /ʃ/.",
            "lateral": "Lengua ancha contra la zona postalveolar con vibración intensa en las cuerdas vocales (sonoro como 'vision')."
        },
        "examples": ['measure', 'vision', 'treasure', 'garage', 'television'],
        "contrast_with": "/dʒ/",
        "contrast_pairs": [['measure', 'major'], ['pleasure', 'pledge']],
        "introduced_at": "B1.2",
        "drill_sentence": "It is a pleasure to measure leisure treasures on television.",
        "svg_params": {
            "lip_width": 34,
            "lip_drop": 14,
            "tongue_visible": False,
            "tongue_path": "M 85 148 Q 100 118 130 110 Q 160 108 185 130 Q 205 160 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 85 148 Z",
            "focus_x": 118,
            "focus_y": 112,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 180 Q 160 108 50 130"
        }
    },
    "/tʃ/": {
        "ipa": "/tʃ/",
        "name": "CH sound (Chair)",
        "category": "consonant_affricate",
        "voicing": "voiceless",
        "tongue_position": "Stop at ridge then release to /ʃ/",
        "mouth_aperture": "Lips rounded slightly, explosive release",
        "airflow": "Stops completely then explodes into friction",
        "mouth_guide": {
            "frontal": "Labios ligeramente proyectados hacia afuera y entreabiertos (como en 'ch').",
            "lateral": "La punta de la lengua bloquea el aire en los alvéolos y se suelta bruscamente con fricción sorda ('chair')."
        },
        "mouth_guide_es": {
            "frontal": "Labios ligeramente proyectados hacia afuera y entreabiertos (como en 'ch').",
            "lateral": "La punta de la lengua bloquea el aire en los alvéolos y se suelta bruscamente con fricción sorda ('chair')."
        },
        "examples": ['chair', 'teach', 'church', 'chocolate', 'match'],
        "contrast_with": "/ʃ/",
        "contrast_pairs": [['chair', 'share'], ['cheat', 'sheet'], ['chew', 'shoe'], ['catch', 'cash']],
        "introduced_at": "A1.2",
        "drill_sentence": "Charles cheered cheerfully during the match at church.",
        "svg_params": {
            "lip_width": 34,
            "lip_drop": 14,
            "tongue_visible": False,
            "tongue_path": "M 85 145 Q 95 115 125 105 Q 155 100 185 125 Q 205 158 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 85 148 Z",
            "focus_x": 108,
            "focus_y": 105,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 175 Q 155 102 50 128"
        }
    },
    "/dʒ/": {
        "ipa": "/dʒ/",
        "name": "J sound (Jump / Age)",
        "category": "consonant_affricate",
        "voicing": "voiced",
        "tongue_position": "Stop at ridge then release to /ʒ/",
        "mouth_aperture": "Lips rounded, voiced pop",
        "airflow": "Stops completely then explodes with voice",
        "mouth_guide": {
            "frontal": "Labios proyectados hacia adelante con dientes casi cerrados.",
            "lateral": "La lengua bloquea y libera el aire en la zona postalveolar con fuerte sonoridad vocal ('joy')."
        },
        "mouth_guide_es": {
            "frontal": "Labios proyectados hacia adelante con dientes casi cerrados.",
            "lateral": "La lengua bloquea y libera el aire en la zona postalveolar con fuerte sonoridad vocal ('joy')."
        },
        "examples": ['job', 'juice', 'bridge', 'age', 'orange'],
        "contrast_with": "/tʃ/",
        "contrast_pairs": [['job', 'chop'], ['joke', 'choke'], ['gin', 'chin'], ['jump', 'chump']],
        "introduced_at": "A1.2",
        "drill_sentence": "Judge John enjoys drinking orange juice in July.",
        "svg_params": {
            "lip_width": 34,
            "lip_drop": 14,
            "tongue_visible": False,
            "tongue_path": "M 85 145 Q 95 115 125 105 Q 155 100 185 125 Q 205 158 215 200 Q 210 225 180 228 Q 140 222 110 202 Q 85 178 85 148 Z",
            "focus_x": 108,
            "focus_y": 105,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 175 Q 155 102 50 128"
        }
    },
    "/f/": {
        "ipa": "/f/",
        "name": "Voiceless F",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Neutral resting",
        "mouth_aperture": "Top teeth resting gently on lower lip",
        "airflow": "Continuous friction between lip and teeth, silent",
        "mouth_guide": {
            "frontal": "Los dientes incisivos superiores se apoyan suavemente sobre el borde interno del labio inferior.",
            "lateral": "El aire continuo sale con fricción entre los dientes superiores y el labio inferior (sordo, sin voz)."
        },
        "mouth_guide_es": {
            "frontal": "Los dientes incisivos superiores se apoyan suavemente sobre el borde interno del labio inferior.",
            "lateral": "El aire continuo sale con fricción entre los dientes superiores y el labio inferior (sordo, sin voz)."
        },
        "examples": ['food', 'phone', 'coffee', 'laugh', 'life'],
        "contrast_with": "/v/",
        "contrast_pairs": [['fan', 'van'], ['safe', 'save'], ['few', 'view'], ['leaf', 'leave']],
        "introduced_at": "A1.1",
        "drill_sentence": "Four famous friends found fresh fruit quickly.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 85 150 Q 100 140 130 140 Q 160 145 185 160 Q 205 180 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 170 Z",
            "focus_x": 75,
            "focus_y": 130,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 50 130"
        }
    },
    "/v/": {
        "ipa": "/v/",
        "name": "Voiced V",
        "category": "consonant_fricative",
        "voicing": "voiced",
        "tongue_position": "Neutral resting",
        "mouth_aperture": "Top teeth resting on lower lip",
        "airflow": "Continuous friction with strong vocal buzz",
        "mouth_guide": {
            "frontal": "Dientes incisivos superiores apoyados sobre el labio inferior húmedo, igual que en /f/.",
            "lateral": "El aire vibra con las cuerdas vocales mientras roza entre los dientes superiores y el labio (sonoro)."
        },
        "mouth_guide_es": {
            "frontal": "Dientes incisivos superiores apoyados sobre el labio inferior húmedo, igual que en /f/.",
            "lateral": "El aire vibra con las cuerdas vocales mientras roza entre los dientes superiores y el labio (sonoro)."
        },
        "examples": ['voice', 'very', 'travel', 'live', 'seven'],
        "contrast_with": "/f/",
        "contrast_pairs": [['van', 'fan'], ['save', 'safe'], ['view', 'few'], ['vest', 'best']],
        "introduced_at": "A1.1",
        "drill_sentence": "Victor travels with vibrant energy every November.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 85 150 Q 100 140 130 140 Q 160 145 185 160 Q 205 180 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 170 Z",
            "focus_x": 75,
            "focus_y": 130,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 50 130"
        }
    },
    "/h/": {
        "ipa": "/h/",
        "name": "H sound (House)",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Adopts position of following vowel",
        "mouth_aperture": "Open mouth, relaxed",
        "airflow": "Exhaled breath through open glottis",
        "mouth_guide": {
            "frontal": "Boca relajada en apertura natural adoptando la forma de la vocal que le sigue.",
            "lateral": "El aire se exhala suavemente desde la glotis en la garganta sin contacto de la lengua."
        },
        "mouth_guide_es": {
            "frontal": "Boca relajada en apertura natural adoptando la forma de la vocal que le sigue.",
            "lateral": "El aire se exhala suavemente desde la glotis en la garganta sin contacto de la lengua."
        },
        "examples": ['happy', 'house', 'hotel', 'help', 'who'],
        "contrast_with": "/r/",
        "contrast_pairs": [['hat', 'at'], ['hear', 'ear'], ['hold', 'old']],
        "introduced_at": "A1.1",
        "drill_sentence": "Harry had a happy holiday in his huge house.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 15,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 100 150 130 150 Q 160 155 185 170 Q 205 190 215 210 Q 212 230 182 232 Q 142 225 112 215 Q 86 195 85 175 Z",
            "focus_x": 235,
            "focus_y": 250,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 235 250 Q 200 180 50 145"
        }
    },
    "/p/": {
        "ipa": "/p/",
        "name": "Voiceless P",
        "category": "consonant_plosive",
        "voicing": "voiceless",
        "tongue_position": "Neutral",
        "mouth_aperture": "Both lips sealed together then popped open",
        "airflow": "Complete burst of air (aspirated)",
        "mouth_guide": {
            "frontal": "Ambos labios se sellan firmemente cortando por completo la salida del aire.",
            "lateral": "El aire se acumula detrás de los labios cerrados y explota con un estallido sordo sin voz."
        },
        "mouth_guide_es": {
            "frontal": "Ambos labios se sellan firmemente cortando por completo la salida del aire.",
            "lateral": "El aire se acumula detrás de los labios cerrados y explota con un estallido sordo sin voz."
        },
        "examples": ['pen', 'park', 'apple', 'stop', 'happy'],
        "contrast_with": "/b/",
        "contrast_pairs": [['pat', 'bat'], ['pin', 'bin'], ['rope', 'robe'], ['cap', 'cab']],
        "introduced_at": "A1.1",
        "drill_sentence": "Peter picked a piece of paper for the party.",
        "svg_params": {
            "lip_width": 46,
            "lip_drop": 0,
            "tongue_visible": False,
            "tongue_path": "M 85 150 Q 100 140 130 140 Q 160 145 185 160 Q 205 180 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 170 Z",
            "focus_x": 75,
            "focus_y": 140,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 75 140"
        }
    },
    "/b/": {
        "ipa": "/b/",
        "name": "Voiced B",
        "category": "consonant_plosive",
        "voicing": "voiced",
        "tongue_position": "Neutral",
        "mouth_aperture": "Both lips sealed then released with voice",
        "airflow": "Burst of vocalized air",
        "mouth_guide": {
            "frontal": "Labios superior e inferior sellados juntos, idéntico a /p/.",
            "lateral": "Acumulación de aire detrás de los labios que se abre en explosión con vibración de las cuerdas vocales (sonoro)."
        },
        "mouth_guide_es": {
            "frontal": "Labios superior e inferior sellados juntos, idéntico a /p/.",
            "lateral": "Acumulación de aire detrás de los labios que se abre en explosión con vibración de las cuerdas vocales (sonoro)."
        },
        "examples": ['book', 'boy', 'table', 'club', 'baby'],
        "contrast_with": "/p/",
        "contrast_pairs": [['bat', 'pat'], ['bin', 'pin'], ['robe', 'rope'], ['cab', 'cap']],
        "introduced_at": "A1.1",
        "drill_sentence": "Bob bought big brown bags of bright balloons.",
        "svg_params": {
            "lip_width": 46,
            "lip_drop": 0,
            "tongue_visible": False,
            "tongue_path": "M 85 150 Q 100 140 130 140 Q 160 145 185 160 Q 205 180 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 85 170 Z",
            "focus_x": 75,
            "focus_y": 140,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 75 140"
        }
    },
    "/t/": {
        "ipa": "/t/",
        "name": "Voiceless T",
        "category": "consonant_plosive",
        "voicing": "voiceless",
        "tongue_position": "Tip firmly seals against alveolar ridge",
        "mouth_aperture": "Slightly open",
        "airflow": "Aspirated clean burst",
        "mouth_guide": {
            "frontal": "Boca entreabierta con dientes frontales ligeramente separados.",
            "lateral": "La punta de la lengua sella firmemente contra los alvéolos superiores y libera el aire con un golpe seco sordo."
        },
        "mouth_guide_es": {
            "frontal": "Boca entreabierta con dientes frontales ligeramente separados.",
            "lateral": "La punta de la lengua sella firmemente contra los alvéolos superiores y libera el aire con un golpe seco sordo."
        },
        "examples": ['table', 'tea', 'water', 'cat', 'time'],
        "contrast_with": "/d/",
        "contrast_pairs": [['tin', 'din'], ['town', 'down'], ['heart', 'hard'], ['bat', 'bad']],
        "introduced_at": "A1.1",
        "drill_sentence": "Two tall teachers told ten funny tales.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 92 128 Q 100 125 125 125 Q 155 135 180 155 Q 205 175 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 92 145 Z",
            "focus_x": 95,
            "focus_y": 128,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 95 128"
        }
    },
    "/d/": {
        "ipa": "/d/",
        "name": "Voiced D",
        "category": "consonant_plosive",
        "voicing": "voiced",
        "tongue_position": "Tip against alveolar ridge",
        "mouth_aperture": "Slightly open",
        "airflow": "Voiced pop release",
        "mouth_guide": {
            "frontal": "Boca entreabierta y mandíbula relajada.",
            "lateral": "La punta de la lengua presiona los alvéolos superiores y suelta el aire con vibración vocal sonora."
        },
        "mouth_guide_es": {
            "frontal": "Boca entreabierta y mandíbula relajada.",
            "lateral": "La punta de la lengua presiona los alvéolos superiores y suelta el aire con vibración vocal sonora."
        },
        "examples": ['door', 'dog', 'day', 'under', 'red'],
        "contrast_with": "/t/",
        "contrast_pairs": [['din', 'tin'], ['down', 'town'], ['hard', 'heart'], ['bad', 'bat']],
        "introduced_at": "A1.1",
        "drill_sentence": "David did daring deeds during difficult days.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 92 128 Q 100 125 125 125 Q 155 135 180 155 Q 205 175 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 92 145 Z",
            "focus_x": 95,
            "focus_y": 128,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 95 128"
        }
    },
    "/k/": {
        "ipa": "/k/",
        "name": "Voiceless K",
        "category": "consonant_plosive",
        "voicing": "voiceless",
        "tongue_position": "Back of tongue against soft palate (velum)",
        "mouth_aperture": "Medium open",
        "airflow": "Velar plosive burst",
        "mouth_guide": {
            "frontal": "Boca relajada medianamente abierta dejando ver la cavidad oral.",
            "lateral": "La parte posterior de la lengua presiona el velo del paladar (paladar blando) y libera un estallido de aire sordo."
        },
        "mouth_guide_es": {
            "frontal": "Boca relajada medianamente abierta dejando ver la cavidad oral.",
            "lateral": "La parte posterior de la lengua presiona el velo del paladar (paladar blando) y libera un estallido de aire sordo."
        },
        "examples": ['cat', 'car', 'key', 'school', 'back'],
        "contrast_with": "/g/",
        "contrast_pairs": [['coat', 'goat'], ['class', 'glass'], ['cold', 'gold'], ['back', 'bag']],
        "introduced_at": "A1.1",
        "drill_sentence": "Karl kept cooking crispy cookies in the kitchen.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 10,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 110 145 150 135 Q 190 110 200 135 Q 210 165 218 200 Q 212 225 182 228 Q 142 222 112 205 Q 86 185 85 165 Z",
            "focus_x": 190,
            "focus_y": 115,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 200 115 190 115"
        }
    },
    "/g/": {
        "ipa": "/g/",
        "name": "Voiced G",
        "category": "consonant_plosive",
        "voicing": "voiced",
        "tongue_position": "Back of tongue against soft palate",
        "mouth_aperture": "Medium open",
        "airflow": "Voiced velar release",
        "mouth_guide": {
            "frontal": "Boca entreabierta con labios neutros.",
            "lateral": "El dorso posterior de la lengua bloquea el velo del paladar y libera el flujo sonoro con voz activa."
        },
        "mouth_guide_es": {
            "frontal": "Boca entreabierta con labios neutros.",
            "lateral": "El dorso posterior de la lengua bloquea el velo del paladar y libera el flujo sonoro con voz activa."
        },
        "examples": ['go', 'girl', 'game', 'big', 'green'],
        "contrast_with": "/k/",
        "contrast_pairs": [['goat', 'coat'], ['glass', 'class'], ['gold', 'cold'], ['bag', 'back']],
        "introduced_at": "A1.1",
        "drill_sentence": "Great green grass grows gracefully in Greg's garden.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 10,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 110 145 150 135 Q 190 110 200 135 Q 210 165 218 200 Q 212 225 182 228 Q 142 222 112 205 Q 86 185 85 165 Z",
            "focus_x": 190,
            "focus_y": 115,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 200 115 190 115"
        }
    },
    "/m/": {
        "ipa": "/m/",
        "name": "Bilabial Nasal M",
        "category": "consonant_nasal",
        "voicing": "voiced",
        "tongue_position": "Neutral",
        "mouth_aperture": "Lips completely closed",
        "airflow": "100% through the nose with humming voice",
        "mouth_guide": {
            "frontal": "Ambos labios cerrados suavemente formando un sello bilabial continuo.",
            "lateral": "El velo del paladar desciende para que el aire y la vibración vocal resuenen completamente a través de la nariz."
        },
        "mouth_guide_es": {
            "frontal": "Ambos labios cerrados suavemente formando un sello bilabial continuo.",
            "lateral": "El velo del paladar desciende para que el aire y la vibración vocal resuenen completamente a través de la nariz."
        },
        "examples": ['man', 'mother', 'summer', 'time', 'room'],
        "contrast_with": "/n/",
        "contrast_pairs": [['mice', 'nice'], ['sum', 'sun'], ['mime', 'nine']],
        "introduced_at": "A1.1",
        "drill_sentence": "Many memorable moments make marvelous memories.",
        "svg_params": {
            "lip_width": 46,
            "lip_drop": 0,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 100 148 130 150 Q 165 158 195 178 Q 210 198 218 218 Q 212 232 182 232 Q 142 226 112 208 Q 86 188 85 170 Z",
            "focus_x": 76,
            "focus_y": 142,
            "nasal": True,
            "velum": "M 215 95 Q 222 115 218 140 Q 215 158 210 170",
            "uvula_y": 178,
            "air": "M 218 120 Q 180 65 120 55 Q 100 55 75 70"
        }
    },
    "/n/": {
        "ipa": "/n/",
        "name": "Alveolar Nasal N",
        "category": "consonant_nasal",
        "voicing": "voiced",
        "tongue_position": "Tongue tip seals upper gum ridge",
        "mouth_aperture": "Slightly open lips",
        "airflow": "Through nose with vocal cord vibration",
        "mouth_guide": {
            "frontal": "Boca entreabierta con labios relajados.",
            "lateral": "La punta de la lengua se apoya en los alvéolos superiores desviando todo el flujo de aire sonoro hacia la nariz."
        },
        "mouth_guide_es": {
            "frontal": "Boca entreabierta con labios relajados.",
            "lateral": "La punta de la lengua se apoya en los alvéolos superiores desviando todo el flujo de aire sonoro hacia la nariz."
        },
        "examples": ['no', 'name', 'night', 'sun', 'open'],
        "contrast_with": "/ŋ/",
        "contrast_pairs": [['sin', 'sing'], ['thin', 'thing'], ['ran', 'rang'], ['pan', 'pang']],
        "introduced_at": "A1.1",
        "drill_sentence": "No nice neighbor notices nine noisy nightingales.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 92 128 Q 100 125 125 125 Q 155 135 180 155 Q 205 175 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 92 145 Z",
            "focus_x": 95,
            "focus_y": 128,
            "nasal": True,
            "velum": "M 215 95 Q 222 115 218 140 Q 215 158 210 170",
            "uvula_y": 178,
            "air": "M 218 120 Q 180 65 120 55 Q 100 55 75 70"
        }
    },
    "/ŋ/": {
        "ipa": "/ŋ/",
        "name": "Velar Nasal NG",
        "category": "consonant_nasal",
        "voicing": "voiced",
        "tongue_position": "Back of tongue seals against soft palate",
        "mouth_aperture": "Medium open lips",
        "airflow": "Through nose from back of throat",
        "mouth_guide": {
            "frontal": "Boca abierta a media altura con labios relajados.",
            "lateral": "La parte posterior de la lengua sella contra el paladar blando, obligando al aire a salir exclusivamente por la cavidad nasal."
        },
        "mouth_guide_es": {
            "frontal": "Boca abierta a media altura con labios relajados.",
            "lateral": "La parte posterior de la lengua sella contra el paladar blando, obligando al aire a salir exclusivamente por la cavidad nasal."
        },
        "examples": ['sing', 'song', 'english', 'bring', 'young'],
        "contrast_with": "/n/",
        "contrast_pairs": [['sing', 'sin'], ['thing', 'thin'], ['ring', 'rinse'], ['bang', 'ban']],
        "introduced_at": "A1.3",
        "drill_sentence": "The strong young king was singing a charming song.",
        "svg_params": {
            "lip_width": 44,
            "lip_drop": 10,
            "tongue_visible": False,
            "tongue_path": "M 85 155 Q 110 145 150 135 Q 190 110 200 135 Q 210 165 218 200 Q 212 225 182 228 Q 142 222 112 205 Q 86 185 85 165 Z",
            "focus_x": 190,
            "focus_y": 115,
            "nasal": True,
            "velum": "M 215 95 Q 222 115 218 140 Q 215 158 210 170",
            "uvula_y": 178,
            "air": "M 218 120 Q 180 65 120 55 Q 100 55 75 70"
        }
    },
    "/l/": {
        "ipa": "/l/",
        "name": "Lateral L",
        "category": "consonant_approximant",
        "voicing": "voiced",
        "tongue_position": "Tip against alveolar ridge, sides lowered",
        "mouth_aperture": "Slightly open",
        "airflow": "Air flows freely around both sides of tongue",
        "mouth_guide": {
            "frontal": "Boca abierta con dientes separados y labios sueltos.",
            "lateral": "La punta de la lengua toca los alvéolos superiores mientras el aire sonoro escapa libremente por ambos costados de la lengua."
        },
        "mouth_guide_es": {
            "frontal": "Boca abierta con dientes separados y labios sueltos.",
            "lateral": "La punta de la lengua toca los alvéolos superiores mientras el aire sonoro escapa libremente por ambos costados de la lengua."
        },
        "examples": ['light', 'love', 'play', 'call', 'yellow'],
        "contrast_with": "/r/",
        "contrast_pairs": [['light', 'right'], ['glass', 'grass'], ['fly', 'fry'], ['belly', 'berry']],
        "introduced_at": "A1.1",
        "drill_sentence": "Lucy loves looking at lovely yellow lights.",
        "svg_params": {
            "lip_width": 50,
            "lip_drop": 6,
            "tongue_visible": False,
            "tongue_path": "M 92 128 Q 105 125 130 135 Q 160 145 185 160 Q 205 180 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 92 145 Z",
            "focus_x": 95,
            "focus_y": 128,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 140 50 140"
        }
    },
    "/r/": {
        "ipa": "/r/",
        "name": "Approximant R",
        "category": "consonant_approximant",
        "voicing": "voiced",
        "tongue_position": "Curled back / bunched near palate without touching",
        "mouth_aperture": "Lips slightly rounded and flared",
        "airflow": "Smooth unobstructed voiced flow",
        "mouth_guide": {
            "frontal": "Labios ligeramente redondeados o fruncidos hacia adelante.",
            "lateral": "La punta de la lengua se curva hacia arriba y atrás (retrofleja) hacia el paladar sin tocarlo."
        },
        "mouth_guide_es": {
            "frontal": "Labios ligeramente redondeados o fruncidos hacia adelante.",
            "lateral": "La punta de la lengua se curva hacia arriba y atrás (retrofleja) hacia el paladar sin tocarlo."
        },
        "examples": ['red', 'run', 'room', 'friend', 'try'],
        "contrast_with": "/l/",
        "contrast_pairs": [['right', 'light'], ['grass', 'glass'], ['fry', 'fly'], ['red', 'led']],
        "introduced_at": "A1.1",
        "drill_sentence": "Robert ran rapidly around the red running ring.",
        "svg_params": {
            "lip_width": 38,
            "lip_drop": 6,
            "tongue_visible": False,
            "tongue_path": "M 105 125 Q 115 135 135 140 Q 165 145 190 160 Q 205 180 215 205 Q 212 230 182 232 Q 142 225 112 210 Q 86 190 105 145 Z",
            "focus_x": 105,
            "focus_y": 125,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 190 Q 160 135 50 140"
        }
    },
    "/w/": {
        "ipa": "/w/",
        "name": "Labio-velar W",
        "category": "consonant_approximant",
        "voicing": "voiced",
        "tongue_position": "Back of tongue high, transitions rapidly to vowel",
        "mouth_aperture": "Lips pursed in tight small circle like whistling",
        "airflow": "Voiced glide release",
        "mouth_guide": {
            "frontal": "Labios fruncidos hacia adelante formando un círculo pequeño muy cerrado y tenso.",
            "lateral": "La parte posterior de la lengua se eleva hacia el velo del paladar mientras el aire vocalizado fluye hacia los labios."
        },
        "mouth_guide_es": {
            "frontal": "Labios fruncidos hacia adelante formando un círculo pequeño muy cerrado y tenso.",
            "lateral": "La parte posterior de la lengua se eleva hacia el velo del paladar mientras el aire vocalizado fluye hacia los labios."
        },
        "examples": ['water', 'we', 'work', 'window', 'sweet'],
        "contrast_with": "/v/",
        "contrast_pairs": [['west', 'vest'], ['wine', 'vine'], ['wet', 'vet'], ['whale', 'veil']],
        "introduced_at": "A1.2",
        "drill_sentence": "We will watch William walk while water winds west.",
        "svg_params": {
            "lip_width": 28,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 86 150 Q 110 135 150 120 Q 185 105 205 135 Q 212 165 218 200 Q 212 225 182 228 Q 142 222 112 205 Q 86 185 86 165 Z",
            "focus_x": 185,
            "focus_y": 110,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 185 Q 185 110 50 135"
        }
    },
    "/j/": {
        "ipa": "/j/",
        "name": "Palatal Approximant Y",
        "category": "consonant_approximant",
        "voicing": "voiced",
        "tongue_position": "High front arched toward hard palate",
        "mouth_aperture": "Smiling lips",
        "airflow": "Smooth voiced palatal glide",
        "mouth_guide": {
            "frontal": "Labios estirados en sonrisa suave y dientes entreabiertos.",
            "lateral": "El dorso de la lengua se eleva muy cerca del paladar duro y se desliza rápidamente hacia la vocal siguiente."
        },
        "mouth_guide_es": {
            "frontal": "Labios estirados en sonrisa suave y dientes entreabiertos.",
            "lateral": "El dorso de la lengua se eleva muy cerca del paladar duro y se desliza rápidamente hacia la vocal siguiente."
        },
        "examples": ['yes', 'you', 'yellow', 'young', 'year'],
        "contrast_with": "/dʒ/",
        "contrast_pairs": [['yet', 'jet'], ['year', 'jeer'], ['yolk', 'joke'], ['yam', 'jam']],
        "introduced_at": "A1.1",
        "drill_sentence": "Young yesterday youth yielded yellow yachts.",
        "svg_params": {
            "lip_width": 55,
            "lip_drop": 4,
            "tongue_visible": False,
            "tongue_path": "M 86 145 Q 100 108 135 100 Q 165 102 190 130 Q 208 162 218 200 Q 212 225 182 228 Q 142 222 112 202 Q 86 178 86 155 Z",
            "focus_x": 135,
            "focus_y": 105,
            "nasal": False,
            "velum": "M 215 95 Q 228 108 232 122 Q 234 132 230 142",
            "uvula_y": 150,
            "air": "M 230 180 Q 170 105 50 135"
        }
    },
}

# Mapping each IPA symbol to its SVG image base filename
PHONEME_IMAGE_MAP: Dict[str, str] = {'/ɪ/': 'vowel_short_i', '/e/': 'vowel_short_e', '/æ/': 'vowel_short_ae', '/ʌ/': 'vowel_short_wedge', '/ɒ/': 'vowel_short_o', '/ʊ/': 'vowel_short_upsilon', '/ə/': 'vowel_schwa', '/iː/': 'vowel_long_i', '/ɑː/': 'vowel_long_a', '/ɔː/': 'vowel_long_o', '/uː/': 'vowel_long_u', '/ɜː/': 'vowel_long_er', '/eɪ/': 'diphthong_ei', '/aɪ/': 'diphthong_ai', '/ɔɪ/': 'diphthong_oi', '/aʊ/': 'diphthong_au', '/əʊ/': 'diphthong_ou', '/ɪə/': 'diphthong_ia', '/eə/': 'diphthong_ea', '/ʊə/': 'diphthong_ua', '/f/': 'fricative_f', '/v/': 'fricative_v', '/θ/': 'fricative_th_voiceless', '/ð/': 'fricative_th_voiced', '/s/': 'fricative_s', '/z/': 'fricative_z', '/ʃ/': 'fricative_sh', '/ʒ/': 'fricative_zh', '/h/': 'fricative_h', '/tʃ/': 'affricate_ch', '/dʒ/': 'affricate_j', '/p/': 'plosive_p', '/b/': 'plosive_b', '/t/': 'plosive_t', '/d/': 'plosive_d', '/k/': 'plosive_k', '/g/': 'plosive_g', '/m/': 'nasal_m', '/n/': 'nasal_n', '/ŋ/': 'nasal_ng', '/l/': 'approximant_l', '/r/': 'approximant_r', '/j/': 'approximant_j', '/w/': 'approximant_w'}


def _enrich_phoneme(item: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not item:
        return None
    data = dict(item)
    ipa = data.get("ipa", "")
    base = PHONEME_IMAGE_MAP.get(ipa)
    if base:
        data["mouth_frontal_img"] = f"/images/phonemes/{base}_frontal.svg"
        data["mouth_lateral_img"] = f"/images/phonemes/{base}_lateral.svg"
        data["audio_file"] = f"/audio/phonemes/{base}.ogg"
    if "mouth_guide_es" in data:
        data["mouth_guide"] = data["mouth_guide_es"]
    return data


def get_all_phonemes() -> List[Dict[str, Any]]:
    """Returns list of all phoneme definitions with enriched image and audio metadata."""
    return [_enrich_phoneme(v) for v in PHONETIC_CATALOG.values()]


def get_phoneme(symbol: str) -> Optional[Dict[str, Any]]:
    """Get single phoneme metadata by IPA key e.g. '/θ/' or 'θ'."""
    if not symbol:
        return None
    clean = symbol.strip()
    if not clean.startswith("/"):
        clean = f"/{clean}"
    if not clean.endswith("/"):
        clean = f"{clean}/"
    item = PHONETIC_CATALOG.get(clean)
    return _enrich_phoneme(item)


def get_phonemes_by_category() -> Dict[str, List[Dict[str, Any]]]:
    """Group phonemes into categorized lists for frontend UI board rendering."""
    categories: Dict[str, List[Dict[str, Any]]] = {
        "vowels_short": [],
        "vowels_long": [],
        "diphthongs": [],
        "consonants_fricatives": [],
        "consonants_plosives": [],
        "consonants_other": []
    }
    for item in PHONETIC_CATALOG.values():
        enriched = _enrich_phoneme(item)
        cat = enriched.get("category", "")
        if cat == "vowel_short":
            categories["vowels_short"].append(enriched)
        elif cat == "vowel_long":
            categories["vowels_long"].append(enriched)
        elif cat == "diphthong":
            categories["diphthongs"].append(enriched)
        elif "fricative" in cat or "affricate" in cat:
            categories["consonants_fricatives"].append(enriched)
        elif "plosive" in cat:
            categories["consonants_plosives"].append(enriched)
        else:
            categories["consonants_other"].append(enriched)
    return categories


def get_phonetic_focus_for_sublevel(sublevel: str, class_index: int = 1) -> Optional[Dict[str, Any]]:
    """
    Select recommended phoneme contrast for a given sublevel and class index (1-4).
    Enforces the 'Enseñar por Contraste' pedagogical rule.
    """
    focus_map: Dict[str, Dict[int, str]] = {
        "A1.1": {1: "/iː/", 2: "/ɪ/", 3: "/s/", 4: "/z/"},
        "A1.2": {1: "/e/", 2: "/æ/", 3: "/ʃ/", 4: "/tʃ/"},
        "A1.3": {1: "/ʌ/", 2: "/ɑː/", 3: "/eɪ/", 4: "/aɪ/"},
        "A1.4": {1: "/θ/", 2: "/ð/", 3: "/ɒ/", 4: "/ɔː/"},
        "A2.1": {1: "/ʊ/", 2: "/uː/", 3: "/p/", 4: "/b/"},
        "A2.2": {1: "/ɜː/", 2: "/ə/", 3: "/ɔɪ/", 4: "/aʊ/"},
        "A2.3": {1: "/ɪə/", 2: "/eə/", 3: "/f/", 4: "/v/"},
        "A2.4": {1: "/t/", 2: "/d/", 3: "/k/", 4: "/g/"},
        "B1.1": {1: "/θ/", 2: "/ð/", 3: "/ʊə/", 4: "/əʊ/"},
        "B1.2": {1: "/æ/", 2: "/ʌ/", 3: "/ʒ/", 4: "/dʒ/"},
        "B1.3": {1: "/iː/", 2: "/ɪ/", 3: "/w/", 4: "/v/"},
        "B1.4": {1: "/s/", 2: "/z/", 3: "/l/", 4: "/r/"},
        "B2.1": {1: "/ʃ/", 2: "/tʃ/", 3: "/ŋ/", 4: "/n/"},
        "B2.2": {1: "/θ/", 2: "/s/", 3: "/eɪ/", 4: "/e/"},
        "B2.3": {1: "/dʒ/", 2: "/j/", 3: "/ɔː/", 4: "/ɒ/"},
        "B2.4": {1: "/ɜː/", 2: "/ə/", 3: "/ʊ/", 4: "/uː/"}
    }
    
    sub = sublevel.upper()
    ph_symbol = focus_map.get(sub, {}).get(class_index, "/θ/")
    return get_phoneme(ph_symbol)
