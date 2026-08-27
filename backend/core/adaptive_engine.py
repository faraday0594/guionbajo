"""
Guionbajo — Adaptive Learning Engine & Knowledge Map Planner
Implements:
1. Spaced Repetition Priority & Decay Calculation: Priority = f(time, mastery, difficulty, relevance)
2. 7 Lesson Archetypes (introduce, practice, review, remediation, integration, assessment, challenge)
3. Interleaving Orchestration (Core topic + Retrieval + Phonetic contrast)
4. Multi-dimensional Mastery Updating (Grammar, Vocabulary, Speaking, Phonetics)
"""
from datetime import datetime, timezone
import math
from typing import Dict, List, Optional, Any
import logging

from core.curriculum_graph import CURRICULUM_GRAPH, get_sublevel_info, get_class_node
from core.phonetic_catalog import PHONETIC_CATALOG, get_phoneme, get_phonetic_focus_for_sublevel

logger = logging.getLogger(__name__)

# 7 Archetype Constants
ARCHETYPE_INTRODUCE = "introduce"
ARCHETYPE_PRACTICE = "practice"
ARCHETYPE_REVIEW = "review"
ARCHETYPE_REMEDIATION = "remediation"
ARCHETYPE_INTEGRATION = "integration"
ARCHETYPE_ASSESSMENT = "assessment"
ARCHETYPE_CHALLENGE = "challenge"

ALL_ARCHETYPES = [
    ARCHETYPE_INTRODUCE,
    ARCHETYPE_PRACTICE,
    ARCHETYPE_REVIEW,
    ARCHETYPE_REMEDIATION,
    ARCHETYPE_INTEGRATION,
    ARCHETYPE_ASSESSMENT,
    ARCHETYPE_CHALLENGE,
]


def calculate_retrieval_priority(
    last_seen_days: float,
    mastery_score: float,
    difficulty: str = "medium",
    relevance_boost: float = 1.0
) -> float:
    """
    Priority = f(time_since_review, mastery, difficulty, relevance)
    Higher score indicates greater urgency to include in current session.
    """
    diff_multipliers = {"easy": 0.8, "medium": 1.0, "hard": 1.3}
    diff_factor = diff_multipliers.get(difficulty.lower(), 1.0)

    # Time factor (reaches max influence around 14 days)
    time_factor = 1.0 - math.exp(-0.15 * max(0.0, last_seen_days))

    # Weakness factor (lower mastery -> higher priority)
    weakness_factor = (100.0 - min(100.0, max(0.0, mastery_score))) / 100.0

    # Composite score between 0.0 and 100.0
    raw_priority = (time_factor * 0.45 + weakness_factor * 0.45 + 0.10) * diff_factor * relevance_boost * 100.0
    return round(min(100.0, max(0.0, raw_priority)), 2)


