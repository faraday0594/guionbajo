"""
Guionbajo — Comprehensive CEFR & Phonetics Diagnosis Engine
Generates and evaluates an 80-question comprehensive exam:
- 60 Curricular Questions (6 level bands x 10 questions)
- 20 Phonetic Questions (10 Pure Audio + 10 Highlighted Word)
"""
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from core.minimax_agent import TutorAgent, LEVEL_SEQUENCE, SUBLEVEL_DESCRIPTIONS
from core.diagnosis_bank import (
    CURRICULAR_QUESTIONS_60,
    PHONETIC_QUESTIONS_20,
    get_all_diagnosis_questions
)

logger = logging.getLogger(__name__)


class DiagnosisEngine:
    def __init__(self, agent: TutorAgent):
        self.agent = agent
        self.all_questions = get_all_diagnosis_questions()
        self.question_map = {q["id"]: q for q in self.all_questions}

    async def generate_exam(self) -> list:
        """Return all 80 questions (60 curricular + 20 phonetic)."""
        logger.info(f"Delivering full 80-question diagnosis exam (60 curricular + 20 phonetic)")
        return self.all_questions

    async def evaluate_exam(self, questions: list, answers: list) -> dict:
        """
        Comprehensive evaluation of curricular and phonetic performance.
        Determines exact CEFR sublevel (A1.1 -> B2.4) and calculates phonetic mastery profile.
        """
        # Build answer map by question_id
        ans_map = {}
        for a in answers:
            qid = a.get("question_id")
            if qid is not None:
                ans_map[qid] = str(a.get("answer", "")).strip().lower()

        # Separate questions into Curricular (1-60) and Phonetics (61-80)
        curricular_results = []
        phonetic_results = []

        for q in self.all_questions:
            qid = q["id"]
            user_ans = ans_map.get(qid, "")
            corr_ans = str(q.get("correct_answer", "")).strip().lower()
            is_correct = bool(user_ans and user_ans == corr_ans)

            item = {
                "id": qid,
                "section": q.get("section", "curriculum"),
                "level": q.get("level", "A1.1"),
                "band": q.get("band", 1),
                "topic": q.get("topic") or q.get("phoneme_symbol", ""),
                "type": q.get("type", "grammar"),
                "user_answer": user_ans,
                "correct_answer": corr_ans,
                "is_correct": is_correct,
                "points": q.get("points", 5),
            }

            if q.get("section") == "phonetics" or qid > 60:
                item["phoneme_symbol"] = q.get("phoneme_symbol", "")
                phonetic_results.append(item)
            else:
                curricular_results.append(item)

        # ─── 1. EVALUATE CURRICULAR PERFORMANCE ───────────────────────
        band_stats = {b: {"total": 0, "correct": 0} for b in range(1, 7)}
        for item in curricular_results:
            b = item.get("band", 1)
            if b in band_stats:
                band_stats[b]["total"] += 1
                if item["is_correct"]:
                    band_stats[b]["correct"] += 1

        curr_correct = sum(1 for item in curricular_results if item["is_correct"])
        curr_total = max(len(curricular_results), 1)
        curr_pct = (curr_correct / curr_total) * 100.0

        # CEFR level calculation based on progressive mastery
        b1_pct = (band_stats[1]["correct"] / max(band_stats[1]["total"], 1)) * 100
        b2_pct = (band_stats[2]["correct"] / max(band_stats[2]["total"], 1)) * 100
        b3_pct = (band_stats[3]["correct"] / max(band_stats[3]["total"], 1)) * 100
        b4_pct = (band_stats[4]["correct"] / max(band_stats[4]["total"], 1)) * 100
        b5_pct = (band_stats[5]["correct"] / max(band_stats[5]["total"], 1)) * 100
        b6_pct = (band_stats[6]["correct"] / max(band_stats[6]["total"], 1)) * 100

        # Determine sublevel progressively based on highest consolidated mastery
        if b1_pct < 60:
            assigned_level = "A1.1"
        elif b1_pct < 85:
            assigned_level = "A1.2"
        elif b2_pct < 60:
            assigned_level = "A1.3"
        elif b2_pct < 85:
            assigned_level = "A1.4"
        elif b3_pct < 60:
            assigned_level = "A2.1"
        elif b3_pct < 85:
            assigned_level = "A2.2"
        elif b4_pct < 60:
            assigned_level = "A2.3"
        elif b4_pct < 85:
            assigned_level = "A2.4"
        elif b5_pct < 60:
            assigned_level = "B1.1"
        elif b5_pct < 85:
            assigned_level = "B1.2"
        elif b6_pct < 50:
            assigned_level = "B1.3"
        elif b6_pct < 70:
            assigned_level = "B1.4"
        elif b6_pct < 85:
            assigned_level = "B2.1"
        elif b6_pct < 95:
            assigned_level = "B2.2"
        else:
            assigned_level = "B2.4"

        # CEFR score breakdown (approximate 0-100 per stage)
        score_by_level = {
            "A1": round((b1_pct + b2_pct) / 2.0, 1),
            "A2": round((b3_pct + b4_pct) / 2.0, 1),
            "B1": round((b5_pct + min(b6_pct * 1.2, 100)) / 2.0, 1),
            "B2": round(b6_pct, 1),
        }

        # ─── 2. EVALUATE PHONETIC PERFORMANCE ─────────────────────────
        phonetic_correct = sum(1 for item in phonetic_results if item["is_correct"])
        phonetic_total = max(len(phonetic_results), 1)
        phonetic_pct = round((phonetic_correct / phonetic_total) * 100.0, 1)

        now_iso = datetime.now(timezone.utc).isoformat()
        phonetics_mastery_dict = {}
        mastered_phonemes = []
        weak_phonemes = []

        for item in phonetic_results:
            sym = item.get("phoneme_symbol")
            if not sym:
                continue
            is_corr = item["is_correct"]
            mastery_score = 95.0 if is_corr else 30.0
            phonetics_mastery_dict[sym] = {
                "mastery": mastery_score,
                "times_practiced": 1,
                "last_seen_date": now_iso,
            }
            if is_corr:
                if sym not in mastered_phonemes:
                    mastered_phonemes.append(sym)
            else:
                if sym not in weak_phonemes:
                    weak_phonemes.append(sym)

        # Strengths and weaknesses extraction
        strong_areas = []
        weak_areas = []
        for item in curricular_results:
            topic = item["topic"]
            if item["is_correct"]:
                if topic not in strong_areas and len(strong_areas) < 4:
                    strong_areas.append(topic)
            else:
                if topic not in weak_areas and len(weak_areas) < 4:
                    weak_areas.append(topic)

        agent_reasoning = (
            f"Diagnóstico Integral completado: {curr_correct}/{curr_total} aciertos curriculares ({curr_pct:.0f}%) "
            f"y {phonetic_correct}/{phonetic_total} aciertos fonéticos ({phonetic_pct:.0f}%). "
            f"Nivel asignado: {assigned_level}. "
            f"Se identificaron {len(mastered_phonemes)} fonemas dominados y {len(weak_phonemes)} fonemas para reforzar."
        )

        recommendation = (
            f"Comenzar en el subnivel {assigned_level}. "
            f"Tu ruta de aprendizaje integrará las 4 clases de este nivel y entrenamiento fonético personalizado."
        )

        return {
            "assigned_level": assigned_level,
            "score_by_level": score_by_level,
            "total_score": (curr_correct * 5) + (phonetic_correct * 5),
            "strong_areas": strong_areas,
            "weak_areas": weak_areas,
            "agent_reasoning": agent_reasoning,
            "recommendation": recommendation,
            "confidence": 0.92,
            "phonetic_mastery_pct": phonetic_pct,
            "phonetic_breakdown": {
                "correct": phonetic_correct,
                "total": phonetic_total,
                "pure_sound_correct": sum(1 for p in phonetic_results if p.get("type") == "phonetic_sound" and p["is_correct"]),
                "word_highlight_correct": sum(1 for p in phonetic_results if p.get("type") == "phonetic_word" and p["is_correct"]),
            },
            "mastered_phonemes": mastered_phonemes,
            "weak_phonemes": weak_phonemes,
            "phonetics_mastery_dict": phonetics_mastery_dict,
        }
