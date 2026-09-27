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
    (r'\b(?:Chist)\b\.{0,3}', 'Silencio... '),
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
    # ── Everyday Verbs & Introductions Phonics for Spanish Voice ──
    r'\bI live\b': 'Ai liv',
    r'\bi live\b': 'ai liv',
    r'\blive in\b': 'liv in',
    r'\bI am\b': 'Ai em',
    r'\bi am\b': 'ai em',
    r'\bI have\b': 'Ai jav',
    r'\bi have\b': 'ai jav',
    r'\bI drink\b': 'Ai drink',
    r'\bi drink\b': 'ai drink',
    r'\bI wake up\b': 'Ai uéik ap',
    r'\bi wake up\b': 'ai uéik ap',
    r'\bwake up\b': 'uéik ap',
    r'\bSpain\b': 'Spein',
    r'\bspain\b': 'spein',
    r'\bfrom Spain\b': 'from Spein',
    r'\bMy name is\b': 'Mai néim is',
    r'\bmy name is\b': 'mai néim is',
    r'\bcoffee\b': 'cófi',
    r'\busually\b': 'iúshuali',
    r'\balways\b': 'ólweis',
    r'\bsometimes\b': 'sámtáims',
    r'\bnever\b': 'néver',
    r'\bthere is\b': 'der is',
    r'\bthere are\b': 'der ar',
    r'\bThere is\b': 'Der is',
    r'\bThere are\b': 'Der ar',
    r'\bTo Be\b': 'Tu Bii',
    r'\bto be\b': 'tu bii',
}

# Grammar suffixes, endings, and spelling rules normalization for Spanish tutor speech
GRAMMAR_SPELLING_REPLACEMENTS = [
    # 1. Grammar suffixes & spelling
    (r'\b(?:la\s+)?terminaci[oó]n\s+(?:-)?ing\b', 'la terminación i, ene, ge', re.IGNORECASE),
    (r'\b(?:el\s+)?sufijo\s+(?:-)?ing\b', 'el sufijo i, ene, ge', re.IGNORECASE),
    (r'\b(agregamos|a[ñn]adimos|agregar|a[ñn]adir)\s+(?:-)?ing\b', r'\1 i, ene, ge', re.IGNORECASE),
    (r'\bterminaci[oó]n\s+(?:-)?ed\b', 'terminación e, de', re.IGNORECASE),
    (r'\bterminaci[oó]n\s+(?:-)?es\b', 'terminación e, ese', re.IGNORECASE),
    (r'\bterminaci[oó]n\s+(?:-)?s\b', 'terminación ese', re.IGNORECASE),
    (r'\bterminaci[oó]n\s+(?:-)?ies\b', 'terminación i, e, ese', re.IGNORECASE),
    (r'\b(agregamos|a[ñn]adimos)\s+(?:-)?es\b', r'\1 e, ese', re.IGNORECASE),
    (r'\b(agregamos|a[ñn]adimos)\s+(?:-)?ed\b', r'\1 e, de', re.IGNORECASE),
    (r'\b(agregamos|a[ñn]adimos)\s+(?:-)?s\b', r'\1 ese', re.IGNORECASE),
    (r'\b(agregamos|a[ñn]adimos)\s+(?:-)?ies\b', r'\1 i, e, ese', re.IGNORECASE),

    # 2. Standalone suffixes with hyphen or uppercase ING in grammar contexts
    (r'\bING\b', 'i, ene, ge', 0),
    (r'(?:\s|^)-(?:ing|ING)\b', ' i, ene, ge', re.IGNORECASE),
    (r'(?:\s|^)-(?:ed|ED)\b', ' e, de', re.IGNORECASE),
    (r'(?:\s|^)-(?:es|ES)\b', ' e, ese', re.IGNORECASE),
    (r'(?:\s|^)-(?:ies|IES)\b', ' i, e, ese', re.IGNORECASE),

    # 3. Consonants and digraphs in Spanish grammar rules (prevents acoustic engine lockups)
    (r'\bterminad[oa]s?\s+en\s+(?:las\s+letras\s+)?(?:-)?sh\s+o\s+(?:-)?ch\b', 'terminados en las letras ese hache o ce hache', re.IGNORECASE),
    (r'\bterminad[oa]s?\s+en\s+(?:las\s+letras\s+)?(?:-)?ch\s+o\s+(?:-)?sh\b', 'terminados en las letras ce hache o ese hache', re.IGNORECASE),
    (r'\btermina(?:n)?\s+en\s+(?:las\s+letras\s+)?(?:-)?sh\b', 'terminan en las letras ese hache', re.IGNORECASE),
    (r'\btermina(?:n)?\s+en\s+(?:las\s+letras\s+)?(?:-)?ch\b', 'terminan en las letras ce hache', re.IGNORECASE),
    (r'\b(?:-)?sh\s+o\s+(?:-)?ch\b', 'ese hache o ce hache', re.IGNORECASE),
    (r'\b(?:-)?ch\s+o\s+(?:-)?sh\b', 'ce hache o ese hache', re.IGNORECASE),
    (r'\b(?:el\s+)?sonido\s+(?:-)?sh\b', 'el sonido shh', re.IGNORECASE),
    (r'\b(?:el\s+)?sonido\s+(?:-)?ch\b', 'el sonido che', re.IGNORECASE),
    (r'\b(?:el\s+)?sonido\s+(?:-)?th\b', 'el sonido th', re.IGNORECASE),
    (r'\b(la\s+combinaci[oó]n|las\s+letras)\s+(?:-)?sh\b', r'\1 ese hache', re.IGNORECASE),
    (r'\b(la\s+combinaci[oó]n|las\s+letras)\s+(?:-)?ch\b', r'\1 ce hache', re.IGNORECASE),
    (r'(?:\s|^)-(?:sh|s-h)\b', ' ese hache', re.IGNORECASE),
    (r'(?:\s|^)-(?:ch|c-h)\b', ' ce hache', re.IGNORECASE),
    (r'\bsonido\s+sonido\b', 'sonido', re.IGNORECASE),
    (r'\bel\s+sonido\s+el\s+sonido\b', 'el sonido', re.IGNORECASE),
]

