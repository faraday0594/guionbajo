"""
Guionbajo — Interactive POV Conversational Quest Engine (Visual Novel Mode)
Generates and evaluates turn-based, first-person narrative quests aligned with CEFR grammar goals.
All visual scenes use bright, colorful 2D Anime Visual Novel art style with clear first-person perspective.
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

# ─── DETERMINISTIC FALLBACK QUEST BANK (ANIME VISUAL NOVEL STYLE) ─────────────

FALLBACK_QUESTS_BANK: Dict[str, List[Dict[str, Any]]] = {
    "A1": [
        {
            "story_id": "future_plans_campus_01",
            "title": "Un Día en el Campus Universitario",
            "grammar_topic": "Future simple with 'will'",
            "difficulty_level": "A1",
            "companion_name": "Emma",
            "companion_gender": "female",
            "companion_voice": "en-US-JennyNeural",
            "companion_avatar": "👩‍🦱",
            "nodes": [
                {
                    "node_id": "step_1_invitation",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, looking directly at a friendly female classmate named Emma with curly brown hair in a cute denim jacket, smiling and making an inviting hand gesture towards the viewer, sunny university campus courtyard with cherry blossoms and modern glass buildings in background, Makoto Shinkai vibrant aesthetic, bright daylight, colorful, clean 2D anime digital illustration, 16:9, no text, no words",
                    "companion_dialogue": "Hey! A group of us are heading to the campus pool tomorrow afternoon. Do you want to join us?",
                    "pedagogical_goal": "Acepta la invitación explícitamente usando 'will' o 'I'll' (ej. 'Sure, I will go' o 'I will join you').",
                    "hint": "Usa 'will' o la contracción 'I'll' + verbo: 'Yes, I will go with you' o 'I'll join you tomorrow'.",
                    "example_phrase": "Yes, I will go with you tomorrow!",
                    "validation_rules": {
                        "must_include": ["will", "'ll", "ill"],
                        "intent": "affirmative_acceptance",
                        "min_words": 2
                    }
                },
                {
                    "node_id": "step_2_items_to_bring",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, sitting inside a bright modern city bus next to the smiling female classmate Emma looking towards the viewer, sunny city street through window, cheerful anime visual novel illustration, vibrant colors, 16:9, no text, no words",
                    "companion_dialogue": "Awesome! I'm so glad you're coming. What will you bring with you tomorrow?",
                    "pedagogical_goal": "Menciona al menos un objeto que llevarás usando 'I will bring...' o 'I'll bring...'",
                    "hint": "Di qué llevarás usando 'I will bring [objeto]' (ej. 'I will bring a towel' o 'I will bring sunscreen').",
                    "example_phrase": "I will bring a towel and sunscreen.",
                    "validation_rules": {
                        "must_include": ["will bring", "'ll bring", "will take", "'ll take", "will have", "'ll have", "will"],
                        "intent": "item_declaration",
                        "min_words": 3
                    }
                },
                {
                    "node_id": "step_3_meeting_time",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, arriving at a bright modern outdoor swimming pool entrance, female classmate Emma waving happily at the viewer, clear blue sky, sunny summer day, clean anime digital art, 16:9, no text, no words",
                    "companion_dialogue": "Great! The pool opens at two o'clock. When will you arrive tomorrow?",
                    "pedagogical_goal": "Indica la hora a la que llegarás usando 'I will arrive at...' o 'I'll be there at...'",
                    "hint": "Responde con la hora de llegada usando 'will': 'I will arrive at one thirty' o 'I'll be there at two'.",
                    "example_phrase": "I will arrive at two o'clock.",
                    "validation_rules": {
                        "must_include": ["will", "'ll", "arrive", "be there", "come"],
                        "intent": "time_declaration",
                        "min_words": 3
                    }
                }
            ]
        },
        {
            "story_id": "coffee_shop_order_01",
            "title": "Tarde en la Cafetería",
            "grammar_topic": "Requests with 'Would like' & 'Can I have'",
            "difficulty_level": "A1",
            "companion_name": "Lucas",
            "companion_gender": "male",
            "companion_voice": "en-US-RogerNeural",
            "companion_avatar": "🧑‍🦰",
            "nodes": [
                {
                    "node_id": "step_1_order_drink",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, looking directly across a clean wooden cafe counter at a friendly young male barista named Lucas wearing a brown apron, smiling and taking your order, bright cozy modern cafe with green plants and warm sunlight, clean anime digital illustration, colorful, 16:9, no text, no words",
                    "companion_dialogue": "Welcome to Central Perk! What would you like to drink today?",
                    "pedagogical_goal": "Pide una bebida educadamente usando 'I would like...' o 'I'd like...'",
                    "hint": "Usa la fórmula de cortesía: 'I would like a coffee' o 'I'd like an iced tea, please'.",
                    "example_phrase": "I would like a cappuccino, please.",
                    "validation_rules": {
                        "must_include": ["would like", "'d like", "can i have", "could i have"],
                        "intent": "drink_order",
                        "min_words": 3
                    }
                },
                {
                    "node_id": "step_2_table_invitation",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, sitting across a small round wooden table from friendly anime friend Lucas who is smiling warmly holding a coffee cup, bright sunlight through cafe window, cozy anime aesthetic, 16:9, no text, no words",
                    "companion_dialogue": "Hey, I found us a cozy table by the window! Where do you want to sit?",
                    "pedagogical_goal": "Acepta el lugar o expresa tu preferencia usando 'I would like to sit...' o 'I'd love to sit here'.",
                    "hint": "Expresa agrado con 'I would like to sit by the window' o 'I'd like to sit next to you'.",
                    "example_phrase": "I would like to sit here by the window.",
                    "validation_rules": {
                        "must_include": ["would like", "'d like", "love to", "sit", "here", "table"],
                        "intent": "seating_preference",
                        "min_words": 3
                    }
                }
            ]
        }
    ],
    "A2": [
        {
            "story_id": "lost_item_airport_02",
            "title": "Aventura en el Aeropuerto",
            "grammar_topic": "Past Simple with Regular & Irregular Verbs",
            "difficulty_level": "A2",
            "companion_name": "Officer Davies",
            "companion_gender": "male",
            "companion_voice": "en-US-RogerNeural",
            "companion_avatar": "👮‍♂️",
            "nodes": [
                {
                    "node_id": "step_1_report_lost",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, standing at an airport customer service counter looking directly at a friendly helpful airport staff officer in a neat blue uniform smiling at the viewer, bright modern airport terminal with big glass windows, colorful anime digital art, 16:9, no text, no words",
                    "companion_dialogue": "Hello traveler. You look concerned. What happened to your luggage?",
                    "pedagogical_goal": "Explica lo ocurrido en pasado simple (ej. 'I lost my backpack' o 'I left my bag on the airplane').",
                    "hint": "Usa un verbo en pasado: 'I lost my suitcase' o 'I forgot my backpack on the flight'.",
                    "example_phrase": "I lost my blue suitcase on the plane.",
                    "validation_rules": {
                        "must_include": ["lost", "left", "forgot", "was", "dropped"],
                        "intent": "past_incident_report",
                        "min_words": 3
                    }
                },
                {
                    "node_id": "step_2_describe_actions",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, standing near a modern baggage conveyor belt with the friendly airport officer pointing helpfully, bright clean anime background with soft lighting, 16:9, no text, no words",
                    "companion_dialogue": "Don't worry, we will help you find it. Where did you go after you landed?",
                    "pedagogical_goal": "Describe tus acciones en pasado simple usando verbos como 'went', 'walked', 'checked' o 'waited'.",
                    "hint": "Narra en pasado: 'I went to the baggage claim' o 'I waited near gate number five'.",
                    "example_phrase": "I went to the baggage claim and waited there.",
                    "validation_rules": {
                        "must_include": ["went", "walked", "waited", "checked", "arrived", "came"],
                        "intent": "past_actions_sequence",
                        "min_words": 3
                    }
                },
                {
                    "node_id": "step_3_found_item",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, friendly airport officer handing over a travel backpack with a warm happy smile, bright welcoming airport office, clean anime digital art, 16:9, no text, no words",
                    "companion_dialogue": "Good news! Another passenger found your bag. How did you feel when you saw it?",
                    "pedagogical_goal": "Expresa tu emoción en pasado simple usando 'I felt...' o 'I was very happy/relieved'.",
                    "hint": "Describe tu sentimiento en pasado: 'I felt so relieved' o 'I was very happy and grateful'.",
                    "example_phrase": "I felt very happy and relieved!",
                    "validation_rules": {
                        "must_include": ["felt", "was", "became", "happy", "relieved", "glad"],
                        "intent": "past_emotion_expression",
                        "min_words": 3
                    }
                }
            ]
        }
    ],
    "B1": [
        {
            "story_id": "job_interview_experience_03",
            "title": "La Entrevista de Tus Sueños",
            "grammar_topic": "Present Perfect for Life Experiences & Duration (Since/For)",
            "difficulty_level": "B1",
            "companion_name": "Ms. Carter",
            "companion_gender": "female",
            "companion_voice": "en-US-JennyNeural",
            "companion_avatar": "👩‍💼",
            "nodes": [
                {
                    "node_id": "step_1_experience_intro",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, sitting across a sleek glass table in a modern corporate office, professional anime businesswoman in a navy blazer named Ms. Carter smiling warmly at the viewer, bright sunlit skyscraper office with skyline view, clean 2D anime illustration, 16:9, no text, no words",
                    "companion_dialogue": "Welcome to our team interview! To start, have you ever worked in a collaborative team project before?",
                    "pedagogical_goal": "Responde afirmativamente usando el Present Perfect: 'I have worked...' o 'I have collaborated in several projects'.",
                    "hint": "Usa Present Perfect (Have/Has + participio): 'Yes, I have worked in diverse teams for years'.",
                    "example_phrase": "Yes, I have worked in collaborative team projects for two years.",
                    "validation_rules": {
                        "must_include": ["have worked", "have collaborated", "have participated", "have been", "'ve worked", "have done"],
                        "intent": "experience_affirmation",
                        "min_words": 4
                    }
                },
                {
                    "node_id": "step_2_duration_skills",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, looking directly at the professional anime interviewer Ms. Carter taking positive notes with a pen in her notebook and smiling encouragingly, bright sunlit modern office, anime digital art, 16:9, no text, no words",
                    "companion_dialogue": "That sounds great. How long have you studied English or developed these skills?",
                    "pedagogical_goal": "Indica la duración usando 'I have studied... for [tiempo]' o 'since [año/fecha]'.",
                    "hint": "Usa 'for' (duración) o 'since' (punto de inicio): 'I have studied English for three years' o 'since 2021'.",
                    "example_phrase": "I have studied English for three years and practiced daily.",
                    "validation_rules": {
                        "must_include": ["have studied", "'ve studied", "have practiced", "'ve practiced", "for", "since"],
                        "intent": "duration_specification",
                        "min_words": 4
                    }
                },
                {
                    "node_id": "step_3_closing_goals",
                    "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, professional anime businesswoman Ms. Carter extending her hand towards the viewer for a friendly handshake with a welcoming smile, golden hour sunlight in modern conference room, clean anime visual novel art, 16:9, no text, no words",
                    "companion_dialogue": "Excellent answers! If we offer you the position, what will be your first priority?",
                    "pedagogical_goal": "Usa una estructura de primer condicional o futuro ('I will focus on...' / 'If I get the job, I will...').",
                    "hint": "Formula tu objetivo futuro: 'If I join the team, I will contribute immediately' o 'I will focus on learning the systems'.",
                    "example_phrase": "If I join the company, I will dedicate my full effort to our goals.",
                    "validation_rules": {
                        "must_include": ["will", "'ll", "if"],
                        "intent": "future_conditional_commitment",
                        "min_words": 4
                    }
                }
            ]
        }
    ]
}


class QuestGenerator:
    """
    Orchestrates the generation and dynamic customization of POV Narrative Quests in Anime Visual Novel Style.
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
                logger.warning(f"Failed to init AsyncOpenAI in QuestGenerator: {e}")
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

    def get_fallback_quest(self, topic: str, sublevel: str) -> Dict[str, Any]:
        lvl_key = self._get_level_key(sublevel)
        bank = FALLBACK_QUESTS_BANK.get(lvl_key, FALLBACK_QUESTS_BANK["A1"])
        
        # Match topic keyword if possible
        topic_lower = topic.lower()
        for q in bank:
            if any(w in topic_lower for w in q["grammar_topic"].lower().split()):
                return json.loads(json.dumps(q))
        
        chosen = random.choice(bank)
        return json.loads(json.dumps(chosen))

    async def generate_quest(self, topic: str, sublevel: str) -> Dict[str, Any]:
        """
        Generates a 3-node POV Conversational Quest in vibrant 2D Anime Visual Novel style.
        """
        if not self.client or not self.api_key:
            return self.get_fallback_quest(topic, sublevel)

        lvl_key = self._get_level_key(sublevel)
        system_prompt = (
            "You are a master ESL game designer creating an Interactive First-Person (POV) Anime Visual Novel Quest.\n"
            "The player is a student learning English. Each scene is from their first-person perspective.\n"
            "ART STYLE IS STRICTLY: Clean 2D Anime Visual Novel illustration, Makoto Shinkai vibrant aesthetic, bright high-key lighting, cheerful atmosphere.\n"
            "Output strictly valid JSON matching the specified schema."
        )

        user_prompt = f"""Design a 3-scene turn-based conversational quest for:
Topic / Grammar Target: {topic}
CEFR Level: {sublevel} ({lvl_key})

STRICT SCENARIO & NODE RULES:
1. Companion Character:
   - Name the companion (e.g. Emma, Sarah, Lucas, Alex).
   - Define "companion_gender": "female" or "male".
   - Set "companion_voice": "en-US-JennyNeural" (for female) or "en-US-RogerNeural" (for male).
   - Set "companion_avatar": "👩‍🦱" (for female) or "🧑‍🦱" (for male).

2. Image Prompts (MANDATORY ANIME VISUAL NOVEL STYLE):
   - Every "pov_image_prompt" MUST start with: "First-person perspective POV shot in clean 2D anime visual novel style, looking directly at [companion name and physical description] who is in center making friendly eye contact with the viewer, [scene action/expression], [bright colorful environment], Makoto Shinkai vibrant aesthetic, high-key bright lighting, colorful anime digital illustration, 16:9, no text, no words"
   - CRITICAL: DO NOT use realistic photography or dark horror lighting. Always use bright, friendly, clean 2D anime visual novel art style where the companion character is looking straight at the player.

3. Nodes: Generate exactly 3 sequential nodes ('nodes' array).
   - "companion_dialogue": Natural spoken English line by the companion (1-2 sentences) prompting the student to use the target grammar.
   - "pedagogical_goal": Clear target in Spanish (e.g. "Acepta la invitación usando 'will'").
   - "hint": Helpful grammar clue in Spanish.
   - "example_phrase": Natural English model answer.
   - "validation_rules": Object with:
       - "must_include": array of 1 to 4 essential grammar tokens (e.g. ["will", "'ll"]).
       - "intent": string identifying communicative intent.
       - "min_words": integer minimum word count (e.g. 2 or 3).

JSON SCHEMA:
{{
  "story_id": "quest_id_here",
  "title": "Story Title in Spanish",
  "grammar_topic": "{topic}",
  "difficulty_level": "{lvl_key}",
  "companion_name": "Emma",
  "companion_gender": "female",
  "companion_voice": "en-US-JennyNeural",
  "companion_avatar": "👩‍🦱",
  "nodes": [
    {{
      "node_id": "step_1_invitation",
      "pov_image_prompt": "First-person perspective POV shot in clean 2D anime visual novel style, looking directly at a friendly female student named Emma with curly brown hair in a cute denim jacket smiling at the viewer, sunny university campus with cherry blossoms, Makoto Shinkai vibrant aesthetic, bright daylight, clean 2D anime digital illustration, 16:9, no text, no words",
      "companion_dialogue": "...",
      "pedagogical_goal": "...",
      "hint": "...",
      "example_phrase": "...",
      "validation_rules": {{
        "must_include": ["will", "'ll"],
        "intent": "affirmative_acceptance",
        "min_words": 2
      }}
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

            if not data.get("nodes") or len(data["nodes"]) < 2:
                logger.warning("LLM returned incomplete quest nodes. Falling back.")
                return self.get_fallback_quest(topic, sublevel)

            # Ensure gender and voice are properly resolved
            comp_gender = str(data.get("companion_gender", "female")).lower()
            if comp_gender not in ("female", "male"):
                comp_gender = "male" if any(m in str(data.get("companion_name", "")).lower() for m in ("lucas", "alex", "john", "michael", "davies", "carlos", "david")) else "female"
            data["companion_gender"] = comp_gender
            data["companion_voice"] = "en-US-RogerNeural" if comp_gender == "male" else "en-US-JennyNeural"

            if not data.get("companion_avatar"):
                data["companion_avatar"] = "👨‍🦱" if comp_gender == "male" else "👩‍🦱"

            # Ensure all nodes have clean anime prompts and necessary fields
            for idx, node in enumerate(data["nodes"]):
                if not node.get("node_id"):
                    node["node_id"] = f"step_{idx+1}"
                
                # Sanitize image prompt to enforce anime visual novel style
                prompt_str = str(node.get("pov_image_prompt", ""))
                if "anime" not in prompt_str.lower() or "photography" in prompt_str.lower():
                    clean_p = re.sub(r'realistic photography|photorealistic|photorealism|photo', 'clean 2D anime visual novel illustration, Makoto Shinkai vibrant aesthetic, bright daylight', prompt_str, flags=re.IGNORECASE)
                    if not clean_p.lower().startswith("first-person"):
                        clean_p = f"First-person perspective POV shot in clean 2D anime visual novel style, looking directly at {data.get('companion_name', 'companion')}, {clean_p}"
                    node["pov_image_prompt"] = clean_p

                if not node.get("validation_rules"):
                    node["validation_rules"] = {"must_include": [], "intent": "general_response", "min_words": 2}
                if not node.get("hint"):
                    node["hint"] = f"Aplica la estructura de {topic} en tu respuesta."

            return data
        except Exception as e:
            logger.warning(f"Error generating quest with LLM: {e}. Using deterministic fallback.")
            return self.get_fallback_quest(topic, sublevel)


class QuestEvaluator:
    """
    Evaluates student spoken transcript against the node's pedagogical goal and validation rules.
    Combines LLM cognitive evaluation with deterministic heuristic fallback.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.MINIMAX_API_KEY
        self.model = settings.MINIMAX_LLM_MODEL
        if self.api_key:
            try:
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=settings.MINIMAX_BASE_URL,
                    timeout=20.0,
                )
            except Exception as e:
                logger.warning(f"Failed to init AsyncOpenAI in QuestEvaluator: {e}")
                self.client = None
        else:
            self.client = None

    def _evaluate_heuristically(
        self,
        transcript: str,
        node: Dict[str, Any],
        topic: str
    ) -> Dict[str, Any]:
        """
        Fast, robust deterministic heuristic evaluator for offline/fallback scenarios.
        """
        clean_text = transcript.strip().lower()
        words = re.findall(r"\b\w+(?:'\w+)?\b", clean_text)
        rules = node.get("validation_rules", {})
        must_include = rules.get("must_include", [])
        min_words = rules.get("min_words", 2)

        # Check word count
        if len(words) < min_words:
            return {
                "is_correct": False,
                "detected_grammar_rule": topic,
                "feedback": f"Tu respuesta es muy corta ({len(words)} palabras). Por favor elabora una oración completa en inglés.",
                "correction": node.get("example_phrase", "Please formulate a complete sentence."),
                "next_node_id": None
            }

        # Check must_include tokens
        has_required_token = True
        if must_include:
            has_required_token = any(token.lower() in clean_text for token in must_include)

        if has_required_token:
            return {
                "is_correct": True,
                "detected_grammar_rule": topic,
                "feedback": f"¡Excelente trabajo! Has respondido de forma natural aplicando la estructura de {topic}.",
                "correction": None,
                "next_node_id": None
            }
        else:
            required_str = " / ".join(must_include[:3])
            return {
                "is_correct": False,
                "detected_grammar_rule": topic,
                "feedback": f"Respuesta incompleta: Recuerda incluir la estructura objetivo ({required_str}) para continuar la historia.",
                "correction": node.get("example_phrase"),
                "next_node_id": None
            }

    async def evaluate_node_response(
        self,
        transcript: str,
        node: Dict[str, Any],
        topic: str,
        all_nodes: Optional[List[Dict[str, Any]]] = None,
        current_node_index: int = 0
    ) -> Dict[str, Any]:
        """
        Evaluates the student's spoken response using LLM and returns structured feedback.
        """
        next_node_id = None
        if all_nodes and current_node_index + 1 < len(all_nodes):
            next_node_id = all_nodes[current_node_index + 1].get("node_id")

        if not transcript or not transcript.strip():
            return {
                "is_correct": False,
                "detected_grammar_rule": topic,
                "feedback": "No se detectó audio ni respuesta. Por favor presiona el micrófono y habla.",
                "correction": node.get("example_phrase"),
                "next_node_id": None
            }

        if not self.client or not self.api_key:
            res = self._evaluate_heuristically(transcript, node, topic)
            if res["is_correct"]:
                res["next_node_id"] = next_node_id
            return res

        system_prompt = (
            "You are an expert, encouraging ESL evaluator. Compare the student's spoken transcript "
            "with the required pedagogical goal and context. "
            "Output strictly valid JSON with no extraneous text."
        )

        user_prompt = f"""Evaluate the student's response in this conversational scene:

TOPIC / GRAMMAR TARGET: {topic}
COMPANION DIALOGUE: "{node.get('companion_dialogue', '')}"
PEDAGOGICAL GOAL: {node.get('pedagogical_goal', '')}
VALIDATION RULES: {json.dumps(node.get('validation_rules', {}))}
STUDENT TRANSCRIPT: "{transcript}"
EXAMPLE TARGET ANSWER: "{node.get('example_phrase', '')}"

CRITICAL EVALUATION CRITERIA:
1. Is the student's response grammatically plausible in English for this CEFR target?
2. Does it fulfill the pedagogical goal (e.g. using the required grammar structure or intent)?
3. If correct, provide supportive praising feedback in Spanish and set "is_correct": true.
4. If incorrect, provide warm, constructive feedback in Spanish explaining what was missing, provide a "correction" in English, and set "is_correct": false.

OUTPUT JSON SCHEMA:
{{
  "is_correct": true,
  "detected_grammar_rule": "{topic}",
  "feedback": "¡Excelente respuesta! Usaste 'will' de manera correcta.",
  "correction": null
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
                temperature=0.2,
                extra_body={"thinking": {"type": "disabled"}},
            )
            raw = response.choices[0].message.content or "{}"
            result = clean_json_response(raw)

            is_correct = bool(result.get("is_correct", False))
            result["is_correct"] = is_correct
            result["next_node_id"] = next_node_id if is_correct else None
            if not result.get("detected_grammar_rule"):
                result["detected_grammar_rule"] = topic
            if not result.get("feedback"):
                result["feedback"] = "¡Muy bien!" if is_correct else "Intenta de nuevo aplicando la estructura."

            return result
        except Exception as e:
            logger.warning(f"LLM Quest evaluation failed: {e}. Falling back to heuristic.")
            res = self._evaluate_heuristically(transcript, node, topic)
            if res["is_correct"]:
                res["next_node_id"] = next_node_id
            return res
