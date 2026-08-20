"""
Guionbajo — TTS Phonetic & Text Normalizer
Normalizes text before sending to speech synthesizers to ensure natural human-sounding delivery.
Prevents spelling out interjections (e.g. "Mmm" -> "eme-eme-eme") and formats currencies,
abbreviations, and English phonetic tokens within Spanish speech.
"""
import re

# Interjections and filler sounds that TTS synthesizers tend to spell out awkwardly
INTERJECTION_REPLACEMENTS = [
    (r'\b(?:Mmm+|Hmm+|Uhm+|Hum+|Emm+)\b\.{0,3}', 'A ver... '),
    (r'\b(?:Aha|Ajá)\b\.{0,3}', '¡Ajá! '),
    (r'\b(?:Wow|Guau)\b\.{0,3}', '¡Guau! '),
    (r'\b(?:Oops|Ups)\b\.{0,3}', '¡Ups! '),
    (r'\b(?:Shh+|Chist)\b\.{0,3}', 'Silencio... '),
]

# Currency & common abbreviations normalization for Spanish TTS
ABBREVIATION_REPLACEMENTS = [
    (r'\$(\d+(?:\.\d+)?)\s*(?:USD|usd)?\b', r'\1 dólares'),
    (r'€(\d+(?:\.\d+)?)\b', r'\1 euros'),
    (r'(\d+)\s*%', r'\1 por ciento'),
    (r'\bvs\.?\b', 'versus'),
    (r'\bej\.?\b', 'por ejemplo'),
    (r'\bpág\.?\b', 'página'),
    (r'\betc\.?\b', 'etcétera'),
    (r'\bEE\.?\s*UU\.?\b', 'Estados Unidos'),
    (r'\bDr\.?\b', 'Doctor'),
    (r'\bDra\.?\b', 'Doctora'),
    (r'\bSr\.?\b', 'Señor'),
    (r'\bSra\.?\b', 'Señora'),
]

# English target words commonly mispronounced by Spanish TTS voices
ENGLISH_TTS_PHONETIC_MAP = {
    r'\bHi\b': 'Hai',
    r'\bhi\b': 'hai',
    r'\bHello\b': 'Helóu',
    r'\bhello\b': 'helóu',
    r'\bGood morning\b': 'Gud mórnin',
    r'\bGood afternoon\b': 'Gud áfternuun',
    r'\bGood evening\b': 'Gud ívnin',
    r'\bGood night\b': 'Gud náit',
    r'\bGoodbye\b': 'Gudbái',
    r'\bBye\b': 'Bái',
    r'\bNice to meet you\b': 'Náiss tu míit iu',
    r'\bSee you later\b': 'Síi iu léiter',
    r'\bThank you\b': 'Zánk iu',
    r'\bTeacher\b': 'Tícher',
    r'\bBook\b': 'Buk',
    r'\bPen\b': 'Pen',
    r'\bNotebook\b': 'Nóutbuk',
    r'\bThree\b': 'Zríi',
    r'\bEnglish\b': 'Ínglish',
    r'\bAirport\b': 'Érport',
    r'\bBreakfast\b': 'Brékfast',
    r'\bBeautiful\b': 'Biútiful',
    r'\bPassport\b': 'Pásport',
    r'\bRestaurant\b': 'Réstorant',
    r'\bFamily\b': 'Fámili',
}


def normalize_tts_text(text: str, is_spanish_tutor: bool = True) -> str:
    """
    Cleans and normalizes text for TTS engines so that symbols, brackets, slashes,
    and markdown artifacts are never spoken aloud as punctuation.
    """
    if not text or not isinstance(text, str):
        return ""

    processed = text.strip()

    # 1. Remove emojis
    processed = re.sub(r'[\U00010000-\U0010ffff]', '', processed)
    processed = re.sub(r'[\u2600-\u27BF\uE000-\uF8FF]', '', processed)

    # 2. Clean IPA phonetic transcriptions in slashes (e.g. /ʃʊd/ -> shud, /ˈev.ri deɪ/ -> evri dei)
    def clean_ipa(m):
        raw = m.group(1).replace('ˈ', '').replace('.', '').replace('ː', '').replace(' ', '')
        return f" {raw} "
    processed = re.sub(r'/([A-Za-zʃʊʌæəɪɔɑɜθðʒŋːˈ\.\s]+)/', clean_ipa, processed)

    # 3. Clean alternatives with slashes (e.g. I/You -> I o You, s/es -> s o es, should/must -> should o must)
    processed = re.sub(r'([A-Za-z0-9]+)\s*/\s*([A-Za-z0-9]+)', r'\1 o \2', processed)

    # 4. Clean brackets [ Sujeto ] -> Sujeto
    processed = re.sub(r'\[\s*([^\]]+)\s*\]', r'\1', processed)

    # 5. Clean arrows and bullets (•, →, =>, ✔, ❌, ✅)
    processed = re.sub(r'^[•\-\*]\s*', '', processed, flags=re.MULTILINE)
    processed = re.sub(r'\s*(?:→|=>|->)\s*', ', ', processed)

    # 6. Clean markdown formatting (*, _, ~, `, #, |, \)
    processed = re.sub(r'[*_~`#|\\]', ' ', processed)

    # 7. Clean quotes and apostrophe marks around words
    processed = re.sub(r'[""''«»`]', ' ', processed)

    # 8. Interjections replacement
    for pattern, replacement in INTERJECTION_REPLACEMENTS:
        processed = re.sub(pattern, replacement, processed, flags=re.IGNORECASE)

    # 9. Abbreviations & currencies
    for pattern, replacement in ABBREVIATION_REPLACEMENTS:
        processed = re.sub(pattern, replacement, processed, flags=re.IGNORECASE)

    # 10. Phonetic adjustments for Spanish tutor speaking English target keywords
    if is_spanish_tutor:
        for pattern, phonetic in ENGLISH_TTS_PHONETIC_MAP.items():
            processed = re.sub(pattern, phonetic, processed)

    # 11. Clean up underscores, slashes and excessive whitespace
    processed = re.sub(r'_+', ' ', processed)
    processed = re.sub(r'/+', ' ', processed)
    processed = re.sub(r'\s{2,}', ' ', processed)
    processed = re.sub(r'\s*([,\.:;\?!])', r'\1', processed)
    processed = re.sub(r'\.{2,}', '...', processed)

    return processed.strip()