IPA_GLYPH_MAP = {
    'ʃ': 'sonido sh',
    'tʃ': 'sonido ch',
    'dʒ': 'dj',
    'ŋ': 'ng',
    'θ': 'th sorda',
    'ð': 'th sonora',
    's': 'ese',
    'z': 'z sonora',
    'ɪz': 'iz',
    'iz': 'iz',
    'iː': 'i larga',
    'i:': 'i larga',
    'ii': 'i larga',
    'ɪ': 'i corta',
    'æ': 'a corta',
    'ʌ': 'a corta',
    'ə': 'schwa',
    'ʊ': 'u corta',
    'uː': 'u larga',
    'ɔː': 'o larga',
    'ɑː': 'a larga',
    'ɜː': 'er',
}


NUM_TO_ENG = {
    0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen",
    16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty",
    25: "twenty-five", 30: "thirty", 40: "forty", 45: "forty-five", 50: "fifty",
    60: "sixty", 100: "one hundred"
}

ORDINALS_TO_ENG = {
    "1st": "first",
    "2nd": "second",
    "3rd": "third",
    "4th": "fourth",
    "5th": "fifth"
}

def number_to_english_words(n: int) -> str:
    if n in NUM_TO_ENG:
        return NUM_TO_ENG[n]
    if 20 < n < 100:
        tens = (n // 10) * 10
        units = n % 10
        return f"{NUM_TO_ENG.get(tens, '')}-{NUM_TO_ENG.get(units, '')}"
    return str(n)

def normalize_english_quote_content(eng_text: str) -> str:
    """
    Normalizes numbers, times, and acronyms inside an English quote or sentence
    so a multilingual TTS synthesizer speaks them natively in English.
    """
    t = eng_text

    # 1. Time patterns: 7:00 AM / 7:30 pm / 8:00 / 7 AM / 8 PM
    def replace_time(m):
        hours = int(m.group(1))
        minutes = m.group(2) if m.lastindex and m.lastindex >= 2 else None
        ampm = m.group(3) if m.lastindex and m.lastindex >= 3 else None

        h_str = number_to_english_words(hours)
        m_str = ""
        if minutes:
            min_int = int(minutes)
            if min_int == 0:
                m_str = " o'clock" if not ampm else ""
            elif min_int < 10:
                m_str = f" oh {number_to_english_words(min_int)}"
            else:
                m_str = f" {number_to_english_words(min_int)}"

        ampm_str = ""
        if ampm:
            clean_ap = ampm.lower().replace('.', '').strip()
            if clean_ap == 'am':
                ampm_str = " ey-em"
            elif clean_ap == 'pm':
                ampm_str = " pee-em"

        return f"{h_str}{m_str}{ampm_str}".strip()

    # Pattern: 7:30 AM / 7:00 / 8 AM / 8 PM
    t = re.sub(r'\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|AM|PM|A\.M\.|P\.M\.)\b', replace_time, t, flags=re.IGNORECASE)
    # Pattern: 7:30 / 8:00 without am/pm
    t = re.sub(r'\b(\d{1,2}):(\d{2})\b', replace_time, t)

    # 2. Ordinals: 1st, 2nd, 3rd, 4th, 5th
    t = re.sub(r'\b(1st|2nd|3rd|4th|5th)\b', lambda m: ORDINALS_TO_ENG.get(m.group(1).lower(), m.group(1)), t, flags=re.IGNORECASE)

    # 3. Standalone AM / PM inside English quote
    t = re.sub(r'\b(?:AM|A\.M\.|am|a\.m\.)\b', 'ey-em', t)
    t = re.sub(r'\b(?:PM|P\.M\.|pm|p\.m\.)\b', 'pee-em', t)

    # 4. Standalone digits (e.g. 'at 6', 'lesson 1', 'step 2', '3 items')
    t = re.sub(r'\b(\d{1,3})\b', lambda m: number_to_english_words(int(m.group(1))), t)

    return t

def normalize_tts_text(text: str, is_spanish_tutor: bool = True) -> str:
    """
    Cleans and normalizes text for TTS engines so that symbols, brackets, slashes,
    markdown artifacts, numbers, and bilingual acronyms are spoken naturally.
    """
    if not text or not isinstance(text, str):
        return ""

    processed = text.strip()

    # 1. Normalize English quotes (numbers, times, acronyms) BEFORE stripping quotes
    def quote_replacer(m):
        quote_char = m.group(1)
        content = m.group(2)
        if not re.search(r'[áéíóúñÁÉÍÓÚÑ]', content):
            normalized_content = normalize_english_quote_content(content)
            return f"{quote_char}{normalized_content}{quote_char}"
        return m.group(0)

    processed = re.sub(r"(['\"‘“])([^'\"‘“’”\n\r]+)(['\"’”])", quote_replacer, processed)

    # Standalone English time markers like "at 7 AM" or "at 8 PM" outside quotes
    def replace_standalone_time(m):
        prefix = m.group(1)
        h = m.group(2)
        mins = m.group(3) if m.group(3) else "00"
        ap = m.group(4)
        normalized = normalize_english_quote_content(f"{h}:{mins} {ap}")
        return f"{prefix} {normalized}"

    processed = re.sub(
        r'\b(at|from|to|until|before|after)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|AM|PM)\b',
        replace_standalone_time,
        processed,
        flags=re.IGNORECASE
    )

    # 2. Remove emojis
    processed = re.sub(r'[\U00010000-\U0010ffff]', '', processed)
    processed = re.sub(r'[\u2600-\u27BF\uE000-\uF8FF]', '', processed)

    # 3. Clean IPA phonetic transcriptions in slashes (e.g. /s/ -> ese, /ʃ/ -> shh, /fəʊnz/ -> strip)
    def clean_ipa(m):
        raw = m.group(1).strip()
        clean = raw.replace('ˈ', '').replace('.', '').replace('ː', '').replace(' ', '')
        if clean in IPA_GLYPH_MAP:
            return f" {IPA_GLYPH_MAP[clean]} "
        for glyph, spoken in IPA_GLYPH_MAP.items():
            if glyph in clean:
                return f" {spoken} "
        # Whole-word phonetic spellings (like /fəʊnz/, /penz/, /bæɡz/) must be stripped
        # so neural TTS voices never articulate raw phonetic glyphs or spelling noise
        return " "
    processed = re.sub(r'/([A-Za-zʃʊʌæəɪɔɑɜθðʒŋːˈ\.\s]+)/', clean_ipa, processed)

    # 4. Clean alternatives with slashes (e.g. I/You -> I o You, s/es -> s o es, should/must -> should o must)
    processed = re.sub(r'([A-Za-z0-9]+)\s*/\s*([A-Za-z0-9]+)', r'\1 o \2', processed)

    # 5. Clean brackets [ Sujeto ] -> Sujeto
    processed = re.sub(r'\[\s*([^\]]+)\s*\]', r'\1', processed)

    # 6. Clean arrows and bullets (•, →, =>, ✔, ❌, ✅)
    processed = re.sub(r'^[•\-\*]\s*', '', processed, flags=re.MULTILINE)
    processed = re.sub(r'\s*(?:→|=>|->)\s*', ', ', processed)

    # 7. Clean markdown formatting (*, _, ~, `, #, |, \)
    processed = re.sub(r'[*_~`#|\\]', ' ', processed)

    # 8. Clean quotes and apostrophe marks around words
    processed = re.sub(r'[""''«»`]', ' ', processed)

    # 9. Interjections replacement
    for pattern, replacement in INTERJECTION_REPLACEMENTS:
        processed = re.sub(pattern, replacement, processed, flags=re.IGNORECASE)

    # 10. Abbreviations & currencies
    for pattern, replacement in ABBREVIATION_REPLACEMENTS:
        processed = re.sub(pattern, replacement, processed, flags=re.IGNORECASE)

    # 10.5 Grammar suffixes, endings, and consonant digraphs spelling (e.g. -ing -> i, ene, ge, sh/ch -> ese hache / ce hache)
    if is_spanish_tutor:
        for pattern, replacement, flags in GRAMMAR_SPELLING_REPLACEMENTS:
            processed = re.sub(pattern, replacement, processed, flags=flags)

    # 11. Phonetic adjustments for Spanish tutor speaking English target keywords
    if is_spanish_tutor:
        for pattern, phonetic in ENGLISH_TTS_PHONETIC_MAP.items():
            processed = re.sub(pattern, phonetic, processed)

    # 12. Clean up underscores, slashes and excessive whitespace
    processed = re.sub(r'_+', ' ', processed)
    processed = re.sub(r'/+', ' ', processed)
    processed = re.sub(r'\s{2,}', ' ', processed)
    processed = re.sub(r'\s*([,\.:;\?!])', r'\1', processed)
    processed = re.sub(r'\.{2,}', '...', processed)

    return processed.strip()
