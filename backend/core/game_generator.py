"""
Guionbajo — Educational Game Generator (Mystery Word & Twin Cards)
Orchestrates LLM prompts and deterministic pedagogical fallback banks to generate
dynamic interactive games aligned with the lesson topic, CEFR level, and grammar structures.
"""
import random
import json
import logging
import re
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI
from config import settings
from core.minimax_agent import clean_json_response

logger = logging.getLogger(__name__)

# ─── FALLBACK VOCABULARY & GAME BANKS BY LEVEL & THEME ─────────────────────────

FALLBACK_GAMES_BANK = {
    "A1": {
        "mystery_words": [
            {
                "target_word": "AIRPORT",
                "category": "Viajes y Lugares",
                "clue_definition": "Lugar grande con pistas de despegue donde las personas abordan aviones para viajar a otras ciudades.",
                "clue_synonym": "Familia léxica: airplane, terminal, flight, boarding pass. Colocación: 'at the airport'.",
                "image_prompt": "Clean flat 2D vector educational illustration of a modern airport departure terminal with airplanes on runway, sunny day, minimal style, vibrant colors, no text, no letters, no words.",
                "clue_first_letter": "La palabra empieza con la letra 'A' y tiene 7 letras.",
                "example_sentence": "We arrived at the airport two hours before our flight.",
                "example_translation": "Llegamos al aeropuerto dos horas antes de nuestro vuelo.",
                "tutor_clue_speeches": [
                    "¡Primera pista! Es un lugar donde despegas hacia nuevas aventuras.",
                    "Segunda pista: Se relaciona con aviones, terminales y maletas.",
                    "Mira la ilustración en pantalla. ¿Qué lugar representa?",
                    "Última pista: Empieza con la letra A y tiene 7 letras."
                ]
            },
            {
                "target_word": "BREAKFAST",
                "category": "Comida y Rutina",
                "clue_definition": "La primera comida que se toma por la mañana después de despertar.",
                "clue_synonym": "Familia léxica: morning, meal, eggs, coffee, cereal. Colocación: 'have breakfast'.",
                "image_prompt": "Clean flat 2D vector educational illustration of a tasty morning breakfast table with pancakes, orange juice and toast, bright sunny morning, minimal style, no text, no words.",
                "clue_first_letter": "La palabra empieza con la letra 'B' y tiene 9 letras.",
                "example_sentence": "I always have breakfast at seven o'clock in the morning.",
                "example_translation": "Siempre desayuno a las siete en punto de la mañana.",
                "tutor_clue_speeches": [
                    "¡Primera pista! Es la comida más importante al inicio del día.",
                    "Segunda pista: Se relaciona con café, jugo, huevos y la mañana.",
                    "Observa la imagen que preparé para ti.",
                    "Última pista: Comienza con la letra B y tiene 9 letras."
                ]
            },
            {
                "target_word": "PASSPORT",
                "category": "Documentos y Viajes",
                "clue_definition": "Documento oficial con foto emitido por un gobierno para poder viajar a otros países.",
                "clue_synonym": "Familia léxica: travel, border, stamp, identification. Colocación: 'valid passport'.",
                "image_prompt": "Clean flat 2D vector illustration of a travel passport document with visa stamps, plane tickets next to it, minimal colorful vector style, no text, no words.",
                "clue_first_letter": "La palabra empieza con la letra 'P' y tiene 8 letras.",
                "example_sentence": "You must show your passport at the immigration desk.",
                "example_translation": "Debes mostrar tu pasaporte en el mostrador de inmigración.",
                "tutor_clue_speeches": [
                    "Primera pista: Es un documento indispensable para cruzar fronteras.",
                    "Segunda pista: Lleva tu fotografía y sellos de viaje.",
                    "Mira la ilustración que acaba de aparecer en el tanque.",
                    "Última pista: Inicia con la letra P y tiene 8 letras."
                ]
            },
            {
                "target_word": "TEACHER",
                "category": "Profesiones y Escuela",
                "clue_definition": "Persona cuya profesión es enseñar y guiar a estudiantes en una escuela o curso.",
                "clue_synonym": "Familia léxica: classroom, school, student, learn. Colocación: 'English teacher'.",
                "image_prompt": "Clean 2D vector illustration of a friendly teacher in a bright classroom pointing to an educational board, warm vector style, no text, no words.",
                "clue_first_letter": "La palabra empieza con la letra 'T' y tiene 7 letras.",
                "example_sentence": "Our English teacher explains the grammar rules very clearly.",
                "example_translation": "Nuestro profesor de inglés explica las reglas gramaticales muy claramente.",
                "tutor_clue_speeches": [
                    "¡Pista 1! Es alguien que te ayuda a aprender cada día.",
                    "Pista 2: Trabaja en salones de clase y explica lecciones.",
                    "Observa la imagen didáctica en pantalla.",
                    "Pista final: Empieza con la letra T y tiene 7 letras."
                ]
            }
        ],
        "twin_card_pairs": [
            {
                "pair_id": "pair-1",
                "card_a": { "text": "Good morning", "icon": "🌅", "category": "Saludos", "translation": "Buenos días" },
                "card_b": { "text": "Buenos días", "icon": "☀️", "category": "Saludos", "translation": "Good morning" },
                "audio_phrase": "Good morning, nice to meet you!",
                "audio_translation": "¡Buenos días, un gusto conocerte!",
                "explanation": "'Good morning' es el saludo formal y amigable que se utiliza desde el amanecer hasta las 12:00 del mediodía."
            },
            {
                "pair_id": "pair-2",
                "card_a": { "text": "Thank you", "icon": "🙏", "category": "Cortesía", "translation": "Gracias" },
                "card_b": { "text": "Gracias", "icon": "✨", "category": "Cortesía", "translation": "Thank you" },
                "audio_phrase": "Thank you very much for your help.",
                "audio_translation": "Muchas gracias por tu ayuda.",
                "explanation": "'Thank you' es la fórmula universal en inglés para expresar gratitud y cortesía."
            },
            {
                "pair_id": "pair-3",
                "card_a": { "text": "See you later", "icon": "👋", "category": "Despedidas", "translation": "Hasta luego" },
                "card_b": { "text": "Hasta luego", "icon": "⏳", "category": "Despedidas", "translation": "See you later" },
                "audio_phrase": "Goodbye, see you later tomorrow!",
                "audio_translation": "¡Adiós, nos vemos más tarde mañana!",
                "explanation": "'See you later' se utiliza cuando te despides de alguien a quien esperas volver a ver pronto."
            },
            {
                "pair_id": "pair-4",
                "card_a": { "text": "My name is", "icon": "🪪", "category": "Presentaciones", "translation": "Mi nombre es" },
                "card_b": { "text": "Mi nombre es", "icon": "🗣️", "category": "Presentaciones", "translation": "My name is" },
                "audio_phrase": "Hello, my name is Alex and I am a student.",
                "audio_translation": "Hola, mi nombre es Alex y soy estudiante.",
                "explanation": "'My name is...' es la estructura básica para presentarte formal o informalmente en inglés."
            },
            {
                "pair_id": "pair-5",
                "card_a": { "text": "Please", "icon": "🤝", "category": "Cortesía", "translation": "Por favor" },
                "card_b": { "text": "Por favor", "icon": "🪄", "category": "Cortesía", "translation": "Please" },
                "audio_phrase": "Could you help me with this exercise, please?",
                "audio_translation": "¿Podrías ayudarme con este ejercicio, por favor?",
                "explanation": "'Please' es la palabra clave de cortesía para realizar solicitudes de manera amable."
            },
            {
                "pair_id": "pair-6",
                "card_a": { "text": "You are welcome", "icon": "😊", "category": "Cortesía", "translation": "De nada" },
                "card_b": { "text": "De nada", "icon": "🌟", "category": "Cortesía", "translation": "You are welcome" },
                "audio_phrase": "You are very welcome, anytime!",
                "audio_translation": "¡De nada, cuando quieras!",
                "explanation": "'You are welcome' es la respuesta estándar y educada ante un agradecimiento ('Thank you')."
            },
            {
                "pair_id": "pair-7",
                "card_a": { "text": "How are you?", "icon": "💬", "category": "Preguntas", "translation": "¿Cómo estás?" },
                "card_b": { "text": "¿Cómo estás?", "icon": "❤️", "category": "Preguntas", "translation": "How are you?" },
                "audio_phrase": "How are you doing today?",
                "audio_translation": "¿Cómo estás hoy?",
                "explanation": "'How are you?' es la pregunta de apertura para indagar sobre el estado de la otra persona."
            },
            {
                "pair_id": "pair-8",
                "card_a": { "text": "Nice to meet you", "icon": "🤝", "category": "Saludos", "translation": "Mucho gusto" },
                "card_b": { "text": "Mucho gusto", "icon": "🎉", "category": "Saludos", "translation": "Nice to meet you" },
                "audio_phrase": "It is very nice to meet you, welcome!",
                "audio_translation": "¡Es un gran placer conocerte, bienvenido!",
                "explanation": "'Nice to meet you' se utiliza exclusivamente al conocer a alguien por primera vez."
            }
        ]
    },
    "A2": {
        "mystery_words": [
            {
                "target_word": "YESTERDAY",
                "category": "Marcadores de Tiempo Pasado",
                "clue_definition": "El día inmediatamente anterior al día de hoy.",
                "clue_synonym": "Familia léxica: past, time, morning, last night. Colocación: 'yesterday afternoon'.",
                "image_prompt": "Clean 2D vector educational calendar illustration showing a past highlighted day marked with a checkmark, clean vector art, no text, no words.",
                "clue_first_letter": "La palabra empieza con la letra 'Y' y tiene 9 letras.",
                "example_sentence": "Yesterday I visited my grandparents and watched a movie.",
                "example_translation": "Ayer visité a mis abuelos y vi una película.",
                "tutor_clue_speeches": [
                    "Pista 1: Es un marcador temporal que nos lleva al pasado reciente.",
                    "Pista 2: Se refiere al día que terminó hace unas horas.",
                    "Revisa la ilustración que apareció en la pantalla.",
                    "Pista final: Comienza con la letra Y y tiene 9 letras."
                ]
            },
            {
                "target_word": "RESTAURANT",
                "category": "Lugares y Comida",
                "clue_definition": "Establecimiento público donde las personas van a pagar para ordenar, sentarse y comer comida preparada.",
                "clue_synonym": "Familia léxica: menu, waiter, order, chef, bill. Colocación: 'Italian restaurant'.",
                "image_prompt": "2D clean vector flat art of a cozy dining restaurant with tables, ambient lighting and a waiter carrying a tray, no text, no words.",
                "clue_first_letter": "La palabra empieza con la letra 'R' y tiene 10 letras.",
                "example_sentence": "We booked a table at our favorite Italian restaurant.",
                "example_translation": "Reservamos una mesa en nuestro restaurante italiano favorito.",
                "tutor_clue_speeches": [
                    "Pista 1: Un lugar público donde disfrutas deliciosos platillos con menú y meseros.",
                    "Pista 2: Vocabulario vinculado: waiter, order, menu, table.",
                    "Observa el dibujo que acabo de crear para ti.",
                    "Pista final: Inicia con R y tiene 10 letras."
                ]
            }
        ],
        "twin_card_pairs": [
            {
                "pair_id": "pair-a2-1",
                "card_a": { "text": "Went", "icon": "🚶", "category": "Verbo Pasado", "translation": "Fui / Fue" },
                "card_b": { "text": "Past of GO", "icon": "➡️", "category": "Gramática", "translation": "Pasado de Ir" },
                "audio_phrase": "Last weekend, we went to the beach together.",
                "audio_translation": "El fin de semana pasado, fuimos juntos a la playa.",
                "explanation": "'Went' es la forma irregular en pasado simple del verbo 'Go' (ir)."
            },
            {
                "pair_id": "pair-a2-2",
                "card_a": { "text": "Bigger than", "icon": "🐘", "category": "Comparativos", "translation": "Más grande que" },
                "card_b": { "text": "Más grande que", "icon": "📐", "category": "Comparativos", "translation": "Bigger than" },
                "audio_phrase": "An elephant is much bigger than a lion.",
                "audio_translation": "Un elefante es mucho más grande que un león.",
                "explanation": "Para adjetivos cortos de 1 sílaba terminados en C-V-C, duplicamos la consonante y añadimos '-er than'."
            },
            {
                "pair_id": "pair-a2-3",
                "card_a": { "text": "Could", "icon": "💡", "category": "Verbo Modal", "translation": "Podía / Pude" },
                "card_b": { "text": "Past ability", "icon": "🏃", "category": "Gramática", "translation": "Habilidad en pasado" },
                "audio_phrase": "When I was young, I could run very fast.",
                "audio_translation": "Cuando era joven, podía correr muy rápido.",
                "explanation": "'Could' expresa habilidad o capacidad física/mental en tiempo pasado."
            },
            {
                "pair_id": "pair-a2-4",
                "card_a": { "text": "Bought", "icon": "🛍️", "category": "Verbo Pasado", "translation": "Compré / Compró" },
                "card_b": { "text": "Past of BUY", "icon": "🏷️", "category": "Gramática", "translation": "Pasado de Comprar" },
                "audio_phrase": "She bought a new jacket at the shopping mall.",
                "audio_translation": "Ella compró una chaqueta nueva en el centro comercial.",
                "explanation": "'Bought' es el pasado simple irregular de 'Buy' (comprar)."
            },
            {
                "pair_id": "pair-a2-5",
                "card_a": { "text": "More expensive", "icon": "💎", "category": "Comparativos", "translation": "Más caro" },
                "card_b": { "text": "Más costoso", "icon": "💰", "category": "Comparativos", "translation": "More expensive" },
                "audio_phrase": "Gold is more expensive than silver.",
                "audio_translation": "El oro es más costoso que la plata.",
                "explanation": "Los adjetivos largos de 3 o más sílabas forman el comparativo anteponiendo 'more'."
            },
            {
                "pair_id": "pair-a2-6",
                "card_a": { "text": "Should", "icon": "🩺", "category": "Consejos", "translation": "Deberías" },
                "card_b": { "text": "Advice / Consejo", "icon": "🎯", "category": "Gramática", "translation": "Should" },
                "audio_phrase": "You should drink plenty of water every day.",
                "audio_translation": "Deberías beber abundante agua todos los días.",
                "explanation": "'Should' es el verbo modal principal para ofrecer sugerencias y recomendaciones amables."
            }
        ]
    },
    "B1": {
        "mystery_words": [
            {
                "target_word": "EXPERIENCE",
                "category": "Vida y Present Perfect",
                "clue_definition": "Conocimiento o habilidad práctica adquirida a través de la vivencia directa de eventos a lo largo del tiempo.",
                "clue_synonym": "Familia léxica: knowledge, background, skill, trial. Colocación: 'work experience', 'have experience'.",
                "image_prompt": "Clean 2D vector flat art of a young professional climbing stairs towards goals, achieving milestones, bright vector style, no text, no words.",
                "clue_first_letter": "La palabra empieza con la letra 'E' y tiene 10 letras.",
                "example_sentence": "Traveling abroad gives you unforgettable life experience.",
                "example_translation": "Viajar al extranjero te brinda una experiencia de vida inolvidable.",
                "tutor_clue_speeches": [
                    "Pista 1: Aquello que acumulas al vivir situaciones y superar desafíos.",
                    "Pista 2: Es clave en entrevistas de trabajo y en el Present Perfect.",
                    "Mira la ilustración generada para inspirarte.",
                    "Pista final: Comienza con la letra E y tiene 10 letras."
                ]
            }
        ],
        "twin_card_pairs": [
            {
                "pair_id": "pair-b1-1",
                "card_a": { "text": "Have been to", "icon": "🗺️", "category": "Present Perfect", "translation": "He visitado y regresado" },
                "card_b": { "text": "Visited and returned", "icon": "🔄", "category": "Gramática", "translation": "Have been to" },
                "audio_phrase": "I have been to Paris twice in my life.",
                "audio_translation": "He estado en París dos veces en mi vida.",
                "explanation": "'Have been to' indica una experiencia de viaje ya completada donde la persona ya regresó."
            },
            {
                "pair_id": "pair-b1-2",
                "card_a": { "text": "Have gone to", "icon": "✈️", "category": "Present Perfect", "translation": "Se fue y aún está allá" },
                "card_b": { "text": "Still there now", "icon": "📍", "category": "Gramática", "translation": "Have gone to" },
                "audio_phrase": "Maria has gone to Italy for her vacation; she is still there.",
                "audio_translation": "María se ha ido a Italia de vacaciones; todavía está allá.",
                "explanation": "'Have gone to' significa que la persona viajó al lugar y todavía permanece allí."
            },
            {
                "pair_id": "pair-b1-3",
                "card_a": { "text": "Since 2020", "icon": "📅", "category": "Marcadores", "translation": "Punto de inicio específico" },
                "card_b": { "text": "Specific starting point", "icon": "🎯", "category": "Gramática", "translation": "Since" },
                "audio_phrase": "I have worked at this company since 2020.",
                "audio_translation": "He trabajado en esta empresa desde 2020.",
                "explanation": "'Since' se combina con un punto temporal exacto en el pasado (año, fecha, hora)."
            },
            {
                "pair_id": "pair-b1-4",
                "card_a": { "text": "For 5 years", "icon": "⏳", "category": "Marcadores", "translation": "Duración de tiempo" },
                "card_b": { "text": "Duration of time", "icon": "⏱️", "category": "Gramática", "translation": "For" },
                "audio_phrase": "They have lived in London for five years.",
                "audio_translation": "Ellos han vivido en Londres durante cinco años.",
                "explanation": "'For' expresa la extensión total o duración del período transcurrido."
            },
            {
                "pair_id": "pair-b1-5",
                "card_a": { "text": "Although", "icon": "⚖️", "category": "Conectores", "translation": "A pesar de que / Aunque" },
                "card_b": { "text": "Contrast connector", "icon": "🔗", "category": "Gramática", "translation": "Although" },
                "audio_phrase": "Although it rained heavily, we enjoyed our picnic.",
                "audio_translation": "Aunque llovió intensamente, disfrutamos nuestro pícnic.",
                "explanation": "'Although' introduce una cláusula de contraste o concesión entre dos ideas subordinadas."
            },
            {
                "pair_id": "pair-b1-6",
                "card_a": { "text": "If I study...", "icon": "📚", "category": "Primer Condicional", "translation": "Causa real futura" },
                "card_b": { "text": "...I will pass", "icon": "🏆", "category": "Consecuencia", "translation": "...aprobaré" },
                "audio_phrase": "If you study hard, you will pass the English exam.",
                "audio_translation": "Si estudias con dedicación, aprobarás el examen de inglés.",
                "explanation": "El First Conditional une 'If + Present Simple' con 'Future Simple (will)' para consecuencias reales."
            }
        ]
    }
}


