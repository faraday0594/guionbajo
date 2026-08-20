"""
Guionbajo — Learning Map Generator
Uses MiniMax M3 to generate a personalized curriculum from student's level to B2.4.
"""
import json
import logging
from core.minimax_agent import TutorAgent

logger = logging.getLogger(__name__)


async def generate_learning_map(agent: TutorAgent, student_profile: dict, start_level: str) -> dict:
    """
    Wrapper to call TutorAgent.generate_learning_map.
    Returns a dict with 'modules' and 'milestones'.
    """
    try:
        result = await agent.generate_learning_map(student_profile, start_level)
        logger.info(f"Generated learning map: {result.get('total_modules', 0)} modules from {start_level}")
        return result
    except Exception as e:
        logger.error(f"Learning map wrapper error: {e}")
        return agent._fallback_learning_map(start_level)
