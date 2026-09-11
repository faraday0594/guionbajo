"""
Guionbajo — Reading Practice Generator & Word-by-Word Phonetic Evaluator
Generates cohesive contextual short stories structured across 3 visual slides,
with MINIMUM 3 sequential text chunks per slide, maintaining character visual
continuity across scenes via a Character Bible, annotating every word with IPA,
and performing strict 80% minimum pronunciation evaluation.
"""
import re
import difflib
import logging
import json
from typing import Dict, List, Optional, Any
from config import settings
from core.ipa_dictionary import annotate_sentence_words, get_word_ipa, clean_token
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

READING_SYSTEM_PROMPT = """You are Guionbajo's Master Reading & Storytelling Professor for English learners.
Your goal is to generate an engaging, cohesive short story centered around the lesson topic for CEFR level {sublevel} with strict visual continuity and character consistency across 3 visual slides (scenes).

CRITICAL STORY & VISUAL CONTINUITY RULES:

1. THEME & TOPIC: The story must naturally integrate the vocabulary and grammatical structures of '{topic}'.

2. SLIDE & CHUNK HIERARCHY (STRICT REQUIREMENT):
   - The story MUST be divided into EXACTLY 3 sequential visual scenes (slides):
     * Slide 1: Scene Introduction / Setup (morning / beginning of action).
     * Slide 2: Core Development / Interaction / Challenge.
     * Slide 3: Resolution / Climax / Satisfying Conclusion.
   - FOR EACH SLIDE, YOU MUST PROVIDE EXACTLY 3 SEQUENTIAL TEXT CHUNKS (Parts 1, 2, and 3):
     * Each chunk must contain 1 to 2 clear, natural English sentences appropriate for level {sublevel}.
     * The 3 chunks in a slide form a continuous, engaging narrative paragraph for that visual scene.
     * TOTAL: 3 slides x 3 chunks = exactly 9 sequential chunks in the entire story.

3. CHARACTER BIBLE & VISUAL CONTINUITY ENGINE:
   - Define a fixed "character_bible" at the start of the story describing each character:
     * Name, exact age, ethnicity, facial features, hairstyle & hair color.
     * Exact signature clothing and colors that remain consistent across all 3 slides (e.g. "Emma, a 24-year-old woman with shoulder-length wavy brown hair and green eyes, wearing a mustard yellow knitted sweater and dark blue jeans").
   - Define "base_setting" (e.g. "a warm cozy modern apartment kitchen with light wooden cabinets and morning sunlight").
   - Define "art_style": strictly "vibrant 2D educational digital vector illustration, clean lines, warm atmospheric lighting, expressive relatable characters, strictly no text, no letters, no words".

4. PER-SLIDE VISUAL SCENE:
   For EACH of the 3 slides:
   - "slide_number": integer (1, 2, or 3)
   - "scene_title": Short title in English (e.g. "Morning in the Kitchen")
   - "scene_context": Specific setting & action description for this scene.
   - "image_prompt": Detailed 2D illustration prompt that incorporates the EXACT character descriptors from the character_bible (same hair, same clothes, same age), setting, lighting, and action. Strictly append: "clean minimalist style, strictly no text, no letters, no words".

5. PER-CHUNK DATA (3 chunks per slide):
   For EACH chunk within a slide:
   - "part_number": integer (1, 2, or 3)
   - "text": 1 to 2 clear English sentences for the student to read aloud.
   - "translation": Natural Spanish translation.
   - "scene_context": Micro-context for this specific sentence.

6. TARGET VOCABULARY: Explicitly list 6 to 12 key vocabulary words from '{topic}' featured in the story.

Return JSON in this EXACT schema:
{{
  "title": "Story Title in English",
  "title_es": "Título de la Historia en Español",
  "topic": "{topic}",
  "sublevel": "{sublevel}",
  "character_bible": {{
    "characters": [
      {{
        "name": "Emma",
        "description": "24-year-old woman with shoulder-length wavy brown hair and green eyes, wearing a mustard yellow knitted sweater and dark blue jeans"
      }}
    ],
    "base_setting": "Warm cozy modern apartment kitchen with wooden cabinets and sunny window",
    "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm lighting, strictly no text"
  }},
  "target_keywords": ["word1", "word2", "word3", "word4"],
  "slides": [
    {{
      "slide_number": 1,
      "scene_title": "Morning in the Kitchen",
      "scene_context": "Emma waking up and brewing fresh coffee in her sunlit kitchen",
      "image_prompt": "flat 2D vector educational illustration of Emma, 24-year-old woman with wavy brown hair in a mustard yellow sweater, brewing coffee at her sunlit wooden kitchen counter, warm morning light, clean style, strictly no text, no letters, no words",
      "chunks": [
        {{
          "part_number": 1,
          "text": "Every morning, Emma wakes up early and walks into her sunlit kitchen.",
          "translation": "Cada mañana, Emma se despierta temprano y entra a su cocina iluminada por el sol.",
          "scene_context": "Emma entering the kitchen in the morning"
        }},
        {{
          "part_number": 2,
          "text": "She loves the peaceful silence of the early morning before her busy day begins.",
          "translation": "A ella le encanta el silencio tranquilo de la madrugada antes de que comience su día ocupado.",
          "scene_context": "Emma enjoying the quiet morning atmosphere"
        }},
        {{
          "part_number": 3,
          "text": "She brews a fresh cup of dark coffee and places a plate of toast on the table.",
          "translation": "Ella prepara una taza fresca de café negro y coloca un plato de tostadas sobre la mesa.",
          "scene_context": "Emma preparing coffee and toast"
        }}
      ]
    }},
    {{
      "slide_number": 2,
      "scene_title": "A Friendly Knock at the Door",
      "scene_context": "Emma opening the front door as her brother Lucas arrives with flowers",
      "image_prompt": "flat 2D vector educational illustration of Emma in her mustard yellow sweater happily opening her wooden front door as her brother Lucas in an olive green jacket hands her a colorful bouquet of flowers, clean style, strictly no text, no words",
      "chunks": [
        {{
          "part_number": 1,
          "text": "Suddenly, someone knocks gently at the wooden front door of the apartment.",
          "translation": "De repente, alguien toca suavemente a la puerta de madera del apartamento.",
          "scene_context": "Someone knocking at the front door"
        }},
        {{
          "part_number": 2,
          "text": "Emma opens the door with a bright smile and sees her younger brother Lucas.",
          "translation": "Emma abre la puerta con una gran sonrisa y ve a su hermano menor Lucas.",
          "scene_context": "Emma opening the door to see Lucas"
        }},
        {{
          "part_number": 3,
          "text": "Lucas is holding a bouquet of fresh yellow flowers to celebrate her new job.",
          "translation": "Lucas sostiene un ramo de flores amarillas frescas para celebrar su nuevo empleo.",
          "scene_context": "Lucas holding the bouquet of flowers"
        }}
      ]
    }},
    {{
      "slide_number": 3,
      "scene_title": "Sharing Tea and Good News",
      "scene_context": "Emma and Lucas sitting together at the table laughing and drinking tea",
      "image_prompt": "flat 2D vector educational illustration of Emma in her mustard yellow sweater and Lucas in his green jacket laughing together while drinking tea at a wooden dining table, cozy ambient lighting, strictly no text, no letters, no words",
      "chunks": [
        {{
          "part_number": 1,
          "text": "They sit down together at the kitchen table and pour two steaming cups of herbal tea.",
          "translation": "Ellos se sientan juntos a la mesa de la cocina y sirven dos tazas humeantes de té de hierbas.",
          "scene_context": "Sitting down at the table with tea"
        }},
        {{
          "part_number": 2,
          "text": "Lucas asks Emma about her upcoming projects and she explains her plans with confidence.",
          "translation": "Lucas le pregunta a Emma sobre sus próximos proyectos y ella le explica sus planes con confianza.",
          "scene_context": "Lucas and Emma talking about future plans"
        }},
        {{
          "part_number": 3,
          "text": "Sharing stories with family always makes any ordinary morning truly special.",
          "translation": "Compartir historias con la familia siempre hace que cualquier mañana común sea verdaderamente especial.",
          "scene_context": "Reflective and heartwarming conclusion"
        }}
      ]
    }}
  ]
}}
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
        base = f"flat 2D vector educational illustration of {character_desc or 'a student'} in an engaging scene about {topic}, warm cozy setting, clean minimalist graphic design, bright colors"
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
    Generates and evaluates reading practice stories across 3 visual slides with
    at least 3 text chunks per slide and word-by-word IPA phonetic annotations.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.MINIMAX_API_KEY
        self.model = settings.MINIMAX_LLM_MODEL
        if self.api_key:
            try:
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=settings.MINIMAX_BASE_URL,
                    timeout=60.0,
                )
            except Exception as e:
                logger.warning(f"Failed to initialize AsyncOpenAI in ReadingGenerator: {e}")
                self.client = None
        else:
            self.client = None

    async def generate_reading_practice(
        self,
        topic: str,
        sublevel: str = "A1.1",
        lesson_data: Optional[dict] = None
    ) -> dict:
        """
        Generates a 3-slide visual reading story with MINIMUM 3 chunks per slide
        (9 chunks total) and word-level IPA transcriptions.
        """
        if not self.client or not self.api_key:
            return self._build_curated_reading_fallback(topic, sublevel)
        prompt = (
            f"Generate an engaging visual reading practice story for:\n"
            f"Topic: {topic}\n"
            f"CEFR Sublevel: {sublevel}\n"
            f"Requirements:\n"
            f"- EXACTLY 3 sequential visual scenes (slides).\n"
            f"- FOR EACH SLIDE, EXACTLY 3 SEQUENTIAL TEXT CHUNKS (Parts 1, 2, 3).\n"
            f"- Each chunk: 1 or 2 natural sentences for student oral reading.\n"
            f"- Full narrative continuity across all 3 slides (9 chunks total).\n"
            f"- Define 'character_bible' with fixed physical appearance.\n"
            f"- Each slide must have a distinct 'image_prompt' with character continuity.\n"
            f"- Incorporate vocabulary and structures from {topic} naturally.\n"
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

            data = json.loads(clean)

            raw_slides = data.get("slides")
            if not raw_slides or not isinstance(raw_slides, list) or len(raw_slides) == 0:
                raw_chunks = data.get("chunks", [])
                if not raw_chunks or len(raw_chunks) == 0:
                    return self._build_curated_reading_fallback(topic, sublevel)
                raw_slides = self._group_chunks_into_slides(raw_chunks, topic)

            target_keys = data.get("target_keywords", [])
            char_bible = data.get("character_bible", {})
            main_char_desc = ""
            if char_bible and isinstance(char_bible.get("characters"), list) and len(char_bible["characters"]) > 0:
                main_char_desc = char_bible["characters"][0].get("description", "")

            formatted_slides = []
            flat_chunks = []
            global_chunk_idx = 0

            for s_idx, slide_data in enumerate(raw_slides):
                slide_num = s_idx + 1
                slide_id = f"slide-{slide_num}"
                scene_title = slide_data.get("scene_title") or f"Escena {slide_num}"
                scene_ctx = slide_data.get("scene_context") or f"Escena {slide_num} sobre {topic}"
                raw_img = slide_data.get("image_prompt") or f"flat 2D vector educational illustration of {main_char_desc} in {scene_ctx}"
                clean_img = sanitize_reading_image_prompt(raw_img, topic, main_char_desc)

                slide_chunks_raw = slide_data.get("chunks", [])
                if len(slide_chunks_raw) < 3:
                    slide_chunks_raw = self._ensure_min_three_chunks(slide_chunks_raw, topic, slide_num)

                formatted_chunks_for_slide = []
                for p_idx, ch in enumerate(slide_chunks_raw):
                    global_chunk_idx += 1
                    part_num = p_idx + 1
                    chunk_id = f"slide-{slide_num}-part-{part_num}"
                    raw_text = ch.get("text", "")
                    words_annotated = annotate_sentence_words(raw_text, target_keys)

                    chunk_obj = {
                        "chunk_id": chunk_id,
                        "order": global_chunk_idx,
                        "slide_index": s_idx,
                        "part_number": part_num,
                        "text": raw_text,
                        "translation": ch.get("translation", ""),
                        "scene_context": ch.get("scene_context", scene_ctx),
                        "has_new_image": p_idx == 0,
                        "image_prompt": clean_img,
                        "words": words_annotated
                    }
                    formatted_chunks_for_slide.append(chunk_obj)
                    flat_chunks.append(chunk_obj)

                formatted_slides.append({
                    "slide_id": slide_id,
                    "slide_number": slide_num,
                    "scene_title": scene_title,
                    "scene_context": scene_ctx,
                    "image_prompt": clean_img,
                    "chunks": formatted_chunks_for_slide
                })

            data["slides"] = formatted_slides
            data["chunks"] = flat_chunks
            data["topic"] = topic
            data["sublevel"] = sublevel
            return data

        except Exception as e:
            logger.warning(f"Reading story LLM generation fallback: {e}")
            return self._build_curated_reading_fallback(topic, sublevel)

    def _group_chunks_into_slides(self, flat_chunks: list, topic: str) -> list:
        """Groups a flat array of chunks into 3 slides with minimum 3 chunks each."""
        total = len(flat_chunks)
        slides = []
        chunk_size = max(3, (total + 2) // 3)
        for s_idx in range(3):
            start = s_idx * chunk_size
            end = start + chunk_size if s_idx < 2 else total
            slice_chunks = flat_chunks[start:end]
            if not slice_chunks:
                slice_chunks = [
                    {"text": f"Alex is continuing the English conversation about {topic}.", "translation": f"Alex continúa la conversación en inglés sobre {topic}."},
                    {"text": "He listens to the teacher and repeats the key phrases.", "translation": "Él escucha al profesor y repite las frases clave."},
                    {"text": "Speaking every day gives him great confidence.", "translation": "Hablar todos los días le da gran confianza."}
                ]
            slides.append({
                "slide_number": s_idx + 1,
                "scene_title": f"Scene {s_idx + 1}",
                "scene_context": f"Story progression part {s_idx + 1}",
                "image_prompt": "",
                "chunks": slice_chunks
            })
        return slides

    def _ensure_min_three_chunks(self, chunks: list, topic: str, slide_num: int) -> list:
        """Fills chunks up to at least 3 if an LLM returned fewer."""
        res = list(chunks)
        fallbacks = [
            {"text": f"They continue practicing essential English phrases related to {topic}.", "translation": f"Ellos continúan practicando frases esenciales de inglés sobre {topic}."},
            {"text": "Every sentence helps them communicate clearly and naturally.", "translation": "Cada oración les ayuda a comunicarse con claridad y naturalidad."},
            {"text": "With patience and repetition, learning becomes an enjoyable habit.", "translation": "Con paciencia y repetición, el aprendizaje se vuelve un hábito agradable."}
        ]
        fb_idx = 0
        while len(res) < 3:
            res.append(fallbacks[fb_idx % len(fallbacks)])
            fb_idx += 1
        return res

    def _build_curated_reading_fallback(self, topic: str, sublevel: str) -> dict:
        """
        Rich, highly-calibrated fallback catalog with 3 visual slides and
        EXACTLY 3 text chunks per slide (9 chunks total) with word-level IPA.
        """
        low = topic.lower()

        # 1. Can & Abilities / Modal Verbs
        if any(w in low for w in ["can", "ability", "abilities", "modal", "talents"]):
            char_bible = {
                "characters": [
                    {
                        "name": "Maya",
                        "description": "22-year-old woman with shoulder-length wavy dark hair, wearing a turquoise knit cardigan, white t-shirt and light blue jeans"
                    },
                    {
                        "name": "David",
                        "description": "24-year-old man with short brown hair and glasses, wearing a burgundy hoodie"
                    }
                ],
                "base_setting": "Vibrant community center music and art studio with instruments and canvases",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm atmospheric lighting, strictly no text"
            }
            title = "Maya's Many Talents"
            title_es = "Los múltiples talentos de Maya"
            targets = ["can", "play", "guitar", "sing", "swim", "speak", "languages", "fast", "cook", "paint", "talents", "practice"]
            slides_data = [
                {
                    "slide_number": 1,
                    "scene_title": "Discovering New Talents in the Studio",
                    "scene_context": "Maya holding an acoustic guitar in a bright community music room",
                    "image_prompt": "flat 2D vector educational illustration of Maya, a 22-year-old woman with wavy dark hair in a turquoise cardigan, sitting on a wooden stool holding an acoustic guitar in a sunlit music studio, clean minimalist style, strictly no text, no letters, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "Maya is a very creative student who can play the acoustic guitar beautifully.",
                            "translation": "Maya es una estudiante muy creativa que puede tocar la guitarra acústica maravillosamente.",
                            "scene_context": "Maya playing the guitar"
                        },
                        {
                            "part_number": 2,
                            "text": "She can also sing melodic jazz songs, but she cannot play the piano yet.",
                            "translation": "Ella también puede cantar canciones melódicas de jazz, pero aún no puede tocar el piano.",
                            "scene_context": "Maya singing while playing"
                        },
                        {
                            "part_number": 3,
                            "text": "Her friend David asks her if she can perform a popular song at the weekend concert.",
                            "translation": "Su amigo David le pregunta si puede interpretar una canción popular en el concierto del fin de semana.",
                            "scene_context": "David asking Maya about the concert"
                        }
                    ]
                },
                {
                    "slide_number": 2,
                    "scene_title": "Active Skills and Language Goals",
                    "scene_context": "Maya and David in the community center courtyard talking about sports and languages",
                    "image_prompt": "flat 2D vector educational illustration of Maya in her turquoise cardigan and David in his burgundy hoodie chatting cheerfully on a sunny garden bench outside the community center, bright daylight, clean style, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "Besides music, Maya can swim very fast and she can ride a bicycle through the city.",
                            "translation": "Además de la música, Maya puede nadar muy rápido y puede andar en bicicleta por la ciudad.",
                            "scene_context": "Talking about athletic skills"
                        },
                        {
                            "part_number": 2,
                            "text": "David smiles and says he can cook delicious Italian meals, but he can't swim.",
                            "translation": "David sonríe y dice que puede cocinar deliciosas comidas italianas, pero no sabe nadar.",
                            "scene_context": "David sharing his cooking ability"
                        },
                        {
                            "part_number": 3,
                            "text": "Both friends can speak English well, and they can practice Spanish together every day.",
                            "translation": "Ambos amigos pueden hablar inglés bien, y pueden practicar español juntos todos los días.",
                            "scene_context": "Practicing languages together"
                        }
                    ]
                },
                {
                    "slide_number": 3,
                    "scene_title": "Confidence on Stage",
                    "scene_context": "Maya performing confidently under warm stage lights with audience applauding",
                    "image_prompt": "flat 2D vector educational illustration of Maya in her turquoise cardigan playing her guitar on an illuminated small stage, warm amber spotlight, smiling happily as audience applauds in silhouette, clean aesthetic, strictly no text, no letters, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "On Saturday evening, Maya steps onto the illuminated stage with high confidence.",
                            "translation": "El sábado por la tarde, Maya sube al escenario iluminado con gran confianza.",
                            "scene_context": "Stepping onto the stage"
                        },
                        {
                            "part_number": 2,
                            "text": "She plays her favorite tune effortlessly and David cheers loudly from the front row.",
                            "translation": "Ella toca su melodía favorita sin esfuerzo y David la ovaciona desde la primera fila.",
                            "scene_context": "Playing under spotlights"
                        },
                        {
                            "part_number": 3,
                            "text": "When you believe in your abilities and practice regularly, you can achieve any goal.",
                            "translation": "Cuando crees en tus habilidades y practicas con regularidad, puedes lograr cualquier meta.",
                            "scene_context": "Inspirational lesson takeaway"
                        }
                    ]
                }
            ]

        # 2. Past Continuous & Interrupted Actions
        elif any(w in low for w in ["past continuous", "interrupted", "was/were + -ing", "while / when"]):
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
            title = "The Surprise Visit"
            title_es = "La visita sorpresa"
            targets = ["cooking", "dinner", "kitchen", "doorbell", "rang", "opening", "arrived", "flowers", "laughing", "drinking", "tea", "rain"]
            slides_data = [
                {
                    "slide_number": 1,
                    "scene_title": "An Evening in the Kitchen",
                    "scene_context": "Emma cooking dinner in her wooden kitchen as the doorbell rings",
                    "image_prompt": "flat 2D vector educational illustration of Emma, a 24-year-old woman with wavy brown hair in a mustard yellow sweater, stirring a pot at a warm wooden stove as the doorbell rings, cozy indoor lighting, clean minimalist style, strictly no text, no letters, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "Emma was cooking a delicious vegetable soup in her warm kitchen after work.",
                            "translation": "Emma estaba cocinando una deliciosa sopa de verduras en su acogedora cocina después del trabajo.",
                            "scene_context": "Emma stirring the soup"
                        },
                        {
                            "part_number": 2,
                            "text": "The aroma of garlic and fresh herbs was filling the entire apartment.",
                            "translation": "El aroma de ajo y hierbas frescas estaba llenando todo el apartamento.",
                            "scene_context": "Aroma in the kitchen"
                        },
                        {
                            "part_number": 3,
                            "text": "She was humming her favorite melody when the doorbell suddenly rang loudly.",
                            "translation": "Ella estaba tarareando su melodía favorita cuando el timbre sonó fuerte de repente.",
                            "scene_context": "Doorbell interrupting Emma"
                        }
                    ]
                },
                {
                    "slide_number": 2,
                    "scene_title": "Opening the Door to a Surprise",
                    "scene_context": "Emma opening the front door as Lucas arrives holding flowers",
                    "image_prompt": "flat 2D vector educational illustration of Emma in her mustard yellow sweater opening her apartment door happily as her brother Lucas in an olive green jacket holds a colorful bouquet of flowers, clean style, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "While Emma was turning off the stove, the doorbell rang a second time.",
                            "translation": "Mientras Emma estaba apagando la estufa, el timbre sonó por segunda vez.",
                            "scene_context": "Turning off the stove"
                        },
                        {
                            "part_number": 2,
                            "text": "She walked to the front door and opened it with great curiosity.",
                            "translation": "Ella caminó hacia la puerta principal y la abrió con gran curiosidad.",
                            "scene_context": "Opening the door"
                        },
                        {
                            "part_number": 3,
                            "text": "Her younger brother Lucas was standing on the porch holding a bright bouquet of flowers.",
                            "translation": "Su hermano menor Lucas estaba parado en el pórtico sosteniendo un brillante ramo de flores.",
                            "scene_context": "Lucas standing with flowers"
                        }
                    ]
                },
                {
                    "slide_number": 3,
                    "scene_title": "Cozy Conversations Over Tea",
                    "scene_context": "Emma and Lucas sitting at the wooden table enjoying tea while it rains outside",
                    "image_prompt": "flat 2D vector educational illustration of Emma in her mustard yellow sweater and Lucas in his olive green jacket sitting together at a wooden table smiling with teacups, rain drops visible on the window glass behind them, warm ambient lighting, strictly no text, no letters, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "They sat down at the wooden table and poured two steaming mugs of black tea.",
                            "translation": "Se sentaron a la mesa de madera y sirvieron dos tazas humeantes de té negro.",
                            "scene_context": "Sitting down with tea"
                        },
                        {
                            "part_number": 2,
                            "text": "While gentle evening rain was falling outside, they were sharing childhood stories.",
                            "translation": "Mientras una suave lluvia caía afuera, ellos estaban compartiendo historias de la infancia.",
                            "scene_context": "Talking while it rains"
                        },
                        {
                            "part_number": 3,
                            "text": "They were laughing together all evening, enjoying a truly unforgettable family reunion.",
                            "translation": "Estuvieron riendo juntos toda la tarde, disfrutando de una reunión familiar verdaderamente inolvidable.",
                            "scene_context": "Laughing and finishing dinner"
                        }
                    ]
                }
            ]

        # 3. Daily Routines & Present Simple
        elif any(w in low for w in ["routine", "rutina", "frequency", "daily", "present simple", "habit"]):
            char_bible = {
                "characters": [
                    {
                        "name": "Leo",
                        "description": "26-year-old man with short dark brown hair, wearing a navy blue henley shirt, khaki trousers and white sneakers"
                    },
                    {
                        "name": "Barnaby",
                        "description": "Cheerful golden retriever dog with a red collar"
                    }
                ],
                "base_setting": "Modern city apartment and nearby sunlit Central Park",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, morning sunlight, strictly no text"
            }
            title = "Leo's Daily Routine"
            title_es = "La rutina diaria de Leo"
            targets = ["wakes", "morning", "drinks", "coffee", "fruit", "always", "walks", "dog", "park", "studies", "online", "classmates"]
            slides_data = [
                {
                    "slide_number": 1,
                    "scene_title": "Early Morning at Home",
                    "scene_context": "Leo drinking coffee in his sunny kitchen",
                    "image_prompt": "flat 2D vector educational illustration of Leo, a 26-year-old man in a navy blue shirt, holding a white coffee mug by a sunny kitchen window with a bowl of fresh fruit, morning light, clean minimalist style, strictly no text, no letters, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "Every morning, Leo wakes up at six o'clock without hitting the alarm snooze.",
                            "translation": "Cada mañana, Leo se despierta a las seis en punto sin posponer la alarma.",
                            "scene_context": "Waking up early"
                        },
                        {
                            "part_number": 2,
                            "text": "He always opens his bedroom window to breathe in the crisp morning air.",
                            "translation": "Él siempre abre la ventana de su dormitorio para respirar el aire fresco de la mañana.",
                            "scene_context": "Opening the window"
                        },
                        {
                            "part_number": 3,
                            "text": "Then, he drinks hot black coffee and prepares a bowl of fresh oatmeal.",
                            "translation": "Luego, él toma café negro caliente y prepara un tazón de avena fresca.",
                            "scene_context": "Eating breakfast"
                        }
                    ]
                },
                {
                    "slide_number": 2,
                    "scene_title": "Morning Walk in the Green Park",
                    "scene_context": "Leo walking his golden retriever in the park under tall green trees",
                    "image_prompt": "flat 2D vector educational illustration of Leo in his navy blue shirt happily walking his golden retriever dog on a leash through a lush green city park with tall trees, bright daylight, clean style, strictly no text, no letters, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "At seven o'clock, Leo puts on his running shoes and takes Barnaby to the park.",
                            "translation": "A las siete en punto, Leo se pone sus zapatillas y lleva a Barnaby al parque.",
                            "scene_context": "Putting on shoes for the walk"
                        },
                        {
                            "part_number": 2,
                            "text": "The golden retriever runs across the grass while Leo jogs at a comfortable pace.",
                            "translation": "El golden retriever corre por el césped mientras Leo trota a un ritmo cómodo.",
                            "scene_context": "Jogging with the dog"
                        },
                        {
                            "part_number": 3,
                            "text": "They often meet friendly neighbors who greet them with warm morning smiles.",
                            "translation": "Ellos a menudo se encuentran con vecinos amables que los saludan con cálidas sonrisas matutinas.",
                            "scene_context": "Greeting neighbors"
                        }
                    ]
                },
                {
                    "slide_number": 3,
                    "scene_title": "Focus and Study Time",
                    "scene_context": "Leo studying English online at his tidy desk with laptop and headphones",
                    "image_prompt": "flat 2D vector educational illustration of Leo in his navy blue shirt sitting at a tidy wooden desk with a laptop and notebook, headphones on, smiling as he attends an online English class, clean minimalist style, strictly no text, no letters, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "In the afternoon, Leo sits at his tidy wooden desk to study English online.",
                            "translation": "Por la tarde, Leo se sienta en su ordenado escritorio de madera para estudiar inglés en línea.",
                            "scene_context": "Sitting at study desk"
                        },
                        {
                            "part_number": 2,
                            "text": "He practices pronunciation daily and takes neat notes in his leather notebook.",
                            "translation": "Él practica la pronunciación a diario y toma notas prolijas en su libreta de cuero.",
                            "scene_context": "Taking notes and practicing"
                        },
                        {
                            "part_number": 3,
                            "text": "Following a healthy routine keeps him motivated, productive, and happy every single day.",
                            "translation": "Seguir una rutina saludable lo mantiene motivado, productivo y feliz cada día.",
                            "scene_context": "Concluding thoughts on routine"
                        }
                    ]
                }
            ]

        # 4. Irregular Past & Simple Past
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
            title = "An Exciting Weekend in Town"
            title_es = "Un fin de semana emocionante en la ciudad"
            targets = ["went", "city", "friends", "saw", "movie", "bought", "delicious", "pizza", "took", "photos", "had", "weekend"]
            slides_data = [
                {
                    "slide_number": 1,
                    "scene_title": "Heading to the City Center",
                    "scene_context": "Sarah and friends walking downtown with city buildings",
                    "image_prompt": "flat 2D vector educational illustration of Sarah, 22-year-old woman with curly auburn ponytail in a pastel pink hoodie and denim jacket, walking happily on a colorful city sidewalk with friends, clean style, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "Last Saturday morning, Sarah traveled to the historic city center with her best friends.",
                            "translation": "El sábado pasado por la mañana, Sarah viajó al centro histórico de la ciudad con sus mejores amigos.",
                            "scene_context": "Traveling to city center"
                        },
                        {
                            "part_number": 2,
                            "text": "They walked through bustling pedestrian streets filled with street musicians and historic cafes.",
                            "translation": "Caminaron por bulliciosas calles peatonales llenas de músicos callejeros y cafés históricos.",
                            "scene_context": "Walking through downtown"
                        },
                        {
                            "part_number": 3,
                            "text": "The bright morning sunshine created a cheerful atmosphere across the entire plaza.",
                            "translation": "El brillante sol de la mañana creaba un ambiente alegre en toda la plaza.",
                            "scene_context": "Sunny downtown plaza"
                        }
                    ]
                },
                {
                    "slide_number": 2,
                    "scene_title": "Dinner at the Italian Pizzeria",
                    "scene_context": "Sarah eating hot pizza at a cozy restaurant table",
                    "image_prompt": "flat 2D vector educational illustration of Sarah in her pastel pink hoodie sitting at a wooden restaurant table sharing a steaming hot slice of pizza with her friends, warm cozy pizzeria lighting, clean style, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "After exploring museums, they went into an authentic Italian pizzeria for lunch.",
                            "translation": "Después de explorar museos, entraron a una auténtica pizzería italiana a almorzar.",
                            "scene_context": "Entering the pizzeria"
                        },
                        {
                            "part_number": 2,
                            "text": "They ordered a large wood-fired pizza covered in fresh mozzarella and basil.",
                            "translation": "Pidieron una gran pizza a la leña cubierta de mozzarella fresca y albahaca.",
                            "scene_context": "Ordering the pizza"
                        },
                        {
                            "part_number": 3,
                            "text": "Everyone ate happily and talked enthusiastically about the art exhibitions they visited.",
                            "translation": "Todos comieron con gusto y hablaron entusiasmados sobre las exposiciones de arte que visitaron.",
                            "scene_context": "Eating and talking"
                        }
                    ]
                },
                {
                    "slide_number": 3,
                    "scene_title": "Memories at Dusk",
                    "scene_context": "Sarah taking photos with a smartphone by an illuminated city monument",
                    "image_prompt": "flat 2D vector educational illustration of Sarah in her pastel pink hoodie taking a photo with her smartphone in front of a beautiful illuminated city square at dusk, clean aesthetic, strictly no text, no letters, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "As dusk fell over the city, the monumental fountains lit up with golden lights.",
                            "translation": "Al caer el anochecer sobre la ciudad, las fuentes monumentales se encendieron con luces doradas.",
                            "scene_context": "Evening lights in the city"
                        },
                        {
                            "part_number": 2,
                            "text": "Sarah took dozens of vibrant photographs to remember this delightful weekend.",
                            "translation": "Sarah tomó docenas de fotografías vibrantes para recordar este encantador fin de semana.",
                            "scene_context": "Taking photos"
                        },
                        {
                            "part_number": 3,
                            "text": "She returned home feeling grateful for the precious time spent with good friends.",
                            "translation": "Ella regresó a casa sintiéndose agradecida por el valioso tiempo compartido con buenos amigos.",
                            "scene_context": "Returning home happily"
                        }
                    ]
                }
            ]

        # 5. Food, Ordering & Cafés / Restaurants
        elif any(w in low for w in ["food", "order", "restaurant", "café", "cafe", "drink", "meal"]):
            char_bible = {
                "characters": [
                    {
                        "name": "Carlos",
                        "description": "28-year-old man with short black hair and glasses, wearing a burgundy crewneck sweater and dark trousers"
                    }
                ],
                "base_setting": "Charming European café with indoor plants and wooden tables",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm lighting, strictly no text"
            }
            title = "A Pleasant Afternoon at the Café"
            title_es = "Una tarde agradable en la cafetería"
            targets = ["table", "window", "café", "cup", "tea", "slice", "apple", "pie", "waiter", "enjoys", "dessert", "music"]
            slides_data = [
                {
                    "slide_number": 1,
                    "scene_title": "Entering the Cozy Café",
                    "scene_context": "Carlos sitting at a café window table looking at the menu",
                    "image_prompt": "flat 2D vector educational illustration of Carlos, 28-year-old man with glasses in a burgundy sweater, sitting at a wooden table by a large café window with green potted plants, holding a menu, clean style, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "Carlos pushes open the glass door of a charming neighborhood café on a sunny afternoon.",
                            "translation": "Carlos empuja la puerta de vidrio de una encantadora cafetería de barrio en una tarde soleada.",
                            "scene_context": "Entering the café"
                        },
                        {
                            "part_number": 2,
                            "text": "He chooses a small wooden table right next to a sunny window lined with green plants.",
                            "translation": "Él elige una pequeña mesa de madera justo al lado de una ventana soleada bordeada de plantas verdes.",
                            "scene_context": "Sitting by the window"
                        },
                        {
                            "part_number": 3,
                            "text": "He opens the menu and takes his time deciding what warm beverage to order.",
                            "translation": "Él abre el menú y se toma su tiempo para decidir qué bebida caliente pedir.",
                            "scene_context": "Browsing the menu"
                        }
                    ]
                },
                {
                    "slide_number": 2,
                    "scene_title": "Placing the Order with the Waiter",
                    "scene_context": "The waiter placing steaming tea and apple pie on Carlos's table",
                    "image_prompt": "flat 2D vector educational illustration of a friendly waiter in a white shirt and black apron serving a steaming porcelain cup of tea and a golden slice of apple pie to Carlos in his burgundy sweater, clean aesthetic, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "A friendly waiter arrives at the table with a welcoming notepad in hand.",
                            "translation": "Un camarero amable llega a la mesa con una libreta de notas en la mano.",
                            "scene_context": "Waiter arriving"
                        },
                        {
                            "part_number": 2,
                            "text": "Carlos politely orders a cup of fragrant green tea and a slice of warm apple pie.",
                            "translation": "Carlos pide educadamente una taza de aromático té verde y una porción de tarta tibia de manzana.",
                            "scene_context": "Placing the order"
                        },
                        {
                            "part_number": 3,
                            "text": "The waiter brings the fresh order quickly, filling the air with sweet cinnamon aroma.",
                            "translation": "El camarero trae el pedido fresco rápidamente, llenando el aire con un dulce aroma a canela.",
                            "scene_context": "Serving the tea and pie"
                        }
                    ]
                },
                {
                    "slide_number": 3,
                    "scene_title": "A Moment of Pure Relaxation",
                    "scene_context": "Carlos smiling as he takes a bite of the dessert with soft acoustic music playing",
                    "image_prompt": "flat 2D vector educational illustration of Carlos in his burgundy sweater taking a bite of apple pie with a small fork, smiling contentedly in the cozy café, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "Carlos takes a slow sip of the soothing tea and tastes a bite of the crispy pie.",
                            "translation": "Carlos toma un sorbo pausado del té relajante y prueba un bocado de la tarta crujiente.",
                            "scene_context": "Tasting the tea and pie"
                        },
                        {
                            "part_number": 2,
                            "text": "Soft acoustic jazz plays in the background, creating the perfect peaceful ambiance.",
                            "translation": "Música suave de jazz acústico suena de fondo, creando el ambiente de tranquilidad perfecto.",
                            "scene_context": "Enjoying the music"
                        },
                        {
                            "part_number": 3,
                            "text": "Taking time to unwind in a welcoming café brings genuine joy to a busy week.",
                            "translation": "Darse tiempo para desconectar en una cafetería acogedora aporta verdadera alegría a una semana ocupada.",
                            "scene_context": "Closing reflection"
                        }
                    ]
                }
            ]

        # 6. Generic Dynamic Fallback
        else:
            char_bible = {
                "characters": [
                    {
                        "name": "Alex",
                        "description": "23-year-old student with neat dark hair, wearing a royal blue sweater, dark jeans and white sneakers"
                    }
                ],
                "base_setting": "Modern cozy study room with bookshelf and laptop desk",
                "art_style": "vibrant 2D educational digital vector illustration, clean lines, warm lighting, strictly no text"
            }
            title = f"Alex's Journey with {topic}"
            title_es = f"El viaje de Alex con {topic}"
            targets = [clean_token(w).lower() for w in topic.split() if len(w) > 3] + ["english", "practice", "sentence", "pronunciation", "daily", "natural", "speaking", "learn"]
            slides_data = [
                {
                    "slide_number": 1,
                    "scene_title": "Starting Today's English Lesson",
                    "scene_context": "Alex sitting at a study desk with open English books and notebook",
                    "image_prompt": f"flat 2D vector educational illustration of Alex, a 23-year-old student with neat dark hair in a royal blue sweater, studying English attentively at a wooden desk with open books, clean modern study room, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": f"Today, Alex sits down at his study desk to master new English concepts about {topic}.",
                            "translation": f"Hoy, Alex se sienta en su escritorio de estudio para dominar nuevos conceptos en inglés sobre {topic}.",
                            "scene_context": "Starting to study"
                        },
                        {
                            "part_number": 2,
                            "text": "He reviews the grammar rules carefully and writes down helpful sample sentences.",
                            "translation": "Él repasa las reglas gramaticales con cuidado y anota oraciones de ejemplo útiles.",
                            "scene_context": "Reviewing rules"
                        },
                        {
                            "part_number": 3,
                            "text": "Learning new vocabulary step by step makes difficult topics feel completely approachable.",
                            "translation": "Aprender nuevo vocabulario paso a paso hace que los temas difíciles se sientan completamente accesibles.",
                            "scene_context": "Building confidence"
                        }
                    ]
                },
                {
                    "slide_number": 2,
                    "scene_title": "Oral Practice and Voice Training",
                    "scene_context": "Alex wearing headphones and speaking clearly into a desktop microphone",
                    "image_prompt": f"flat 2D vector educational illustration of Alex in his royal blue sweater wearing headphones and speaking clearly as he reads English notes, warm cozy study room, clean minimalist style, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "Alex puts on his wireless headphones and prepares to practice his oral pronunciation.",
                            "translation": "Alex se pone sus auriculares inalámbricos y se prepara para practicar su pronunciación oral.",
                            "scene_context": "Putting on headphones"
                        },
                        {
                            "part_number": 2,
                            "text": "He reads each phrase aloud with steady rhythm and listens to the native speaker model.",
                            "translation": "Él lee cada frase en voz alta con ritmo constante y escucha el modelo del hablante nativo.",
                            "scene_context": "Reading aloud"
                        },
                        {
                            "part_number": 3,
                            "text": "Hearing his own voice in English gives him immediate feedback and clarity.",
                            "translation": "Escuchar su propia voz en inglés le brinda retroalimentación inmediata y claridad.",
                            "scene_context": "Gaining vocal clarity"
                        }
                    ]
                },
                {
                    "slide_number": 3,
                    "scene_title": "Mastery and Confidence",
                    "scene_context": "Alex smiling proudly with notebook closed, feeling confident in his English skills",
                    "image_prompt": f"flat 2D vector educational illustration of Alex in his royal blue sweater giving a confident smile and thumbs up at his desk, bright uplifting room lighting, clean minimalist style, strictly no text, no words",
                    "chunks": [
                        {
                            "part_number": 1,
                            "text": "By the end of the lesson, Alex feels very proud of the progress he made.",
                            "translation": "Hacia el final de la lección, Alex se siente muy orgulloso del progreso que ha alcanzado.",
                            "scene_context": "Feeling proud of progress"
                        },
                        {
                            "part_number": 2,
                            "text": "He realizes that consistent daily practice transforms hesitation into fluent confidence.",
                            "translation": "Él se da cuenta de que la práctica diaria constante transforma la vacilación en fluida confianza.",
                            "scene_context": "Realizing the power of practice"
                        },
                        {
                            "part_number": 3,
                            "text": "With genuine dedication, speaking English fluently becomes a natural reality.",
                            "translation": "Con verdadera dedicación, hablar inglés con fluidez se convierte en una realidad natural.",
                            "scene_context": "Final uplifting takeaway"
                        }
                    ]
                }
            ]

        formatted_slides = []
        flat_chunks = []
        global_idx = 0

        for s_idx, s in enumerate(slides_data):
            slide_num = s["slide_number"]
            clean_img = sanitize_reading_image_prompt(s["image_prompt"], topic)
            slide_chunks = []
            for p_idx, ch in enumerate(s["chunks"]):
                global_idx += 1
                part_num = p_idx + 1
                chunk_id = f"slide-{slide_num}-part-{part_num}"
                annotated = annotate_sentence_words(ch["text"], targets)
                chunk_obj = {
                    "chunk_id": chunk_id,
                    "order": global_idx,
                    "slide_index": s_idx,
                    "part_number": part_num,
                    "text": ch["text"],
                    "translation": ch["translation"],
                    "scene_context": ch["scene_context"],
                    "has_new_image": p_idx == 0,
                    "image_prompt": clean_img,
                    "words": annotated
                }
                slide_chunks.append(chunk_obj)
                flat_chunks.append(chunk_obj)

            formatted_slides.append({
                "slide_id": f"slide-{slide_num}",
                "slide_number": slide_num,
                "scene_title": s["scene_title"],
                "scene_context": s["scene_context"],
                "image_prompt": clean_img,
                "chunks": slide_chunks
            })

        return {
            "title": title,
            "title_es": title_es,
            "topic": topic,
            "sublevel": sublevel,
            "character_bible": char_bible,
            "target_keywords": targets[:8],
            "slides": formatted_slides,
            "chunks": flat_chunks
        }

    def evaluate_reading_attempt(
        self,
        chunk_words: List[Dict[str, Any]],
        student_transcript: str
    ) -> dict:
        """
        Performs precise word-by-word evaluation of the student's spoken transcript
        against the expected chunk words.
        Returns detailed evaluation per word, overall score, accuracy percentage,
        and enforces the strict 80% minimum threshold for passing.
        """
        normalized_transcript = normalize_speech_text(student_transcript)
        spoken_tokens = [clean_token(w).lower() for w in normalized_transcript.split() if clean_token(w)]
        target_clean_tokens = [w.get("clean_word", "").lower() for w in chunk_words]

        matcher = difflib.SequenceMatcher(None, target_clean_tokens, spoken_tokens)
        matched_target_indices = set()

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                for idx in range(i1, i2):
                    matched_target_indices.add(idx)
            elif tag == 'replace':
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
        # 🎯 STRICT USER RULE: Minimum 80% score required to pass!
        is_passed = accuracy_percent >= 80

        if accuracy_percent >= 90:
            feedback = f"¡Excelente lectura y pronunciación fluida! Has dominado esta parte con {accuracy_percent}% de precisión."
        elif accuracy_percent >= 80:
            feedback = f"¡Aprobado con éxito! Pronunciaste {correct_count} de {total_words} palabras correctamente ({accuracy_percent}%). Superaste el 80% mínimo requerido."
        elif accuracy_percent >= 50:
            feedback = f"Buen intento ({accuracy_percent}%). Se requiere al menos 80% para desbloquear la siguiente escena. Toca las palabras en rojo para escuchar su fonética y reintenta."
        else:
            feedback = f"Precisión insuficiente ({accuracy_percent}%). Necesitas un mínimo de 80% para aprobar. Haz clic en cada palabra en rojo para escuchar su pronunciación antes de volver a grabar."

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
