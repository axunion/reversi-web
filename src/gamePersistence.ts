import { DIFFICULTIES } from "./ai/difficulty";
import { SIZE } from "./logic/rules";
import type {
  Board,
  CellValue,
  Difficulty,
  GameConfig,
  Player,
} from "./logic/types";

const STORAGE_KEY = "reversi:save";
const BOARD_LENGTH = SIZE * SIZE;

export type RestoreState = {
  board: Board;
  turn: Player;
  lastMove: number | null;
};

export type SavedGame = RestoreState & { config: GameConfig };

export function saveGame(game: SavedGame): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {
    // Storage can be unavailable (private browsing, quota) - losing
    // persistence silently is not worth surfacing to the player.
  }
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    return isSavedGame(data) ? data : null;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // see saveGame
  }
}

function isCellValue(v: unknown): v is CellValue {
  return v === 0 || v === 1 || v === 2;
}

function isPlayer(v: unknown): v is Player {
  return v === 1 || v === 2;
}

function isBoard(v: unknown): v is Board {
  return Array.isArray(v) && v.length === BOARD_LENGTH && v.every(isCellValue);
}

function isLastMove(v: unknown): v is number | null {
  return (
    v === null ||
    (Number.isInteger(v) && (v as number) >= 0 && (v as number) < BOARD_LENGTH)
  );
}

function isGameConfig(v: unknown): v is GameConfig {
  if (typeof v !== "object" || v === null) return false;
  const config = v as Record<string, unknown>;
  if (config.mode === "pvp") return true;
  if (config.mode === "ai") {
    return (
      DIFFICULTIES.includes(config.difficulty as Difficulty) &&
      isPlayer(config.playerColor)
    );
  }
  return false;
}

function isSavedGame(v: unknown): v is SavedGame {
  if (typeof v !== "object" || v === null) return false;
  const game = v as Record<string, unknown>;
  return (
    isBoard(game.board) &&
    isPlayer(game.turn) &&
    isLastMove(game.lastMove) &&
    isGameConfig(game.config)
  );
}
