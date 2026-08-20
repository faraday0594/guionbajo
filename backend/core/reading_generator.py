"""
Guionbajo — Reading Practice Generator & Word-by-Word Phonetic Evaluator
Generates contextual short stories chunked into max 2 sentences per part,
maintains visual character continuity across scenes via a Character Bible,
annotates every word with its IPA phonetic transcription, and performs
precise word-by-word pronunciation and speech alignment evaluation.
"""
import re
import difflib
import logging
from typing import Dict, List, Optional, Any
from config import settings
from core.ipa_dictionary import annotate_sentence_words, get_word_ipa, clean_token
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

READING_SYSTEM_PROMPT = """You are Guionbajo's Master Reading & Storytelling Professor for English learners.
Your goal is to generate an engaging, cohesive short story centered around the lesson topic for CEFR level {sublevel} with strict visual continuity and character consistency across all scenes.

CRITICAL STORY & VISUAL CONTINUITY RULES:

1. THEME & TOPIC: The story must naturally integrate the vocabulary and grammatical structures of '{topic}'.

2. CHUNKING MANDATE (STRICT):
   - Divide the story into 3 to 4 sequential parts (chunks).
   - EACH CHUNK MUST CONTAIN EXACTLY 1 OR 2 ENGLISH SENTENCES MAXIMUM (No long paragraphs!).
   - Sentences must be clear, natural, and pedagogically appropriate for level {sublevel}.

3. CHARACTER BIBLE & VISUAL CONTINUITY ENGINE:
   - Define a fixed "character_bible" at the start of the story describing each character:
     * Name, exact age, ethnicity, facial features, hairstyle & hair color.
     * Exact signature clothing and colors that remain consistent across scenes (e.g. "Emma, a 24-year-old woman with shoulder-length wavy brown hair and green eyes, wearing a mustard yellow knitted sweater and dark blue jeans").
   - Define "base_setting" (e.g. "a warm cozy modern apartment kitchen with light wooden cabinets and morning sunlight").
   - Define "art_style": strictly "vibrant 2D educational digital vector illustration, clean lines, warm atmospheric lighting, expressive relatable characters, strictly no text, no letters, no words".

4. PER-CHUNK IMAGE DECISION & PROMPT REASONING:
   For EACH chunk, you must explicitly evaluate:
   a) "has_new_image": (boolean)
      - Set true if the action, character location, time, or visual focal point changes significantly.
      - Set false if it is an immediate conversational continuation where the previous scene illustration already fully captures the moment.
   b) "image_prompt": (English string if has_new_image is true)
      - MUST incorporate the EXACT character descriptors from the character_bible (same hair, same sweater, same age).
      - Account for temporal continuity (e.g. morning sunlight vs evening lamp, temporal flashback, characters aging or younger if time shifted).
      - Describe concrete character actions and interactions (e.g. "flat 2D vector educational illustration of Emma, a 24-year-old woman with shoulder-length wavy brown hair in a mustard yellow sweater, pouring steaming hot coffee into a ceramic mug at her wooden kitchen counter, morning sunlight through the window, clean minimalist style, strictly no text, no letters, no words").

5. SPANISH TRANSLATION: Provide a clear Spanish translation for each chunk.
6. TARGET VOCABULARY: Explicitly list 3 to 6 key vocabulary words from '{topic}' featured in the story.

Return JSON in this EXACT schema:
{
  "title": "Story Title in English",
  "title_es": "Título de la Historia en Español",
  "topic": "{topic}",
  "sublevel": "{sublevel}",
  "character_bible": {
    "characters": [
      {
        "name": "Emma",
        "description": "24-year-old woman, shoulder-length wavy brown hair, friendly smile, wearing a mustard yellow sweater and dark blue jeans"
      }
    ],
    "base_setting": "Cozy sunlit apartment kitchen with wooden table",
    "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm lighting, strictly no text"
  },
  "target_keywords": ["word1", "word2", "word3"],
  "chunks": [
    {
      "chunk_id": "chunk-1",
      "order": 1,
      "text": "Sentence one. Sentence two.",
      "translation": "Oración uno. Oración dos.",
      "has_new_image": true,
      "scene_context": "Emma waking up and brewing fresh coffee in the morning",
      "image_prompt": "flat 2D vector educational illustration of Emma, 24-year-old woman with shoulder-length wavy brown hair in a mustard yellow sweater, brewing coffee in her sunlit wooden kitchen, clean minimalist style, strictly no text, no letters, no words"
    },
    {
      "chunk_id": "chunk-2",
      "order": 2,
      "text": "Sentence three. Sentence four.",
      "translation": "Oración tres. Oración cuatro.",
      "has_new_image": true,
      "scene_context": "Emma opening the front door as her brother arrives with flowers",
      "image_prompt": "flat 2D vector educational illustration of Emma in her mustard yellow sweater happily opening her wooden front door as her younger brother Lucas in a green jacket hands her a colorful bouquet of flowers, clean style, strictly no text, no words"
    },
    {
      "chunk_id": "chunk-3",
      "order": 3,
      "text": "Sentence five. Sentence six.",
      "translation": "Oración cinco. Oración seis.",
      "has_new_image": true,
      "scene_context": "Emma and Lucas laughing together at the wooden dining table",
      "image_prompt": "flat 2D vector educational illustration of Emma in her mustard yellow sweater and Lucas in his green jacket laughing together while drinking tea at a wooden dining table, warm cozy indoor lighting, strictly no text, no letters, no words"
    }
  ]
}
"""

