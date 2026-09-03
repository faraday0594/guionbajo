"""
Guionbajo — Curated High-Pedagogy Lesson Fallbacks Catalog
Provides authentic CEFR lessons with deep grammatical explanations,
meaningful English sentence models, relatable human visual scenes, and zero placeholder text.
"""
import re
from typing import Optional, Dict, Any
from core.curriculum_graph import CURRICULUM_GRAPH


def find_curriculum_node(topic: str, sublevel: Optional[str] = None) -> Optional[dict]:
    """Finds the curriculum class node for a given topic and sublevel."""
    if not topic:
        return None
    topic_lower = topic.strip().lower()

    if sublevel and sublevel in CURRICULUM_GRAPH:
        for c in CURRICULUM_GRAPH[sublevel].get("classes", []):
            if c.get("topic", "").strip().lower() == topic_lower:
                return c

    for sl, sdata in CURRICULUM_GRAPH.items():
        for c in sdata.get("classes", []):
            c_topic = c.get("topic", "").strip().lower()
            if c_topic == topic_lower or (len(topic_lower) > 5 and (topic_lower in c_topic or c_topic in topic_lower)):
                return c
    return None


def build_curated_fallback(topic: str, sublevel: str, is_a_level: bool) -> dict:
    """Dispatches to the dedicated, highly-calibrated fallback builder for any CEFR curriculum topic."""
    low = topic.lower()

    # 1. Direct Topic Dispatchers
    if "irregular past" in low or ("irregular" in low and "past" in low) or ("past" in low and "question" in low):
        data = _build_irregular_past_fallback(sublevel)
    elif "was / were" in low or "was/were" in low or "regular verb" in low or ("past simple" in low and "regular" in low):
        data = _build_past_simple_fallback(sublevel)
    elif "going to" in low or ("future" in low and "plan" in low):
        data = _build_future_going_to_fallback(sublevel)
    elif "will" in low and "future" in low:
        data = _build_future_fallback(sublevel)
    elif "can & abilities" in low or "can &" in low or ("can" in low and "abilit" in low):
        data = _build_can_abilities_fallback(sublevel)
    elif "there is" in low or "there are" in low or "places &" in low or "place" in low:
        data = _build_there_is_there_are_fallback(sublevel)
    elif "do / does" in low or "do/does" in low or ("question" in low and "negative" in low):
        data = _build_do_does_questions_fallback(sublevel)
    elif "a1.2 integration" in low or ("integration" in low and ("a1.2" in sublevel.lower() or "a1.2" in low)):
        data = _build_a1_2_integration_fallback(sublevel)
    elif "time & frequency" in low or "adverbs of frequency" in low or "frequency" in low:
        data = _build_time_frequency_fallback(sublevel)
    elif "objects & possession" in low or "demonstrative" in low or ("object" in low and "possession" in low):
        data = _build_objects_possession_fallback(sublevel)
    elif "personal info" in low or ("personal" in low and "information" in low):
        data = _build_personal_info_fallback(sublevel)
    elif "english sounds & introductions" in low or "sound" in low or "greeting" in low or "introduction" in low or "saludo" in low:
        data = _build_greetings_fallback(sublevel)
    elif "number" in low or "número" in low or "clock" in low:
        data = _build_numbers_fallback(sublevel)
    elif "quantit" in low or "countable" in low or "uncountable" in low or "much" in low or "many" in low or "some / any" in low:
        data = _build_quantities_fallback(sublevel)
    elif "comparative" in low or "comparativ" in low:
        data = _build_comparatives_fallback(sublevel)
    elif "superlative" in low or "superlativ" in low:
        data = _build_superlatives_fallback(sublevel)
    elif "past continuous" in low or "interrupted" in low:
        data = _build_past_continuous_fallback(sublevel)
    elif "present perfect vs past simple" in low:
        data = _build_present_perfect_vs_past_simple_fallback(sublevel)
    elif "present perfect" in low or "experience" in low or "have been" in low:
        data = _build_present_perfect_fallback(sublevel)
    elif "present continuous" in low or "progressive" in low:
        data = _build_present_continuous_fallback(sublevel)
    elif "first conditional" in low or ("conditional" in low and "1" in low):
        data = _build_conditionals_fallback(sublevel)
    elif "second conditional" in low or ("conditional" in low and "2" in low):
        data = _build_second_conditional_fallback(sublevel)
    elif "third conditional" in low or ("conditional" in low and "3" in low):
        data = _build_third_conditional_fallback(sublevel)
    elif "wish" in low or "regret" in low:
        data = _build_wish_regret_fallback(sublevel)
    elif "passive" in low:
        data = _build_passive_voice_fallback(sublevel)
    elif "reported speech" in low:
        data = _build_reported_speech_fallback(sublevel)
    elif "relative" in low:
        data = _build_relative_clauses_fallback(sublevel)
    elif "logic of out" in low or ("phrasal" in low and ("out" in low or "up" in low or "b1.2" in sublevel.lower())):
        data = _build_phrasal_verbs_out_up_fallback(sublevel)
    elif "off, on" in low or ("phrasal" in low and ("off" in low or "away" in low or "back" in low or "b1.4" in sublevel.lower())):
        data = _build_phrasal_verbs_off_on_fallback(sublevel)
    elif "three-part" in low or "multi-particle" in low or "separability" in low or ("phrasal" in low and "b2" in sublevel.lower()):
        data = _build_phrasal_verbs_advanced_fallback(sublevel)
    elif "phrasal" in low or "particle" in low:
        data = _build_phrasal_verbs_spatial_fallback(sublevel)
    elif "deduction" in low or "must be" in low or "can't be" in low:
        data = _build_modals_deduction_fallback(sublevel)
    elif "advice" in low or "obligation" in low or "should" in low or "must" in low or "have to" in low:
        data = _build_modals_advice_fallback(sublevel)
    elif "routine" in low or "rutina" in low or "daily" in low:
        data = _build_routines_fallback(sublevel)
    elif "past simple" in low or "pasado simple" in low or "did" in low:
        data = _build_past_simple_fallback(sublevel)
    elif "narrative" in low or "storytelling" in low or "past perfect" in low:
        data = _build_narrative_tenses_fallback(sublevel)
    else:
        # Check if matched in curriculum graph
        node = find_curriculum_node(topic, sublevel)
        if node:
            data = _build_curriculum_node_fallback(node, sublevel)
        else:
            data = _build_generic_interactive_fallback(topic, sublevel, is_a_level)

    data["topic"] = topic
    data["sublevel"] = sublevel
    data["level"] = sublevel.split(".")[0]
    data["subject"] = "English"
    return data


