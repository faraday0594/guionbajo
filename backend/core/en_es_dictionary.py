"""
Diccionario inteligente Inglés -> Español sin consumo de tokens de IA.
Incluye vocabulario frecuente CEFR A1-B2, verbos irregulares, contracciones,
reglas morfológicas (plurales, -ed, -ing, -ly, -er/-est) y respaldo HTTP gratuito
sin API key (Google Translate gtx) con caché en memoria.
"""
import logging
import re
from typing import Dict, Optional
import httpx

logger = logging.getLogger(__name__)

_TRANSLATION_CACHE: Dict[str, str] = {}

CONTRACTIONS: Dict[str, str] = {
    "i'm": "yo soy / estoy",
    "you're": "tú eres / estás",
    "he's": "él es / está",
    "she's": "ella es / está",
    "it's": "eso es / está",
    "we're": "nosotros somos / estamos",
    "they're": "ellos son / están",
    "i've": "yo he",
    "you've": "tú has",
    "we've": "nosotros hemos",
    "they've": "ellos han",
    "i'll": "yo (futuro)",
    "you'll": "tú (futuro)",
    "he'll": "él (futuro)",
    "she'll": "ella (futuro)",
    "we'll": "nosotros (futuro)",
    "they'll": "ellos (futuro)",
    "i'd": "yo (condicional/había)",
    "you'd": "tú (condicional/habías)",
    "don't": "no (presente)",
    "doesn't": "no (3ra persona)",
    "didn't": "no (pasado)",
    "isn't": "no es / no está",
    "aren't": "no son / no están",
    "wasn't": "no fue / no estaba",
    "weren't": "no fueron / no estaban",
    "haven't": "no he / no han",
    "hasn't": "no ha",
    "hadn't": "no había",
    "can't": "no puede",
    "couldn't": "no pudo / no podría",
    "won't": "no (futuro)",
    "wouldn't": "no (condicional)",
    "shouldn't": "no debería",
    "mustn't": "no debe",
    "let's": "vamos a",
    "there's": "hay (singular)",
    "what's": "qué es / cuál es",
    "that's": "eso es",
    "who's": "quién es",
    "where's": "dónde está",
}

