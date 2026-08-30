"""
Guionbajo — Interactive POV Conversational Quest Engine (Visual Novel Mode)
Generates and evaluates turn-based, first-person narrative quests aligned with CEFR grammar goals.
All visual scenes use bright, colorful 2D Anime Visual Novel art style with authentic First-Person POV (visible player hands in foreground) and locked consistent scenography for static conversations.
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

# ─── DETERMINISTIC FALLBACK QUEST BANK (ANIME VISUAL NOVEL STYLE WITH POV HANDS) ─────────────

FALLBACK_QUESTS_BANK: Dict[str, List[Dict[str, Any]]] = {
    "A1": [
        {
            "story_id": "future_plans_campus_01",
            "title": "Un Día en el Campus Universitario",
            "grammar_topic": "Future simple with 'will'",
            "difficulty_level": "A1",
            "setting_type": "journey_walk",
            "companion_name": "Emma",
            "companion_gender": "female",
            "companion_voice": "en-US-JennyNeural",
            "companion_avatar": "👩‍🦱",
            "character_dna": "Emma, 20-year-old female student with wavy chestnut brown hair, warm hazel eyes, wearing a denim jacket over a white t-shirt",
            "nodes": [
                {
                    "node_id": "step_1_invitation",
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai vibrant aesthetic, solo, 1girl, single female character only, Emma (20-year-old female student with wavy chestnut brown hair, warm hazel eyes, wearing a denim jacket over a white t-shirt) sitting across a wooden bench facing camera with direct friendly eye contact, smiling warmly and making an inviting hand gesture, sunny university campus with cherry blossom trees in background, bright daylight, clean 2D anime digital illustration, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai vibrant aesthetic, solo, 1girl, single female character only, Emma (wearing the exact same denim jacket over white t-shirt) sitting in a sunny campus bus seat facing camera with direct eye contact, smiling enthusiastically, sunny city street outside bus window, clean 2D anime visual novel illustration, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai vibrant aesthetic, solo, 1girl, single female character only, Emma (wearing the exact same denim jacket over white t-shirt) standing outside modern swimming pool entrance facing camera with direct eye contact, waving happily, sunny blue summer sky, clean 2D anime digital illustration, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
            "setting_type": "static_location",
            "companion_name": "Lucas",
            "companion_gender": "male",
            "companion_voice": "en-US-RogerNeural",
            "companion_avatar": "🧑‍🦰",
            "character_dna": "Lucas, friendly 22-year-old male barista with short auburn hair, hazel eyes, wearing a brown canvas barista apron over a beige sweater",
            "environment_anchor": "inside the exact same cozy cafe by a sunlit arched window with a warm polished wooden table and hanging green plants, warm golden afternoon lighting",
            "nodes": [
                {
                    "node_id": "step_1_order_drink",
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, solo, 1boy, single male character only, Lucas (friendly 22-year-old male barista with short auburn hair, hazel eyes, wearing a brown canvas apron over a beige sweater) standing behind wooden cafe counter facing camera with friendly eye contact, smiling pleasantly, inside the exact same cozy cafe by a sunlit arched window with a warm polished wooden table and hanging green plants, warm golden afternoon lighting, clean 2D anime visual novel illustration, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, solo, 1boy, single male character only, Lucas (wearing the exact same beige sweater) sitting across the wooden table facing camera with direct eye contact, smiling warmly holding a coffee cup, inside the exact same cozy cafe by a sunlit arched window with a warm polished wooden table and hanging green plants, warm golden afternoon lighting, clean 2D anime visual novel illustration, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
            "setting_type": "journey_walk",
            "companion_name": "Officer Davies",
            "companion_gender": "male",
            "companion_voice": "en-US-RogerNeural",
            "companion_avatar": "👮‍♂️",
            "character_dna": "Officer Davies, 35-year-old polite airport staff officer with short dark hair, wearing a crisp navy blue airport uniform with a silver badge",
            "nodes": [
                {
                    "node_id": "step_1_report_lost",
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, solo, 1boy, single male character only, Officer Davies (35-year-old polite airport staff officer with short dark hair, wearing a crisp navy blue airport uniform with a silver badge) standing at information desk facing camera with direct eye contact, listening attentively, bright modern airport terminal with huge glass windows, clean 2D anime visual novel art, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, solo, 1boy, single male character only, Officer Davies (wearing the exact same crisp navy blue uniform) walking near baggage conveyor belt facing camera with direct eye contact, pointing helpfully, bright airport lighting, clean anime digital illustration, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, solo, 1boy, single male character only, Officer Davies (wearing the exact same navy uniform) smiling happily facing camera with direct eye contact, holding out a black backpack in a bright clean office, clean 2D anime visual novel style, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
            "setting_type": "static_location",
            "companion_name": "Ms. Carter",
            "companion_gender": "female",
            "companion_voice": "en-US-JennyNeural",
            "companion_avatar": "👩‍💼",
            "character_dna": "Ms. Carter, 32-year-old elegant executive with sleek dark brown hair in a neat low bun, wearing a tailored navy blazer over an ivory silk blouse",
            "environment_anchor": "inside the exact same executive glass conference room across a polished reflective desk, panoramic city skyline view outside large floor-to-ceiling windows, bright sunny daylight",
            "nodes": [
                {
                    "node_id": "step_1_experience_intro",
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, solo, 1girl, single female character only, Ms. Carter (32-year-old executive with sleek dark brown hair in a low bun, wearing a navy blazer over an ivory blouse) sitting across executive desk facing camera with direct friendly eye contact, smiling warmly and holding a pen, inside the exact same executive glass conference room across a polished reflective desk, panoramic city skyline view outside large floor-to-ceiling windows, bright sunny daylight, clean 2D anime visual novel digital art, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, solo, 1girl, single female character only, Ms. Carter (wearing the exact same navy blazer and ivory blouse) sitting across the desk facing camera with direct eye contact, nodding approvingly and jotting positive notes in a leather notebook, inside the exact same executive glass conference room across a polished reflective desk, panoramic city skyline view outside large floor-to-ceiling windows, bright sunny daylight, clean 2D anime visual novel digital art, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
                    "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, solo, 1girl, single female character only, Ms. Carter (wearing the exact same navy blazer and ivory blouse) standing slightly across the desk facing camera with direct eye contact, extending her hand towards the camera for a friendly handshake with a welcoming smile, inside the exact same executive glass conference room across a polished reflective desk, panoramic city skyline view outside large floor-to-ceiling windows, bright sunny daylight, clean 2D anime visual novel digital art, strictly 2D anime drawing, single person only, no second person, no couple, not a photo, no photorealism, 16:9, no text, no words",
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
    Enforces strict background scenography continuity and authentic First-Person POV foreground cues (player hands/props).
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
            "The player is an English student experiencing the story directly from their own first-person eyes.\n"
            "ART STYLE IS STRICTLY: Masterpiece 2D Japanese Anime Visual Novel Game CG, Makoto Shinkai vibrant aesthetic, Kyoto Animation style, clean 2D cel-shaded digital drawing, high-key bright daylight, cheerful atmosphere.\n"
            "Output strictly valid JSON matching the specified schema."
        )

        user_prompt = f"""Design a 3-scene turn-based conversational quest for:
Topic / Grammar Target: {topic}
CEFR Level: {sublevel} ({lvl_key})

MANDATORY RULES FOR 2D ANIME VISUAL NOVEL & SCENOGRAPHY:

1. SOLO COMPANION ONLY (NO COUPLE / NO ROMANCE / NO TWO PEOPLE):
   - Exactly ONE companion character on screen facing front, centered in waist-up portrait view, making direct eye contact with the player/camera.
   - DO NOT describe two people interacting, DO NOT describe holding hands between characters, DO NOT describe a couple or romance. The player is the camera.

2. Setting & Background Scenography Continuity:
   - Choose one logical setting type:
     a) "static_location" (e.g. Seated across a table at a cafe, office desk interview, living room table, classroom desk).
        CRITICAL RULE: If "static_location", define a specific "environment_anchor" (e.g. "inside the exact same cozy cafe booth by a sunny arched window with wooden table and hanging green plants, warm afternoon sunlight"). ALL 3 SCENE PROMPTS MUST REUSE THE EXACT SAME ENVIRONMENT ANCHOR! The background, room, windows, and table MUST NOT CHANGE across nodes.
     b) "journey_walk" (e.g. Walking tour from courtyard -> bus -> destination). Scenery progresses logically step-by-step.
     c) "time_jump" (Only if the grammar topic explicitly demands past vs present or 'used to').