def _build_irregular_past_fallback(sublevel: str) -> dict:
    """Comprehensive fallback for A1.4: Irregular Past & Questions."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Irregular Past & Questions",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Verbos Irregulares y la Máquina del Tiempo",
                "tutor_says": "¡Bienvenido a la clase de Pasado Irregular y Preguntas! A diferencia de los verbos regulares que solo añaden '-ed', los verbos irregulares son como camaleones: cambian su forma interna por completo para viajar al pasado. Por ejemplo, 'go' (ir) se convierte en 'went', 'see' (ver) pasa a ser 'saw', 'have' (tener) cambia a 'had', 'eat' (comer) se transforma en 'ate' y 'buy' (comprar) pasa a ser 'bought'. Fíjate en la oración modelo: 'Yesterday I went to the cinema and saw a great movie'.",
                "board_content": "📸 VERBOS IRREGULARES EN PASADO (CAMALEONES):\n\n• go (ir) → went (fui / fue)\n• see (ver) → saw (vi / vio)\n• have (tener) → had (tuve / tuvo)\n• eat (comer) → ate (comí / comió)\n• buy (comprar) → bought (compré / compró)\n\n👉 Oración Afirmativa Modelo:\n\"Yesterday I went to the cinema and saw a great movie.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student enthusiastically storytelling to friends about a weekend trip in a cozy modern cafe, expressive character poses, warm cinematic lighting, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "I went / I saw / I bought",
                "target_audio_items": [
                    {"english": "Yesterday I went to the cinema", "translation": "Ayer fui al cine", "label": "Verbo Irregular V2"},
                    {"english": "I saw a great movie", "translation": "Vi una gran película", "label": "Verbo Irregular V2"},
                    {"english": "I bought a new book", "translation": "Compré un libro nuevo", "label": "Verbo Irregular V2"}
                ],
                "grammar_structure": {
                    "title": "Estructura del Pasado Irregular Afirmativo",
                    "formula": "[ Sujeto ] + [ Verbo Irregular (V2) ] + [ Complemento ] + [ Expresión de Tiempo ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / We / They", "color": "blue"},
                        {"role": "Verbo V2", "pattern": "went / saw / had / bought / ate", "color": "purple"},
                        {"role": "Complemento", "pattern": "to the park / a movie / pizza", "color": "emerald"},
                        {"role": "Tiempo", "pattern": "yesterday / last night / last week", "color": "amber"}
                    ],
                    "explanation": "En oraciones afirmativas en pasado, usamos la forma irregular V2 directamente con todos los sujetos sin cambiar.",
                    "example_breakdowns": [
                        {
                            "english": "Yesterday I went to the cinema.",
                            "spanish": "Ayer fui al cine.",
                            "parts": [
                                {"role": "Tiempo", "text": "Yesterday", "color": "amber"},
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Verbo V2", "text": "went", "color": "purple"},
                                {"role": "Complemento", "text": "to the cinema", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "Los verbos irregulares no llevan '-ed'; memoriza su forma V2 (go→went, buy→bought, see→saw)."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Preguntas y Negaciones: El Detective Did",
                "tutor_says": "Para formular preguntas y negaciones en pasado simple, entra en acción nuestro héroe auxiliar: el detective 'Did' o 'Didn't'. Como 'Did' ya lleva la marca del pasado sobre sus hombros, el verbo principal regresa mágicamente a su forma base pura (V1). Decimos 'Did you go?' y NUNCA 'Did you went?'. Para negar: 'I didn't see him' y NUNCA 'I didn't saw'. ¡Observa las tres fórmulas en la pizarra!",
                "board_content": "⚡ FÓRMULAS DE PREGUNTAS Y NEGACIONES CON DID:\n\n• Pregunta Sí/No (?) → [ Did ] + [ Sujeto ] + [ Verbo Base V1 ] ?\n  → \"Did you see the movie?\" (¿Viste la película?)\n\n• Pregunta con Wh- (?) → [ Wh- ] + [ did ] + [ Sujeto ] + [ Verbo Base V1 ] ?\n  → \"Where did you go yesterday?\" (¿Adónde fuiste ayer?)\n\n• Negativa (-) → [ Sujeto ] + [ didn't ] + [ Verbo Base V1 ]\n  → \"I didn't buy the ticket\" (No compré el boleto)\n\n📌 Regla de Oro: Did / Didn't absorbe el pasado; el verbo vuelve a su forma base.",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of a young student holding a magnifying glass examining a travel diary and airplane tickets, bright colorful classroom, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Did + Subject + Base Verb?",
                "target_audio_items": [
                    {"english": "Did you see the movie?", "translation": "¿Viste la película?", "label": "Pregunta con Did"},
                    {"english": "Where did you go yesterday?", "translation": "¿Adónde fuiste ayer?", "label": "Pregunta Wh-"},
                    {"english": "I didn't buy the ticket", "translation": "No compré el boleto", "label": "Negación didn't"}
                ],
                "grammar_structure": {
                    "title": "Fórmula Maestra de Preguntas con Did",
                    "formula": "[ Did / Wh- + did ] + [ Sujeto ] + [ Verbo en Forma Base (V1) ] + [ Complemento ] ?",
                    "formula_tokens": [
                        {"role": "Auxiliar", "pattern": "Did / Where did / What did", "color": "purple"},
                        {"role": "Sujeto", "pattern": "you / she / they / he", "color": "blue"},
                        {"role": "Verbo Base", "pattern": "go / see / eat / buy / do", "color": "amber"},
                        {"role": "Complemento", "pattern": "yesterday / last weekend", "color": "emerald"}
                    ],
                    "explanation": "El auxiliar 'Did' transporta la oración al pasado, por lo que el verbo principal DEBE quedarse en forma base (go, see, buy).",
                    "example_breakdowns": [
                        {
                            "english": "Did you go to the party?",
                            "spanish": "¿Fuiste a la fiesta?",
                            "parts": [
                                {"role": "Auxiliar", "text": "Did", "color": "purple"},
                                {"role": "Sujeto", "text": "you", "color": "blue"},
                                {"role": "Verbo Base", "text": "go", "color": "amber"},
                                {"role": "Complemento", "text": "to the party?", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "Error gravísimo: Nunca pongas dos pasados juntos ('Did you went?' es incorrecto; lo correcto es 'Did you go?')."
                }
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto de Pronunciación: Enlace \"Did you\" (/dɪdʒuː/)",
                "tutor_says": "En el inglés hablado cotidiano, cuando 'did' se junta con 'you', los hablantes nativos enlazan la 'd' final con la 'y' creando un sonido suave como /dɪdʒuː/ ('did-joo'). Escucha la pregunta modelo 'What did you do last weekend?' y practica conectando las palabras con naturalidad usando tu micrófono.",
                "board_content": "🗣️ RETO FONÉTICO: ENLACE SUAVE EN DID YOU:\n\n• \"What did you do last weekend?\"\n(Traducción: ¿Qué hiciste el fin de semana pasado?)\n\nClave de articulación:\n• 'Did you' se pronuncia enlazado: /dɪdʒuː/ ('did-joo')\n• 'bought' se pronuncia /bɔːt/ (la 'gh' es muda)\n• 'saw' se pronuncia /sɔː/",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student speaking into a studio microphone with headphones on, laptop with soundwaves, warm vibrant colors, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con fluidez: 'What did you do last weekend?'",
                "expected_answer": "What did you do last weekend?",
                "key_structure": "Connected Speech: Did you /dɪdʒuː/",
                "target_audio_items": [
                    {"english": "What did you do last weekend?", "translation": "¿Qué hiciste el fin de semana pasado?", "label": "Pregunta Fluida"},
                    {"english": "I bought a new book yesterday", "translation": "Compré un libro nuevo ayer", "label": "Pronunciación /bɔːt/"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Detección y Corrección: La Trampa del Doble Pasado",
                "tutor_says": "La trampa número uno de los hispanohablantes es duplicar el pasado diciendo 'Did you went?' o 'I didn't had time'. Recuerda: 'Did' y 'Didn't' ya hacen todo el trabajo de indicar pasado, por lo que el verbo principal DEBE regresar a su forma base 'go' y 'have'. Observa el duelo de oraciones en la pizarra y corrige la frase en el desafío.",
                "board_content": "⚔️ DUELO DE CONCEPTOS: ¿DOBLE PASADO?\n\n❌ Incorrecto: \"Did you went to the party yesterday?\"\n✅ Correcto: \"Did you go to the party yesterday?\"\n\n❌ Incorrecto: \"I didn't saw the movie.\"\n✅ Correcto: \"I didn't see the movie.\"\n\n❌ Incorrecto: \"Where did you bought that?\"\n✅ Correcto: \"Where did you buy that?\"\n\n📌 Regla: Tras Did o Didn't, usa SIEMPRE el verbo en forma base (V1).",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D illustration of an interactive study table with glowing green checkmarks and red crossed-out mistakes, warm studio lighting, highly detailed, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige el verbo 'went' tras Did: 'Did you went to the party?'",
                "expected_answer": "Did you go to the party?",
                "key_structure": "Did + Base Verb (go / see)",
                "target_audio_items": [
                    {"english": "Did you go to the party?", "translation": "¿Fuiste a la fiesta?", "label": "Frase Correcta"},
                    {"english": "I didn't see the movie", "translation": "No vi la película", "label": "Negación Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Entrevista del Fin de Semana",
                "tutor_says": "Imagina que es lunes por la mañana y un amigo te pregunta emocionado: 'Where did you go on Saturday?'. Para responder aplicando un verbo irregular en pasado (go → went), dices: 'I went to a restaurant and ate delicious food'. ¿Cómo respondes aplicando los verbos irregulares 'went' y 'ate'?",
                "board_content": "🎭 JUEGO DE ROL CONVERSACIONAL:\n\nPregunta de tu amigo: \"Where did you go on Saturday?\"\n\nTu respuesta modelo:\n• \"I went to a restaurant and ate delicious food\"\n\n(Traducción: Fui a un restaurante y comí comida deliciosa)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two young colleagues chatting cheerfully by a coffee machine at work, holding coffee cups, expressive faces, vibrant colors, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde en pasado: 'I went to a restaurant and ate delicious food'",
                "expected_answer": "I went to a restaurant and ate delicious food",
                "key_structure": "Past Storytelling (went & ate)",
                "target_audio_items": [
                    {"english": "Where did you go on Saturday?", "translation": "¿Adónde fuiste el sábado?", "label": "Pregunta de tu amigo"},
                    {"english": "I went to a restaurant and ate delicious food", "translation": "Fui a un restaurante y comí comida deliciosa", "label": "Tu Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Cierre: Dominio de Pasado Irregular y Did",
                "tutor_says": "¡Felicitaciones! Has dominado los verbos irregulares más importantes (went, saw, ate, had, bought) y la formulación de preguntas y negaciones con Did. Ahora puedes relatar cualquier anécdota del pasado y formular preguntas fluidas con total seguridad.",
                "board_content": "🎉 RESUMEN DE DOMINIO: IRREGULAR PAST & QUESTIONS\n\n✔ Verbos camaleónicos: go→went, see→saw, eat→ate, have→had, buy→bought\n✔ Afirmativa: Sujeto + Verbo V2 (I saw a movie)\n✔ Negativa: didn't + Verbo Base V1 (I didn't see)\n✔ Preguntas: Did + Sujeto + Verbo Base V1? (Did you see?)\n✔ Enlace fonético: 'Did you' (/dɪdʒuː/)",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a shining golden trophy cup with an open book and glowing stars, modern colorful room, bold clean design, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Irregular Past Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_past_simple_fallback(sublevel: str) -> dict:
    """Past Simple: Was / Were & Regular Verbs (-ed)."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Past Simple: Was / Were & Regular Verbs",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Introducción: El Pasado del Verbo To Be (Was / Were)",
                "tutor_says": "Para hablar del pasado en inglés, el verbo 'To Be' se divide en dos formas: 'Was' para sujetos singulares (I, He, She, It) y 'Were' para sujetos plurales (You, We, They). Por ejemplo: 'Yesterday I was at home' (Ayer estuve en casa) y 'They were at school' (Ellos estuvieron en la escuela). Observa el desglose en la pizarra.",
                "board_content": "📌 PASADO DEL VERBO TO BE:\n\n• I / He / She / It → WAS (era / estaba)\n• You / We / They → WERE (eras / eran / estábamos)\n\n👉 Ejemplos modelo:\n• \"I was tired yesterday\" (Estaba cansado ayer)\n• \"We were happy last night\" (Estábamos felices anoche)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student relaxing on a sofa at home reading a book yesterday, cozy evening atmosphere, warm ambient lighting, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Subject + was/were + Complement",
                "target_audio_items": [
                    {"english": "I was at home yesterday", "translation": "Estuve en casa ayer", "label": "Singular: Was"},
                    {"english": "They were at school", "translation": "Ellos estuvieron en la escuela", "label": "Plural: Were"}
                ],
                "grammar_structure": {
                    "title": "Estructura: Was vs Were",
                    "formula": "[ Sujeto ] + [ was / were ] + [ Lugar / Estado / Adjetivo ] + [ Expresión de Tiempo ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / He / She (Was) | You / We / They (Were)", "color": "blue"},
                        {"role": "Verbo Be", "pattern": "was / were", "color": "purple"},
                        {"role": "Estado / Lugar", "pattern": "at home / tired / happy", "color": "emerald"},
                        {"role": "Tiempo", "pattern": "yesterday / last night", "color": "amber"}
                    ],
                    "explanation": "Usa 'was' con sujetos singulares y 'were' con 'you', 'we' y 'they'.",
                    "example_breakdowns": [
                        {
                            "english": "I was at home yesterday.",
                            "spanish": "Estuve en casa ayer.",
                            "parts": [
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Verbo Be", "text": "was", "color": "purple"},
                                {"role": "Lugar", "text": "at home", "color": "emerald"},
                                {"role": "Tiempo", "text": "yesterday", "color": "amber"}
                            ]
                        }
                    ],
                    "tips": "Recuerda: 'You' siempre usa 'were', tanto para singular (tú) como plural (ustedes)."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Verbos Regulares: La Terminación -ed",
                "tutor_says": "Para la mayoría de los verbos en inglés, formamos el pasado simple añadiendo la terminación '-ed' a la forma base del verbo: 'play' se convierte en 'played', 'work' en 'worked', 'watch' en 'watched' y 'listen' en 'listened'. Observa cómo esta regla se aplica a todas las personas gramaticales por igual.",
                "board_content": "⚡ REGLA DE VERBOS REGULARES (-ed):\n\n• play → played (jugó / jugué)\n• work → worked (trabajó / trabajé)\n• watch → watched (miró / miré)\n• listen → listened (escuchó / escuché)\n\nFórmula afirmativa:\n[ Sujeto ] + [ Verbo Base + ed ] + [ Complemento ]\n→ \"I watched a movie last night\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of a person working focused at a laptop desk with a calendar showing yesterday, clean modern room, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Subject + Verb-ed + Complement",
                "target_audio_items": [
                    {"english": "I played soccer yesterday", "translation": "Jugué fútbol ayer", "label": "Verbo regular"},
                    {"english": "She worked all day", "translation": "Ella trabajó todo el día", "label": "Verbo regular"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Las 3 Pronunciaciones de -ed",
                "tutor_says": "¡Cuidado! La terminación '-ed' NO siempre se pronuncia como 'ed'. Tiene 3 sonidos: /t/ tras consonantes sordas como en 'watched' (/wɒtʃt/), /d/ tras sonidos sonoros como en 'played' (/pleɪd/), e /ɪd/ únicamente tras verbos que terminan en 't' o 'd' como 'wanted' (/ˈwɒn.tɪd/). Practica pronunciando la frase modelo con tu micrófono.",
                "board_content": "🗣️ PRONUNCIACIÓN DE LA TERMINACIÓN -ed:\n\n1. /t/ → tras /p, k, f, s, ʃ, tʃ/: watched (/wɒtʃt/), worked (/wɜːkt/)\n2. /d/ → tras vocales y consonantes sonoras: played (/pleɪd/), lived (/lɪvd/)\n3. /ɪd/ → SOLAMENTE tras 't' o 'd': wanted (/ˈwɒn.tɪd/), needed (/ˈniː.dɪd/)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student practicing pronunciation with speech bubbles in front of a teacher, expressive cell shading, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con claridad: 'I watched television yesterday'",
                "expected_answer": "I watched television yesterday",
                "key_structure": "-ed endings (/t/, /d/, /ɪd/)",
                "target_audio_items": [
                    {"english": "I watched television yesterday", "translation": "Miré televisión ayer", "label": "Sonido /t/"},
                    {"english": "I visited my family", "translation": "Visité a mi familia", "label": "Sonido /ɪd/"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: Was vs Were y -ed",
                "tutor_says": "Un error frecuente es decir 'We was' o añadir '-ed' a verbos que ya tienen pasado. Corrige la concordancia de 'was' en la siguiente oración.",
                "board_content": "⚔️ DETECCIÓN DE ERRORES:\n\n❌ Incorrecto: \"We was at the park yesterday.\"\n✅ Correcto: \"We were at the park yesterday.\"\n\n❌ Incorrecto: \"She playeded tennis.\"\n✅ Correcto: \"She played tennis.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D concept art of a study board with glowing green correct signs, warm lighting, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige 'was' por 'were': 'We was at the park yesterday'",
                "expected_answer": "We were at the park yesterday",
                "key_structure": "Subject-Verb Agreement in Past",
                "target_audio_items": [
                    {"english": "We were at the park yesterday", "translation": "Estuvimos en el parque ayer", "label": "Oración Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: ¿Dónde estabas ayer?",
                "tutor_says": "Tu compañero de clase te pregunta: 'Where were you yesterday at 5 PM?'. Responde usando 'was': 'I was at the library studying'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nPregunta: \"Where were you yesterday at 5 PM?\"\nTu respuesta: \"I was at the library studying English.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two university students talking in a bright modern library, bookshelves in background, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde a la pregunta: 'I was at the library studying English'",
                "expected_answer": "I was at the library studying English",
                "key_structure": "Past Location with Was",
                "target_audio_items": [
                    {"english": "Where were you yesterday?", "translation": "¿Dónde estabas ayer?", "label": "Pregunta"},
                    {"english": "I was at the library studying English", "translation": "Estuve en la biblioteca estudiando inglés", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Past Simple Was/Were & Regular Verbs",
                "tutor_says": "¡Excelente! Has dominado el pasado de To Be (Was/Were) y la formación de verbos regulares con -ed.",
                "board_content": "🎉 RESUMEN:\n\n✔ I/He/She/It → was | You/We/They → were\n✔ Verbos regulares → base + -ed (worked, played, watched)\n✔ 3 sonidos de -ed: /t/, /d/, /ɪd/",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden victory badge with stars, clean vibrant colors, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Past Simple Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_future_going_to_fallback(sublevel: str) -> dict:
    """Future Plans with Be Going To."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Future Plans with Be Going To",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Expresar Intenciones con 'Be Going To'",
                "tutor_says": "Usamos la estructura 'Be going to' para hablar de planes futuros e intenciones que ya hemos decidido de antemano. Por ejemplo: 'I am going to travel to Spain next month' (Voy a viajar a España el próximo mes). Combina el verbo To Be (am/is/are) con 'going to' y el verbo en forma base.",
                "board_content": "📌 FÓRMULA DE PLANES FUTUROS (BE GOING TO):\n\n[ Sujeto ] + [ am / is / are ] + [ going to ] + [ Verbo Base ] + [ Complemento ]\n\n• I am going to study English tomorrow\n• She is going to buy a new car next week\n• They are going to visit us tonight",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a young student packing a colorful suitcase looking at a plane ticket, excited expression, cozy room, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Subject + Be + going to + Base Verb",
                "target_audio_items": [
                    {"english": "I am going to travel next month", "translation": "Voy a viajar el próximo mes", "label": "Plan Futuro"},
                    {"english": "She is going to start a new job", "translation": "Ella va a comenzar un nuevo trabajo", "label": "Plan Futuro"}
                ],
                "grammar_structure": {
                    "title": "Estructura: Be Going To para Planes",
                    "formula": "[ Sujeto ] + [ am / is / are ] + [ going to ] + [ Verbo Base ] + [ Tiempo Futuro ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / We / They", "color": "blue"},
                        {"role": "Verbo Be", "pattern": "am / is / are", "color": "purple"},
                        {"role": "Intención", "pattern": "going to", "color": "amber"},
                        {"role": "Verbo Base", "pattern": "travel / study / visit", "color": "emerald"},
                        {"role": "Tiempo Futuro", "pattern": "tomorrow / next week", "color": "rose"}
                    ],
                    "explanation": "El verbo To Be debe concordar con el sujeto (I am, He is, They are), seguido de 'going to' y la acción base.",
                    "example_breakdowns": [
                        {
                            "english": "I am going to study tomorrow.",
                            "spanish": "Voy a estudiar mañana.",
                            "parts": [
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Verbo Be", "text": "am", "color": "purple"},
                                {"role": "Intención", "text": "going to", "color": "amber"},
                                {"role": "Verbo Base", "text": "study", "color": "emerald"},
                                {"role": "Tiempo", "text": "tomorrow", "color": "rose"}
                            ]
                        }
                    ],
                    "tips": "Nunca olvides conjugar el verbo To Be ('I going to' es incorrecto; di 'I am going to')."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Preguntas y Negaciones con Be Going To",
                "tutor_says": "Para formular preguntas, invertimos el verbo To Be al inicio: 'Are you going to travel?'. Para negar, añadimos 'not' después de To Be: 'I am not going to stay at home'.",
                "board_content": "⚡ PREGUNTAS Y NEGACIONES:\n\n• Pregunta (?) → [ Am / Is / Are ] + [ Sujeto ] + [ going to ] + [ Verbo Base ] ?\n  → \"Are you going to study tonight?\"\n\n• Negativa (-) → [ Sujeto ] + [ am/is/are not ] + [ going to ] + [ Verbo Base ]\n  → \"He is not going to come today\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a calendar planner with colorful event badges and checklists, bright aesthetic, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Are you going to + Base Verb?",
                "target_audio_items": [
                    {"english": "Are you going to study tonight?", "translation": "¿Vas a estudiar esta noche?", "label": "Pregunta"},
                    {"english": "I am not going to stay at home", "translation": "No me voy a quedar en casa", "label": "Negación"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Pronunciación de 'Going to' (/ˈɡənə/)",
                "tutor_says": "En la conversación informal, los hablantes nativos a menudo reducen 'going to' a 'gonna' (/ˈɡənə/). Escucha y practica la frase modelo.",
                "board_content": "🗣️ RETO FONÉTICO:\n\n• Formal: \"I am going to see my friend\"\n• Conversacional: \"I'm gonna see my friend\"\n\nPractica el ritmo natural de la frase con tu micrófono.",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student speaking enthusiastically with headphones on, laptop desk setting, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con fluidez: 'I am going to see my friend tomorrow'",
                "expected_answer": "I am going to see my friend tomorrow",
                "key_structure": "Be going to Pronunciation",
                "target_audio_items": [
                    {"english": "I am going to see my friend tomorrow", "translation": "Voy a ver a mi amigo/a mañana", "label": "Práctica de Voz"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: Omitir el Verbo To Be",
                "tutor_says": "El error más frecuente es olvidar el verbo To Be diciendo 'I going to study'. Corrige la frase añadiendo 'am'.",
                "board_content": "⚔️ ANÁLISIS DE ERROR:\n\n❌ Incorrecto: \"I going to travel next week.\"\n✅ Correcto: \"I am going to travel next week.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D illustration of a study desk with study notes and green checkmarks, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige agregando 'am': 'I going to travel next week'",
                "expected_answer": "I am going to travel next week",
                "key_structure": "Subject + Be + going to",
                "target_audio_items": [
                    {"english": "I am going to travel next week", "translation": "Voy a viajar la próxima semana", "label": "Frase Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Planes para las Vacaciones",
                "tutor_says": "Tu amigo te pregunta: 'What are you going to do this summer?'. Responde usando 'going to': 'I am going to visit the beach with my family'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nPregunta: \"What are you going to do this summer?\"\nTu respuesta: \"I am going to visit the beach with my family.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two friends discussing vacation ideas pointing at a sunny map, vibrant colors, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde con tu plan: 'I am going to visit the beach with my family'",
                "expected_answer": "I am going to visit the beach with my family",
                "key_structure": "Vacation Plans with Going To",
                "target_audio_items": [
                    {"english": "What are you going to do this summer?", "translation": "¿Qué vas a hacer este verano?", "label": "Pregunta"},
                    {"english": "I am going to visit the beach with my family", "translation": "Voy a visitar la playa con mi familia", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Planes con Be Going To",
                "tutor_says": "¡Excelente trabajo! Ya sabes expresar intenciones y planes decididos para el futuro usando 'Be going to'.",
                "board_content": "🎉 RESUMEN:\n\n✔ Fórmula: Sujeto + am/is/are + going to + Verbo Base\n✔ Preguntas: Are you going to + Verbo?\n✔ Negaciones: I am not going to + Verbo",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden trophy with an airplane and sun icon, clean vibrant colors, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Going To Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_can_abilities_fallback(sublevel: str) -> dict:
    """Can & Abilities."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Can & Abilities",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Expresar Habilidades con 'Can'",
                "tutor_says": "El verbo modal 'Can' se usa para hablar de habilidades y capacidades físicas o mentales. Significa 'poder' o 'saber hacer'. Una gran ventaja: 'can' no cambia nunca con ninguna persona (I can, he can, they can) y siempre va seguido de un verbo en forma base sin 'to' ni '-s'. Por ejemplo: 'I can swim' (Sé nadar) y 'She can speak English' (Ella puede hablar inglés).",
                "board_content": "📌 EL VERBO MODAL CAN (HABILIDADES):\n\n• I can swim (Sé nadar / Puedo nadar)\n• She can speak English (Ella sabe hablar inglés)\n• They can play the guitar (Ellos saben tocar la guitarra)\n\nFórmula afirmativa:\n[ Sujeto ] + [ can ] + [ Verbo Base ] + [ Complemento ]",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a young person happily playing an acoustic guitar and singing, colorful modern room, expressive character, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Subject + can + Base Verb",
                "target_audio_items": [
                    {"english": "I can speak English", "translation": "Puedo hablar inglés", "label": "Habilidad"},
                    {"english": "She can play the guitar", "translation": "Ella sabe tocar la guitarra", "label": "Habilidad"}
                ],
                "grammar_structure": {
                    "title": "Estructura: Can para Habilidades",
                    "formula": "[ Sujeto ] + [ can / can't ] + [ Verbo en Forma Base ] + [ Complemento ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / She / We / They", "color": "blue"},
                        {"role": "Modal", "pattern": "can / can't", "color": "purple"},
                        {"role": "Verbo Base", "pattern": "swim / speak / drive / cook", "color": "emerald"},
                        {"role": "Complemento", "pattern": "English / well / fast", "color": "amber"}
                    ],
                    "explanation": "El verbo principal NUNCA lleva 'to' ni '-s' después de 'can'.",
                    "example_breakdowns": [
                        {
                            "english": "She can speak English.",
                            "spanish": "Ella sabe hablar inglés.",
                            "parts": [
                                {"role": "Sujeto", "text": "She", "color": "blue"},
                                {"role": "Modal", "text": "can", "color": "purple"},
                                {"role": "Verbo Base", "text": "speak", "color": "emerald"},
                                {"role": "Complemento", "text": "English", "color": "amber"}
                            ]
                        }
                    ],
                    "tips": "Nunca digas 'He cans' ni 'He can to swim'. La forma correcta es 'He can swim'."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Preguntas y Negaciones con Can / Can't",
                "tutor_says": "Para hacer preguntas con 'can', colocamos 'Can' al inicio: 'Can you drive?'. Para negar, usamos 'cannot' o la contracción 'can't': 'I can't swim'.",
                "board_content": "⚡ PREGUNTAS Y NEGACIONES:\n\n• Pregunta (?) → [ Can ] + [ Sujeto ] + [ Verbo Base ] ?\n  → \"Can you speak English?\"\n\n• Negativa (-) → [ Sujeto ] + [ can't ] + [ Verbo Base ]\n  → \"I can't drive a car\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of skill icons like swimming, driving, cooking, speaking, vibrant icons on clean board, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Can you + Base Verb?",
                "target_audio_items": [
                    {"english": "Can you speak English?", "translation": "¿Puedes hablar inglés?", "label": "Pregunta"},
                    {"english": "I can't drive a car", "translation": "No sé conducir un auto", "label": "Negación"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Contraste Can (/kən/) vs Can't (/kænt/)",
                "tutor_says": "En oraciones afirmativas, 'can' se pronuncia de forma débil como /kən/. En cambio, en la negación 'can't' la vocal es más abierta y enfática: /kænt/ o /kɑːnt/. Practica pronunciando la pregunta con tu micrófono.",
                "board_content": "🗣️ CONTRASTE FONÉTICO:\n\n• can (débil) → /kən/ (\"I can /kən/ swim\")\n• can't (fuerte/enfático) → /kænt/ o /kɑːnt/ (\"I can't /kænt/ swim\")\n\nPractica la entonación con tu micrófono.",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student with microphone practicing English pronunciation, smiling confidently, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con claridad: 'Yes, I can speak English very well'",
                "expected_answer": "Yes, I can speak English very well",
                "key_structure": "Can /kən/ vs Can't /kænt/",
                "target_audio_items": [
                    {"english": "Yes, I can speak English very well", "translation": "Sí, sé hablar inglés muy bien", "label": "Pronunciación Can"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: Prohibido usar 'to' con Can",
                "tutor_says": "Un error común de los hispanohablantes es decir 'She can to swim' o 'She cans swim'. Corrige la frase eliminando 'to'.",
                "board_content": "⚔️ ANÁLISIS DE ERROR:\n\n❌ Incorrecto: \"She can to swim very well.\"\n❌ Incorrecto: \"She cans swim.\"\n✅ Correcto: \"She can swim very well.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D illustration of a study desk with glowing checkmarks, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige eliminando 'to': 'She can to swim very well'",
                "expected_answer": "She can swim very well",
                "key_structure": "Can + Base Verb (no 'to')",
                "target_audio_items": [
                    {"english": "She can swim very well", "translation": "Ella sabe nadar muy bien", "label": "Frase Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Entrevista de Habilidades",
                "tutor_says": "En una entrevista te preguntan: 'Can you use a computer and speak English?'. Responde usando 'can': 'Yes, I can use a computer and speak English fluently'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nPregunta: \"Can you use a computer and speak English?\"\nTu respuesta: \"Yes, I can use a computer and speak English fluently.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a friendly job interview across a modern desk, two professionals talking, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde afirmativamente: 'Yes, I can use a computer and speak English fluently'",
                "expected_answer": "Yes, I can use a computer and speak English fluently",
                "key_structure": "Interview Abilities with Can",
                "target_audio_items": [
                    {"english": "Can you speak English?", "translation": "¿Puedes hablar inglés?", "label": "Pregunta"},
                    {"english": "Yes, I can use a computer and speak English fluently", "translation": "Sí, puedo usar una computadora y hablar inglés con fluidez", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Modal Can para Habilidades",
                "tutor_says": "¡Excelente trabajo! Has dominado el uso de 'Can' y 'Can't' para expresar habilidades y responder preguntas.",
                "board_content": "🎉 RESUMEN:\n\n✔ Can no cambia con ninguna persona (I can, he can, they can)\n✔ Siempre va seguido de verbo en forma base (sin 'to')\n✔ Negativa: can't | Pregunta: Can you...?",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden certificate badge of achievement, clean minimal aesthetic, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Can Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_there_is_there_are_fallback(sublevel: str) -> dict:
    """Places & There is / There are."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Places & There is / There are",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Existencia con 'There is' y 'There are'",
                "tutor_says": "En inglés usamos 'There is' para decir 'hay' cuando hablamos de una sola cosa (singular) o algo incontable. Usamos 'There are' para decir 'hay' cuando hablamos de dos o más cosas (plural). Por ejemplo: 'There is a bank near here' (Hay un banco cerca de aquí) y 'There are three parks in this city' (Hay tres parques en esta ciudad).",
                "board_content": "📌 EXISTENCIA EN LA CIUDAD:\n\n• There is + singular / incontable:\n  → \"There is a hospital on this street\" (Hay un hospital en esta calle)\n\n• There are + plural:\n  → \"There are two restaurants near the park\" (Hay dos restaurantes cerca del parque)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a colorful city street with a bakery, bank, and park, pedestrians walking happily, sunny day, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "There is (singular) / There are (plural)",
                "target_audio_items": [
                    {"english": "There is a park near my house", "translation": "Hay un parque cerca de mi casa", "label": "Singular: There is"},
                    {"english": "There are three restaurants here", "translation": "Hay tres restaurantes aquí", "label": "Plural: There are"}
                ],
                "grammar_structure": {
                    "title": "Estructura: There is vs There are",
                    "formula": "[ There is / There are ] + [ Sustantivo (Singular/Plural) ] + [ Preposición de Lugar ] + [ Ubicación ]",
                    "formula_tokens": [
                        {"role": "Existencia", "pattern": "There is (singular) | There are (plural)", "color": "purple"},
                        {"role": "Lugar / Objeto", "pattern": "a bank / two hotels / a park", "color": "blue"},
                        {"role": "Preposición", "pattern": "next to / in front of / between", "color": "emerald"},
                        {"role": "Ubicación", "pattern": "the station / my house", "color": "amber"}
                    ],
                    "explanation": "Usa 'There is a/an' con sustantivos singulares y 'There are' con sustantivos en plural.",
                    "example_breakdowns": [
                        {
                            "english": "There is a park next to the school.",
                            "spanish": "Hay un parque al lado de la escuela.",
                            "parts": [
                                {"role": "Existencia", "text": "There is", "color": "purple"},
                                {"role": "Lugar", "text": "a park", "color": "blue"},
                                {"role": "Preposición", "text": "next to", "color": "emerald"},
                                {"role": "Ubicación", "text": "the school", "color": "amber"}
                            ]
                        }
                    ],
                    "tips": "Para preguntar invierte el orden: 'Is there a bank?' o 'Are there any restaurants?'."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Preposiciones de Lugar Clave",
                "tutor_says": "Para ubicar lugares con precisión usamos preposiciones: 'next to' (al lado de), 'in front of' (delante de), 'behind' (detrás de), 'between' (entre dos cosas) y 'opposite' (enfrente cruzando la calle).",
                "board_content": "⚡ PREPOSICIONES DE LUGAR:\n\n• next to → al lado de (\"The bank is next to the cafe\")\n• in front of → delante de (\"There is a bus in front of the school\")\n• between → entre (\"The shop is between the bank and the hotel\")\n• opposite → enfrente de (\"The cinema is opposite the station\")",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational diagram of city buildings showing positions like next to, between, opposite, clean minimalist design, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Prepositions of Place (next to / between)",
                "target_audio_items": [
                    {"english": "The bank is next to the pharmacy", "translation": "El banco está al lado de la farmacia", "label": "Preposición: next to"},
                    {"english": "There is a shop opposite the station", "translation": "Hay una tienda enfrente de la estación", "label": "Preposición: opposite"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Enlace /ðeər ɪz/ y /ðeər ɑːr/",
                "tutor_says": "Al pronunciar 'There is', enlazamos la 'r' con la 'i': /ðeər ɪz/ ('ther-iz'). En 'There are', la pronunciación fluye como /ðeər ɑːr/. Practica la pregunta modelo con tu micrófono.",
                "board_content": "🗣️ RETO FONÉTICO:\n\n• \"Is there a pharmacy near here?\"\n(Traducción: ¿Hay una farmacia cerca de aquí?)\n\nArticulación de 'th' sonora: coloca la lengua entre los dientes y vibra las cuerdas vocales (/ð/).",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a tourist holding a street map asking a friendly local for directions on a sunny corner, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con fluidez: 'Is there a pharmacy near here?'",
                "expected_answer": "Is there a pharmacy near here?",
                "key_structure": "Is there /ðeər ɪz/ Pronunciation",
                "target_audio_items": [
                    {"english": "Is there a pharmacy near here?", "translation": "¿Hay una farmacia cerca de aquí?", "label": "Pregunta de Ubicación"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: Concordancia There is / There are",
                "tutor_says": "Corrige el error de concordancia en la oración: cuando hablamos de dos cosas, debemos usar 'are' y no 'is'.",
                "board_content": "⚔️ ANÁLISIS DE ERROR:\n\n❌ Incorrecto: \"There is two banks on this street.\"\n✅ Correcto: \"There are two banks on this street.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D illustration of a city map with green correct marks, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige 'is' por 'are': 'There is two banks on this street'",
                "expected_answer": "There are two banks on this street",
                "key_structure": "There are + plural nouns",
                "target_audio_items": [
                    {"english": "There are two banks on this street", "translation": "Hay dos bancos en esta calle", "label": "Oración Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Dando Indicaciones a un Turista",
                "tutor_says": "Un turista te pregunta: 'Excuse me, is there a supermarket near here?'. Responde indicando que hay uno al lado del banco: 'Yes, there is a supermarket next to the bank'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nTurista: \"Excuse me, is there a supermarket near here?\"\nTu respuesta: \"Yes, there is a supermarket next to the bank.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two people smiling and pointing directions on a bustling avenue, warm modern city setting, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde al turista: 'Yes, there is a supermarket next to the bank'",
                "expected_answer": "Yes, there is a supermarket next to the bank",
                "key_structure": "Directions with There is & Next to",
                "target_audio_items": [
                    {"english": "Is there a supermarket near here?", "translation": "¿Hay un supermercado cerca de aquí?", "label": "Pregunta"},
                    {"english": "Yes, there is a supermarket next to the bank", "translation": "Sí, hay un supermercado al lado del banco", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Lugares y Existencia",
                "tutor_says": "¡Felicitaciones! Has dominado 'There is' (singular), 'There are' (plural) y las preposiciones de lugar para dar indicaciones con fluidez.",
                "board_content": "🎉 RESUMEN:\n\n✔ There is + singular (There is a bank)\n✔ There are + plural (There are two parks)\n✔ Preposiciones: next to, in front of, between, opposite",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden compass and map pin icon, clean modern aesthetic, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Places & There is/are Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_do_does_questions_fallback(sublevel: str) -> dict:
    """Questions & Negatives (Do / Does)."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Questions & Negatives (Do / Does)",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: El Auxiliar Do / Does en Presente Simple",
                "tutor_says": "Para formular preguntas y negaciones en presente simple (excepto con el verbo To Be), necesitamos el auxiliar 'Do' o 'Does'. 'Do' se usa con I, You, We y They; 'Does' se usa con He, She e It. Cuando usamos 'Does' en una pregunta, el verbo principal pierde la '-s' y vuelve a su forma base pura.",
                "board_content": "📌 EL AUXILIAR DO / DOES:\n\n• I / You / We / They → DO / DON'T\n  → \"Do you speak English?\" (¿Hablas inglés?)\n  → \"I don't live in Madrid\" (No vivo en Madrid)\n\n• He / She / It → DOES / DOESN'T\n  → \"Does she work here?\" (¿Trabaja ella aquí?)\n  → \"He doesn't eat meat\" (Él no come carne)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two young professionals chatting in a modern creative studio, one asking a question with a friendly smile, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Do/Does + Subject + Base Verb?",
                "target_audio_items": [
                    {"english": "Do you speak English?", "translation": "¿Hablas inglés?", "label": "Pregunta con Do"},
                    {"english": "Does she work here?", "translation": "¿Trabaja ella aquí?", "label": "Pregunta con Does"},
                    {"english": "I don't drink coffee", "translation": "No tomo café", "label": "Negación don't"}
                ],
                "grammar_structure": {
                    "title": "Estructura de Preguntas con Do / Does",
                    "formula": "[ Do / Does / Wh- + do/does ] + [ Sujeto ] + [ Verbo Base ] + [ Complemento ] ?",
                    "formula_tokens": [
                        {"role": "Auxiliar", "pattern": "Do / Does / Where do", "color": "purple"},
                        {"role": "Sujeto", "pattern": "you / she / they / he", "color": "blue"},
                        {"role": "Verbo Base", "pattern": "live / work / study / speak", "color": "amber"},
                        {"role": "Complemento", "pattern": "in London / here", "color": "emerald"}
                    ],
                    "explanation": "El auxiliar 'Do/Does' abre la pregunta; el verbo principal siempre va en su forma base más pura.",
                    "example_breakdowns": [
                        {
                            "english": "Do you live in London?",
                            "spanish": "¿Vives en Londres?",
                            "parts": [
                                {"role": "Auxiliar", "text": "Do", "color": "purple"},
                                {"role": "Sujeto", "text": "you", "color": "blue"},
                                {"role": "Verbo Base", "text": "live", "color": "amber"},
                                {"role": "Complemento", "text": "in London?", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "Nunca digas 'Does she works?'; como 'Does' ya tiene la 'es', el verbo debe ser 'work' ('Does she work?')."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Preguntas con Wh- (What, Where, When, Why)",
                "tutor_says": "Para hacer preguntas abiertas, colocamos la palabra interrogativa (What, Where, When, Why) justo antes del auxiliar 'do' o 'does'. Observa la fórmula: [ Wh- ] + [ do/does ] + [ Sujeto ] + [ Verbo Base ].",
                "board_content": "⚡ PREGUNTAS CON WH-:\n\n• Where do you work? (¿Dónde trabajas?)\n• What does she study? (¿Qué estudia ella?)\n• What time do you wake up? (¿A qué hora te despiertas?)\n• Why do you study English? (¿Por qué estudias inglés?)",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of question marks and magnifying glass examining daily routine icons, clean modern graphic design, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Wh- + do/does + Subject + Base Verb?",
                "target_audio_items": [
                    {"english": "Where do you work?", "translation": "¿Dónde trabajas?", "label": "Pregunta Where"},
                    {"english": "What does he do?", "translation": "¿A qué se dedica él?", "label": "Pregunta What"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Enlace 'Do you' y 'Does he'",
                "tutor_says": "Al hablar rápido, 'Do you' se reduce a /djuː/ o /dʒuː/, y en 'Does he' la 'h' a menudo desaparece sonando como /dʌziː/. Practica la pregunta modelo con tu micrófono.",
                "board_content": "🗣️ ENLACES FONÉTICOS EN PREGUNTAS:\n\n• \"Where do you live?\" → /weər dʒuː lɪv/\n• \"Does he work here?\" → /dʌziː wɜːk hɪər/\n\nEscucha y graba tu pronunciación.",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student with headphones practicing speaking into a microphone, cheerful expression, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con fluidez: 'Where do you live?'",
                "expected_answer": "Where do you live?",
                "key_structure": "Connected Speech: Do you /dʒuː/",
                "target_audio_items": [
                    {"english": "Where do you live?", "translation": "¿Dónde vives?", "label": "Pregunta Fluida"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: La 's' en preguntas con Does",
                "tutor_says": "Corrige el error en la pregunta: cuando usamos 'Does', el verbo principal NO debe llevar 's'.",
                "board_content": "⚔️ ANÁLISIS DE ERROR:\n\n❌ Incorrecto: \"Does she speaks English?\"\n✅ Correcto: \"Does she speak English?\"\n\n❌ Incorrecto: \"He doesn't likes coffee.\"\n✅ Correcto: \"He doesn't like coffee.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D illustration of a chalkboard with glowing checkmarks and crossed out mistakes, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige 'speaks' por 'speak': 'Does she speaks English?'",
                "expected_answer": "Does she speak English?",
                "key_structure": "Does + Base Verb (no 's')",
                "target_audio_items": [
                    {"english": "Does she speak English?", "translation": "¿Habla ella inglés?", "label": "Frase Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Conociendo a un Nuevo Compañero",
                "tutor_says": "Un nuevo compañero te pregunta: 'Do you work in this office?'. Responde afirmativamente: 'Yes, I work here from Monday to Friday'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nCompañero: \"Do you work in this office?\"\nTu respuesta: \"Yes, I work here from Monday to Friday.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two friendly coworkers talking at an office reception area, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde afirmativamente: 'Yes, I work here from Monday to Friday'",
                "expected_answer": "Yes, I work here from Monday to Friday",
                "key_structure": "Routine Dialogue with Do",
                "target_audio_items": [
                    {"english": "Do you work in this office?", "translation": "¿Trabajas en esta oficina?", "label": "Pregunta"},
                    {"english": "Yes, I work here from Monday to Friday", "translation": "Sí, trabajo aquí de lunes a viernes", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Preguntas y Negaciones con Do / Does",
                "tutor_says": "¡Excelente trabajo! Has dominado el uso de Do y Does para preguntar y negar en presente simple.",
                "board_content": "🎉 RESUMEN:\n\n✔ I/You/We/They → Do / Don't\n✔ He/She/It → Does / Doesn't\n✔ Con Does/Doesn't, el verbo vuelve a forma base (sin 's')",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a shining golden trophy cup with question mark badge, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Do/Does Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_objects_possession_fallback(sublevel: str) -> dict:
    """Objects & Possession (This/That/These/Those & 's)."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Objects & Possession",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Demostrativos: This, That, These, Those",
                "tutor_says": "Para señalar objetos según su cercanía y cantidad usamos demostrativos: 'This' (esto, singular cerca), 'That' (eso/aquello, singular lejos), 'These' (estos, plural cerca) y 'Those' (esos/aquellos, plural lejos).",
                "board_content": "📌 DEMOSTRATIVOS EN INGLÉS:\n\n• Singular Cerca → THIS is my phone (Este es mi teléfono)\n• Singular Lejos → THAT is your car (Ese es tu auto)\n• Plural Cerca → THESE are my keys (Estas son mis llaves)\n• Plural Lejos → THOSE are our bags (Esas son nuestras mochilas)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student showing a smartphone in hand and pointing at a bicycle across the street, expressive clean vector art, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "This / That / These / Those",
                "target_audio_items": [
                    {"english": "This is my phone", "translation": "Este es mi teléfono", "label": "This (cerca)"},
                    {"english": "That is my car", "translation": "Ese es mi auto", "label": "That (lejos)"},
                    {"english": "These are my keys", "translation": "Estas son mis llaves", "label": "These (plural cerca)"}
                ],
                "grammar_structure": {
                    "title": "Estructura: Demostrativos y Posesión",
                    "formula": "[ This / That / These / Those ] + [ is / are ] + [ Posesivo / Nombre's ] + [ Objeto ]",
                    "formula_tokens": [
                        {"role": "Demostrativo", "pattern": "This / That (is) | These / Those (are)", "color": "blue"},
                        {"role": "Verbo Be", "pattern": "is / are", "color": "purple"},
                        {"role": "Posesivo", "pattern": "my / your / Carlos's", "color": "emerald"},
                        {"role": "Objeto", "pattern": "laptop / keys / jacket", "color": "amber"}
                    ],
                    "explanation": "Usa 'is' con This/That y 'are' con These/Those.",
                    "example_breakdowns": [
                        {
                            "english": "This is Carlos's laptop.",
                            "spanish": "Esta es la laptop de Carlos.",
                            "parts": [
                                {"role": "Demostrativo", "text": "This", "color": "blue"},
                                {"role": "Verbo Be", "text": "is", "color": "purple"},
                                {"role": "Posesivo", "text": "Carlos's", "color": "emerald"},
                                {"role": "Objeto", "text": "laptop", "color": "amber"}
                            ]
                        }
                    ],
                    "tips": "El posesivo sajón 's indica pertenencia: 'Maria's book' (el libro de María)."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. El Posesivo Sajón ('s)",
                "tutor_says": "En inglés no decimos 'the car of John', sino 'John's car'. Colocamos el poseedor primero con un apóstrofo y una 's', seguido de lo poseído.",
                "board_content": "⚡ POSESIVO CON APÓSTROFO ('s):\n\n• Sarah's notebook (El cuaderno de Sarah)\n• My brother's laptop (La laptop de mi hermano)\n• The teacher's desk (El escritorio del profesor)\n\nFórmula:\n[ Poseedor ] + [ 's ] + [ Objeto poseído ]",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of everyday personal items like notebook, keys, glasses, headphones neatly arranged on a wooden desk, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Owner + 's + Object",
                "target_audio_items": [
                    {"english": "This is Sarah's notebook", "translation": "Este es el cuaderno de Sarah", "label": "Posesivo 's"},
                    {"english": "That is my friend's jacket", "translation": "Esa es la chaqueta de mi amigo", "label": "Posesivo 's"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Contraste This (/ðɪs/) vs These (/ðiːz/)",
                "tutor_says": "Presta atención a la diferencia: 'This' tiene una vocal corta /ɪ/ y termina en 's' sorda (/ðɪs/). 'These' tiene una vocal larga /iː/ y termina en 'z' sonora vibrante (/ðiːz/). Practica la frase modelo.",
                "board_content": "🗣️ CONTRASTE FONÉTICO:\n\n• this (singular) → /ðɪs/ (vocal corta, 's' sorda)\n• these (plural) → /ðiːz/ (vocal larga 'ii', 'z' sonora)\n\nPractica con tu micrófono.",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student practicing pronunciation in front of a mirror holding a key and keys, expressive cell shading, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con claridad: 'These are my new glasses'",
                "expected_answer": "These are my new glasses",
                "key_structure": "This /ðɪs/ vs These /ðiːz/",
                "target_audio_items": [
                    {"english": "These are my new glasses", "translation": "Estos son mis nuevos lentes", "label": "Pronunciación These"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: Concordancia con Demostrativos",
                "tutor_says": "Corrige el error: 'This' no se puede usar con plurales ni con 'are'. Usa 'These'.",
                "board_content": "⚔️ ANÁLISIS DE ERROR:\n\n❌ Incorrecto: \"This are my keys.\"\n✅ Correcto: \"These are my keys.\"\n\n❌ Incorrecto: \"The car of my father.\"\n✅ Correcto: \"My father's car.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D concept art of a study desk with glowing checkmarks, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige 'This' por 'These': 'This are my keys'",
                "expected_answer": "These are my keys",
                "key_structure": "These are + plural nouns",
                "target_audio_items": [
                    {"english": "These are my keys", "translation": "Estas son mis llaves", "label": "Frase Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Objetos Perdidos",
                "tutor_says": "Encuentras una mochila y preguntas a tu compañero: 'Is this your backpack?'. Tu compañero responde: 'Yes, that is my backpack, thank you!'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nPregunta: \"Is this your backpack?\"\nTu respuesta: \"Yes, that is my backpack, thank you!\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two students in a classroom, one handing a stylish backpack to the other with a smile, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde: 'Yes, that is my backpack, thank you!'",
                "expected_answer": "Yes, that is my backpack, thank you!",
                "key_structure": "Demonstratives in Dialogue",
                "target_audio_items": [
                    {"english": "Is this your backpack?", "translation": "¿Es esta tu mochila?", "label": "Pregunta"},
                    {"english": "Yes, that is my backpack, thank you!", "translation": "¡Sí, esa es mi mochila, gracias!", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Demostrativos y Posesión",
                "tutor_says": "¡Felicitaciones! Has dominado This, That, These, Those y el posesivo sajón 's.",
                "board_content": "🎉 RESUMEN:\n\n✔ This (singular cerca) | That (singular lejos)\n✔ These (plural cerca) | Those (plural lejos)\n✔ Posesivo 's: John's car, Maria's book",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a shining golden trophy cup with a key icon, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Possession Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_personal_info_fallback(sublevel: str) -> dict:
    """Personal Information (To Be, Possessive Adjectives)."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Personal Information",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Nombre, Nacionalidad y Profesión con To Be",
                "tutor_says": "Para dar información personal en inglés usamos el verbo To Be: 'I am David, I am 28 years old, and I am from Mexico'. En inglés la edad siempre se expresa con To Be (I am 28 years old) y NUNCA con 'have'.",
                "board_content": "📌 INFORMACIÓN PERSONAL:\n\n• Nombre → \"My name is Maria\" / \"I am Maria\"\n• Edad → \"I am 25 years old\" (Usa SIEMPRE el verbo To Be)\n• Origen → \"I am from Colombia\"\n• Profesión → \"I am an engineer\" (Usa a/an antes de profesiones)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a smiling young professional holding an ID badge introducing herself at a modern international conference, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "I am + Name / Age / Profession",
                "target_audio_items": [
                    {"english": "My name is David", "translation": "Mi nombre es David", "label": "Nombre"},
                    {"english": "I am 25 years old", "translation": "Tengo 25 años", "label": "Edad con To Be"},
                    {"english": "I am from Spain", "translation": "Soy de España", "label": "Origen"}
                ],
                "grammar_structure": {
                    "title": "Estructura: Información Personal",
                    "formula": "[ Sujeto ] + [ am / is / are ] + [ Nombre / Edad / Nacionalidad / a+Profesión ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / She", "color": "blue"},
                        {"role": "Verbo Be", "pattern": "am / is / are", "color": "purple"},
                        {"role": "Dato Personal", "pattern": "David / 25 years old / from Mexico / a doctor", "color": "emerald"}
                    ],
                    "explanation": "La edad en inglés es un estado con To Be ('I am 25'), no una posesión ('I have 25').",
                    "example_breakdowns": [
                        {
                            "english": "I am twenty-five years old.",
                            "spanish": "Tengo veinticinco años.",
                            "parts": [
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Verbo Be", "text": "am", "color": "purple"},
                                {"role": "Edad", "text": "twenty-five years old", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "Para profesiones en singular siempre añade 'a' o 'an': 'I am a teacher', 'I am an architect'."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Adjetivos Posesivos (My, Your, His, Her, Our, Their)",
                "tutor_says": "Los adjetivos posesivos indican a quién pertenece algo y concuerdan con el poseedor: 'My' (mi), 'Your' (tu), 'His' (su de él), 'Her' (su de ella), 'Our' (nuestro) y 'Their' (su de ellos).",
                "board_content": "⚡ ADJETIVOS POSESIVOS:\n\n• I → MY name is Carlos\n• You → YOUR email address\n• He → HIS phone number\n• She → HER country is Peru\n• We → OUR teacher\n• They → THEIR company",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of business cards and passport documents with clean minimalist icons, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Possessive Adjectives (My, Your, His, Her)",
                "target_audio_items": [
                    {"english": "His name is Daniel", "translation": "Su nombre (de él) es Daniel", "label": "Posesivo His"},
                    {"english": "Her city is Madrid", "translation": "Su ciudad (de ella) es Madrid", "label": "Posesivo Her"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Contracciones I'm, He's, She's",
                "tutor_says": "Practica las contracciones naturales: 'I am' se contrae como 'I'm' (/aɪm/), 'He is' como 'He's' (/hiːz/) y 'She is' como 'She's' (/ʃiːz/). Escucha y graba tu voz.",
                "board_content": "🗣️ CONTRACCIONES NATURALES:\n\n• I am → I'm (/aɪm/)\n• He is → He's (/hiːz/)\n• She is → She's (/ʃiːz/)\n• We are → We're (/wɪər/)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student speaking clearly into a desktop mic, cozy study space, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con fluidez: 'I'm from Mexico and I'm a software designer'",
                "expected_answer": "I'm from Mexico and I'm a software designer",
                "key_structure": "Contractions I'm / He's",
                "target_audio_items": [
                    {"english": "I'm from Mexico and I'm a software designer", "translation": "Soy de México y soy diseñador/a de software", "label": "Presentación"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: La Trampa de la Edad",
                "tutor_says": "Corrige el error más famoso de los hispanohablantes: nunca digas 'I have 20 years'. Usa el verbo To Be 'I am 20 years old'.",
                "board_content": "⚔️ ANÁLISIS DE ERROR:\n\n❌ Incorrecto: \"I have 25 years old.\"\n✅ Correcto: \"I am 25 years old.\"\n\n❌ Incorrecto: \"I am engineer.\"\n✅ Correcto: \"I am an engineer.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D concept art of an identity passport with glowing green checkmarks, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige 'have' por 'am': 'I have 25 years old'",
                "expected_answer": "I am 25 years old",
                "key_structure": "Age with To Be (I am 25)",
                "target_audio_items": [
                    {"english": "I am 25 years old", "translation": "Tengo 25 años", "label": "Edad Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Registro en un Hotel / Conferencia",
                "tutor_says": "En la recepción te preguntan: 'What is your full name and occupation?'. Responde: 'My name is Carlos Ramirez and I am a software engineer'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nRecepcionista: \"What is your full name and occupation?\"\nTu respuesta: \"My name is Carlos Ramirez and I am a software engineer.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a hotel reception check-in desk, guest giving information with a smile, warm atmospheric lighting, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde con tu información: 'My name is Carlos Ramirez and I am a software engineer'",
                "expected_answer": "My name is Carlos Ramirez and I am a software engineer",
                "key_structure": "Registration Dialogue",
                "target_audio_items": [
                    {"english": "What is your full name?", "translation": "¿Cuál es tu nombre completo?", "label": "Pregunta"},
                    {"english": "My name is Carlos Ramirez and I am a software engineer", "translation": "Mi nombre es Carlos Ramírez y soy ingeniero de software", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Información Personal",
                "tutor_says": "¡Excelente trabajo! Ya puedes presentarte, dar tu edad con To Be, tu profesión con a/an y usar posesivos con total corrección.",
                "board_content": "🎉 RESUMEN:\n\n✔ Nombre: My name is... / I am...\n✔ Edad: I am [X] years old (SIEMPRE To Be)\n✔ Profesión: I am a/an [profesión]\n✔ Posesivos: my, your, his, her, our, their",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden ID badge trophy with stars, clean vibrant aesthetic, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Personal Info Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_time_frequency_fallback(sublevel: str) -> dict:
    """Time & Frequency (Adverbs of Frequency, Time Expressions)."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Time & Frequency",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Adverbios de Frecuencia",
                "tutor_says": "Los adverbios de frecuencia indican con qué regularidad realizamos una acción: 'always' (siempre 100%), 'usually' (usualmente 80%), 'often' (a menudo 60%), 'sometimes' (a veces 50%), 'rarely' / 'hardly ever' (casi nunca 10%) y 'never' (nunca 0%). Regla clave de posición: van ANTES del verbo principal ('I always wake up early'), pero DESPUÉS del verbo To Be ('I am always happy').",
                "board_content": "📌 ADVERBIOS DE FRECUENCIA:\n\n• Always (100%) → Siempre\n• Usually (80%) → Usualmente\n• Often (60%) → A menudo\n• Sometimes (50%) → A veces\n• Never (0%) → Nunca\n\nPosición:\n• Antes de verbos normales: \"I usually drink coffee\"\n• Después de To Be: \"She is always on time\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student waking up cheerfully to a morning alarm clock with sunlight pouring through window, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Subject + Adverb of Frequency + Main Verb",
                "diagram_svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a101d"/>
      <stop offset="100%" stop-color="#141e33"/>
    </linearGradient>
    <linearGradient id="timeLineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="700" height="380" rx="16" fill="url(#chalkBg)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#f8fafc">TIMELINE: HABITS &amp; FREQUENCY ADVERBS</text>
  <text x="350" y="60" font-family="system-ui, -apple-system, sans-serif" font-size="12" text-anchor="middle" fill="#38bdf8">Visualización de repetición en el tiempo hacia el presente</text>
  <line x1="60" y1="140" x2="640" y2="140" stroke="url(#timeLineGrad)" stroke-width="3" stroke-linecap="round"/>
  <polygon points="640,140 626,134 626,146" fill="#c084fc"/>
  <circle cx="120" cy="140" r="7" fill="#0ea5e9" filter="url(#glow)"/>
  <text x="120" y="170" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#7dd3fc">PAST</text>
  <text x="120" y="185" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">(Pasado)</text>
  <line x1="350" y1="95" x2="350" y2="185" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4"/>
  <circle cx="350" cy="140" r="11" fill="#f59e0b" filter="url(#glow)"/>
  <rect x="305" y="90" width="90" height="24" rx="12" fill="#f59e0b" />
  <text x="350" y="106" font-family="system-ui, sans-serif" font-size="12" font-weight="900" text-anchor="middle" fill="#000">NOW (Hoy)</text>
  <text x="350" y="202" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fbbf24">PRESENTE</text>
  <circle cx="580" cy="140" r="7" fill="#10b981" filter="url(#glow)"/>
  <text x="580" y="170" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#6ee7b7">FUTURE</text>
  <text x="580" y="185" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">(Futuro)</text>
  <g filter="url(#glow)">
    <circle cx="170" cy="140" r="5" fill="#38bdf8"/>
    <circle cx="215" cy="140" r="5" fill="#38bdf8"/>
    <circle cx="260" cy="140" r="5" fill="#38bdf8"/>
    <circle cx="305" cy="140" r="5" fill="#38bdf8"/>
  </g>
  <path d="M 170 125 Q 260 100 340 125" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="255" y="112" font-family="system-ui, sans-serif" font-size="11" font-weight="600" text-anchor="middle" fill="#38bdf8">Acciones Repetidas / Rutina</text>
  <rect x="40" y="225" width="620" height="135" rx="12" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
  <g transform="translate(65, 245)">
    <rect x="0" y="0" width="115" height="42" rx="8" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.4)"/>
    <text x="12" y="18" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#34d399">ALWAYS</text>
    <text x="95" y="18" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#10b981">100%</text>
    <text x="12" y="32" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Siempre</text>
  </g>
  <g transform="translate(195, 245)">
    <rect x="0" y="0" width="115" height="42" rx="8" fill="rgba(6,182,212,0.12)" stroke="rgba(6,182,212,0.4)"/>
    <text x="12" y="18" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">USUALLY</text>
    <text x="95" y="18" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#06b6d4">80%</text>
    <text x="12" y="32" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Usualmente</text>
  </g>
  <g transform="translate(325, 245)">
    <rect x="0" y="0" width="115" height="42" rx="8" fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.4)"/>
    <text x="10" y="18" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#fbbf24">SOMETIMES</text>
    <text x="95" y="18" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#f59e0b">50%</text>
    <text x="10" y="32" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">A veces</text>
  </g>
  <g transform="translate(455, 245)">
    <rect x="0" y="0" width="115" height="42" rx="8" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.4)"/>
    <text x="12" y="18" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#f87171">NEVER</text>
    <text x="95" y="18" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ef4444">0%</text>
    <text x="12" y="32" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Nunca</text>
  </g>
  <g transform="translate(65, 305)">
    <rect x="0" y="0" width="570" height="40" rx="8" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
    <text x="285" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#e0e7ff">
      FÓRMULA: <tspan fill="#38bdf8">[ Sujeto ]</tspan> + <tspan fill="#34d399">[ Adverbio ]</tspan> + <tspan fill="#fbbf24">[ Verbo ]</tspan> + <tspan fill="#cbd5e1">[ Complemento ]</tspan>  ➔  "I always drink coffee"
    </text>
  </g>
</svg>""",
                "target_audio_items": [
                    {"english": "I always wake up at seven", "translation": "Siempre me despierto a las siete", "label": "Always"},
                    {"english": "I usually drink coffee in the morning", "translation": "Usualmente tomo café por la mañana", "label": "Usually"},
                    {"english": "I never skip breakfast", "translation": "Nunca me salto el desayuno", "label": "Never"}
                ],
                "grammar_structure": {
                    "title": "Estructura: Posición de Adverbios de Frecuencia",
                    "formula": "[ Sujeto ] + [ Adverbio de Frecuencia ] + [ Verbo Principal ] + [ Complemento de Tiempo ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / She / We", "color": "blue"},
                        {"role": "Frecuencia", "pattern": "always / usually / sometimes / never", "color": "purple"},
                        {"role": "Verbo", "pattern": "wake up / exercise / study", "color": "emerald"},
                        {"role": "Hora / Momento", "pattern": "at 7 AM / in the morning", "color": "amber"}
                    ],
                    "explanation": "El adverbio va entre el sujeto y el verbo de acción.",
                    "example_breakdowns": [
                        {
                            "english": "I always drink water in the morning.",
                            "spanish": "Siempre tomo agua por la mañana.",
                            "parts": [
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Frecuencia", "text": "always", "color": "purple"},
                                {"role": "Verbo", "text": "drink", "color": "emerald"},
                                {"role": "Complemento", "text": "water in the morning", "color": "amber"}
                            ]
                        }
                    ],
                    "tips": "Para horas específicas usamos 'at' (at 8 AM), para partes del día 'in' (in the morning) y para días 'on' (on Monday)."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Expresiones de Tiempo: At, In, On",
                "tutor_says": "Para indicar el tiempo usamos las 3 preposiciones maestras: 'at' para horas exactas (at 8:00 AM, at midnight), 'in' para periodos largos (in the morning, in July), y 'on' para días específicos (on Monday, on the weekend).",
                "board_content": "⚡ PREPOSICIONES DE TIEMPO (AT / IN / ON):\n\n• AT → Horas exactas: at 7:30 AM, at noon, at night\n• IN → Franjas del día / meses: in the morning, in the evening\n• ON → Días de la semana / fechas: on Monday, on Friday morning",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational clock and weekly calendar graphic with bright color markers for daily routines, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "at + time / in + morning / on + day",
                "target_audio_items": [
                    {"english": "I start work at eight in the morning", "translation": "Comienzo a trabajar a las ocho de la mañana", "label": "at + in"},
                    {"english": "I play tennis on Saturdays", "translation": "Juego tenis los sábados", "label": "on + día"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Pronunciación de 'Usually' (/ˈjuː.ʒu.ə.li/)",
                "tutor_says": "Practica la pronunciación de 'usually' con el sonido suave /ʒ/ (como 'sh' sonora): /ˈjuː.ʒu.ə.li/. Escucha y graba la oración con tu micrófono.",
                "board_content": "🗣️ RETO FONÉTICO:\n\n• usually → /ˈjuː.ʒu.ə.li/ (sonido 'zh' suave)\n• always → /ˈɔːl.weɪz/\n\nGraba tu voz con el micrófono.",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a young person with headphones speaking into a laptop microphone cheerfully, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con fluidez: 'I usually have breakfast at eight in the morning'",
                "expected_answer": "I usually have breakfast at eight in the morning",
                "key_structure": "Usually /ˈjuː.ʒu.ə.li/ Pronunciation",
                "target_audio_items": [
                    {"english": "I usually have breakfast at eight in the morning", "translation": "Usualmente desayuno a las ocho de la mañana", "label": "Práctica de Voz"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: Posición del Adverbio",
                "tutor_says": "Corrige el error de orden sintáctico: el adverbio 'always' debe ir ANTES del verbo principal 'drink'.",
                "board_content": "⚔️ ANÁLISIS DE ERROR:\n\n❌ Incorrecto: \"I drink always coffee.\"\n✅ Correcto: \"I always drink coffee.\"\n\n❌ Incorrecto: \"I wake up in 7 AM.\"\n✅ Correcto: \"I wake up at 7 AM.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D concept art of a study desk with an open diary and green checkmarks, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige el orden del adverbio: 'I drink always coffee in the morning'",
                "expected_answer": "I always drink coffee in the morning",
                "key_structure": "Subject + Adverb + Verb",
                "target_audio_items": [
                    {"english": "I always drink coffee in the morning", "translation": "Siempre tomo café por la mañana", "label": "Orden Correcto"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Hábitos y Rutinas Semanales",
                "tutor_says": "Un amigo te pregunta: 'How often do you exercise?'. Responde indicando tu frecuencia: 'I usually exercise three times a week at the gym'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nPregunta: \"How often do you exercise?\"\nTu respuesta: \"I usually exercise three times a week at the gym.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two friends in sportswear jogging in a sunny park and talking cheerfully, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde con tu frecuencia: 'I usually exercise three times a week at the gym'",
                "expected_answer": "I usually exercise three times a week at the gym",
                "key_structure": "How often response with usually",
                "target_audio_items": [
                    {"english": "How often do you exercise?", "translation": "¿Con qué frecuencia haces ejercicio?", "label": "Pregunta"},
                    {"english": "I usually exercise three times a week at the gym", "translation": "Usualmente hago ejercicio tres veces por semana en el gimnasio", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Tiempo y Frecuencia",
                "tutor_says": "¡Excelente trabajo! Has dominado los adverbios de frecuencia (always, usually, sometimes, never) y las preposiciones temporales (at, in, on).",
                "board_content": "🎉 RESUMEN:\n\n✔ Adverbios: van antes del verbo de acción (I always study)\n✔ To Be: el adverbio va después (I am always happy)\n✔ Preposiciones: at + hora | in + mes/mañana | on + día",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden clock trophy badge with stars, clean minimalist aesthetic, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Time & Frequency Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_narrative_tenses_fallback(sublevel: str) -> dict:
    """Dedicated high-pedagogy fallback for B1.1 Narrative Tenses."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Narrative Tenses",
        "level": "B1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Las 3 Capas Temporales de Narrative Tenses",
                "tutor_says": "¡Bienvenido a la clase de Narrative Tenses! En la narración en inglés combinamos tres tiempos para dar profundidad y dinamismo a una historia: el Past Continuous (was/were + -ing) describe el escenario o la acción de fondo ('It was raining heavily...'), el Past Simple cuenta la secuencia de acciones principales en orden ('...when I arrived at the station'), y el Past Perfect (had + V3) revela los antecedentes que ocurrieron antes de todo ('...the train had already left'). Fíjate en la oración modelo: 'When I arrived at the station, the train had already left because I had overslept'.",
                "board_content": "🎬 LAS 3 CAPAS DE NARRATIVE TENSES:\n\n1. ACCIÓN ANTERIOR / BACKSTORY (Past Perfect - had + V3):\n   → \"The train had already left\"\n2. ESCENARIO DE FONDO (Past Continuous - was/were + -ing):\n   → \"It was raining heavily...\"\n3. EVENTO PRINCIPAL (Past Simple - V2 / -ed):\n   → \"...when I arrived at the station\"\n\n👉 Oración Modelo Completa:\n\"When I arrived at the station, the train had already left because I had overslept.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a young traveler looking at an empty railway platform in the rain with station clock, cinematic warm lighting, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Past Simple + Past Perfect (had + V3)",
                "target_audio_items": [
                    {"english": "When I arrived, the train had already left", "translation": "Cuando llegué, el tren ya se había ido", "label": "Past Perfect"},
                    {"english": "She was crying because she had lost her passport", "translation": "Ella estaba llorando porque había perdido su pasaporte", "label": "Narrative Sequence"},
                    {"english": "By the time we got home, the movie had finished", "translation": "Para cuando llegamos a casa, la película había terminado", "label": "Conector By The Time"}
                ],
                "grammar_structure": {
                    "title": "Estructura Nuclear: Narrative Tenses",
                    "formula": "[ Evento Pasado Simple ] + [ Conector ] + [ Past Perfect (had + V3) ]",
                    "formula_tokens": [
                        {"role": "Pasado Simple", "pattern": "When I arrived / When she called", "color": "blue"},
                        {"role": "Conector", "pattern": "because / by the time / before", "color": "rose"},
                        {"role": "Past Perfect", "pattern": "had + already + V3 (left / finished / started)", "color": "purple"},
                        {"role": "Complemento", "pattern": "the train / the movie / her keys", "color": "emerald"}
                    ],
                    "explanation": "El Past Perfect (had + V3) se usa exclusivamente para la acción que ocurrió PRIMERO en la línea temporal.",
                    "example_breakdowns": [
                        {
                            "english": "When I arrived, the train had already left.",
                            "spanish": "Cuando llegué, el tren ya se había ido.",
                            "parts": [
                                {"role": "Pasado Simple", "text": "When I arrived,", "color": "blue"},
                                {"role": "Sujeto", "text": "the train", "color": "emerald"},
                                {"role": "Past Perfect", "text": "had already left", "color": "purple"}
                            ]
                        }
                    ],
                    "tips": "El Past Perfect no se usa solo: siempre necesita un punto de referencia en Pasado Simple."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Conectores Temporales: By the time, As soon as & Already",
                "tutor_says": "Para enlazar eventos narrativos con precisión usamos conectores clave: 'By the time' significa 'para cuando' y va seguido de Pasado Simple con el resultado en Past Perfect ('By the time the police arrived, the burglar had escaped'). 'As soon as' introduce lo que ocurrió inmediatamente después ('As soon as I had finished dinner, my phone rang'). Observa las fórmulas en la pizarra.",
                "board_content": "⚡ CONECTORES CLAVE EN HISTORIAS:\n\n• By the time + [ Pasado Simple ], [ Sujeto ] + had + V3\n  → \"By the time the police arrived, the suspect had escaped.\"\n\n• [ Pasado Simple ] + because + [ Sujeto ] + had + V3\n  → \"I was exhausted because I had worked all night.\"\n\n• As soon as + [ Sujeto ] + had + V3, [ Pasado Simple ]\n  → \"As soon as she had arrived, we started the meeting.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of a timeline infographic with clocks and story panels, modern clean design, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "By the time + Past Simple, Past Perfect",
                "target_audio_items": [
                    {"english": "By the time the police arrived, the suspect had escaped", "translation": "Para cuando llegó la policía, el sospechoso se había escapado", "label": "By the time"},
                    {"english": "I was exhausted because I had worked all night", "translation": "Estaba agotado/a porque había trabajado toda la noche", "label": "Causa en Pasado"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Contracciones con Had (/aɪd/, /ʃiːd/, /ðeɪd/)",
                "tutor_says": "En el inglés hablado natural, 'had' casi siempre se contrae con los pronombres: 'I had' se convierte en 'I'd' (/aɪd/), 'She had' en 'She'd' (/ʃiːd/), y 'They had' en 'They'd' (/ðeɪd/). Escucha con atención la frase modelo: 'I realized I'd left my keys in the office'. Practica la contracción con tu micrófono.",
                "board_content": "🗣️ RETO FONÉTICO: CONTRACCIONES DE HAD:\n\n• I had → I'd (/aɪd/)\n• She had → She'd (/ʃiːd/)\n• They had → They'd (/ðeɪd/)\n• We had → We'd (/wiːd/)\n\nFrase de práctica:\n\"I realized I'd left my keys in the office.\"\n(Pronuncia /aɪd/ de forma suave y conectada)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student speaking into a studio microphone with soundwaves glowing, expressive character, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con fluidez: 'I realized I'd left my keys in the office'",
                "expected_answer": "I realized I'd left my keys in the office",
                "key_structure": "Contractions: I'd / She'd + V3",
                "target_audio_items": [
                    {"english": "I realized I'd left my keys in the office", "translation": "Me di cuenta de que había dejado mis llaves en la oficina", "label": "Contracción I'd"},
                    {"english": "She said she'd never seen that man before", "translation": "Ella dijo que nunca había visto a ese hombre antes", "label": "Contracción She'd"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Detección de Errores: La Trampa Cronológica del Doble Pasado",
                "tutor_says": "Un error común es usar dos Pasados Simples cuando una acción ocurrió antes que otra alterando el orden cronológico. Si dices 'When I got to the cinema, the movie started', significa que empezó DESPUÉS de que llegaste. Si ya había empezado antes, DEBES usar Past Perfect: 'the movie had already started'. Corrige la frase en la pizarra.",
                "board_content": "⚔️ ANÁLISIS DE ERROR CRONOLÓGICO:\n\n❌ Confuso: \"When we arrived at the party, everyone left.\"\n(Suena a que se fueron justo al verte llegar)\n\n✅ Preciso: \"When we arrived at the party, everyone had already left.\"\n(Ya se habían ido antes de que llegaras)\n\n📌 Regla: Usa Past Perfect (had + V3) para el evento previo.",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D concept art of an investigator comparing two conflicting timeline photographs on a glowing detective board, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige agregando 'had already left': 'When we arrived at the party, everyone left'",
                "expected_answer": "When we arrived at the party, everyone had already left",
                "key_structure": "Past Perfect for Prior Actions",
                "target_audio_items": [
                    {"english": "When we arrived at the party, everyone had already left", "translation": "Cuando llegamos a la fiesta, todos ya se habían ido", "label": "Oración Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: El Testigo del Giro Inesperado",
                "tutor_says": "Imagina que un detective te pregunta qué ocurrió cuando abriste la puerta de tu departamento: 'What happened when you opened the door?'. Relata el giro inesperado usando Past Simple y Past Perfect: 'When I opened the door, someone had turned off all the lights and taken my laptop'.",
                "board_content": "🎭 JUEGO DE ROL (TESTIMONIO NARRATIVO):\n\nDetective: \"What happened when you opened the door?\"\n\nTu respuesta modelo:\n• \"When I opened the door, someone had turned off all the lights and taken my laptop.\"\n\n(Traducción: Cuando abrí la puerta, alguien había apagado todas las luces y tomado mi laptop)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a friendly modern detective taking notes while listening to a witness in a living room, warm colors, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde al detective: 'When I opened the door, someone had turned off all the lights'",
                "expected_answer": "When I opened the door, someone had turned off all the lights",
                "key_structure": "Narrative Storytelling with Past Perfect",
                "target_audio_items": [
                    {"english": "What happened when you opened the door?", "translation": "¿Qué ocurrió cuando abriste la puerta?", "label": "Pregunta Detective"},
                    {"english": "When I opened the door, someone had turned off all the lights", "translation": "Cuando abrí la puerta, alguien había apagado todas las luces", "label": "Tu Testimonio"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Narrative Tenses Mastery",
                "tutor_says": "¡Felicitaciones! Has dominado las tres capas narrativas en inglés: Past Continuous para el fondo, Past Simple para la acción principal y Past Perfect (had + V3) para los antecedentes y giros de trama. ¡Ahora puedes relatar cualquier anécdota con nivel profesional!",
                "board_content": "🎉 RESUMEN DE DOMINIO: NARRATIVE TENSES\n\n✔ Past Continuous (was/were + -ing): Escenario de fondo\n✔ Past Simple (V2): Eventos secuenciales en primer plano\n✔ Past Perfect (had + V3): Acción que ocurrió ANTES\n✔ Conectores: By the time, As soon as, When, Because\n✔ Contracciones: I'd, She'd, They'd",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden quill pen and open storybook with glowing stars, elegant minimalist design, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Narrative Tenses Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_a1_2_integration_fallback(sublevel: str) -> dict:
    """Mastery fallback for A1.2 Integration: Full Present Simple & Habits Synthesis."""
    return {
        "schema": "ai_tutor.lesson.v2",
        "topic": "A1.2 Integration: Present Simple & Daily Habits",
        "level": "A1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "Hook: El Enigma de las Rutinas Semanales",
                "is_hook": True,
                "hook_type": "dilemma",
                "hook_images": [
                    {
                        "prompt": "A person looking at a busy weekly planner calendar on a modern wooden desk with a cup of coffee, morning sunlight, vibrant 2D vector art, strictly no text",
                        "caption": "Tu semana en inglés: Hábitos y rutinas",
                        "role": "hook_situation"
                    },
                    {
                        "prompt": "Split illustration of a young adult practicing guitar in the afternoon and relaxing with friends on the weekend, colorful minimal 2D vector style, strictly no text",
                        "caption": "Expresando todo tu día a día",
                        "role": "hook_context"
                    }
                ],
                "image_style": "comic_scene",
                "image_prompt": "A person looking at a weekly planner calendar on a desk with coffee, 2D vector illustration, no text",
                "tutor_says": "¿Sabías que dominar el presente simple te permite describir el 80% de lo que haces en tu vida cotidiana? En esta sesión de integración uniremos afirmaciones, preguntas y adverbios de frecuencia para que puedas sostener una conversación fluida y natural sobre tus hábitos.",
                "board_content": "🌟 SÍNTESIS TOTAL DE A1.2 (INTEGRACIÓN):\n\n• Afirmaciones: \"I wake up at 7 AM every day\"\n• Negaciones: \"She doesn't work on Sundays\"\n• Preguntas: \"Do you usually drink coffee in the morning?\"\n• Adverbios de frecuencia: always (100%), usually (80%), sometimes (50%), never (0%)\n\n👉 Meta de hoy: Describir tu semana completa con ritmo y naturalidad.",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Full Present Simple & Frequency",
                "target_audio_items": [
                    {"english": "I always drink coffee in the morning", "translation": "Siempre tomo café por la mañana", "label": "Hábito Diario"},
                    {"english": "Do you usually study on weekends?", "translation": "¿Usualmente estudias los fines de semana?", "label": "Pregunta de Rutina"},
                    {"english": "She doesn't watch TV at night", "translation": "Ella no ve televisión por la noche", "label": "Negación"}
                ],
                "grammar_structure": {
                    "title": "Síntesis del Presente Simple y Frecuencia",
                    "formula": "[ Sujeto ] + [ Adverbio de Frecuencia ] + [ Verbo ] + [ Complemento de Tiempo ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / She / We / They", "color": "blue"},
                        {"role": "Frecuencia", "pattern": "always / usually / sometimes / never", "color": "purple"},
                        {"role": "Verbo", "pattern": "drink / work / study / play", "color": "emerald"},
                        {"role": "Complemento", "pattern": "coffee / at 8 AM / on weekends", "color": "amber"}
                    ],
                    "explanation": "Los adverbios de frecuencia van antes del verbo de acción, y el complemento de tiempo cierra la idea.",
                    "example_breakdowns": [
                        {
                            "english": "I always drink coffee in the morning.",
                            "spanish": "Siempre tomo café por la mañana.",
                            "parts": [
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Frecuencia", "text": "always", "color": "purple"},
                                {"role": "Verbo", "text": "drink", "color": "emerald"},
                                {"role": "Complemento", "text": "coffee in the morning", "color": "amber"}
                            ]
                        }
                    ],
                    "tips": "Recuerda añadir '-s' o '-es' al verbo cuando hables de He, She o It (She usually works)."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Arquitectura de Preguntas y Respuestas Rápidas",
                "tutor_says": "Para preguntar por hábitos usamos 'Do' o 'Does' al inicio. Piensa en 'Do' y 'Does' como llaves que abren la pregunta: 'Do you study English every day?'. Para responder brevemente decimos 'Yes, I do' o 'No, I don't'.",
                "board_content": "⚡ FÓRMULAS DE PREGUNTA CON DO / DOES:\n\n• [ Do / Does ] + [ Sujeto ] + [ Verbo Base ] + [ Complemento ] ?\n\nEjemplos:\n• \"Do you live in a big city?\" ➔ \"Yes, I do / No, I don't\"\n• \"Does he practice sports on Saturday?\" ➔ \"Yes, he does\"\n\n📌 Regla: Con He/She/It el verbo vuelve a su forma base porque 'Does' ya lleva la -s.",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of two friendly coworkers discussing their daily routine at an office coffee corner, bright colorful palette, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Do/Does + Subject + Base Verb?",
                "target_audio_items": [
                    {"english": "Do you usually wake up early?", "translation": "¿Usualmente te despiertas temprano?", "label": "Pregunta de Hábito"},
                    {"english": "Yes, I always wake up at six", "translation": "Sí, siempre me despierto a las seis", "label": "Respuesta Fluida"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Práctica de Pronunciación y Ritmo de Frase",
                "tutor_says": "En inglés, las palabras de contenido (como 'always' y 'coffee') llevan más fuerza de voz, mientras que los pronombres se dicen de manera ligera y rápida. Escucha cómo conectamos las palabras: 'I always drink coffee in the morning'. ¡Graba tu voz!",
                "board_content": "🎙️ RETO DE RITMO Y FLUIDEZ:\n\n• Frase: \"I always drink coffee in the morning\"\n• Enlace fonético: drink_coffee / in_the_morning\n\nPresiona el micrófono y pronuncia con naturalidad.",
                "image_style": "comic_scene",
                "image_prompt": "comic book illustration of a student speaking enthusiastically into a studio microphone with sound waves, vibrant lighting, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia en voz alta: 'I always drink coffee in the morning'",
                "expected_answer": "I always drink coffee in the morning",
                "key_structure": "Spoken Rhythm & Linking",
                "target_audio_items": [
                    {"english": "I always drink coffee in the morning", "translation": "Siempre tomo café por la mañana", "label": "Práctica de Voz"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: El Desafío de la 3ra Persona",
                "tutor_says": "Uno de los errores más comunes al integrar el presente simple es olvidar cambiar el auxiliar 'don't' por 'doesn't' cuando hablamos de otra persona. Fíjate en la pizarra y corrige la oración.",
                "board_content": "⚔️ DETECCIÓN DE ERRORES FRECUENTES:\n\n❌ Error común: \"She don't work on weekends\"\n✅ Corrección: \"She doesn't work on weekends\"\n\n📌 Explicación: Con He, She o It la negación siempre es 'doesn't' + verbo base.",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D illustration of a blackboard with glowing checkmarks and grammatical formulas, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige la oración: 'She don't work on weekends'",
                "expected_answer": "She doesn't work on weekends",
                "key_structure": "Subject + doesn't + Base Verb",
                "target_audio_items": [
                    {"english": "She doesn't work on weekends", "translation": "Ella no trabaja los fines de semana", "label": "Frase Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Diálogo Continuo y Producción Conversacional",
                "tutor_says": "¡Excelente! Ahora pondremos todo en práctica en una conversación real. Te pregunto sobre tus fines de semana y tú responderás usando un adverbio de frecuencia.",
                "board_content": "🎭 DIÁLOGO EN VIVO:\n\nTutor: \"What do you usually do on Saturday morning?\"\n\nTu respuesta modelo:\n• \"I usually meet my friends and play sports.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two friends meeting at a sunny park cafe discussing weekend plans, vibrant colors, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde: 'I usually meet my friends and play sports.'",
                "expected_answer": "I usually meet my friends and play sports",
                "key_structure": "Conversational Habit Dialogue",
                "target_audio_items": [
                    {"english": "What do you usually do on Saturday morning?", "translation": "¿Qué haces usualmente el sábado por la mañana?", "label": "Pregunta"},
                    {"english": "I usually meet my friends and play sports", "translation": "Usualmente me reúno con mis amigos y practico deportes", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen de Dominio: Presente Simple Total",
                "tutor_says": "¡Felicitaciones! Has completado el módulo de integración de A1.2. Ahora dominas cómo afirmar, negar, preguntar y expresar la frecuencia exacta de tus actividades diarias en inglés. ¡Estás listo para el siguiente nivel!",
                "board_content": "🏆 RESUMEN DE DOMINIO A1.2:\n\n✔ Afirmaciones con hábitos diarios\n✔ Preguntas con Do y Does\n✔ Adverbios de frecuencia (always, usually, sometimes, never)\n✔ Fluidez oral en diálogos de rutina",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a shining gold medal award with stars, celebration banner, clean vibrant colors, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "A1.2 Integration Complete",
                "target_audio_items": []
            }
        ]
    }


def _derive_topic_sentence_models(topic: str, grammar_core: str, vocab_core: str, sublevel: str) -> dict:
    """Generates authentic, highly contextualized CEFR sentence models and typical errors based on topic."""
    low = f"{topic} {grammar_core}".lower()
    
    if any(k in low for k in ["routine", "rutina", "daily", "present simple", "habit", "third person"]):
        return {
            "model_1": "Mateo wakes up at six in the morning and drinks hot coffee.",
            "model_trans_1": "Mateo se despierta a las seis de la mañana y toma café caliente.",
            "model_2": "She always studies English before going to work.",
            "model_trans_2": "Ella siempre estudia inglés antes de ir a trabajar.",
            "err_wrong": "He wake up early and study every day.",
            "err_correct": "He wakes up early and studies every day.",
            "err_tip": "En tercera persona (He / She / It), agregamos -s o -es al verbo en presente simple.",
            "dialogue_q": "What time do you usually wake up on weekdays?",
            "dialogue_a": "I usually wake up at seven o'clock and have breakfast.",
            "formula_pattern": "Sujeto + Verbo(+-s) + Complemento",
            "formula_role_pattern": "wake up / wakes up / works / studies"
        }
    elif any(k in low for k in ["past continuous", "pasado continuo", "interrupted action", "was/were +", "while i was", "while they were"]):
        return {
            "model_1": "I was cooking dinner in the kitchen when the lights suddenly went out.",
            "model_trans_1": "Estaba cocinando la cena en la cocina cuando de repente se fue la luz.",
            "model_2": "While they were walking in the park, it began to rain heavily.",
            "model_trans_2": "Mientras ellos caminaban por el parque, empezó a llover fuerte.",
            "err_wrong": "I was cook dinner when she was call me.",
            "err_correct": "I was cooking dinner when she called me.",
            "err_tip": "La acción continua lleva 'was/were + -ing', y la acción que interrumpe va en Past Simple.",
            "dialogue_q": "What were you doing at eight o'clock yesterday evening?",
            "dialogue_a": "I was watching an interesting movie with my family.",
            "formula_pattern": "Sujeto + was/were + Verbo(-ing) + when + Past Simple",
            "formula_role_pattern": "was cooking / were walking / was studying"
        }
    elif any(k in low for k in ["present perfect", "experience", "have you ever"]):
        return {
            "model_1": "I have visited three different countries in Europe this year.",
            "model_trans_1": "He visitado tres países diferentes en Europa este año.",
            "model_2": "She has worked at this international company for five years.",
            "model_trans_2": "Ella ha trabajado en esta empresa internacional durante cinco años.",
            "err_wrong": "I have went to London last summer.",
            "err_correct": "I have been to London / I went to London last summer.",
            "err_tip": "No uses fechas específicas pasadas (last summer) con Present Perfect; usa Participio V3 (been/worked).",
            "dialogue_q": "Have you ever traveled to an English-speaking country?",
            "dialogue_a": "Yes, I have traveled to Canada and it was wonderful.",
            "formula_pattern": "Sujeto + have/has + Participio (V3) + Complemento",
            "formula_role_pattern": "have visited / has worked / have seen"
        }
    elif any(k in low for k in ["second conditional", "2nd conditional"]):
        return {
            "model_1": "If I won the lottery tomorrow, I would travel around the whole world.",
            "model_trans_1": "Si ganara la lotería mañana, viajaría por todo el mundo.",
            "model_2": "If she had more free time, she could learn another language.",
            "model_trans_2": "Si ella tuviera más tiempo libre, podría aprender otro idioma.",
            "err_wrong": "If I would win the lottery, I bought a big house.",
            "err_correct": "If I won the lottery, I would buy a big house.",
            "err_tip": "En la condición 'If' usamos Past Simple ('won/had'); en el resultado usamos 'would + Verbo Base'.",
            "dialogue_q": "What would you do if you could live anywhere in the world?",
            "dialogue_a": "If I could live anywhere, I would choose to live in Japan.",
            "formula_pattern": "If + Sujeto + Past Simple, Sujeto + would + Verbo Base",
            "formula_role_pattern": "If I won -> I would travel / If she were -> she could help"
        }
    elif any(k in low for k in ["third conditional", "3rd conditional"]):
        return {
            "model_1": "If I had studied harder in college, I would have passed the examination.",
            "model_trans_1": "Si hubiera estudiado más en la universidad, habría aprobado el examen.",
            "model_2": "If we had left earlier, we would not have missed our flight.",
            "model_trans_2": "Si hubiéramos salido más temprano, no habríamos perdido el vuelo.",
            "err_wrong": "If I would have studied, I would passed.",
            "err_correct": "If I had studied, I would have passed.",
            "err_tip": "En la condición usamos 'had + V3', y en el resultado usamos 'would have + V3'.",
            "dialogue_q": "What would you have done differently if you had known the truth?",
            "dialogue_a": "If I had known the truth, I would have warned my friends immediately.",
            "formula_pattern": "If + Sujeto + had + V3, Sujeto + would have + V3",
            "formula_role_pattern": "If had studied -> would have passed"
        }
    elif any(k in low for k in ["wish", "regret"]):
        return {
            "model_1": "I wish I had more free time to travel and explore new cultures.",
            "model_trans_1": "Desearía tener más tiempo libre para viajar y explorar nuevas culturas.",
            "model_2": "She wishes she had accepted the job offer last year.",
            "model_trans_2": "Ella desearía haber aceptado la oferta de trabajo el año pasado.",
            "err_wrong": "I wish I am rich and famous.",
            "err_correct": "I wish I were rich and famous.",
            "err_tip": "Para deseos presentes usamos 'wish + Past Simple' (I wish I had/were).",
            "dialogue_q": "What is one thing you wish you could change about your routine?",
            "dialogue_a": "I wish I could wake up earlier without feeling exhausted.",
            "formula_pattern": "Sujeto + wish + Past Simple / had + V3",
            "formula_role_pattern": "I wish I had / she wishes she had known"
        }
    elif any(k in low for k in ["relative clause", "relative clauses", "who / which / that"]):
        return {
            "model_1": "I met an inspiring professor who speaks six different languages fluently.",
            "model_trans_1": "Conocí a un profesor inspirador que habla seis idiomas diferentes con fluidez.",
            "model_2": "The software which we installed yesterday solved all our technical issues.",
            "model_trans_2": "El software que instalamos ayer resolvió todos nuestros problemas técnicos.",
            "err_wrong": "I met a woman she speaks six languages.",
            "err_correct": "I met a woman who speaks six languages.",
            "err_tip": "Une las dos ideas con 'who' para personas, 'which' para cosas, o 'that' para ambos.",
            "dialogue_q": "Can you describe the teacher who influenced you the most?",
            "dialogue_a": "She was an extraordinary mentor who always believed in our potential.",
            "formula_pattern": "Sustantivo + who/which/that + Cláusula Relativa",
            "formula_role_pattern": "a professor who speaks / the software which we installed"
        }
    elif any(k in low for k in ["deduction", "modals of deduction", "must have", "can't have"]):
        return {
            "model_1": "She must have left her keys at home because she cannot find them anywhere.",
            "model_trans_1": "Ella debe haber dejado sus llaves en casa porque no las encuentra en ningún lugar.",
            "model_2": "He can't have committed that mistake because he is extremely thorough.",
            "model_trans_2": "Él no puede haber cometido ese error porque es extremadamente meticuloso.",
            "err_wrong": "She must left her keys / She mustn't have done it.",
            "err_correct": "She must have left her keys / She can't have done it.",
            "err_tip": "Para deducción en pasado usa 'must have + V3' (casi seguro) o 'can't have + V3' (imposible).",
            "dialogue_q": "Why is the office completely dark right now?",
            "dialogue_a": "Everyone must have gone home because it is already eight o'clock.",
            "formula_pattern": "Sujeto + must/might/can't + have + Participio (V3) + Complemento",
            "formula_role_pattern": "must have left / can't have committed / might have forgotten"
        }
    elif any(k in low for k in ["conditional", "condicional", "if +"]):
        return {
            "model_1": "If you practice speaking every single day, your fluency will improve rapidly.",
            "model_trans_1": "Si practicas hablar todos los días, tu fluidez mejorará rápidamente.",
            "model_2": "If it rains tomorrow morning, we will stay at home and read.",
            "model_trans_2": "Si llueve mañana por la mañana, nos quedaremos en casa a leer.",
            "err_wrong": "If you will study hard, you pass the exam.",
            "err_correct": "If you study hard, you will pass the exam.",
            "err_tip": "En la cláusula con 'If' usamos Present Simple; el 'will' va en la cláusula de resultado.",
            "dialogue_q": "What will you do if the weather is sunny this weekend?",
            "dialogue_a": "If the weather is sunny, I will go cycling in the countryside.",
            "formula_pattern": "If + Sujeto + Present Simple, Sujeto + will + Verbo Base",
            "formula_role_pattern": "practice -> will improve / rains -> will stay"
        }
    elif any(k in low for k in ["passive", "pasiva"]):
        return {
            "model_1": "English is spoken by millions of people across the entire world.",
            "model_trans_1": "El inglés es hablado por millones de personas en todo el mundo.",
            "model_2": "The new bridge was built by experienced engineers last year.",
            "model_trans_2": "El nuevo puente fue construido por ingenieros experimentados el año pasado.",
            "err_wrong": "The report wrote by the manager yesterday.",
            "err_correct": "The report was written by the manager yesterday.",
            "err_tip": "La voz pasiva siempre requiere el verbo 'to be' en el tiempo correcto + Participio Pasado (V3).",
            "dialogue_q": "How is coffee produced in Latin America?",
            "dialogue_a": "Coffee beans are harvested by hand and exported worldwide.",
            "formula_pattern": "Objeto + to be + Participio (V3) + (by Agente)",
            "formula_role_pattern": "is spoken / was built / are harvested"
        }
    elif any(k in low for k in ["phrasal", "particle", "out", "up", "off", "on"]):
        return {
            "model_1": "We need to find out what happened before making a final decision.",
            "model_trans_1": "Necesitamos averiguar qué ocurrió antes de tomar una decisión final.",
            "model_2": "He turned down the job offer because the salary was too low.",
            "model_trans_2": "Él rechazó la oferta de trabajo porque el salario era muy bajo.",
            "err_wrong": "I ran of sugar this morning.",
            "err_correct": "I ran out of sugar this morning.",
            "err_tip": "Las partículas espaciales alteran el significado del verbo; 'run out of' significa agotarse.",
            "dialogue_q": "How do you figure out complex problems at work?",
            "dialogue_a": "I break them down into small steps and work through them.",
            "formula_pattern": "Sujeto + Verbo + Partícula + Complemento",
            "formula_role_pattern": "find out / turn down / run out of / figure out"
        }
    elif any(k in low for k in ["modal", "advice", "obligation", "should", "must", "have to"]):
        return {
            "model_1": "You should drink plenty of water and rest when you feel tired.",
            "model_trans_1": "Deberías beber abundante agua y descansar cuando te sientas cansado.",
            "model_2": "Students must turn off their mobile phones during the official exam.",
            "model_trans_2": "Los estudiantes deben apagar sus teléfonos móviles durante el examen oficial.",
            "err_wrong": "You should to see a doctor immediately.",
            "err_correct": "You should see a doctor immediately.",
            "err_tip": "Los verbos modales (should, must, can) van seguidos directamente por el verbo base sin 'to'.",
            "dialogue_q": "What should I do to improve my English listening skills?",
            "dialogue_a": "You should listen to English podcasts and audiobooks every day.",
            "formula_pattern": "Sujeto + Modal (should/must) + Verbo Base (V1) + Complemento",
            "formula_role_pattern": "should drink / must turn off / have to practice"
        }
    elif any(k in low for k in ["future", "going to", "will"]):
        return {
            "model_1": "I am going to visit my grandparents in the countryside this weekend.",
            "model_trans_1": "Voy a visitar a mis abuelos en el campo este fin de semana.",
            "model_2": "I think artificial intelligence will transform education in the future.",
            "model_trans_2": "Creo que la inteligencia artificial transformará la educación en el futuro.",
            "err_wrong": "I going to travel to London next month.",
            "err_correct": "I am going to travel to London next month.",
            "err_tip": "Con 'be going to' es obligatorio incluir la forma de 'to be' (am/is/are).",
            "dialogue_q": "What are you going to do after this English class?",
            "dialogue_a": "I am going to practice my pronunciation and review the notes.",
            "formula_pattern": "Sujeto + be (am/is/are) + going to + Verbo Base",
            "formula_role_pattern": "am going to visit / is going to study / will transform"
        }
    else:
        # High quality CEFR default
        is_b = sublevel.startswith("B1") or sublevel.startswith("B2")
        v_first = vocab_core.split(",")[0].strip() if vocab_core else "communication"
        g_first = grammar_core.split(",")[0].strip() if grammar_core else topic
        return {
            "model_1": f"In daily communication, we apply {g_first.lower()} with total accuracy.",
            "model_trans_1": f"En la comunicación cotidiana, aplicamos {g_first.lower()} con total precisión.",
            "model_2": f"She demonstrates strong command of {v_first.lower()} in her conversations.",
            "model_trans_2": f"Ella demuestra un sólido dominio de {v_first.lower()} en sus conversaciones.",
            "err_wrong": f"He explain the rule to me without respect the grammar structure.",
            "err_correct": f"He explains the rule to me following the correct grammar structure.",
            "err_tip": f"Respeta siempre la concordancia sintáctica y los patrones de {topic}.",
            "dialogue_q": f"How do you effectively use {topic.lower()} in real life?",
            "dialogue_a": f"I practice applying the core structure in everyday English conversations.",
            "formula_pattern": f"Sujeto + {g_first} + Complemento",
            "formula_role_pattern": f"{g_first} / {v_first}"
        }


def _build_curriculum_node_fallback(node: dict, sublevel: str) -> dict:
    """Dynamically builds an authentic pedagogical 6-phase lesson from any CURRICULUM_GRAPH class node."""
    topic = node.get("topic", "English Lesson")
    grammar_core = node.get("grammar_core", "Grammar & Vocabulary Structure")
    vocab_core = node.get("vocabulary_core", "Core Vocabulary")
    can_do = node.get("can_do", f"Express ideas clearly about {topic}")
    
    first_grammar_rule = grammar_core.split(",")[0].strip() if grammar_core else topic
    first_vocab = vocab_core.split(",")[0].strip() if vocab_core else "everyday situations"

    models = _derive_topic_sentence_models(topic, grammar_core, vocab_core, sublevel)
    model_sent_1 = models["model_1"]
    model_sent_trans_1 = models["model_trans_1"]
    model_sent_2 = models["model_2"]
    model_sent_trans_2 = models["model_trans_2"]
    err_wrong = models["err_wrong"]
    err_correct = models["err_correct"]
    err_tip = models["err_tip"]
    practice_dialogue_q = models["dialogue_q"]
    practice_dialogue_a = models["dialogue_a"]
    formula_pattern = models["formula_pattern"]

    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": topic,
        "level": sublevel.split(".")[0],
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": f"1. Fundamentos y Enfoque de {topic}",
                "tutor_says": f"¡Bienvenido a tu clase de {topic}! En esta lección aprenderemos a dominar {grammar_core}. Piensa en esta estructura como una herramienta de precisión para comunicarte con total seguridad en nivel {sublevel}. Fíjate en la oración modelo principal: '{model_sent_1}'.",
                "board_content": f"📌 FUNDAMENTOS DE {topic.upper()}:\n\n• Enfoque gramatical: {grammar_core}\n• Vocabulario clave: {vocab_core}\n• Meta comunicativa: {can_do}\n\n👉 Oración Modelo Principal:\n\"{model_sent_1}\"\n(Traducción: {model_sent_trans_1})",
                "image_style": "comic_scene",
                "image_prompt": f"comic book panel illustration of young learners having an engaging conversation about {topic} in a bright modern study lounge, warm atmospheric lighting, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": f"{first_grammar_rule}",
                "target_audio_items": [
                    {"english": model_sent_1, "translation": model_sent_trans_1, "label": "Oración Principal"},
                    {"english": model_sent_2, "translation": model_sent_trans_2, "label": "Ejemplo Modelo"}
                ],
                "grammar_structure": {
                    "title": f"Estructura Nuclear: {topic}",
                    "formula": f"[ {formula_pattern} ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / She / We / They", "color": "blue"},
                        {"role": "Estructura Clave", "pattern": first_grammar_rule, "color": "purple"},
                        {"role": "Vocabulario", "pattern": first_vocab, "color": "emerald"},
                        {"role": "Complemento", "pattern": "Time / Context / Place", "color": "amber"}
                    ],
                    "explanation": f"Aplica '{first_grammar_rule}' manteniendo siempre el orden sintáctico natural.",
                    "example_breakdowns": [
                        {
                            "english": model_sent_1,
                            "spanish": model_sent_trans_1,
                            "parts": [
                                {"role": "Sujeto", "text": model_sent_1.split()[0] if model_sent_1 else "I", "color": "blue"},
                                {"role": "Estructura", "text": first_grammar_rule[:20], "color": "purple"},
                                {"role": "Vocabulario", "text": first_vocab.lower()[:20], "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": err_tip
                }
            },
            {
                "phase_number": 2,
                "phase_name": f"2. Desglose Gramatical y Sintaxis de {topic}",
                "tutor_says": f"Desglosemos la sintaxis de {topic} paso a paso. Para estructurar oraciones con precisión, aplicamos: {grammar_core}. Observa cómo cada término cumple una función indispensable en la frase y escucha el segundo ejemplo modelo.",
                "board_content": f"⚡ FÓRMULAS Y REGLAS DE {topic.upper()}:\n\n• Regla principal: {grammar_core}\n• Vocabulario de apoyo: {vocab_core}\n• Aplicación práctica: {can_do}\n\n👉 Segundo Ejemplo Modelo:\n\"{model_sent_2}\"\n(Traducción: {model_sent_trans_2})\n\n📌 Regla de oro: {err_tip}",
                "image_style": "flat_art",
                "image_prompt": f"flat 2D vector educational illustration of a student taking notes on a modern desk with colorful grammar formula cards, clean minimalist design, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": f"{first_grammar_rule}",
                "target_audio_items": [
                    {"english": model_sent_2, "translation": model_sent_trans_2, "label": "Fórmula Maestra"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto de Pronunciación y Ritmo de Frase",
                "tutor_says": f"Llegó el momento de entrenar la pronunciación y la fluidez oral en {topic}. Escucha la frase modelo con atención y graba tu pronunciación conectando las palabras de forma continua usando tu micrófono.",
                "board_content": f"🗣️ RETO FONÉTICO:\n\n• \"{model_sent_1}\"\n(Traducción: {model_sent_trans_1})\n\nClave de articulación:\n• Enlace de palabras y ritmo natural\n• Vocabulario objetivo: {vocab_core}\n\nGraba tu voz con el micrófono.",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student speaking with confidence into a studio microphone, expressive cell shading, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": f"Pronuncia en voz alta: '{model_sent_1}'",
                "expected_answer": model_sent_1,
                "key_structure": "Spoken Fluency Drill",
                "target_audio_items": [
                    {"english": model_sent_1, "translation": model_sent_trans_1, "label": "Práctica de Voz"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Detección y Corrección de Errores Típicos",
                "tutor_says": f"Analicemos el error más común que cometen los estudiantes al aplicar {topic}: la interferencia del orden sintáctico en español. Observa la corrección en la pizarra: decimos '{err_correct}' y nunca '{err_wrong}'. Resuelve el desafío.",
                "board_content": f"⚔️ ANÁLISIS DE ERROR FRECUENTE:\n\n❌ Incorrecto: \"{err_wrong}\"\n✅ Correcto: \"{err_correct}\"\n\n📌 Regla: {err_tip}",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D concept art of an interactive chalkboard with glowing green checkmarks and study notes, strictly no text",
                "interaction_type": "error_correction",
                "student_task": f"Corrige la oración: '{err_wrong}'",
                "expected_answer": err_correct,
                "key_structure": "Error Correction",
                "target_audio_items": [
                    {"english": err_correct, "translation": "Oración corregida", "label": "Frase Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol y Producción Comunicativa",
                "tutor_says": f"Vamos a simular una conversación real. Te formularé la pregunta '{practice_dialogue_q}'. Tu objetivo es responder en inglés aplicando la estructura aprendida: '{practice_dialogue_a}'.",
                "board_content": f"🎭 DESAFÍO COMUNICATIVO:\n\nPregunta: \"{practice_dialogue_q}\"\n\nTu respuesta modelo:\n• \"{practice_dialogue_a}\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of two friendly people conversing outdoors in a vibrant city setting, strictly no text",
                "interaction_type": "roleplay",
                "student_task": f"Responde a la pregunta: '{practice_dialogue_a}'",
                "expected_answer": practice_dialogue_a,
                "key_structure": "Communicative Roleplay",
                "target_audio_items": [
                    {"english": practice_dialogue_q, "translation": "Pregunta de práctica", "label": "Pregunta"},
                    {"english": practice_dialogue_a, "translation": "Respuesta modelo", "label": "Juego de Rol"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": f"6. Resumen y Dominio: {topic}",
                "tutor_says": f"¡Excelente trabajo! Has completado la lección sobre {topic}. Hoy dominaste {grammar_core} y vocabulario clave como {vocab_core}. ¡Estás listo para el siguiente módulo!",
                "board_content": f"🎉 RESUMEN DE DOMINIO: {topic.upper()}\n\n✔ Gramática aprendida: {grammar_core}\n✔ Vocabulario dominado: {vocab_core}\n✔ Logro: {can_do}",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a shining golden trophy badge with stars, clean vibrant colors, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": f"{topic} Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_generic_interactive_fallback(topic: str, sublevel: str, is_a_level: bool) -> dict:
    """Fallback if topic is not in predefined catalog or curriculum graph."""
    node = find_curriculum_node(topic, sublevel)
    if node:
        return _build_curriculum_node_fallback(node, sublevel)

    clean_topic = topic.strip()
    return _build_curriculum_node_fallback(
        {"topic": clean_topic, "grammar_core": f"{clean_topic} structures and expressions", "vocabulary_core": "Key conversational phrases", "can_do": f"Communicate with confidence about {clean_topic}"},
        sublevel
    )


# Forward other builders to dedicated implementations
def _build_greetings_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "English Sounds & Introductions", "grammar_core": "Verb To Be (Affirmative), Subject Pronouns, Basic Sentence Structure", "vocabulary_core": "Greetings, Numbers 0-20, Alphabet sounds", "can_do": "Introduce yourself and greet others warmly"},
        sublevel
    )

def _build_numbers_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Numbers and Time", "grammar_core": "Telling the Time (It's... o'clock / past / to), Numbers 1-100", "vocabulary_core": "Numbers, Clock times, Daily schedules", "can_do": "Tell the exact time and count numbers fluently"},
        sublevel
    )

def _build_quantities_fallback(sublevel: str) -> dict:
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Quantities & Countable / Uncountable",
        "level": "A2",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Sustantivos Contables vs Incontables",
                "tutor_says": "Los sustantivos contables son cosas que puedes contar individualmente (one apple, two apples). Los incontables son líquidos, masas o conceptos abstractos que no se cuentan por unidades (water, sugar, money, time). Para preguntar cantidad usamos 'How many' con contables y 'How much' con incontables.",
                "board_content": "📌 SUSTANTIVOS CONTABLES VS INCONTABLES:\n\n• Contables (How many...?) → apples, chairs, bottles, people\n• Incontables (How much...?) → water, coffee, money, time, sugar\n\nEjemplos:\n• \"How many apples do you want?\"\n• \"How much water do you drink?\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student grocery shopping in a vibrant colorful supermarket examining apples and water bottles, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "How much / How many",
                "target_audio_items": [
                    {"english": "How many apples do you have?", "translation": "¿Cuántas manzanas tienes?", "label": "Contables"},
                    {"english": "How much water do you need?", "translation": "¿Cuánta agua necesitas?", "label": "Incontables"}
                ]
            },
            {
                "phase_number": 2,
                "phase_name": "2. Cuantificadores: Some, Any, Much, Many, A lot of",
                "tutor_says": "Usamos 'some' en oraciones afirmativas ('I have some apples') y 'any' en preguntas y negaciones ('Do you have any sugar?' / 'I don't have any money'). 'A lot of' funciona tanto con contables como con incontables.",
                "board_content": "⚡ CUANTIFICADORES PRINCIPALES:\n\n• SOME (afirmaciones) → \"I have some milk\"\n• ANY (preguntas y negativas) → \"Do you have any apples?\" / \"I don't have any sugar\"\n• MUCH (incontables) / MANY (contables)\n• A LOT OF (ambos)",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of pantry items with quantifier labels, clean colorful graphic design, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Some (affirmative) / Any (negative & question)",
                "target_audio_items": [
                    {"english": "I have some milk in the fridge", "translation": "Tengo algo de leche en el refrigerador", "label": "Some"},
                    {"english": "I don't have any money", "translation": "No tengo nada de dinero", "label": "Any"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Enlace 'How much' y 'How many'",
                "tutor_says": "Practica el ritmo de las preguntas de cantidad con tu micrófono: 'How many apples do you need?'.",
                "board_content": "🗣️ RETO FONÉTICO:\n\n• \"How many apples do you need?\"\n• \"How much water do you drink every day?\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a customer speaking to a fruit vendor in a sunny marketplace, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con fluidez: 'How much water do you drink every day?'",
                "expected_answer": "How much water do you drink every day?",
                "key_structure": "How much / How many Pronunciation",
                "target_audio_items": [
                    {"english": "How much water do you drink every day?", "translation": "¿Cuánta agua tomas todos los días?", "label": "Pregunta de Cantidad"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: Much con Incontables",
                "tutor_says": "Corrige el error: 'money' es incontable en inglés, por lo que debemos usar 'How much' y no 'How many'.",
                "board_content": "⚔️ ANÁLISIS DE ERROR:\n\n❌ Incorrecto: \"How many money do you have?\"\n✅ Correcto: \"How much money do you have?\"\n\n❌ Incorrecto: \"I don't have some money.\"\n✅ Correcto: \"I don't have any money.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D concept art of a study desk with glowing checkmarks, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige 'many' por 'much': 'How many money do you have?'",
                "expected_answer": "How much money do you have?",
                "key_structure": "How much + uncountable",
                "target_audio_items": [
                    {"english": "How much money do you have?", "translation": "¿Cuánto dinero tienes?", "label": "Frase Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: Compras en el Supermercado",
                "tutor_says": "En la panadería te preguntan: 'How many bread rolls would you like?'. Responde: 'I would like five bread rolls and some coffee, please'.",
                "board_content": "🎭 JUEGO DE ROL:\n\nVendedor: \"How many bread rolls would you like?\"\nTu respuesta: \"I would like five bread rolls and some coffee, please.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a customer ordering bread and coffee at a cozy artisan bakery counter, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde: 'I would like five bread rolls and some coffee, please'",
                "expected_answer": "I would like five bread rolls and some coffee, please",
                "key_structure": "Shopping with Quantifiers",
                "target_audio_items": [
                    {"english": "How many would you like?", "translation": "¿Cuántos te gustaría?", "label": "Pregunta"},
                    {"english": "I would like five bread rolls and some coffee, please", "translation": "Quisiera cinco panecillos y algo de café, por favor", "label": "Respuesta"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Cantidades",
                "tutor_says": "¡Excelente! Has dominado sustantivos contables e incontables, how much/many y some/any.",
                "board_content": "🎉 RESUMEN:\n\n✔ How many + contables (apples, books)\n✔ How much + incontables (water, money)\n✔ Some (afirmativa) / Any (pregunta y negativa)",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden trophy cup with grocery basket badge, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Quantities Mastery",
                "target_audio_items": []
            }
        ]
    }


def _build_comparatives_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Comparatives", "grammar_core": "Comparative Adjectives (-er than / more... than / better / worse / as... as)", "vocabulary_core": "Descriptive adjectives, City vs nature, Objects", "can_do": "Compare two items, places, or people accurately"},
        sublevel
    )

def _build_superlatives_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Superlatives", "grammar_core": "Superlative Adjectives (the -est / the most... / the best / the worst)", "vocabulary_core": "World records, Geographic features, Extreme adjectives", "can_do": "Identify and describe the extreme highest/lowest in a group"},
        sublevel
    )

def _build_past_continuous_fallback(sublevel: str) -> dict:
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Past Continuous & Interrupted Actions",
        "level": "A2",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: Past Continuous & Interrupciones (When / While)",
                "tutor_says": "Imagina que estás en medio de una acción en el pasado: cocinando, estudiando o manejando ('I was cooking'). De repente, ocurre un evento súbito y puntual que corta esa acción: sonó el teléfono ('the phone rang'). Usamos el Past Continuous (was/were + -ing) para la acción larga en progreso, y el Past Simple para la interrupción súbita, unidos por 'when' o 'while'. Observa el gráfico en la pizarra.",
                "board_content": "📌 PAST CONTINUOUS & ACCIONES INTERRUMPIDAS:\n\n• Acción de Fondo (en progreso) → was/were + -ing\n  Ejemplo: \"I was cooking dinner...\"\n\n• Interrupción Súbita (puntual) → Past Simple\n  Ejemplo: \"...when the phone rang!\"\n\n🔗 Reglas de Conectores:\n• WHEN + Acción corta puntual: \"I was studying when the lights went out\"\n• WHILE + Acción larga en progreso: \"While she was driving, it started to rain\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a young person in a modern kitchen cooking dinner at the stove when suddenly their smartphone rings with a bright glowing screen, expressive characters, vibrant warm lighting, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "was/were + -ing + WHEN + Past Simple",
                "target_audio_items": [
                    {"english": "I was cooking dinner when the phone rang", "translation": "Estaba cocinando la cena cuando sonó el teléfono", "label": "Oración Principal"},
                    {"english": "While she was driving, it started to rain", "translation": "Mientras ella manejaba, comenzó a llover", "label": "Conector While"},
                    {"english": "We were watching a movie when the lights went out", "translation": "Estábamos viendo una película cuando se fue la luz", "label": "Ejemplo Cotidiano"}
                ],
                "grammar_structure": {
                    "title": "Estructura: Past Continuous + When + Past Simple",
                    "formula": "[ Sujeto ] + [ was/were + -ing ] + [ WHEN ] + [ Sujeto ] + [ Verbo Pasado Simple ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / She / We / They", "color": "blue"},
                        {"role": "Acción en Progreso", "pattern": "was / were + studying", "color": "purple"},
                        {"role": "Conector", "pattern": "WHEN", "color": "rose"},
                        {"role": "Interrupción Súbita", "pattern": "the phone rang", "color": "emerald"}
                    ],
                    "explanation": "Usa 'was/were + -ing' para la acción continua que ya estaba ocurriendo cuando ocurrió la interrupción en pasado simple.",
                    "example_breakdowns": [
                        {
                            "english": "I was studying in my room when the lights went out.",
                            "spanish": "Estaba estudiando en mi habitación cuando se fue la luz.",
                            "parts": [
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Acción Continua", "text": "was studying in my room", "color": "purple"},
                                {"role": "Conector", "text": "when", "color": "rose"},
                                {"role": "Interrupción", "text": "the lights went out", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "Recuerda: 'was' se usa con I, he, she, it; 'were' se usa con you, we, they."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Desglose Gramatical: El Uso de 'While' vs 'When'",
                "tutor_says": "La regla de oro para no dudar nunca es: 'While' acompaña a la acción larga en progreso con '-ing' ('While I was walking in the park...'). En cambio, 'When' introduce la acción corta en pasado simple ('...when I found ten dollars').",
                "board_content": "⚡ REGLA DE ORO: WHILE vs WHEN\n\n1. WHILE + Past Continuous (Acción en progreso):\n   • \"While we were walking in the park, we saw an accident.\"\n   • \"While he was working, his computer turned off.\"\n\n2. WHEN + Past Simple (Acción que interrumpe):\n   • \"They were having lunch when someone knocked on the door.\"\n   • \"She was taking a shower when the water stopped.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of two contrasting grammar paths comparing While and When with timeline flow arrows, clean minimalist aesthetic, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "While + Past Continuous vs When + Past Simple",
                "target_audio_items": [
                    {"english": "While we were walking in the park, we saw an accident", "translation": "Mientras caminábamos en el parque, vimos un accidente", "label": "While + Progreso"},
                    {"english": "They were having lunch when someone knocked on the door", "translation": "Estaban almorzando cuando alguien tocó la puerta", "label": "When + Pasado"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Reto Fonético: Formas Débiles de 'Was' /wəz/ y 'Were' /wə/",
                "tutor_says": "En inglés conversacional natural, 'was' y 'were' casi nunca se pronuncian con estrés fuerte; se reducen a formas débiles: 'was' suena /wəz/ y 'were' suena /wə/ o /wər/. Escucha cómo fluye: 'I was /wəz/ cooking when you called'. Graba tu voz con el micrófono.",
                "board_content": "🗣️ RETO FONÉTICO: FORMAS DÉBILES (WEAK FORMS)\n\n• was → /wəz/ (sonido schwa relajado)\n• were → /wə/ o /wər/\n\nFrase de práctica:\n\"I was cooking when you called.\"\n(Conecta las palabras con ritmo natural)",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a student with headphones speaking confidently into a studio microphone, glowing acoustic soundwaves, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia con ritmo natural y forma débil: 'I was cooking when you called'",
                "expected_answer": "I was cooking when you called",
                "key_structure": "Weak forms: was /wəz/ & were /wə/",
                "target_audio_items": [
                    {"english": "I was cooking when you called", "translation": "Estaba cocinando cuando llamaste", "label": "Práctica de Voz"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Corrección de Errores: Inversión de While y When",
                "tutor_says": "Un error muy común de los hispanohablantes es usar 'while' delante de la acción corta puntual. No decimos 'I was sleeping while the alarm rang', sino 'I was sleeping WHEN the alarm rang'. Corrige el conector en la oración.",
                "board_content": "⚔️ ANÁLISIS DE ERROR FRECUENTE:\n\n❌ Incorrecto: \"I was sleeping while the alarm rang.\"\n✅ Correcto: \"I was sleeping when the alarm rang.\"\n\n❌ Incorrecto: \"When I was driving, it rained.\"\n✅ Correcto: \"While I was driving, it started to rain.\"",
                "image_style": "concept_art",
                "image_prompt": "cinematic 2D concept art of a chalkboard with glowing green checkmarks correcting a grammar sentence, warm cinematic lighting, strictly no text",
                "interaction_type": "error_correction",
                "student_task": "Corrige 'while' por 'when' en la interrupción: 'I was sleeping while the alarm rang'",
                "expected_answer": "I was sleeping when the alarm rang",
                "key_structure": "Past Continuous + WHEN + Past Simple",
                "target_audio_items": [
                    {"english": "I was sleeping when the alarm rang", "translation": "Estaba durmiendo cuando sonó la alarma", "label": "Frase Correcta"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Juego de Rol: La Coartada del Detective",
                "tutor_says": "Imagina que un detective te pregunta qué estabas haciendo ayer a las ocho de la noche cuando ocurrió el apagón: 'What were you doing yesterday at eight PM when the power went out?'. Responde con tu coartada en Past Continuous: 'I was having dinner with my family when the power went out'.",
                "board_content": "🎭 JUEGO DE ROL (ALIBI / COARTADA):\n\nDetective: \"What were you doing yesterday at eight PM when the power went out?\"\nTu respuesta: \"I was having dinner with my family when the power went out.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic book panel illustration of a modern friendly detective with a notebook interviewing a smiling witness in a cozy living room, cinematic colors, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Responde con tu coartada: 'I was having dinner with my family when the power went out'",
                "expected_answer": "I was having dinner with my family when the power went out",
                "key_structure": "Roleplay: Alibi with Past Continuous",
                "target_audio_items": [
                    {"english": "What were you doing when the power went out?", "translation": "¿Qué estabas haciendo cuando se fue la luz?", "label": "Pregunta Detective"},
                    {"english": "I was having dinner with my family when the power went out", "translation": "Estaba cenando con mi familia cuando se fue la luz", "label": "Tu Coartada"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Resumen y Dominio: Past Continuous & Interrupciones",
                "tutor_says": "¡Excelente trabajo! Has dominado el Past Continuous (was/were + -ing) para acciones de fondo en progreso y el uso preciso de When y While para conectar eventos e interrupciones en el pasado.",
                "board_content": "🎉 RESUMEN DE DOMINIO:\n\n✔ Past Continuous (was/were + -ing): Acción continua de fondo\n✔ Past Simple: Acción puntual que interrumpe\n✔ Regla: [Acción larga] + WHEN + [Acción corta]\n✔ Regla: WHILE + [Acción larga] , [Acción corta]",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a golden trophy badge with lightning and clock icons, clean minimalist aesthetic, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Past Continuous Mastery",
                "target_audio_items": []
            }
        ]
    }

def _build_present_perfect_vs_past_simple_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Present Perfect vs Past Simple", "grammar_core": "Finished vs Unfinished Time, Specific Time Markers (ago, in 2020) vs Open Time (so far, recently)", "vocabulary_core": "Life milestones, Career achievements, Time linkers", "can_do": "Distinguish clearly between completed past events and ongoing experiences"},
        sublevel
    )

def _build_present_perfect_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Experiences & Present Perfect Intro", "grammar_core": "Present Perfect with Ever and Never (Have you ever...?), Past Participles", "vocabulary_core": "Travel destinations, Adventurous activities, Bucket lists", "can_do": "Ask and talk about lifetime experiences with Have you ever"},
        sublevel
    )

def _build_present_continuous_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Present Continuous", "grammar_core": "Present Continuous (Subject + Be + Verb-ing), Present Simple vs Present Continuous Intro", "vocabulary_core": "Actions happening now, Temporary states, Phone calls", "can_do": "Describe actions happening right now at the moment of speaking"},
        sublevel
    )

def _build_future_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Future Forms Contrast", "grammar_core": "Will (Spontaneous/Predictions) vs Going To (Intentions) vs Present Continuous (Arrangements)", "vocabulary_core": "Weather forecasts, Predictions, Technology trends", "can_do": "Select the correct future form based on certainty and decision timing"},
        sublevel
    )

def _build_conditionals_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "First Conditional", "grammar_core": "First Conditional: If + Present Simple, will + Verb (Real possibilities)", "vocabulary_core": "Consequences, Weather possibilities, Plans and contingencies", "can_do": "Express real possibilities and likely outcomes in the future"},
        sublevel
    )

def _build_second_conditional_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Second Conditional", "grammar_core": "Second Conditional: If + Past Simple, would + Verb (Unreal / Imaginary situations in present/future)", "vocabulary_core": "Hypothetical dilemmas, Dreams, Advice (If I were you)", "can_do": "Speculate on imaginary and hypothetical present/future scenarios"},
        sublevel
    )

def _build_third_conditional_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Third Conditional", "grammar_core": "Third Conditional: If + Past Perfect, would have + V3 (Past hypothetical actions & consequences)", "vocabulary_core": "Historical turning points, Personal regrets, Alternative outcomes", "can_do": "Talk about past regrets and alternative historical outcomes"},
        sublevel
    )

def _build_wish_regret_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Wish & Regret", "grammar_core": "Wish + Past Simple (Present desires), Wish + Would (Annoyances), Wish + Past Perfect (Past regrets)", "vocabulary_core": "Desires, Annoyances, Regrets", "can_do": "Express nuanced desires for change in the present and regrets about the past"},
        sublevel
    )

def _build_passive_voice_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Passive Voice", "grammar_core": "Present & Past Passive (Be + Past Participle), Modal Passive (Can be done, Should be checked)", "vocabulary_core": "Inventions, Processes, News reports, Manufacturing", "can_do": "Focus on the action or object rather than the agent using passive structures"},
        sublevel
    )

def _build_reported_speech_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Reported Speech", "grammar_core": "Reported Statements, Questions & Commands (Backshifting tenses, say vs tell)", "vocabulary_core": "Reporting verbs, News interviews, Relaying messages", "can_do": "Accurately report what someone else said using tense backshifting"},
        sublevel
    )

def _build_relative_clauses_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Relative Clauses Introduction", "grammar_core": "Defining Relative Pronouns: Who (people), Which (things), That (both), Where (places)", "vocabulary_core": "Definitions, Recommending books/movies/places", "can_do": "Combine clauses and give detailed descriptions using who, which, that and where"},
        sublevel
    )

def _build_phrasal_verbs_spatial_fallback(sublevel: str) -> dict:
    """Rich curated fallback for A2.4: Everyday Phrasal Verbs: Spatial & Physical Particles."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Everyday Phrasal Verbs: Spatial & Physical Particles",
        "level": "A2",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Fundamentos: La Dirección Espacial de las Partículas",
                "tutor_says": "¡Bienvenido a la clase de Phrasal Verbs espaciales! En inglés, los phrasal verbs no son combinaciones caprichosas de palabras, sino que siguen una lógica física clara: el verbo describe la acción y la partícula indica el vector o dirección del movimiento. Con 'UP' la energía se orienta hacia arriba como en 'stand up' (ponerse de pie); con 'DOWN' hacia el suelo como en 'sit down' (sentarse); y con 'ON' y 'OFF' activamos o desactivamos un contacto como en 'turn on' y 'turn off'. Observa la primera oración modelo en la pizarra.",
                "board_content": "🧭 VECTORES ESPACIALES DE PARTÍCULAS:\n\n• UP (Hacia arriba) → stand up (ponerse de pie), get up (levantarse)\n• DOWN (Hacia abajo) → sit down (sentarse), put down (bajar/soltar)\n• ON (Contacto / Flujo) → turn on (encender), put on (ponerse ropa)\n• OFF (Separación) → turn off (apagar), take off (quitarse ropa)\n\n👉 Oración Modelo:\n\"Please stand up and turn on the classroom lights.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic panel of an encouraging teacher in a bright classroom demonstrating physical action verbs with a warm smile, clean 2D vector style, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Verb + Spatial Particle",
                "target_audio_items": [
                    {"english": "Please stand up", "translation": "Por favor ponte de pie", "label": "Vector UP"},
                    {"english": "Sit down on the chair", "translation": "Siéntate en la silla", "label": "Vector DOWN"},
                    {"english": "Turn on the lights", "translation": "Enciende las luces", "label": "Vector ON"}
                ],
                "grammar_structure": {
                    "title": "Estructura de Phrasal Verbs Espaciales",
                    "formula": "[ Sujeto ] + [ Verbo Base (Acción) ] + [ Partícula Espacial ] + [ Objeto ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / She / We", "color": "blue"},
                        {"role": "Verbo", "pattern": "stand / sit / turn / pick", "color": "purple"},
                        {"role": "Partícula", "pattern": "up / down / on / off", "color": "amber"},
                        {"role": "Objeto", "pattern": "the phone / the lights / the bag", "color": "emerald"}
                    ],
                    "explanation": "El verbo aporta el movimiento físico y la partícula orienta la dirección espacial exacta de la acción.",
                    "example_breakdowns": [
                        {
                            "english": "She turned on the radio.",
                            "spanish": "Ella encendió la radio.",
                            "parts": [
                                {"role": "Sujeto", "text": "She", "color": "blue"},
                                {"role": "Verbo", "text": "turned", "color": "purple"},
                                {"role": "Partícula", "text": "on", "color": "amber"},
                                {"role": "Objeto", "text": "the radio", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "Piensa en el movimiento físico o contacto que provoca la partícula antes de traducir."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Rutinas y Movimiento Físico Cotidiano",
                "tutor_says": "En nuestra rutina diaria usamos estos vectores constantemente. 'Wake up' es abrir los ojos cuando la consciencia sube, mientras que 'get up' es el acto físico de sacar el cuerpo de la cama y ponerse de pie. Si algo cae al suelo, decimos 'pick up' porque lo levantamos hacia arriba con la mano. Y al terminar de usarlo, decimos 'put down' porque lo devolvemos a la superficie. Observa la diferencia entre despertar y levantarse en la pizarra.",
                "board_content": "☀️ RUTINA DIARIA Y ACCIONES FÍSICAS:\n\n• Wake up → Despertar (abrir los ojos al amanecer)\n• Get up → Levantarse físicamente de la cama\n• Pick up → Recoger / Levantar algo del suelo o mesa\n• Put down → Colocar / Dejar algo sobre una superficie\n\n📌 Comparación Clave:\n\"I wake up at 6:00 AM, but I get up at 6:30 AM.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of a person waking up cheerfully in a sunny bedroom and picking up a notebook from the desk, clean colors, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "wake up vs get up",
                "target_audio_items": [
                    {"english": "I wake up early every morning", "translation": "Me despierto temprano cada mañana", "label": "Rutina"},
                    {"english": "He gets up at seven", "translation": "Él se levanta a las siete", "label": "Rutina física"},
                    {"english": "Pick up your notebook, please", "translation": "Recoge tu libreta, por favor", "label": "Acción física"}
                ],
                "grammar_structure": {
                    "title": "Contraste de Rutina: Wake up vs Get up",
                    "formula": "[ Sujeto ] + [ wake up / get up ] + [ Expresión de Tiempo ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / You / He / She", "color": "blue"},
                        {"role": "Phrasal Verb", "pattern": "wake up / get up", "color": "purple"},
                        {"role": "Tiempo", "pattern": "at 7:00 AM / early", "color": "amber"}
                    ],
                    "explanation": "'Wake up' refiere al estado mental consciente; 'get up' refiere al desplazamiento físico.",
                    "example_breakdowns": [
                        {
                            "english": "I wake up at 6:00 AM.",
                            "spanish": "Me despierto a las 6:00 AM.",
                            "parts": [
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Phrasal Verb", "text": "wake up", "color": "purple"},
                                {"role": "Tiempo", "text": "at 6:00 AM", "color": "amber"}
                            ]
                        }
                    ],
                    "tips": "No confundas 'wake up' (abrir los ojos) con 'get up' (salir físicamente de la cama)."
                }
            },
            {
                "phase_number": 3,
                "phase_name": "3. Conexión Fonética y Pronunciación Ligada (Connected Speech)",
                "tutor_says": "En la pronunciación real de los hablantes nativos, la consonante final del verbo salta y se fusiona fluidamente con la vocal de la partícula. Por ejemplo, en 'turn on' no se hace una pausa entre palabras: la 'n' se enlaza y suena /tɜːr-nɒn/. Lo mismo ocurre en 'pick up', que se pronuncia /pɪ-kʌp/, y en 'get in', que suena /ɡɛ-tɪn/. Escucha y practica esta conexión continua.",
                "board_content": "🗣️ PRONUNCIACIÓN LIGADA (CONNECTED SPEECH):\n\n• turn + on ➔ /tɜːr.nɒn/ (el sonido 'n' se une a 'on')\n• pick + up ➔ /pɪ.kʌp/ (el sonido 'k' se une a 'up')\n• get + in ➔ /ɡɛ.tɪn/ (el sonido 't' se une a 'in')\n• put + on ➔ /pʊ.tɒn/ (el sonido 't' se une a 'on')\n\n👉 Enlace Natural:\n\"Turn_on the lamp and pick_it_up.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational graphic showing visual sound waves connecting two words smoothly, bright cyan and amber highlights, strictly no text",
                "interaction_type": "pronunciation",
                "student_task": "Pronuncia la oración uniendo los sonidos de las palabras sin pausas intermedias: 'Turn on the lamp and pick up the book'",
                "expected_answer": "Turn on the lamp and pick up the book",
                "key_structure": "Linking: Consonant + Vowel",
                "target_audio_items": [
                    {"english": "Turn on the lamp", "translation": "Enciende la lámpara", "label": "Connected Speech"},
                    {"english": "Pick up the book", "translation": "Recoge el libro", "label": "Connected Speech"},
                    {"english": "Get in the car", "translation": "Sube al auto", "label": "Connected Speech"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Desglose y Análisis de Errores Típicos",
                "tutor_says": "Analicemos dos errores muy comunes cometidos por hispanohablantes. El primero es usar 'open the light' en lugar de 'turn on the light'; en inglés solo abrimos puertas o ventanas físicas, mientras que los circuitos eléctricos se encienden con 'turn on'. El segundo error es olvidar la partícula: decir 'I wake at 7' en vez de 'I wake up at 7'. Observa la tabla de correcciones en la pizarra.",
                "board_content": "⚠️ ERRORES COMUNES DE HISPANOHABLANTES:\n\n❌ Incorrecto: \"*Open the light*\" (Calco del español 'abrir la luz')\n✅ Correcto: \"Turn on the light\" (Activar el interruptor)\n\n❌ Incorrecto: \"*Close the TV*\"\n✅ Correcto: \"Turn off the TV\"\n\n❌ Incorrecto: \"*I stand from the chair*\"\n✅ Correcto: \"I stand up from the chair\"",
                "image_style": "comic_scene",
                "image_prompt": "comic panel showing a smart modern living room with a person turning on a stylish lamp using a wall switch, clean vector art, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Turn on/off vs Open/Close",
                "target_audio_items": [
                    {"english": "Turn on the light, please", "translation": "Enciende la luz, por favor", "label": "Uso Correcto"},
                    {"english": "Turn off the TV before sleeping", "translation": "Apaga la televisión antes de dormir", "label": "Uso Correcto"},
                    {"english": "Please sit down here", "translation": "Por favor siéntate aquí", "label": "Uso Correcto"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Práctica Guiada Interactiva",
                "tutor_says": "Es momento de poner en práctica lo que aprendiste. Completa la oración eligiendo el phrasal verb correcto según el contexto físico. A continuación, completa el ejercicio interactivo en la pizarra.",
                "board_content": "📝 EJERCICIO DE SELECCIÓN:\n\nCompleta la frase según el contexto:\n\"It is very dark in this room. Please __________ the light.\" [ turn on / turn off / sit down ]\n\n📌 Opciones:\n• turn on (encender)\n• turn off (apagar)\n• sit down (sentarse)",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational scene of a student confidently solving an exercise on a chalkboard in a modern classroom, strictly no text",
                "interaction_type": "quiz",
                "student_task": "Completa la oración: 'It is very dark in this room. Please __________ the light' [ turn on / turn off / sit down ]",
                "expected_answer": "turn on",
                "key_structure": "turn on the light",
                "target_audio_items": [
                    {"english": "Please turn on the light", "translation": "Por favor enciende la luz", "label": "Ejercicio Resuelto"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Producción Comunicativa Espontánea",
                "tutor_says": "¡Excelente progreso! Para cerrar la lección, describe en inglés a qué hora te despiertas y te levantas por las mañanas utilizando 'wake up' y 'get up'. A continuación, responde en la pizarra con tu frase completa.",
                "board_content": "🎯 DESAFÍO COMUNICATIVO:\n\nDescribe tu rutina matutina usando ambos phrasal verbs:\n👉 Modelo: \"I wake up at 6:30 AM and I get up at 7:00 AM.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of a student speaking with confidence in a friendly conversation, warm colors, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Di en inglés a qué hora te despiertas y a qué hora te levantas (ejemplo: 'I wake up at 7:00 AM and I get up at 7:15 AM')",
                "expected_answer": "I wake up at 7:00 AM and I get up at 7:15 AM",
                "key_structure": "I wake up at... and I get up at...",
                "target_audio_items": [
                    {"english": "I wake up at 7:00 AM and I get up at 7:15 AM", "translation": "Me despierto a las 7:00 AM y me levanto a las 7:15 AM", "label": "Producción Final"}
                ]
            }
        ]
    }


def _build_phrasal_verbs_out_up_fallback(sublevel: str) -> dict:
    """Rich curated fallback for B1.2: Phrasal Verbs: Cognitive Logic of OUT & UP."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Phrasal Verbs: Cognitive Logic of OUT & UP",
        "level": "B1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Semántica Cognitiva: El Esquema de Contenedor de 'OUT'",
                "tutor_says": "¡Bienvenido a la clase de semántica cognitiva de Phrasal Verbs! La partícula 'OUT' tiene como origen el esquema espacial de un contenedor: algo que se mueve desde el interior hacia el exterior. Pero en inglés, esta idea física se proyecta en metáforas mentales fascinantes. Cuando una verdad o dato oculto sale a la luz pública, usamos 'find out' (descubrir o averiguar). Cuando alguien sobresale visiblemente de un grupo, decimos 'stand out' (destacar). Fíjate en la oración modelo en la pizarra.",
                "board_content": "💡 EL ESQUEMA DE CONTENEDOR (PARTÍCULA 'OUT'):\n\n1. Salida física → walk out (salir caminando), get out (salir)\n2. De lo oculto a la luz (Descubrimiento / Visibilidad):\n   • find out → Descubrir información (la verdad sale a la luz)\n   • stand out → Sobresalir / Destacarse de la multitud\n   • point out → Señalar / Hacer visible un detalle importante\n\n👉 Oración Modelo:\n\"We need to find out the truth before the meeting.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic panel illustration of a team of detectives in a bright modern office discovering a key document that glows with discovery light, clean vector art, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "find out / stand out / point out",
                "target_audio_items": [
                    {"english": "We need to find out the truth", "translation": "Necesitamos descubrir la verdad", "label": "Descubrimiento"},
                    {"english": "Her creative ideas stand out", "translation": "Sus ideas creativas se destacan", "label": "Visibilidad"},
                    {"english": "He pointed out a critical mistake", "translation": "Él señaló un error crítico", "label": "Revelación"}
                ],
                "grammar_structure": {
                    "title": "Esquema Cognitivo de 'OUT' (Descubrimiento)",
                    "formula": "[ Sujeto ] + [ find out / stand out / point out ] + [ Objeto / Detalle ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "I / We / The team", "color": "blue"},
                        {"role": "Verbo + OUT", "pattern": "find out / point out", "color": "purple"},
                        {"role": "Información", "pattern": "the truth / the problem / the facts", "color": "emerald"}
                    ],
                    "explanation": "La partícula 'OUT' proyecta la idea de que la información sale del ocultamiento hacia el conocimiento consciente.",
                    "example_breakdowns": [
                        {
                            "english": "I found out the solution yesterday.",
                            "spanish": "Descubrí la solución ayer.",
                            "parts": [
                                {"role": "Sujeto", "text": "I", "color": "blue"},
                                {"role": "Verbo + OUT", "text": "found out", "color": "purple"},
                                {"role": "Información", "text": "the solution yesterday", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "Recuerda: 'find' es encontrar un objeto físico; 'find out' es descubrir información que no sabías."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Agotamiento y Resolución con 'OUT'",
                "tutor_says": "La partícula 'OUT' tiene dos extensiones metafóricas adicionales de gran importancia. La primera es el límite exterior o agotamiento total: cuando una sustancia sale por completo del stock, decimos 'run out of' (quedarse sin algo, como café o tiempo), y cuando una persona agota toda su energía decimos 'burn out'. La segunda es la resolución de problemas: 'figure out' o 'work out' significan extraer orden y solución fuera de un enredo caótico. Observa ambas ramas en la pizarra.",
                "board_content": "⚡ DOS METÁFORAS MÁS CON 'OUT':\n\n3. Agotamiento total (Límite exterior):\n   • run out of → Quedarse sin stock/recurso (\"We ran out of time\")\n   • sell out → Venderse todo hasta agotar existencias\n   • burn out → Quedar exhausto / Quemarse por exceso de trabajo\n\n4. Resolución del caos (Extraer la solución):\n   • figure out → Calcular / Descifrar la solución a un enigma\n   • work out → Resolver un problema / Dar buen resultado\n\n📌 Comparación:\n\"I figured out the problem before we ran out of budget.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration comparing an empty hourglass showing running out of time and a glowing lightbulb representing figuring out a solution, clean educational graphic, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "run out of vs figure out",
                "target_audio_items": [
                    {"english": "We ran out of coffee this morning", "translation": "Nos quedamos sin café esta mañana", "label": "Agotamiento"},
                    {"english": "I finally figured out the code", "translation": "Finalmente descifré el código", "label": "Resolución"},
                    {"english": "Everything will work out fine", "translation": "Todo se resolverá bien", "label": "Resultado"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. El Eje Vertical y la Completitud con 'UP'",
                "tutor_says": "Pasemos ahora a la partícula 'UP'. Además del movimiento hacia arriba como en 'stand up', en lingüística cognitiva 'UP' funciona como un marcador de telicidad y completitud total: cuando un recipiente se llena, el nivel del líquido sube hasta el borde. Por eso 'eat up' significa comerse todo el plato hasta el final, 'clean up' es limpiar a fondo sin dejar nada sucio, y 'wrap up' es concluir una reunión por completo. Además, con 'turn up' aumentamos el volumen según la metáfora 'More is Up'.",
                "board_content": "📈 LA PARTÍCULA 'UP' (COMPLETITUD Y AUMENTO):\n\n1. Completitud Total (Llenar hasta el tope):\n   • eat up / drink up → Comer/beber todo sin dejar sobras\n   • clean up → Limpiar completamente a fondo\n   • wrap up → Concluir o cerrar una reunión de forma definitiva\n\n2. Aumento de Escala (More is Up):\n   • turn up (the volume) → Subir el volumen / la intensidad\n   • speed up → Acelerar el paso\n\n3. Emergencia en la Mente:\n   • come up with → Idear o crear una solución ingeniosa",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of a professional team celebrating wrapping up a successful project in a modern boardroom, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "clean up / wrap up / come up with",
                "target_audio_items": [
                    {"english": "Let's clean up the kitchen", "translation": "Limpiemos la cocina por completo", "label": "Completitud UP"},
                    {"english": "We should wrap up the meeting", "translation": "Deberíamos concluir la reunión", "label": "Cierre total"},
                    {"english": "She came up with a great idea", "translation": "A ella se le ocurrió una gran idea", "label": "Emergencia mental"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Desconstrucción y Contraste de Contextos",
                "tutor_says": "Fíjate en cómo una sola partícula cambia radicalmente el matiz del verbo. 'Look for' es simplemente buscar con los ojos, mientras que 'look up' es consultar un dato en un diccionario o base de datos hasta encontrarlo. Y 'eat' es la acción de comer, mientras que 'eat up' añade la urgencia de terminar todo el alimento. No memorices traducciones: pregúntate qué fuerza espacial o metafórica aporta la partícula.",
                "board_content": "🔬 DESGLOSE DE MATICES METAFÓRICOS:\n\n• Look for (buscar físicamente) vs Look up (consultar un dato en un registro)\n• Eat (comer) vs Eat up (acabarse todo el plato hasta el final)\n• Run (correr) vs Run out of (quedarse sin existencias de algo)\n• Find (encontrar un objeto) vs Find out (descubrir un secreto o información)",
                "image_style": "comic_scene",
                "image_prompt": "comic panel showing a person consulting a large dictionary with a lightbulb above their head while cooking in the kitchen, clean vector art, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Particle Semantic Nuances",
                "target_audio_items": [
                    {"english": "Look up the word in the dictionary", "translation": "Busca la palabra en el diccionario", "label": "Consulta de datos"},
                    {"english": "Eat up your vegetables", "translation": "Cómete todas tus verduras", "label": "Completitud"},
                    {"english": "We ran out of milk", "translation": "Nos quedamos sin leche", "label": "Agotamiento"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Práctica Guiada de Selección y Deducción",
                "tutor_says": "Apliquemos la lógica cognitiva de 'OUT'. Elige la opción correcta para completar la frase en el contexto de resolver un problema complejo. A continuación, resuelve el ejercicio en la pizarra.",
                "board_content": "📝 EJERCICIO DE DEDUCCIÓN:\n\nCompleta la frase:\n\"After hours of research, the team finally __________ how to solve the error.\" [ figured out / ran out of / looked for ]\n\n📌 Opciones:\n• figured out (descifró / resolvió)\n• ran out of (se quedó sin)\n• looked for (buscó con la mirada)",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of a student selecting the right answer on an interactive board, strictly no text",
                "interaction_type": "quiz",
                "student_task": "Completa la oración: 'After hours of research, the team finally __________ how to solve the error' [ figured out / ran out of / looked for ]",
                "expected_answer": "figured out",
                "key_structure": "figured out how to solve",
                "target_audio_items": [
                    {"english": "The team finally figured out how to solve the error", "translation": "El equipo finalmente descifró cómo resolver el error", "label": "Ejercicio Resuelto"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Producción Espontánea y Fluidez",
                "tutor_says": "¡Brillante trabajo! Para concluir, cuéntame una situación en la que te hayas quedado sin tiempo o recursos usando 'ran out of', o una en la que hayas descubierto algo importante con 'found out'. A continuación, di tu oración completa en la pizarra.",
                "board_content": "🎯 DESAFÍO DE PRODUCCIÓN:\n\nConstruye una oración con 'find out' o 'run out of':\n👉 Modelo: \"Yesterday we ran out of coffee, but I found out there is a new store nearby.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector graphic of a professional explaining a solution during an interactive meeting, vibrant colors, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Di una oración en inglés usando 'find out' o 'run out of' (ejemplo: 'We ran out of time during the exam')",
                "expected_answer": "We ran out of time during the exam",
                "key_structure": "We ran out of... / I found out that...",
                "target_audio_items": [
                    {"english": "We ran out of time during the exam", "translation": "Nos quedamos sin tiempo durante el examen", "label": "Producción Final"}
                ]
            }
        ]
    }


def _build_phrasal_verbs_off_on_fallback(sublevel: str) -> dict:
    """Rich curated fallback for B1.4: Phrasal Verbs: Particle Semantics of OFF, ON, AWAY & BACK."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Phrasal Verbs: Particle Semantics of OFF, ON, AWAY & BACK",
        "level": "B1",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. El Contraste de Contacto y Separación: 'ON' vs 'OFF'",
                "tutor_says": "¡Bienvenido a la clase de semántica de partículas intermedias! En este nivel exploramos la oposición fundamental entre 'ON' (contacto, activación y avance en el tiempo) y 'OFF' (separación, desconexión y corte). Cuando un avión despega, se separa de la pista y decimos 'take off'; cuando cancelamos un evento, lo separamos de la agenda y decimos 'call off'; y cuando postergamos una tarea, la alejamos de la fecha fijada con 'put off'. Observa este mapa conceptual en la pizarra.",
                "board_content": "⚡ OPOSICIÓN CONCEPTUAL: ON vs OFF\n\n• ON (Superficie / Flujo / Continuidad):\n  → turn on (activar), put on (colocar sobre el cuerpo), carry on (continuar)\n\n• OFF (Separación / Interrupción / Cancelación):\n  → take off (despegar / quitarse ropa)\n  → turn off (desactivar circuito)\n  → call off (cancelar un evento programado)\n  → put off (posponer / aplazar una tarea)\n\n👉 Oración Modelo:\n\"They had to call off the match because the storm took off the roof.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic panel showing an airport runway with an airplane taking off smoothly into the sky, clean 2D vector art, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "call off / put off / take off",
                "target_audio_items": [
                    {"english": "The flight will take off soon", "translation": "El vuelo despegará pronto", "label": "Separación OFF"},
                    {"english": "They called off the concert", "translation": "Cancelaron el concierto", "label": "Cancelación OFF"},
                    {"english": "Don't put off your homework", "translation": "No pospongas tus deberes", "label": "Postergación OFF"}
                ],
                "grammar_structure": {
                    "title": "Semántica de 'OFF' (Separación y Cancelación)",
                    "formula": "[ Sujeto ] + [ call off / put off / take off ] + [ Objeto ]",
                    "formula_tokens": [
                        {"role": "Sujeto", "pattern": "They / We / The pilot", "color": "blue"},
                        {"role": "Verbo + OFF", "pattern": "called off / put off / took off", "color": "purple"},
                        {"role": "Evento/Objeto", "pattern": "the meeting / the flight / the project", "color": "emerald"}
                    ],
                    "explanation": "'OFF' indica el desprendimiento de una superficie física o la exclusión de una fecha del calendario.",
                    "example_breakdowns": [
                        {
                            "english": "They called off the meeting.",
                            "spanish": "Cancelaron la reunión.",
                            "parts": [
                                {"role": "Sujeto", "text": "They", "color": "blue"},
                                {"role": "Verbo + OFF", "text": "called off", "color": "purple"},
                                {"role": "Evento", "text": "the meeting", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "'Call off' significa cancelar por completo; 'put off' significa solo aplazar para otra fecha."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Continuidad Aspectual con 'ON'",
                "tutor_says": "Cuando la partícula 'ON' se combina con verbos de movimiento o acción, proyecta la metáfora de avanzar a lo largo de una línea temporal continua sin detenerse. Es lo que en lingüística llamamos aspecto continuativo. 'Carry on' y 'go on' significan proseguir con la tarea a pesar de las dificultades, y 'keep on' expresa perseverancia constante. Escucha y observa la fórmula de continuidad.",
                "board_content": "⏩ ASPECTO CONTINUATIVO CON 'ON':\n\n• carry on (with) → Proseguir la marcha / no rendirse\n• go on → Continuar hablando o sucediendo\n• keep on (+ ing) → Seguir haciendo una acción repetidamente\n• drive on → Seguir conduciendo hacia adelante\n\n📌 Regla Aspectual:\n\"Keep on + Verb-ing\" ➔ \"She kept on studying despite being tired.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of a determined marathon runner moving forward along an endless bright track, clean colors, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "carry on / keep on + ing",
                "target_audio_items": [
                    {"english": "Please carry on with your presentation", "translation": "Por favor continúa con tu presentación", "label": "Continuidad ON"},
                    {"english": "She kept on practicing every day", "translation": "Ella siguió practicando todos los días", "label": "Perseverancia ON"},
                    {"english": "The story goes on", "translation": "La historia continúa", "label": "Progreso ON"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Distancia con 'AWAY' y Retorno con 'BACK'",
                "tutor_says": "Otras dos partículas indispensables son 'AWAY' y 'BACK'. 'AWAY' describe desplazamiento hacia la lejanía o almacenamiento fuera de la vista: 'give away' es regalar o donar a otros, y 'put away' es guardar las cosas en su lugar correcto. Por el contrario, 'BACK' es el vector de retorno al origen o reciprocidad: 'pay back' es devolver dinero prestado y 'call back' es regresar una llamada telefónica.",
                "board_content": "🔄 TRAYECTORIAS: AWAY (Distancia) vs BACK (Retorno):\n\n• AWAY (Hacia la lejanía / Almacenamiento):\n  → give away (donar / regalar / desprenderse)\n  → put away (guardar en el armario o cajón)\n\n• BACK (Retorno al punto de partida / Reciprocidad):\n  → pay back (devolver dinero / saldar deuda)\n  → call back (devolver una llamada telefónica)\n  → give back (devolver un objeto a su dueño)",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of two people happily returning a borrowed book and shaking hands, bright warm colors, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "pay back / put away",
                "target_audio_items": [
                    {"english": "I will pay you back tomorrow", "translation": "Te devolveré el dinero mañana", "label": "Retorno BACK"},
                    {"english": "Put away your toys after playing", "translation": "Guarda tus juguetes después de jugar", "label": "Almacenamiento AWAY"},
                    {"english": "She gave away her old clothes", "translation": "Ella donó su ropa vieja", "label": "Distancia AWAY"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Análisis de Errores: 'Put off' vs 'Call off'",
                "tutor_says": "Uno de los errores más frecuentes en exámenes B1 es confundir 'put off' con 'call off'. Recuerda la regla mnemotécnica: si la reunión se cancela definitivamente y no ocurrirá, se usó 'call off'. Si la reunión se reprograma para el próximo viernes, solo se pospuso y se usó 'put off'. Observa las dos oraciones en la pizarra.",
                "board_content": "⚠️ DIFERENCIA CRÍTICA: CANCELAR vs POSPONER:\n\n• CALL OFF = Cancelación definitiva (el evento queda eliminado)\n  → \"The concert was called off due to heavy rain.\"\n\n• PUT OFF = Postergación temporal (el evento se hará más tarde)\n  → \"We put off the meeting until next Tuesday.\"",
                "image_style": "comic_scene",
                "image_prompt": "comic panel showing a calendar with an event crossed out with a red cross versus an arrow moving an event to next week, clean vector art, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "call off vs put off",
                "target_audio_items": [
                    {"english": "The match was called off", "translation": "El partido fue cancelado", "label": "Cancelado"},
                    {"english": "We put off the launch until next month", "translation": "Pospusimos el lanzamiento hasta el próximo mes", "label": "Pospuesto"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Práctica Guiada de Partículas",
                "tutor_says": "Demuestra tu dominio de las partículas 'OFF' y 'ON'. Completa la frase seleccionando el phrasal verb adecuado. A continuación, responde en la pizarra.",
                "board_content": "📝 EJERCICIO INTERACTIVO:\n\nCompleta la frase:\n\"Because of the bad weather, the organizers decided to __________ the outdoor festival.\" [ call off / carry on / put away ]\n\n📌 Opciones:\n• call off (cancelar definitivamente)\n• carry on (continuar adelante)\n• put away (guardar)",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational graphic of a student selecting the correct card on a smart screen, strictly no text",
                "interaction_type": "quiz",
                "student_task": "Completa la oración: 'Because of the bad weather, the organizers decided to __________ the outdoor festival' [ call off / carry on / put away ]",
                "expected_answer": "call off",
                "key_structure": "decided to call off",
                "target_audio_items": [
                    {"english": "The organizers decided to call off the festival", "translation": "Los organizadores decidieron cancelar el festival", "label": "Ejercicio Resuelto"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Producción y Debate Comunicativo",
                "tutor_says": "¡Excelente dominio! Para finalizar, formula una oración donde expreses por qué es una mala idea postergar tareas importantes usando 'put off', o da un consejo para seguir adelante usando 'carry on'. A continuación, di tu frase en la pizarra.",
                "board_content": "🎯 DESAFÍO COMUNICATIVO:\n\nExpresa un consejo usando 'put off' o 'carry on':\n👉 Modelo: \"You should never put off your responsibilities, but carry on with determination.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of two professionals having an engaging strategic conversation in a modern creative workspace, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Di una oración en inglés usando 'put off' o 'carry on' (ejemplo: 'Don't put off what you can do today')",
                "expected_answer": "Don't put off what you can do today",
                "key_structure": "Don't put off... / You must carry on...",
                "target_audio_items": [
                    {"english": "Don't put off what you can do today", "translation": "No pospongas lo que puedes hacer hoy", "label": "Producción Final"}
                ]
            }
        ]
    }


def _build_phrasal_verbs_advanced_fallback(sublevel: str) -> dict:
    """Rich curated fallback for B2.2: Three-Part Phrasal Verbs & Separability Mechanics."""
    return {
        "schema": "ai_tutor.lesson.v1",
        "topic": "Three-Part Phrasal Verbs & Separability Mechanics",
        "level": "B2",
        "sublevel": sublevel,
        "subject": "English",
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "1. Sintaxis Avanzada: La Regla del Sándwich del Pronombre",
                "tutor_says": "Welcome to B2 Advanced Phrasal Syntax! In English, separable transitive phrasal verbs allow noun objects either after the particle or between the verb and particle (e.g. 'turn off the lights' or 'turn the lights off'). However, when the object is a pronoun like 'it', 'them', or 'him', the pronoun MUST sit inside the verb sandwich. Saying '*turn off it*' is a severe grammatical violation in English; you must strictly say 'turn it off' and 'figure it out'. Examine the syntax breakdown on the board.",
                "board_content": "🥪 THE PRONOUN SANDWICH RULE (SEPARABILITY):\n\n• With full Nouns (Both are correct):\n  → \"I looked up the word\"  ✅\n  → \"I looked the word up\"  ✅\n\n• With Object Pronouns (it / them / me / him / her):\n  → \"I looked IT up\"        ✅ (Mandatory pronoun placement)\n  → \"*I looked up IT*\"      ❌ (Severe syntactic error)\n\n👉 Rule: Object pronouns MUST sit between the verb and particle.",
                "image_style": "comic_scene",
                "image_prompt": "comic panel of an executive writing clear syntax brackets on a modern glass board during an advanced language masterclass, clean vector art, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Verb + Pronoun + Particle",
                "target_audio_items": [
                    {"english": "I will figure it out tomorrow", "translation": "Lo descifraré mañana", "label": "Pronoun Sandwich"},
                    {"english": "Please turn them off before leaving", "translation": "Por favor apágalos antes de salir", "label": "Pronoun Sandwich"},
                    {"english": "She looked it up online", "translation": "Ella lo consultó en internet", "label": "Pronoun Sandwich"}
                ],
                "grammar_structure": {
                    "title": "Pronoun Sandwich Placement Formula",
                    "formula": "[ Subject ] + [ Verb ] + [ Pronoun (it/them/him/her) ] + [ Particle ]",
                    "formula_tokens": [
                        {"role": "Subject", "pattern": "I / You / We / They", "color": "blue"},
                        {"role": "Verb", "pattern": "figure / turn / pick / look", "color": "purple"},
                        {"role": "Pronoun Object", "pattern": "it / them / him / her", "color": "amber"},
                        {"role": "Particle", "pattern": "out / off / up / down", "color": "emerald"}
                    ],
                    "explanation": "Weak unstressed object pronouns are syntactically required to be enclosed between the lexical verb and its particle.",
                    "example_breakdowns": [
                        {
                            "english": "We figured it out.",
                            "spanish": "Lo resolvimos.",
                            "parts": [
                                {"role": "Subject", "text": "We", "color": "blue"},
                                {"role": "Verb", "text": "figured", "color": "purple"},
                                {"role": "Pronoun", "text": "it", "color": "amber"},
                                {"role": "Particle", "text": "out", "color": "emerald"}
                            ]
                        }
                    ],
                    "tips": "Never place an object pronoun after the particle: always 'turn it on', never '*turn on it*'."
                }
            },
            {
                "phase_number": 2,
                "phase_name": "2. Verbos Frasales de Tres Partes (Three-Part Phrasal Verbs)",
                "tutor_says": "Three-part phrasal verbs consist of a Base Verb + Adverbial Particle + Preposition. Crucially, three-part verbs are ALWAYS INSEPARABLE. You cannot split their particles. High-frequency structures include 'come up with' (to produce an idea), 'cut down on' (to reduce consumption), 'put up with' (to tolerate something unpleasant), and 'look down on' (to despise or feel superior). Notice their flow on the board.",
                "board_content": "🔗 THREE-PART PHRASAL VERBS (ALWAYS INSEPARABLE):\n\n• come up with → Idear o producir una solución (\"She came up with a strategy\")\n• cut down on → Reducir el consumo de algo (\"We must cut down on expenses\")\n• put up with → Tolerar o soportar una molestia (\"I can't put up with this noise\")\n• look down on → Menospreciar a alguien (\"Never look down on others\")\n• look forward to (+ ing) → Esperar con entusiasmo (\"I look forward to meeting you\")\n\n📌 Syntactic Rule: [ Verb + Particle 1 + Preposition 2 ] + [ Noun / Gerund ]",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational illustration of an executive presentation showing strategic cost reduction and creative innovation diagrams, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "come up with / cut down on / put up with",
                "target_audio_items": [
                    {"english": "We came up with an innovative solution", "translation": "Se nos ocurrió una solución innovadora", "label": "Three-Part Verb"},
                    {"english": "I need to cut down on sugar", "translation": "Necesito reducir el azúcar", "label": "Three-Part Verb"},
                    {"english": "She refuses to put up with delays", "translation": "Ella se rehúsa a tolerar retrasos", "label": "Three-Part Verb"}
                ]
            },
            {
                "phase_number": 3,
                "phase_name": "3. Registro Ejecutivo y Redes Semánticas Avanzadas",
                "tutor_says": "In executive and professional English, phrasal verbs with particles like 'OUT', 'THROUGH', and 'DOWN' convey sophisticated business nuances. 'Iron out' means to resolve minor discrepancies; 'follow through' means to execute a commitment to completion; and 'phase out' means to gradually eliminate an obsolete process. Observe how these expressions elevate your professional register.",
                "board_content": "💼 EXECUTIVE & STRATEGIC PHRASAL VERBS:\n\n• iron out → Alisar asperezas / resolver discrepancias (\"Iron out the contract terms\")\n• follow through (with) → Cumplir un compromiso hasta el final (\"Follow through on promises\")\n• phase out → Eliminar progresivamente (\"Phase out legacy software\")\n• step down (from) → Renunciar a un cargo de liderazgo (\"Step down as CEO\")\n• look over → Revisar minuciosamente un reporte (\"Look over the financial audit\")",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector illustration of two business executives finalizing a strategic partnership contract with confident handshakes, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "iron out / follow through / phase out",
                "target_audio_items": [
                    {"english": "We ironed out the final contract details", "translation": "Resolvimos los detalles finales del contrato", "label": "Registro Ejecutivo"},
                    {"english": "The company will phase out old systems", "translation": "La empresa eliminará gradualmente los sistemas antiguos", "label": "Registro Ejecutivo"},
                    {"english": "He followed through on his commitments", "translation": "Él cumplió con sus compromisos hasta el final", "label": "Registro Ejecutivo"}
                ]
            },
            {
                "phase_number": 4,
                "phase_name": "4. Desconstrucción y Corrección de Errores Sintácticos",
                "tutor_says": "Let us deconstruct the two classic errors at the B2 level. The first error is placing pronouns outside separable verbs (saying '*I figured out it*' instead of 'I figured it out'). The second error is attempting to separate three-part phrasal verbs (saying '*I cut it down on*' instead of 'I cut down on it'). Examine the side-by-side corrections on the board.",
                "board_content": "🔬 CRITICAL B2 ERROR AUDIT:\n\n❌ Error 1: \"*I will figure out it later*\"\n✅ Correct: \"I will figure it out later\" (Pronoun sandwich)\n\n❌ Error 2: \"*We must cut expenses down on*\"\n✅ Correct: \"We must cut down on expenses\" (Three-part verbs are inseparable)\n\n❌ Error 3: \"*I look forward to meet you*\"\n✅ Correct: \"I look forward to meeting you\" (Preposition 'to' requires gerund -ing)",
                "image_style": "comic_scene",
                "image_prompt": "comic panel illustration of a professional reviewing a document with green checkmarks indicating grammatical precision, clean vector art, strictly no text",
                "interaction_type": "explanation",
                "student_task": None,
                "expected_answer": None,
                "key_structure": "Inseparable vs Separable",
                "target_audio_items": [
                    {"english": "I will figure it out later", "translation": "Lo resolveré más tarde", "label": "Uso Correcto"},
                    {"english": "We must cut down on expenses", "translation": "Debemos reducir gastos", "label": "Uso Correcto"},
                    {"english": "I look forward to meeting you", "translation": "Espero con entusiasmo conocerte", "label": "Uso Correcto"}
                ]
            },
            {
                "phase_number": 5,
                "phase_name": "5. Práctica Guiada de Sintaxis y Corrección",
                "tutor_says": "Apply your syntactic mastery. Choose the grammatically correct sentence adhering to the Pronoun Sandwich rule. Complete the interactive exercise on the board.",
                "board_content": "📝 SYNTACTIC ACCURACY CHALLENGE:\n\nSelect the only grammatically correct sentence:\n1. \"*She turned off it before leaving the office.*\"\n2. \"She turned it off before leaving the office.\"\n3. \"*She turned off them before leaving the office.*\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector educational scene of a student solving an advanced syntax challenge on a glowing digital board, strictly no text",
                "interaction_type": "quiz",
                "student_task": "Elige la opción correcta con la colocación adecuada del pronombre: [ She turned it off / She turned off it ]",
                "expected_answer": "She turned it off",
                "key_structure": "She turned it off",
                "target_audio_items": [
                    {"english": "She turned it off before leaving the office", "translation": "Ella lo apagó antes de salir de la oficina", "label": "Ejercicio Resuelto"}
                ]
            },
            {
                "phase_number": 6,
                "phase_name": "6. Producción Ejecutiva Espontánea",
                "tutor_says": "Masterful progress! To conclude this B2 mastery session, formulate an executive statement describing how your team resolved an issue or reduced costs using 'ironed out', 'came up with', or 'cut down on'. Deliver your complete spoken sentence on the board.",
                "board_content": "🎯 EXECUTIVE FLUENCY CAPSTONE:\n\nFormulate a professional sentence using a three-part or executive phrasal verb:\n👉 Model: \"Our team came up with a strategy to iron out the project discrepancies.\"",
                "image_style": "flat_art",
                "image_prompt": "flat 2D vector graphic of a confident executive presenting project outcomes in a sleek modern boardroom, strictly no text",
                "interaction_type": "roleplay",
                "student_task": "Di una oración profesional en inglés usando 'came up with', 'cut down on' o 'iron out' (ejemplo: 'We came up with a plan to cut down on costs')",
                "expected_answer": "We came up with a plan to cut down on costs",
                "key_structure": "We came up with a plan to...",
                "target_audio_items": [
                    {"english": "We came up with a plan to cut down on costs", "translation": "Idreamos un plan para reducir costos", "label": "Producción Final B2"}
                ]
            }
        ]
    }

def _build_modals_advice_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Advice & Obligation", "grammar_core": "Modals: Should / Shouldn't (Advice), Must / Mustn't (Strong obligation), Have to / Don't have to (Requirement)", "vocabulary_core": "Health advice, Office policies, Traffic laws, Safety rules", "can_do": "Give constructive advice and differentiate between obligation and prohibition"},
        sublevel
    )

def _build_modals_deduction_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Modals of Deduction", "grammar_core": "Must be (Certainty positive), Can't be (Certainty negative), Might / Could be (Possibility)", "vocabulary_core": "Crime mysteries, Speculations, Visual clues", "can_do": "Make logical deductions about present situations with varying degrees of certainty"},
        sublevel
    )

def _build_routines_fallback(sublevel: str) -> dict:
    return _build_curriculum_node_fallback(
        {"topic": "Daily Routines", "grammar_core": "Present Simple Affirmative (I wake up, He works), Third-person singular -s", "vocabulary_core": "Morning habits, Meal times, Transportation", "can_do": "Describe daily habits, schedules and third-person routines with correct -s/es"},
        sublevel
    )