BASE_DICTIONARY: Dict[str, str] = {
    # Artículos, pronombres y determinantes
    "the": "el / la / los / las",
    "a": "un / una",
    "an": "un / una",
    "i": "yo",
    "you": "tú / usted / ustedes",
    "he": "él",
    "she": "ella",
    "it": "eso / ello",
    "we": "nosotros",
    "they": "ellos / ellas",
    "me": "me / mí",
    "him": "lo / a él",
    "us": "nos / nosotros",
    "them": "los / a ellos",
    "my": "mi / mis",
    "your": "tu / su",
    "his": "su (de él)",
    "her": "su (de ella)",
    "its": "su (de ello)",
    "our": "nuestro / nuestra",
    "their": "su (de ellos)",
    "mine": "mío",
    "yours": "tuyo",
    "this": "esto / este / esta",
    "that": "eso / ese / que",
    "these": "estos / estas",
    "those": "esos / esas",
    "all": "todo / todos",
    "every": "cada / todos",
    "each": "cada",
    "both": "ambos",
    "some": "algunos / algo",
    "any": "cualquier / alguno",
    "no": "no / ningún",
    "none": "ninguno",
    "many": "muchos / muchas",
    "much": "mucho / mucha",
    "more": "más",
    "most": "la mayoría / más",
    "few": "pocos",
    "little": "poco / pequeño",
    "other": "otro / otra",
    "another": "otro más",
    "such": "tal",

    # Preposiciones y conjunciones
    "and": "y",
    "or": "o",
    "but": "pero",
    "so": "así que / tan",
    "because": "porque",
    "if": "si",
    "although": "aunque",
    "though": "aunque",
    "while": "mientras",
    "until": "hasta",
    "unless": "a menos que",
    "of": "de",
    "in": "en / dentro de",
    "on": "en / sobre",
    "at": "en / a las",
    "to": "a / para",
    "for": "para / por / durante",
    "with": "con",
    "without": "sin",
    "by": "por / junto a",
    "from": "de / desde",
    "into": "hacia dentro",
    "onto": "sobre",
    "out": "fuera",
    "over": "sobre / encima",
    "under": "debajo de",
    "above": "encima de",
    "below": "debajo de",
    "between": "entre (dos)",
    "among": "entre (varios)",
    "through": "a través de",
    "across": "a través de / en todo",
    "around": "alrededor de",
    "about": "acerca de / sobre",
    "against": "contra",
    "before": "antes de",
    "after": "después de",
    "during": "durante",
    "since": "desde",
    "near": "cerca de",
    "far": "lejos",

    # Preguntas y adverbios comunes
    "what": "qué / cuál",
    "who": "quién",
    "whom": "a quién",
    "whose": "de quién",
    "which": "cuál / que",
    "where": "dónde",
    "when": "cuándo",
    "why": "por qué",
    "how": "cómo",
    "yes": "sí",
    "not": "no",
    "very": "muy",
    "really": "realmente",
    "quite": "bastante",
    "too": "también / demasiado",
    "also": "también",
    "only": "solo / solamente",
    "just": "solo / justo / acabar de",
    "still": "todavía / aún",
    "already": "ya",
    "yet": "todavía / aún",
    "now": "ahora",
    "then": "entonces / luego",
    "here": "aquí",
    "there": "allí / hay",
    "always": "siempre",
    "usually": "usualmente",
    "often": "a menudo",
    "sometimes": "a veces",
    "rarely": "rara vez",
    "never": "nunca",
    "ever": "alguna vez",
    "today": "hoy",
    "tomorrow": "mañana",
    "yesterday": "ayer",
    "soon": "pronto",
    "early": "temprano",
    "late": "tarde",
    "well": "bien",
    "fast": "rápido",
    "hard": "duro / difícil",
    "together": "juntos",
    "alone": "solo",

    # Verbos auxiliares y modales
    "be": "ser / estar",
    "am": "soy / estoy",
    "is": "es / está",
    "are": "son / están",
    "was": "fue / estaba",
    "were": "fueron / estaban",
    "been": "sido / estado",
    "being": "siendo / estando",
    "have": "tener / haber",
    "has": "tiene / ha",
    "had": "tuvo / había",
    "having": "teniendo",
    "do": "hacer (auxiliar)",
    "does": "hace (auxiliar)",
    "did": "hizo (pasado)",
    "done": "hecho",
    "doing": "haciendo",
    "will": "auxiliar futuro",
    "would": "auxiliar condicional",
    "can": "poder",
    "could": "podría / pudo",
    "may": "poder / quizás",
    "might": "podría / tal vez",
    "must": "deber (obligación)",
    "should": "debería",
    "shall": "deberá / sugerencia",

    # Verbos frecuentes y sus formas irregulares
    "speak": "hablar",
    "speaks": "habla",
    "spoke": "habló",
    "spoken": "hablado",
    "speaking": "hablando",
    "talk": "conversar / hablar",
    "say": "decir",
    "says": "dice",
    "said": "dijo / dicho",
    "tell": "contar / decir",
    "told": "contó / dicho",
    "ask": "preguntar / pedir",
    "answer": "responder",
    "listen": "escuchar",
    "hear": "oír",
    "heard": "oyó / oído",
    "read": "leer / leído",
    "write": "escribir",
    "wrote": "escribió",
    "written": "escrito",
    "go": "ir",
    "goes": "va",
    "went": "fue",
    "gone": "ido",
    "going": "yendo / va a",
    "come": "venir",
    "came": "vino",
    "get": "obtener / conseguir / llegar",
    "got": "obtuvo / consiguió",
    "gotten": "obtenido",
    "make": "hacer / fabricar",
    "made": "hecho / fabricado",
    "know": "saber / conocer",
    "knew": "sabía / conoció",
    "known": "conocido / sabido",
    "think": "pensar / creer",
    "thought": "pensó / pensamiento",
    "see": "ver",
    "saw": "vio",
    "seen": "visto",
    "look": "mirar / parecer",
    "watch": "ver / observar",
    "want": "querer",
    "need": "necesitar",
    "like": "gustar / como",
    "love": "amar / encantar",
    "hate": "odiar",
    "use": "usar / utilizar",
    "used": "usado / solía",
    "work": "trabajar / trabajo",
    "study": "estudiar",
    "learn": "aprender",
    "teach": "enseñar",
    "taught": "enseñó / enseñado",
    "give": "dar",
    "gave": "dio",
    "given": "dado",
    "take": "tomar / llevar",
    "took": "tomó",
    "taken": "tomado",
    "find": "encontrar",
    "found": "encontrado / encontró",
    "feel": "sentir",
    "felt": "sintió / sentido",
    "try": "intentar / probar",
    "leave": "salir / dejar",
    "left": "salió / izquierda",
    "call": "llamar",
    "called": "llamado / llamó",
    "keep": "mantener / guardar",
    "kept": "mantuvo / guardado",
    "let": "dejar / permitir",
    "begin": "comenzar / empezar",
    "began": "comenzó",
    "begun": "comenzado",
    "start": "empezar / iniciar",
    "seem": "parecer",
    "help": "ayudar / ayuda",
    "show": "mostrar",
    "shown": "mostrado",
    "play": "jugar / tocar",
    "run": "correr",
    "ran": "corrió",
    "move": "mover / mudarse",
    "live": "vivir",
    "believe": "creer",
    "bring": "traer",
    "brought": "trajo / traído",
    "happen": "ocurrir / pasar",
    "sit": "sentarse",
    "sat": "sentó / sentado",
    "stand": "estar de pie / soportar",
    "stood": "estuvo de pie",
    "lose": "perder",
    "lost": "perdido / perdió",
    "pay": "pagar",
    "paid": "pagado / pagó",
    "meet": "conocer / reunirse",
    "met": "conoció / reunido",
    "include": "incluir",
    "continue": "continuar",
    "set": "establecer / poner",
    "change": "cambiar / cambio",
    "lead": "liderar / guiar",
    "understand": "entender / comprender",
    "understood": "entendió / entendido",
    "follow": "seguir",
    "stop": "detener / parar",
    "create": "crear",
    "allow": "permitir",
    "add": "añadir / agregar",
    "spend": "gastar / pasar (tiempo)",
    "spent": "gastó / pasado",
    "grow": "crecer / cultivar",
    "grew": "creció",
    "grown": "crecido",
    "open": "abrir / abierto",
    "close": "cerrar / cercano",
    "walk": "caminar",
    "win": "ganar",
    "won": "ganó / ganado",
    "offer": "ofrecer",
    "remember": "recordar",
    "consider": "considerar",
    "appear": "aparecer",
    "buy": "comprar",
    "bought": "compró / comprado",
    "wait": "esperar",
    "serve": "servir",
    "send": "enviar",
    "sent": "envió / enviado",
    "expect": "esperar (expectativa)",
    "build": "construir",
    "built": "construido / construyó",
    "stay": "quedarse",
    "fall": "caer / otoño",
    "fell": "cayó",
    "fallen": "caído",
    "cut": "cortar / cortado",
    "reach": "alcanzar / llegar a",
    "decide": "decidir",
    "eat": "comer",
    "ate": "comió",
    "eaten": "comido",
    "drink": "beber",
    "drank": "bebió",
    "drunk": "bebido",
    "sleep": "dormir",
    "slept": "durmió",
    "drive": "conducir / manejar",
    "drove": "condujo",
    "driven": "conducido",
    "travel": "viajar",
    "visit": "visitar",
    "practice": "practicar",
    "improve": "mejorar",

    # Sustantivos y adjetivos frecuentes
    "english": "inglés",
    "spanish": "español",
    "language": "idioma / lenguaje",
    "word": "palabra",
    "sentence": "oración / frase",
    "world": "mundo",
    "country": "país",
    "city": "ciudad",
    "home": "hogar / casa",
    "house": "casa",
    "room": "habitación / sala",
    "school": "escuela",
    "class": "clase",
    "student": "estudiante",
    "teacher": "profesor / maestro",
    "friend": "amigo / amiga",
    "family": "familia",
    "person": "persona",
    "people": "personas / gente",
    "man": "hombre",
    "men": "hombres",
    "woman": "mujer",
    "women": "mujeres",
    "child": "niño / niña",
    "children": "niños",
    "time": "tiempo / hora",
    "day": "día",
    "week": "semana",
    "month": "mes",
    "year": "año",
    "morning": "mañana",
    "afternoon": "tarde",
    "evening": "noche (temprano)",
    "night": "noche",
    "life": "vida",
    "way": "camino / manera",
    "thing": "cosa",
    "place": "lugar",
    "part": "parte",
    "number": "número",
    "million": "millón",
    "millions": "millones",
    "hundred": "cien",
    "thousand": "mil",
    "book": "libro",
    "water": "agua",
    "food": "comida",
    "coffee": "café",
    "money": "dinero",
    "job": "empleo / trabajo",
    "company": "empresa / compañía",
    "problem": "problema",
    "question": "pregunta",
    "idea": "idea",
    "example": "ejemplo",
    "fact": "hecho",
    "story": "historia / cuento",
    "music": "música",
    "movie": "película",
    "car": "carro / auto",
    "phone": "teléfono",
    "computer": "computadora",
    "good": "bueno",
    "better": "mejor",
    "best": "el mejor",
    "bad": "malo",
    "worse": "peor",
    "worst": "el peor",
    "new": "nuevo",
    "old": "viejo / antiguo",
    "young": "joven",
    "big": "grande",
    "large": "grande / amplio",
    "small": "pequeño",
    "long": "largo",
    "short": "corto / bajo",
    "high": "alto",
    "low": "bajo",
    "great": "genial / gran",
    "important": "importante",
    "different": "diferente",
    "same": "mismo",
    "entire": "entero / completo",
    "whole": "entero / todo",
    "full": "lleno / completo",
    "empty": "vacío",
    "easy": "fácil",
    "difficult": "difícil",
    "simple": "simple / sencillo",
    "possible": "posible",
    "able": "capaz",
    "ready": "listo",
    "happy": "feliz",
    "sad": "triste",
    "right": "correcto / derecha",
    "wrong": "equivocado / incorrecto",
    "true": "verdadero",
    "false": "falso",
    "free": "libre / gratis",
    "clear": "claro",
    "sure": "seguro",
    "next": "siguiente / próximo",
    "last": "último / pasado",
    "first": "primero",
    "second": "segundo",
    "third": "tercero",
}