DIGIT_MAP = {
    r'\b0\b': 'zero', r'\b1\b': 'one', r'\b2\b': 'two', r'\b3\b': 'three', r'\b4\b': 'four',
    r'\b5\b': 'five', r'\b6\b': 'six', r'\b7\b': 'seven', r'\b8\b': 'eight', r'\b9\b': 'nine',
    r'\b10\b': 'ten', r'\b11\b': 'eleven', r'\b12\b': 'twelve', r'\b13\b': 'thirteen',
    r'\b14\b': 'fourteen', r'\b15\b': 'fifteen', r'\b16\b': 'sixteen', r'\b17\b': 'seventeen',
    r'\b18\b': 'eighteen', r'\b19\b': 'nineteen', r'\b20\b': 'twenty', r'\b30\b': 'thirty',
    r'\b40\b': 'forty', r'\b50\b': 'fifty', r'\b60\b': 'sixty', r'\b70\b': 'seventy',
    r'\b80\b': 'eighty', r'\b90\b': 'ninety', r'\b100\b': 'one hundred'
}


def normalize_speech_text(text: str) -> str:
    """Normalizes speech transcript by lowering case, removing punctuation, and converting digits to words."""
    if not text or not isinstance(text, str):
        return ""
    res = text.lower()
    for pat, word in DIGIT_MAP.items():
        res = re.sub(pat, word, res, flags=re.IGNORECASE)
    res = re.sub(r"[^\w\s']", " ", res)
    return re.sub(r"\s+", " ", res).strip()


