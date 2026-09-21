/**
 * guionbajoUpgrades.ts
 *
 * Sistema de evolución progresiva de Guionbajo.
 * Cada vez que el estudiante completa la última clase de un subnivel "clave" CEFR,
 * Guionbajo desbloquea un upgrade visual permanente.
 *
 * 8 upgrades totales distribuidos en los 16 subniveles (A1.1 → B2.4).
 */

import { SUBLEVEL_ORDER } from '@/lib/journeyTopics';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type UpgradeStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// ─── Mapa de triggers ────────────────────────────────────────────────────────

/**
 * Subniveles cuya compleción (clase 4 terminada) dispara un upgrade.
 * El valor es el stage que se desbloquea.
 */
export const UPGRADE_TRIGGERS: Record<string, UpgradeStage> = {
  'A1.2': 1, // 🦾 Brazos articulados cromados
  'A1.4': 2, // 🚀 Jetpack dorsal doble tobera
  'A2.2': 3, // 🥽 Visor HUD táctico neón
  'A2.4': 4, // 🛡️ Ribetes de chasis dorados
  'B1.2': 5, // 📡 Antena → Bobina Tesla
  'B1.4': 6, // 🪽 Alas holográficas de plasma
  'B2.2': 7, // 🛸 Mini-dron "Guioncito" orbital
  'B2.4': 8, // 👑 Corona maestra + aura dorada
};

// ─── Definiciones de upgrades ─────────────────────────────────────────────────

export interface UpgradeDefinition {
  stage: UpgradeStage;
  name: string;
  emoji: string;
  desc: string;
  triggerSublevel: string | null; // el subnivel que lo desbloquea (null para stage 0)
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    stage: 0,
    name: 'Prototipo Rústico',
    emoji: '🤖',
    desc: 'Sin mejoras aún. El viaje comienza.',
    triggerSublevel: null,
  },
  {
    stage: 1,
    name: 'Brazos Articulados Cromados',
    emoji: '🦾',
    desc: 'Chasis de combate. Puede gesticular y señalar con precisión.',
    triggerSublevel: 'A1.2',
  },
  {
    stage: 2,
    name: 'Jetpack Dorsal Doble Tobera',
    emoji: '🚀',
    desc: 'Propulsión de plasma azul. ¡Graduado del nivel A1!',
    triggerSublevel: 'A1.4',
  },
  {
    stage: 3,
    name: 'Visor HUD Táctico Neón',
    emoji: '🥽',
    desc: 'Análisis lingüístico en tiempo real. La gramática ya no tiene secretos.',
    triggerSublevel: 'A2.2',
  },
  {
    stage: 4,
    name: 'Chasis Cromado Dorado',
    emoji: '🛡️',
    desc: 'Blindaje certificado. ¡Graduado del nivel A2!',
    triggerSublevel: 'A2.4',
  },
  {
    stage: 5,
    name: 'Bobina Tesla Cuántica',
    emoji: '📡',
    desc: 'Escucha profunda y comprensión avanzada de texto.',
    triggerSublevel: 'B1.2',
  },
  {
    stage: 6,
    name: 'Espadas Gemelas Cyber',
    emoji: '⚔️',
    desc: 'Doble espada de combate montada a los lados. ¡Graduado del nivel B1 con estilo!',
    triggerSublevel: 'B1.4',
  },
  {
    stage: 7,
    name: 'Mini-Dron Guioncito',
    emoji: '🛸',
    desc: 'Copiloto orbital de oratoria. Dominio B2 en camino.',
    triggerSublevel: 'B2.2',
  },
  {
    stage: 8,
    name: 'Forma Maestra',
    emoji: '👑',
    desc: '¡Bilingüe certificado! El nivel máximo ha sido alcanzado.',
    triggerSublevel: 'B2.4',
  },
];

// ─── Helpers de progreso ───────────────────────────────────────────────────────

const CHECKPOINT_KEY = 'guionbajo_checkpoint';

/**
 * Lee el localStorage y devuelve los subniveles en los que el usuario
 * ya terminó las 4 clases (classIndex === 4 con quizCompleted o lessonCompleted).
 *
 * El formato del checkpoint guardado en page.tsx es:
 * {
 *   sublevel: string,
 *   classIndex: number,
 *   quizCompleted: boolean,
 *   ...
 * }
 *
 * Se considera un subnivel "completado" si hay un checkpoint donde
 * classIndex === 4 y algún flag de completado es true.
 */