3. Character Visual DNA (Facial & Outfit Consistency):
   - Define exact physical traits: hair style/color, eye color, age, and signature clothing.
   - UNLESS a multi-year flashback is explicitly mentioned, the companion's face, age, hairstyle, and clothing MUST REMAIN 100% IDENTICAL across all 3 scenes. Only their facial expression (curious -> engaged -> happy/relieved) and hand gestures change.

4. Nodes: Generate exactly 3 sequential nodes ('nodes' array):
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
  "setting_type": "static_location",
  "companion_name": "Emma",
  "companion_gender": "female",
  "companion_voice": "en-US-JennyNeural",
  "companion_avatar": "👩‍🦱",
  "character_dna": "Emma, 20-year-old female student with wavy chestnut brown hair, warm hazel eyes, wearing a denim jacket over a white shirt",
  "environment_anchor": "inside the exact same cozy cafe booth by a sunny arched window with a warm wooden table and green plants, bright daylight",
  "nodes": [
    {{
      "node_id": "step_1_invitation",
      "pov_image_prompt": "Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai vibrant aesthetic, solo, 1girl, single female character only, Emma (20-year-old female student with wavy chestnut brown hair, warm hazel eyes, wearing a denim jacket over a white shirt) sitting across the wooden table facing camera with direct friendly eye contact, smiling and making an inviting hand gesture, inside the exact same cozy cafe booth by a sunny arched window with a warm wooden table and green plants, bright daylight, clean 2D anime digital illustration, strictly 2D anime drawing, single person only, no second person, no couple, no photorealism, 16:9, no text, no words",
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

            dna = data.get("character_dna") or f"{data.get('companion_name', 'companion')}, friendly anime character"
            env_anchor = data.get("environment_anchor", "in a bright sunlit environment with warm natural lighting")
            is_static = data.get("setting_type") == "static_location"
            solo_tag = "solo, 1female, single female character only" if comp_gender == "female" else "solo, 1male, single male character only"

            # Ensure all nodes have clean anime prompts and scenography continuity
            for idx, node in enumerate(data["nodes"]):
                if not node.get("node_id"):
                    node["node_id"] = f"step_{idx+1}"
                
                prompt_str = str(node.get("pov_image_prompt", ""))
                
                # Remove photography/dark artifacts and hands holding that cause couples
                clean_p = re.sub(r'realistic photography|photorealistic|photorealism|photo|hyperrealistic|realism', 'clean 2D anime visual novel digital illustration, Makoto Shinkai vibrant aesthetic, bright daylight', prompt_str, flags=re.IGNORECASE)
                clean_p = re.sub(r"player's (own )?hands (and arms )?(visible in (the )?bottom foreground )?(holding|resting|reaching|gesturing)?", "foreground wooden table edge", clean_p, flags=re.IGNORECASE)

                # Ensure solo anime visual novel prefix
                if not clean_p.lower().startswith("masterpiece 2d japanese anime"):
                    clean_p = f"Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai aesthetic, {solo_tag}, looking directly into camera with friendly eye contact, {dna}, {clean_p}"
                
                # If static, enforce environment anchor
                if is_static and env_anchor and env_anchor.lower() not in clean_p.lower():
                    clean_p = f"{clean_p}, {env_anchor}"

                # Append mandatory 2D anime and anti-couple negative tags
                clean_p = f"{clean_p}, clean 2D anime digital drawing, strictly 2D anime, single person only, no second person, no couple, no romance, no holding hands, not a photo, no photorealism, no 3D, no text, no words"

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