def sanitize_reading_image_prompt(prompt: str, topic: str, character_desc: str = "") -> str:
    """Cleans and standardizes image prompt with strict non-text mandates."""
    if not prompt or not isinstance(prompt, str) or len(prompt.strip()) < 10:
        base = f"flat 2D vector educational illustration of {character_desc or 'a student'} learning {topic}, warm cozy setting, clean minimalist graphic design, bright colors"
        return f"{base}, strictly no text, no letters, no words, no writing, no labels, no captions, no typography"
    
    clean = prompt.strip()
    clean = re.sub(r'/[A-Za-zʃʊʌæəɪɔɑɜθðʒŋːˈ\.\s]+/', ' ', clean)
    clean = re.sub(r'\b(?:duel|versus|vs|fight|fighting|boxers|letters|alphabet|spelling|text|characters|subtitles|captions)\b', 'educational scene', clean, flags=re.IGNORECASE)
    clean = re.sub(r'[/\\|\[\](){}+=→<>_~*#^"“”‘’`]', ' ', clean)
    clean = re.sub(r'\s{2,}', ' ', clean).strip()

    negative_mandate = "vibrant 2D educational digital vector illustration, clean lines, warm atmospheric lighting, strictly no text, no letters, no words, no writing, no labels, no captions, no typography, no watermarks, no alphabets"
    if "no text" not in clean.lower():
        clean = f"{clean}, {negative_mandate}"
    return clean