export function getCompletedSublevelsFromLocalStorage(): string[] {
  if (typeof window === 'undefined') return [];

  const completed: string[] = [];

  try {
    // Método 1: checkpoint principal
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (raw) {
      const cp = JSON.parse(raw);
      const sublevel: string = cp.sublevel || '';
      const classIndex: number = cp.classIndex ?? cp.class_index ?? 0;
      const isCompleted: boolean =
        cp.quizCompleted || cp.readingCompleted || cp.mysteryWordCompleted || false;

      if (sublevel && classIndex >= 4 && isCompleted) {
        // El subnivel actual está completado
        const sublevelIdx = SUBLEVEL_ORDER.indexOf(sublevel);
        // Todos los subniveles anteriores también se consideran completados
        for (let i = 0; i <= sublevelIdx; i++) {
          completed.push(SUBLEVEL_ORDER[i]);
        }
      } else if (sublevel) {
        // Solo los anteriores al actual
        const sublevelIdx = SUBLEVEL_ORDER.indexOf(sublevel);
        for (let i = 0; i < sublevelIdx; i++) {
          completed.push(SUBLEVEL_ORDER[i]);
        }
      }
    }

    // Método 2: bandera de clase recién completada
    const justCompletedRaw = localStorage.getItem('guionbajo_class_just_completed');
    if (justCompletedRaw) {
      const jc = JSON.parse(justCompletedRaw);
      const sublevel: string = jc.sublevel || '';
      const classIndex: number = jc.classIndex ?? jc.class_index ?? 0;
      if (sublevel && classIndex >= 4 && !completed.includes(sublevel)) {
        completed.push(sublevel);
      }
    }
  } catch {
    // Si el JSON está corrupto, retornar vacío
  }

  return completed;
}

/**
 * Calcula el upgrade stage actual del estudiante a partir de los
 * subniveles completados.
 */
export function getUpgradeStageFromCompleted(completedSublevels: string[]): UpgradeStage {
  let maxStage: UpgradeStage = 0;

  for (const sublevel of completedSublevels) {
    const stage = UPGRADE_TRIGGERS[sublevel];
    if (stage !== undefined && stage > maxStage) {
      maxStage = stage as UpgradeStage;
    }
  }

  return maxStage;
}

/**
 * Calcula el upgrade stage alcanzado automáticamente a partir del subnivel activo del estudiante.
 * Todo subnivel completado antes del actual desbloquea su upgrade correspondiente.
 */
export function getUpgradeStageFromSublevel(sublevel: string): UpgradeStage {
  const sublevelIdx = SUBLEVEL_ORDER.indexOf(sublevel);
  if (sublevelIdx < 0) return 0;

  let maxStage: UpgradeStage = 0;
  for (let i = 0; i < sublevelIdx; i++) {
    const s = SUBLEVEL_ORDER[i];
    const stage = UPGRADE_TRIGGERS[s];
    if (stage !== undefined && stage > maxStage) {
      maxStage = stage as UpgradeStage;
    }
  }
  return maxStage;
}

/**
 * Función conveniente: lee localStorage o toma el subnivel provisto y retorna el stage directamente.
 */
export function getCurrentUpgradeStage(currentSublevel?: string): UpgradeStage {
  const fromLocal = getUpgradeStageFromCompleted(getCompletedSublevelsFromLocalStorage());
  let fromSavedSublevel: UpgradeStage = 0;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('guionbajo_user_sublevel');
    if (saved) {
      fromSavedSublevel = getUpgradeStageFromSublevel(saved);
    }
  }
  const fromParam = currentSublevel ? getUpgradeStageFromSublevel(currentSublevel) : 0;
  return Math.max(fromLocal, fromSavedSublevel, fromParam) as UpgradeStage;
}

/**
 * Verifica si completar la clase `classIndex` del subnivel `sublevel`
 * dispara un nuevo upgrade. Retorna el nuevo UpgradeStage o null si no hay upgrade.
 */
export function checkUpgradeTrigger(
  sublevel: string,
  classIndex: number
): UpgradeStage | null {
  if (classIndex < 4) return null;
  const stage = UPGRADE_TRIGGERS[sublevel];
  return stage !== undefined ? stage : null;
}