def lookup_local_dictionary(word: str) -> Optional[str]:
    """
    Busca una palabra en el diccionario local aplicando reglas morfológicas
    (contracciones, plurales, -ed, -ing, -ly, -er/-est) sin usar tokens de IA.
    """
    w = (word or "").strip().lower()
    if not w:
        return None

    if w in CONTRACTIONS:
        return CONTRACTIONS[w]
    if w in BASE_DICTIONARY:
        return BASE_DICTIONARY[w]

    # Posesivo 's
    if w.endswith("'s") and len(w) > 2:
        stem = w[:-2]
        if stem in BASE_DICTIONARY:
            return f"de {BASE_DICTIONARY[stem]}"

    # Plurales / 3ra persona singular
    if w.endswith("ies") and len(w) > 4:
        cand = w[:-3] + "y"
        if cand in BASE_DICTIONARY:
            return BASE_DICTIONARY[cand]
    if w.endswith("es") and len(w) > 3:
        cand = w[:-2]
        if cand in BASE_DICTIONARY:
            return BASE_DICTIONARY[cand]
    if w.endswith("s") and len(w) > 2:
        cand = w[:-1]
        if cand in BASE_DICTIONARY:
            return BASE_DICTIONARY[cand]

    # Pasado / participio regular -ed
    if w.endswith("ied") and len(w) > 4:
        cand = w[:-3] + "y"
        if cand in BASE_DICTIONARY:
            return f"{BASE_DICTIONARY[cand]} (pasado)"
    if w.endswith("ed") and len(w) > 3:
        for cand in (w[:-2], w[:-1]):
            if cand in BASE_DICTIONARY:
                return f"{BASE_DICTIONARY[cand]} (pasado)"

    # Gerundio -ing
    if w.endswith("ing") and len(w) > 4:
        for cand in (w[:-3], w[:-3] + "e"):
            if cand in BASE_DICTIONARY:
                return f"{BASE_DICTIONARY[cand]} (-ando/-iendo)"

    # Adverbios -ly
    if w.endswith("ly") and len(w) > 3:
        cand = w[:-2]
        if cand in BASE_DICTIONARY:
            return f"{BASE_DICTIONARY[cand]} (-mente)"

    # Comparativos / superlativos
    if w.endswith("er") and len(w) > 3:
        for cand in (w[:-2], w[:-1]):
            if cand in BASE_DICTIONARY:
                return f"más {BASE_DICTIONARY[cand]}"
    if w.endswith("est") and len(w) > 4:
        for cand in (w[:-3], w[:-2]):
            if cand in BASE_DICTIONARY:
                return f"el más {BASE_DICTIONARY[cand]}"

    return None