class GameGenerator:
    """
    Orchestrates the generation of educational mini-games:
    1. Mystery Word (reactive tank, 4 clue layers, image prompts).
    2. Twin Cards (3D paired memory cards, audio phrases, pedagogical explanations).
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.MINIMAX_API_KEY
        self.model = settings.MINIMAX_LLM_MODEL
        if self.api_key:
            try:
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=settings.MINIMAX_BASE_URL,
                    timeout=45.0,
                )
            except Exception as e:
                logger.warning(f"Failed to initialize AsyncOpenAI in GameGenerator: {e}")
                self.client = None
        else:
            self.client = None

    def _get_level_key(self, sublevel: str) -> str:
        if not sublevel:
            return "A1"
        sub = sublevel.upper()
        if "B2" in sub or "B1" in sub:
            return "B1"
        if "A2" in sub:
            return "A2"
        return "A1"

    def _get_fallback_mystery_word(self, topic: str, sublevel: str) -> Dict[str, Any]:
        level_key = self._get_level_key(sublevel)
        bank = FALLBACK_GAMES_BANK.get(level_key, FALLBACK_GAMES_BANK["A1"])
        words = bank.get("mystery_words", FALLBACK_GAMES_BANK["A1"]["mystery_words"])
        chosen = random.choice(words)
        return dict(chosen)

    def _get_fallback_twin_cards(self, topic: str, sublevel: str, pair_count: int = 6) -> List[Dict[str, Any]]:
        level_key = self._get_level_key(sublevel)
        bank = FALLBACK_GAMES_BANK.get(level_key, FALLBACK_GAMES_BANK["A1"])
        all_pairs = list(bank.get("twin_card_pairs", FALLBACK_GAMES_BANK["A1"]["twin_card_pairs"]))
        
        # Ensure pair_count is even and at least 6
        target_count = max(6, pair_count)
        if target_count % 2 != 0:
            target_count += 1

        # If bank has fewer pairs than needed, duplicate or pool from other levels
        if len(all_pairs) < target_count:
            extra = FALLBACK_GAMES_BANK["A1"]["twin_card_pairs"] + FALLBACK_GAMES_BANK["A2"]["twin_card_pairs"]
            for item in extra:
                if len(all_pairs) >= target_count:
                    break
                if item not in all_pairs:
                    all_pairs.append(item)

        selected = all_pairs[:target_count]
        return selected

    async def generate_mystery_word(self, topic: str, sublevel: str, lesson_script: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Generate a Mystery Word challenge with 4-tier clues, image prompt and contextual example.
        """
        if not self.client or not self.api_key:
            return self._get_fallback_mystery_word(topic, sublevel)

        level_desc = sublevel or "A1.1"
        is_a_level = sublevel.startswith("A1") or sublevel.startswith("A2")

        system_prompt = (
            "You are an expert CEFR English teacher. Design a 'Mystery Word' game challenge.\n"
            "Output MUST be valid JSON only."
        )

        user_prompt = f"""Generate a single target vocabulary word challenge based on:
Topic: {topic}
CEFR Level: {sublevel}

CRITICAL RULES:
1. "target_word": Exactly ONE English word (uppercase, 4 to 10 letters, no spaces, no hyphen, no numbers).
2. "category": 2-3 words category name in Spanish (e.g. "Viajes y Aeropuerto", "Rutina Diaria").
3. "clue_definition": Clear pedagogical definition in Spanish WITHOUT containing the target word itself or its direct lexical root.
4. "clue_synonym": Lexical family, synonyms, and grammatical collocations in Spanish/English.
5. "image_prompt": Rich 2D flat vector educational illustration description in English, starting with "Clean flat 2D vector illustration of..." and ending with "no text, no letters, no words".
6. "clue_first_letter": Sentence in Spanish stating the first letter and character count (e.g. "La palabra empieza con la letra 'X' y tiene N letras.").
7. "example_sentence": Natural English application sentence using the target word.
8. "example_translation": Natural Spanish translation of the example sentence.
9. "tutor_clue_speeches": Array of 4 encouraging short voice commentary lines in Spanish that the tutor will speak out loud when each clue tier is unlocked.

Return JSON schema:
{{
  "target_word": "AIRPORT",
  "category": "Viajes y Lugares",
  "clue_definition": "...",
  "clue_synonym": "...",
  "image_prompt": "...",
  "clue_first_letter": "...",
  "example_sentence": "...",
  "example_translation": "...",
  "tutor_clue_speeches": ["Pista 1...", "Pista 2...", "Pista 3...", "Pista 4..."]
}}
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                extra_body={"thinking": {"type": "disabled"}},
            )
            raw = response.choices[0].message.content or "{}"
            data = clean_json_response(raw)

            # Validate fields
            if not data.get("target_word") or len(str(data["target_word"]).strip()) < 3:
                return self._get_fallback_mystery_word(topic, sublevel)

            data["target_word"] = re.sub(r'[^A-Z]', '', str(data["target_word"]).upper().strip())
            if not data.get("clue_first_letter"):
                data["clue_first_letter"] = f"La palabra empieza con '{data['target_word'][0]}' y tiene {len(data['target_word'])} letras."

            if not data.get("tutor_clue_speeches") or len(data["tutor_clue_speeches"]) < 4:
                data["tutor_clue_speeches"] = [
                    f"¡Primera pista! Revisa la definición en pantalla.",
                    f"Segunda pista: Observa los sinónimos y familia léxica.",
                    f"Mira la imagen generada por IA para descifrar la palabra.",
                    f"Última pista de auxilio: {data['clue_first_letter']}"
                ]

            return data
        except Exception as e:
            logger.warning(f"Error generating mystery word via LLM: {e}. Using rich fallback bank.")
            return self._get_fallback_mystery_word(topic, sublevel)

    async def generate_twin_cards(
        self, topic: str, sublevel: str, pair_count: int = 6, lesson_script: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate strict symmetric paired cards (card_a and card_b) for the Twin Cards 3D game.
        """
        pair_count = max(6, pair_count)
        if pair_count % 2 != 0:
            pair_count += 1

        if not self.client or not self.api_key:
            return self._get_fallback_twin_cards(topic, sublevel, pair_count)

        system_prompt = (
            "You are an expert English teacher. Design a paired card matching game (Cartas Gemelas / Twin Cards).\n"
            "Output MUST be valid JSON only."
        )

        user_prompt = f"""Design exactly {pair_count} conceptual card pairs for:
Topic: {topic}
CEFR Sublevel: {sublevel}

STRICT SYMMETRY & GAMEPLAY RULES:
1. Generate an array "pairs" containing exactly {pair_count} pair objects.
2. For each pair:
   - "pair_id": unique string (e.g. "p-1", "p-2", etc.).
   - "card_a": {{"text": "Short English phrase/word (1-4 words)", "icon": "emoji icon", "category": "Category tag", "translation": "Spanish translation"}}
   - "card_b": {{"text": "Matching Spanish translation or English counterpart", "icon": "matching emoji", "category": "Category tag", "translation": "English counterpart"}}
   - "audio_phrase": A complete natural English sentence (5-10 words) exemplifying the concept to be pronounced with audio TTS.
   - "audio_translation": Spanish translation of the audio_phrase.
   - "explanation": Concise 1-2 sentence pedagogical explanation of why card_a and card_b match and how to use them.

Return JSON schema:
{{
  "pairs": [
    {{
      "pair_id": "p-1",
      "card_a": {{ "text": "Good morning", "icon": "🌅", "category": "Saludos", "translation": "Buenos días" }},
      "card_b": {{ "text": "Buenos días", "icon": "☀️", "category": "Saludos", "translation": "Good morning" }},
      "audio_phrase": "Good morning, how are you today?",
      "audio_translation": "Buenos días, ¿cómo estás hoy?",
      "explanation": "'Good morning' se usa formal e informalmente desde el amanecer hasta el mediodía."
    }}
  ]
}}
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                extra_body={"thinking": {"type": "disabled"}},
            )
            raw = response.choices[0].message.content or "{}"
            data = clean_json_response(raw)
            pairs = data.get("pairs", [])

            if isinstance(pairs, list) and len(pairs) >= 6:
                # Ensure each pair has all required fields
                sanitized = []
                for idx, p in enumerate(pairs[:pair_count]):
                    if not p.get("card_a") or not p.get("card_b"):
                        continue
                    p_id = p.get("pair_id") or f"p-{idx+1}"
                    card_a = p["card_a"]
                    card_b = p["card_b"]
                    sanitized.append({
                        "pair_id": p_id,
                        "card_a": {
                            "text": str(card_a.get("text", "Word")),
                            "icon": card_a.get("icon", "✨"),
                            "category": card_a.get("category", topic),
                            "translation": card_a.get("translation", ""),
                        },
                        "card_b": {
                            "text": str(card_b.get("text", "Palabra")),
                            "icon": card_b.get("icon", "🎯"),
                            "category": card_b.get("category", topic),
                            "translation": card_b.get("translation", ""),
                        },
                        "audio_phrase": str(p.get("audio_phrase", card_a.get("text", "Hello"))),
                        "audio_translation": str(p.get("audio_translation", card_b.get("text", "Hola"))),
                        "explanation": str(p.get("explanation", "Par conceptual clave de la lección.")),
                    })
                if len(sanitized) >= 6:
                    return sanitized

            return self._get_fallback_twin_cards(topic, sublevel, pair_count)
        except Exception as e:
            logger.warning(f"Error generating twin cards via LLM: {e}. Using rich fallback bank.")
            return self._get_fallback_twin_cards(topic, sublevel, pair_count)