class ReadingGenerator:
    """
    Generates and evaluates reading practice stories with visual continuity and word-by-word IPA phonetic annotations.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.MINIMAX_API_KEY
        self.model = settings.MINIMAX_LLM_MODEL
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=settings.MINIMAX_BASE_URL,
            timeout=60.0,
        )

    async def generate_reading_practice(
        self,
        topic: str,
        sublevel: str = "A1.1",
        lesson_data: Optional[dict] = None
    ) -> dict:
        """
        Generates a 3-4 part chunked reading story with character continuity and word-level IPA transcriptions.
        """
        prompt = (
            f"Generate an engaging visual reading practice story for:\n"
            f"Topic: {topic}\n"
            f"CEFR Sublevel: {sublevel}\n"
            f"Requirements:\n"
            f"- 3 to 4 sequential parts (chunks).\n"
            f"- STRICT: Exactly 1 or 2 sentences per chunk.\n"
            f"- Define a 'character_bible' with fixed physical appearances for characters.\n"
            f"- Ensure all per-chunk 'image_prompt' maintain exact character clothing, hair, and age consistency.\n"
            f"- For each chunk, determine if 'has_new_image' is true or false.\n"
            f"- Incorporate vocabulary and concepts from {topic} naturally.\n"
            f"- Return strictly valid JSON matching the schema."
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": READING_SYSTEM_PROMPT.format(topic=topic, sublevel=sublevel)},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            raw = response.choices[0].message.content or "{}"
            clean = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL)
            clean = re.sub(r'```json\s*|```\s*', '', clean).strip()

            import json
            data = json.loads(clean)

            if "chunks" not in data or not isinstance(data.get("chunks"), list) or len(data["chunks"]) == 0:
                return self._build_curated_reading_fallback(topic, sublevel)

            # Enrich and annotate each chunk word-by-word with IPA and clean image prompts
            target_keys = data.get("target_keywords", [])
            char_bible = data.get("character_bible", {})
            main_char_desc = ""
            if char_bible and isinstance(char_bible.get("characters"), list) and len(char_bible["characters"]) > 0:
                main_char_desc = char_bible["characters"][0].get("description", "")

            for idx, ch in enumerate(data["chunks"]):
                ch["order"] = idx + 1
                ch["chunk_id"] = f"chunk-{idx + 1}"
                raw_text = ch.get("text", "")
                ch["words"] = annotate_sentence_words(raw_text, target_keys)
                
                # Sanitize image prompt
                if ch.get("has_new_image") is not False:
                    ch["has_new_image"] = True
                    raw_img = ch.get("image_prompt") or f"flat 2D vector educational illustration of {main_char_desc} in a scene about {topic}"
                    ch["image_prompt"] = sanitize_reading_image_prompt(raw_img, topic, main_char_desc)
                else:
                    ch["has_new_image"] = False

            data["topic"] = topic
            data["sublevel"] = sublevel
            return data

        except Exception as e:
            logger.warning(f"Reading story LLM generation fallback: {e}")
            return self._build_curated_reading_fallback(topic, sublevel)

    def _build_curated_reading_fallback(self, topic: str, sublevel: str) -> dict:
        """
        Rich, highly-calibrated fallback catalog of reading stories with visual character continuity and word-level IPA.
        """
        low = topic.lower()

        # 1. Past Continuous & Interrupted Actions (The Surprise Visit)
        if any(w in low for w in ["past continuous", "interrupted", "was/were + -ing", "while / when"]):
            char_bible = {
                "characters": [
                    {
                        "name": "Emma",
                        "description": "24-year-old woman with shoulder-length wavy brown hair, wearing a mustard yellow knitted sweater and dark blue jeans"
                    },
                    {
                        "name": "Lucas",
                        "description": "20-year-old young man with short curly black hair, wearing an olive green jacket and grey t-shirt"
                    }
                ],
                "base_setting": "Cozy modern apartment kitchen with warm wooden cabinets and front door",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm ambient lighting, strictly no text"
            }
            raw_chunks = [
                {
                    "text": "Emma was cooking dinner in her warm kitchen when the doorbell suddenly rang.",
                    "translation": "Emma estaba cocinando la cena en su acogedora cocina cuando el timbre sonó de repente.",
                    "has_new_image": True,
                    "scene_context": "Emma cooking dinner in her wooden kitchen as the doorbell rings",
                    "image_prompt": "flat 2D vector educational illustration of Emma, a 24-year-old woman with wavy brown hair in a mustard yellow sweater, stirring a pot at a warm wooden stove as the doorbell rings, cozy indoor lighting, clean minimalist style, strictly no text, no letters, no words"
                },
                {
                    "text": "While she was opening the door, her brother Lucas arrived with a bright bouquet of flowers.",
                    "translation": "Mientras ella abría la puerta, su hermano Lucas llegó con un brillante ramo de flores.",
                    "has_new_image": True,
                    "scene_context": "Emma opening the front door as Lucas arrives holding flowers",
                    "image_prompt": "flat 2D vector educational illustration of Emma in her mustard yellow sweater opening her apartment door happily as her brother Lucas with curly black hair in an olive green jacket holds a colorful bouquet of flowers, clean style, strictly no text, no words"
                },
                {
                    "text": "They were laughing and drinking hot tea together while the gentle rain was falling outside.",
                    "translation": "Ellos se estaban riendo y bebiendo té caliente juntos mientras la suave lluvia caía afuera.",
                    "has_new_image": True,
                    "scene_context": "Emma and Lucas sitting at the wooden table enjoying tea while it rains outside the window",
                    "image_prompt": "flat 2D vector educational illustration of Emma in her mustard yellow sweater and Lucas in his olive green jacket sitting together at a wooden table smiling with teacups, rain drops visible on the window glass behind them, warm ambient lighting, strictly no text, no letters, no words"
                }
            ]
            title = "The Surprise Visit"
            title_es = "La visita sorpresa"
            targets = ["cooking", "dinner", "kitchen", "doorbell", "rang", "opening", "arrived", "flowers", "laughing", "drinking", "tea", "rain"]

        # 2. Daily Routines & Present Simple (Leo's Daily Routine)
        elif any(w in low for w in ["routine", "rutina", "frequency", "daily", "present simple", "habit"]):
            char_bible = {
                "characters": [
                    {
                        "name": "Leo",
                        "description": "26-year-old man with short neat dark brown hair, friendly brown eyes, wearing a navy blue henley shirt, khaki trousers and white sneakers"
                    },
                    {
                        "name": "Barnaby",
                        "description": "Cheerful golden retriever dog with a red collar"
                    }
                ],
                "base_setting": "Modern city apartment and nearby sunlit Central Park",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, morning sunlight, strictly no text"
            }
            raw_chunks = [
                {
                    "text": "Leo wakes up at seven in the morning. He drinks hot coffee and eats fresh fruit.",
                    "translation": "Leo se despierta a las siete de la mañana. Él bebe café caliente y come fruta fresca.",
                    "has_new_image": True,
                    "scene_context": "Leo drinking coffee in his kitchen at morning sunlight",
                    "image_prompt": "flat 2D vector educational illustration of Leo, a 26-year-old man with short dark brown hair in a navy blue shirt, holding a white coffee mug by a sunny kitchen window with a bowl of fresh fruit, morning light, clean minimalist style, strictly no text, no letters, no words"
                },
                {
                    "text": "He always walks his friendly golden dog in the green park before starting work.",
                    "translation": "Él siempre pasea a su simpático perro dorado en el parque verde antes de comenzar a trabajar.",
                    "has_new_image": True,
                    "scene_context": "Leo walking his golden retriever in the sunlit green park",
                    "image_prompt": "flat 2D vector educational illustration of Leo in his navy blue shirt and khaki trousers happily walking his golden retriever dog on a leash through a lush green city park with tall trees, bright daylight, clean style, strictly no text, no letters, no words"
                },
                {
                    "text": "In the afternoon, Leo studies English online and chats with his international classmates.",
                    "translation": "Por la tarde, Leo estudia inglés en línea y conversa con sus compañeros internacionales.",
                    "has_new_image": True,
                    "scene_context": "Leo studying at his modern desk with a laptop",
                    "image_prompt": "flat 2D vector educational illustration of Leo in his navy blue shirt sitting at a tidy wooden desk with a laptop and notebook, headphones on, smiling as he attends an online English class, clean minimalist style, strictly no text, no letters, no words"
                }
            ]
            title = "Leo's Daily Routine"
            title_es = "La rutina diaria de Leo"
            targets = ["wakes", "morning", "drinks", "coffee", "fruit", "always", "walks", "dog", "park", "studies", "online", "classmates"]

        # 3. Irregular Past & Simple Past
        elif any(w in low for w in ["past simple", "irregular past", "regular verb", "pasado", "did", "was / were"]):
            char_bible = {
                "characters": [
                    {
                        "name": "Sarah",
                        "description": "22-year-old woman with curly auburn hair tied in a loose ponytail, wearing a pastel pink hoodie and denim jacket"
                    }
                ],
                "base_setting": "Historic downtown city center, cinema and cozy Italian pizzeria",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm lighting, strictly no text"
            }
            raw_chunks = [
                {
                    "text": "Last Saturday, Sarah went to the city center with her best friends.",
                    "translation": "El sábado pasado, Sarah fue al centro de la ciudad con sus mejores amigos.",
                    "has_new_image": True,
                    "scene_context": "Sarah and friends walking downtown with city buildings",
                    "image_prompt": "flat 2D vector educational illustration of Sarah, 22-year-old woman with curly auburn ponytail in a pastel pink hoodie and denim jacket, walking happily on a colorful city sidewalk with friends, clean style, strictly no text, no words"
                },
                {
                    "text": "They saw an exciting movie and bought delicious Italian pizza for dinner.",
                    "translation": "Ellos vieron una película emocionante y compraron deliciosa pizza italiana para cenar.",
                    "has_new_image": True,
                    "scene_context": "Sarah eating hot pizza at a cozy restaurant table",
                    "image_prompt": "flat 2D vector educational illustration of Sarah in her pastel pink hoodie sitting at a wooden restaurant table sharing a steaming hot slice of pizza with her friends, warm cozy pizzeria lighting, clean style, strictly no text, no words"
                },
                {
                    "text": "Sarah took wonderful photos and had a fantastic weekend in town.",
                    "translation": "Sarah tomó fotos maravillosas y tuvo un fin de semana fantástico en la ciudad.",
                    "has_new_image": True,
                    "scene_context": "Sarah taking photos with a smartphone by a city monument",
                    "image_prompt": "flat 2D vector educational illustration of Sarah in her pastel pink hoodie taking a photo with her smartphone in front of a beautiful illuminated city square at dusk, clean aesthetic, strictly no text, no letters, no words"
                }
            ]
            title = "An Exciting Weekend in Town"
            title_es = "Un fin de semana emocionante en la ciudad"
            targets = ["went", "city", "friends", "saw", "movie", "bought", "delicious", "pizza", "took", "photos", "had", "weekend"]

        # 4. Food, Ordering & Cafes
        elif any(w in low for w in ["food", "order", "restaurant", "café", "cafe", "drink", "meal"]):
            char_bible = {
                "characters": [
                    {
                        "name": "Carlos",
                        "description": "28-year-old man with short black hair and glasses, wearing a burgundy crewneck sweater and dark trousers"
                    },
                    {
                        "name": "Waiter",
                        "description": "Friendly waiter wearing a white shirt and black waist apron"
                    }
                ],
                "base_setting": "Charming European café with indoor plants and wooden tables",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm lighting, strictly no text"
            }
            raw_chunks = [
                {
                    "text": "Carlos is sitting at a cozy wooden table near the sunny window of the café.",
                    "translation": "Carlos está sentado en una acogedora mesa de madera cerca de la ventana soleada de la cafetería.",
                    "has_new_image": True,
                    "scene_context": "Carlos sitting at a café window table looking at the menu",
                    "image_prompt": "flat 2D vector educational illustration of Carlos, 28-year-old man with glasses in a burgundy sweater, sitting at a wooden table by a large café window with green potted plants, holding a menu, clean style, strictly no text, no words"
                },
                {
                    "text": "He would like a hot cup of green tea and a slice of fresh apple pie.",
                    "translation": "A él le gustaría una taza caliente de té verde y una porción de tarta de manzana fresca.",
                    "has_new_image": True,
                    "scene_context": "The waiter placing steaming tea and apple pie on Carlos's table",
                    "image_prompt": "flat 2D vector educational illustration of a friendly waiter in a white shirt and black apron serving a steaming porcelain cup of tea and a golden slice of apple pie to Carlos in his burgundy sweater, clean aesthetic, strictly no text, no words"
                },
                {
                    "text": "Carlos enjoys the sweet dessert and listens to the soft background music.",
                    "translation": "Carlos disfruta el dulce postre y escucha la suave música de fondo.",
                    "has_new_image": False,
                    "scene_context": "Carlos smiling as he eats the dessert (same table scene)",
                    "image_prompt": "flat 2D vector educational illustration of Carlos in his burgundy sweater taking a bite of apple pie with a small fork, smiling contentedly in the cozy café, strictly no text, no words"
                }
            ]
            title = "A Pleasant Afternoon at the Café"
            title_es = "Una tarde agradable en la cafetería"
            targets = ["table", "window", "café", "cup", "tea", "slice", "apple", "pie", "waiter", "enjoys", "dessert", "music"]

        # 5. Greetings & Introductions
        elif any(w in low for w in ["greeting", "introduction", "saludo", "sound", "present"]):
            char_bible = {
                "characters": [
                    {
                        "name": "Lucas",
                        "description": "20-year-old student with short brown hair, wearing a teal blue hoodie and carrying a grey backpack"
                    },
                    {
                        "name": "Teacher Elena",
                        "description": "Friendly teacher with dark hair in a bun, wearing a coral blazer and glasses"
                    }
                ],
                "base_setting": "Bright modern English classroom with a clean chalkboard and wooden desks",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, bright classroom, strictly no text"
            }
            raw_chunks = [
                {
                    "text": "Hello! My name is Lucas and I am an excited new student.",
                    "translation": "¡Hola! Mi nombre es Lucas y soy un nuevo estudiante emocionado.",
                    "has_new_image": True,
                    "scene_context": "Lucas introducing himself at the classroom door",
                    "image_prompt": "flat 2D vector educational illustration of Lucas, 20-year-old student with brown hair in a teal blue hoodie with a grey backpack, waving friendly at the doorway of a bright modern classroom, clean style, strictly no text, no words"
                },
                {
                    "text": "Good morning, teacher Elena. Nice to meet you in our English class today!",
                    "translation": "Buenos días, profesora Elena. ¡Gusto en conocerla en nuestra clase de inglés hoy!",
                    "has_new_image": True,
                    "scene_context": "Teacher Elena warmly greeting Lucas by the classroom desk",
                    "image_prompt": "flat 2D vector educational illustration of Teacher Elena with hair in a bun and coral blazer warmly greeting Lucas in his teal hoodie by the teacher desk in a sunny classroom, clean minimal style, strictly no text, no words"
                },
                {
                    "text": "We are ready to learn English words and practice pronunciation together.",
                    "translation": "Estamos listos para aprender palabras en inglés y practicar la pronunciación juntos.",
                    "has_new_image": True,
                    "scene_context": "Lucas and classmates sitting at desks smiling and practicing",
                    "image_prompt": "flat 2D vector educational illustration of Lucas in his teal hoodie sitting at a clean wooden classroom desk with a notebook, smiling attentively with other diverse students, clean bright classroom, strictly no text, no letters, no words"
                }
            ]
            title = "A Warm Welcome to Class"
            title_es = "Una cálida bienvenida a clase"
            targets = ["hello", "name", "student", "good", "morning", "teacher", "meet", "class", "ready", "learn", "practice", "pronunciation"]

        # 6. Generic Dynamic Fallback
        else:
            char_bible = {
                "characters": [
                    {
                        "name": "Alex",
                        "description": "23-year-old student with neat dark hair, wearing a royal blue sweater and jeans"
                    }
                ],
                "base_setting": "Modern cozy study room with bookshelf and laptop desk",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm lighting, strictly no text"
            }
            raw_chunks = [
                {
                    "text": f"Alex is practicing English lessons about {topic} today.",
                    "translation": f"Alex está practicando lecciones de inglés sobre {topic} hoy.",
                    "has_new_image": True,
                    "scene_context": "Alex sitting at a study desk with books",
                    "image_prompt": f"flat 2D vector educational illustration of Alex, 23-year-old student with neat dark hair in a royal blue sweater, studying English attentively at a wooden desk with open books, clean modern study room, strictly no text, no words"
                },
                {
                    "text": "He reads every sentence carefully and listens to the correct pronunciation.",
                    "translation": "Él lee cada oración con cuidado y escucha la pronunciación correcta.",
                    "has_new_image": True,
                    "scene_context": "Alex listening with headphones and reading aloud",
                    "image_prompt": f"flat 2D vector educational illustration of Alex in his royal blue sweater wearing headphones and speaking clearly as he reads English notes, warm cozy study room, clean minimalist style, strictly no text, no words"
                },
                {
                    "text": "With daily practice, speaking English becomes easy, natural and fun.",
                    "translation": "Con práctica diaria, hablar inglés se vuelve fácil, natural y divertido.",
                    "has_new_image": True,
                    "scene_context": "Alex smiling confidently with thumbs up at his desk",
                    "image_prompt": f"flat 2D vector educational illustration of Alex in his royal blue sweater giving a confident smile and thumbs up at his desk, bright uplifting room lighting, clean minimalist style, strictly no text, no words"
                }
            ]
            title = f"Practicing {topic}"
            title_es = f"Practicando {topic}"
            targets = [clean_token(w).lower() for w in topic.split() if len(w) > 3] + ["english", "practice", "sentence", "pronunciation", "daily", "natural"]

        annotated_chunks = []
        for idx, ch in enumerate(raw_chunks):
            chunk_obj = {
                "chunk_id": f"chunk-{idx + 1}",
                "order": idx + 1,
                "text": ch["text"],
                "translation": ch["translation"],
                "has_new_image": ch.get("has_new_image", True),
                "scene_context": ch.get("scene_context", ""),
                "image_prompt": sanitize_reading_image_prompt(ch.get("image_prompt", ""), topic),
                "words": annotate_sentence_words(ch["text"], targets)
            }
            annotated_chunks.append(chunk_obj)

        return {
            "title": title,
            "title_es": title_es,
            "topic": topic,
            "sublevel": sublevel,
            "character_bible": char_bible,
            "target_keywords": targets[:6],
            "chunks": annotated_chunks
        }

    def evaluate_reading_attempt(
        self,
        chunk_words: List[Dict[str, Any]],
        student_transcript: str
    ) -> dict:
        """
        Performs precise word-by-word evaluation of the student's spoken transcript
        against the expected chunk words.
        Returns detailed evaluation per word (green for correct, red for mispronounced/omitted),
        overall score, accuracy percentage, and pedagogical feedback.
        """
        normalized_transcript = normalize_speech_text(student_transcript)
        spoken_tokens = [clean_token(w).lower() for w in normalized_transcript.split() if clean_token(w)]

        target_clean_tokens = [w.get("clean_word", "").lower() for w in chunk_words]

        # Use SequenceMatcher to find longest contiguous matching blocks
        matcher = difflib.SequenceMatcher(None, target_clean_tokens, spoken_tokens)
        matched_target_indices = set()

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                for idx in range(i1, i2):
                    matched_target_indices.add(idx)
            elif tag == 'replace':
                # Check for minor phonetic tolerance / fuzzy match
                for t_idx, s_idx in zip(range(i1, i2), range(j1, j2)):
                    t_word = target_clean_tokens[t_idx]
                    s_word = spoken_tokens[s_idx]
                    ratio = difflib.SequenceMatcher(None, t_word, s_word).ratio()
                    if ratio >= 0.82 or (len(t_word) <= 3 and t_word == s_word):
                        matched_target_indices.add(t_idx)

        words_evaluation = []
        correct_count = 0
        mispronounced_words = []

        for idx, word_item in enumerate(chunk_words):
            raw_w = word_item.get("word", "")
            clean_w = word_item.get("clean_word", "")
            ipa_w = word_item.get("ipa") or get_word_ipa(clean_w)
            is_target = word_item.get("is_target", False)

            if idx in matched_target_indices:
                status = "correct"
                correct_count += 1
                score = 100
            else:
                status = "mispronounced"
                mispronounced_words.append(clean_w)
                score = 0

            words_evaluation.append({
                "word": raw_w,
                "clean_word": clean_w,
                "ipa": ipa_w,
                "status": status,
                "score": score,
                "is_target": is_target
            })

        total_words = len(chunk_words)
        accuracy_percent = int(round((correct_count / max(1, total_words)) * 100))
        is_passed = accuracy_percent >= 70

        # Constructive feedback
        if accuracy_percent >= 90:
            feedback = "¡Excelente lectura y pronunciación fluida! Has dominado este párrafo."
        elif accuracy_percent >= 70:
            feedback = f"¡Muy buen trabajo! Pronunciaste {correct_count} de {total_words} palabras correctamente. Toca las palabras en rojo para escuchar su sonido exacto y perfeccionar tu acento."
        elif accuracy_percent >= 40:
            feedback = "Buen intento. Escucha el audio de las palabras en rojo haciendo clic en ellas y repite la lectura para mejorar tu puntaje."
        else:
            feedback = "Intenta leer más despacio y con claridad. Haz clic en cada palabra para escuchar cómo se pronuncia antes de volver a grabar."

        return {
            "is_correct": is_passed,
            "overall_score": accuracy_percent,
            "accuracy_percent": accuracy_percent,
            "correct_words_count": correct_count,
            "total_words_count": total_words,
            "words_evaluation": words_evaluation,
            "mispronounced_words": mispronounced_words[:4],
            "feedback": feedback,
            "transcript_received": student_transcript
        }