async def translate_word_free(word: str, sentence: str = "") -> str:
    """
    Traduce una palabra al español con 0 tokens de IA:
    1. Caché en memoria
    2. Diccionario local + reglas morfológicas
    3. Respaldo gratuito sin API key (Google Translate gtx) para palabras raras
    """
    clean_word = re.sub(r"^[^a-zA-Z']+|[^a-zA-Z']+$", "", (word or "").strip())
    if not clean_word:
        return ""

    lower_w = clean_word.lower()
    if lower_w in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[lower_w]

    local_hit = lookup_local_dictionary(lower_w)
    if local_hit:
        _TRANSLATION_CACHE[lower_w] = local_hit
        return local_hit

    # Respaldo gratuito sin tokens de LLM ni API key (MyMemory API)
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                "https://api.mymemory.translated.net/get",
                params={"q": clean_word, "langpair": "en|es"},
            )
            if resp.status_code == 200:
                data = resp.json()
                translated = (
                    (data.get("responseData") or {}).get("translatedText") or ""
                ).strip()
                if translated and translated.lower() != lower_w:
                    _TRANSLATION_CACHE[lower_w] = translated
                    return translated
    except Exception as e:
        logger.debug(f"Free MyMemory dictionary fallback skipped for '{clean_word}': {e}")

    return ""