class AdaptiveEngine:
    """
    Orchestrates personalized curriculum selection and class synthesis.
    """

    def __init__(self, student_profile: Optional[Dict[str, Any]] = None):
        self.profile = student_profile or {}
        self.knowledge_map = self.profile.get("knowledge_map") or {}
        self.phonetics_mastery = self.profile.get("phonetics_mastery") or {}
        self.weak_areas = self.profile.get("weak_areas") or []

    def select_lesson_archetype(
        self,
        sublevel: str,
        class_index: int,
        topic_mastery: float = 0.0,
        recent_error_rate: float = 0.0,
        days_since_last_session: float = 0.0
    ) -> str:
        """
        Dynamically selects 1 of the 7 archetypes based on class position, mastery, and history.
        """
        # Class 4 of any sublevel is by default an Assessment / Capstone milestone
        if class_index == 4:
            return ARCHETYPE_ASSESSMENT

        # High error rate (> 45%) triggers Remediation
        if recent_error_rate >= 0.45 or topic_mastery < 35.0 and topic_mastery > 0.0:
            return ARCHETYPE_REMEDIATION

        # Long inactivity (> 10 days) triggers Review first
        if days_since_last_session > 10.0 and topic_mastery > 0.0:
            return ARCHETYPE_REVIEW

        # Never seen before -> Introduce
        if topic_mastery <= 5.0:
            return ARCHETYPE_INTRODUCE

        # High mastery (> 85%) -> Challenge mode
        if topic_mastery >= 85.0:
            return ARCHETYPE_CHALLENGE

        # Class 3 often combines previous 2 topics -> Integration
        if class_index == 3:
            return ARCHETYPE_INTEGRATION

        # Default standard -> Practice
        return ARCHETYPE_PRACTICE

    def compose_adaptive_plan(
        self,
        sublevel: str,
        class_index: int = 1
    ) -> Dict[str, Any]:
        """
        Builds complete adaptive blueprint combining Core Topic, Retrieval,
        Phonetic Contrast Pair, and Time distribution.
        """
        sublevel_info = get_sublevel_info(sublevel) or get_sublevel_info("A1.1")
        class_node = get_class_node(sublevel, class_index) or sublevel_info["classes"][0]

        core_topic = class_node["topic"]
        macro_objective = sublevel_info.get("macro_objective", "Core Fluency")

        # 1. Retrieve knowledge data for this topic
        topic_data = self.knowledge_map.get(core_topic, {})
        mastery = topic_data.get("mastery", 0.0)
        last_seen = topic_data.get("last_seen_days", 0.0)

        # 2. Select Archetype
        archetype = self.select_lesson_archetype(
            sublevel=sublevel,
            class_index=class_index,
            topic_mastery=mastery,
            recent_error_rate=topic_data.get("error_rate", 0.0),
            days_since_last_session=last_seen
        )

        # 3. Interleaving Selection: Pick highest priority retrieval candidate
        possible_retrievals = class_node.get("retrieval_topics", [])
        best_retrieval = None
        highest_priority = -1.0

        for r_topic in possible_retrievals:
            r_data = self.knowledge_map.get(r_topic, {})
            r_days = r_data.get("last_seen_days", 5.0)
            r_mastery = r_data.get("mastery", 50.0)
            p = calculate_retrieval_priority(r_days, r_mastery)
            if p > highest_priority:
                highest_priority = p
                best_retrieval = r_topic

        if not best_retrieval and possible_retrievals:
            best_retrieval = possible_retrievals[0]

        # 4. Phonetic Contrast Selection - ONLY if scheduled for this class
        contrast_symbols = class_node.get("phonetic_contrast")
        phonetic_focus = None
        if contrast_symbols and isinstance(contrast_symbols, list) and len(contrast_symbols) > 0:
            primary_phoneme = get_phoneme(contrast_symbols[0])
            secondary_phoneme = get_phoneme(contrast_symbols[1]) if len(contrast_symbols) > 1 else None
            if primary_phoneme:
                phonetic_focus = {
                    "primary": primary_phoneme,
                    "secondary": secondary_phoneme,
                    "symbols": contrast_symbols,
                    "contrast_pairs": primary_phoneme.get("contrast_pairs", []),
                    "mouth_guide": primary_phoneme.get("mouth_guide", {}),
                    "mouth_guide_es": primary_phoneme.get("mouth_guide_es", primary_phoneme.get("mouth_guide", {})),
                    "drill_sentence": primary_phoneme.get("drill_sentence", ""),
                    "mouth_frontal_img": primary_phoneme.get("mouth_frontal_img"),
                    "mouth_lateral_img": primary_phoneme.get("mouth_lateral_img"),
                    "audio_file": primary_phoneme.get("audio_file"),
                    "focus_title": class_node.get("phonetic_focus_title", "Bonus de Pronunciación: Contraste Fonético")
                }

        # 5. Phased time distribution based on archetype and phonetic focus
        time_allocation = self._calculate_time_allocation(archetype, has_phonetic_focus=bool(phonetic_focus))

        return {
            "sublevel": sublevel,
            "class_index": class_index,
            "macro_objective": macro_objective,
            "archetype": archetype,
            "core_topic": core_topic,
            "grammar_core": class_node.get("grammar_core", ""),
            "vocabulary_core": class_node.get("vocabulary_core", ""),
            "retrieval_topic": best_retrieval,
            "phonetic_focus": phonetic_focus,
            "time_allocation_minutes": time_allocation,
            "target_skills": class_node.get("target_skills", ["speaking", "grammar"])
        }

    def _calculate_time_allocation(self, archetype: str, has_phonetic_focus: bool = False) -> Dict[str, int]:
        """Calculates recommended minute breakdown per phase."""
        ph_mins = 5 if has_phonetic_focus else 0
        if archetype == ARCHETYPE_INTRODUCE:
            return {
                "warmup": 3,
                "retrieval": 2,
                "grammar_explanation": 12 if not has_phonetic_focus else 9,
                "phonetics_microlesson": ph_mins,
                "guided_practice": 15 if not has_phonetic_focus else 12,
                "spontaneous_speaking": 8 if not has_phonetic_focus else 7
            }
        elif archetype == ARCHETYPE_REMEDIATION:
            return {
                "warmup": 2,
                "retrieval": 6,
                "grammar_explanation": 12 if not has_phonetic_focus else 8,
                "phonetics_microlesson": ph_mins,
                "guided_practice": 14 if not has_phonetic_focus else 12,
                "spontaneous_speaking": 6 if not has_phonetic_focus else 5
            }
        elif archetype == ARCHETYPE_CHALLENGE:
            return {
                "warmup": 2,
                "retrieval": 3,
                "grammar_explanation": 5,
                "phonetics_microlesson": ph_mins,
                "guided_practice": 8,
                "spontaneous_speaking": 22 if not has_phonetic_focus else 18
            }
        elif archetype == ARCHETYPE_ASSESSMENT:
            return {
                "warmup": 2,
                "retrieval": 4,
                "grammar_explanation": 0,
                "phonetics_microlesson": ph_mins,
                "guided_practice": 12 if not has_phonetic_focus else 10,
                "spontaneous_speaking": 22 if not has_phonetic_focus else 17
            }
        else:  # practice, review, integration
            return {
                "warmup": 2,
                "retrieval": 4,
                "grammar_explanation": 8 if not has_phonetic_focus else 6,
                "phonetics_microlesson": ph_mins,
                "guided_practice": 14 if not has_phonetic_focus else 11,
                "spontaneous_speaking": 12
            }

    @staticmethod
    def update_knowledge_node(
        current_data: Optional[Dict[str, Any]],
        is_correct: bool,
        is_productive_speaking: bool = False,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """
        Updates node mastery differentiating recognition vs spontaneous production.
        """
        data = current_data.copy() if current_data else {
            "mastery": 0.0,
            "recognition_score": 0.0,
            "productive_score": 0.0,
            "times_seen": 0,
            "times_practiced": 0,
            "success_count": 0,
            "last_seen_date": datetime.now(timezone.utc).isoformat(),
            "stability_index": 1.0
        }

        data["times_seen"] = data.get("times_seen", 0) + 1
        data["times_practiced"] = data.get("times_practiced", 0) + 1
        if is_correct:
            data["success_count"] = data.get("success_count", 0) + 1

        delta = 15.0 if is_correct else -12.0
        if is_productive_speaking:
            # Speaking carries higher weight for real communicative mastery
            delta *= 1.3
            curr_prod = data.get("productive_score", 0.0)
            data["productive_score"] = round(min(100.0, max(0.0, curr_prod + delta)), 1)
        else:
            curr_rec = data.get("recognition_score", 0.0)
            data["recognition_score"] = round(min(100.0, max(0.0, curr_rec + delta)), 1)

        # Composite mastery: 60% productive + 40% recognition
        rec = data.get("recognition_score", 0.0)
        prod = data.get("productive_score", 0.0)
        data["mastery"] = round((prod * 0.60) + (rec * 0.40), 1)
        data["last_seen_date"] = datetime.now(timezone.utc).isoformat()

        return data
