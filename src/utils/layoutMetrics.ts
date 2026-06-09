import { H_PAD } from "../theme";

/** Espace réservé sous le contenu (gap + barre + padding), aligné sur l’ancien emplacement des pips. */
export const PIPS_ZONE = 30;

/** Marge basse totale pour le layout de l’écran d’accueil (pips + respiration). */
export const PIPS_BLOCK = 50;

/** Côté du grand carré central (écran d'accueil). */
export function getMainSquareSide(
  screenW: number,
  screenH: number,
  insetTop: number,
  insetBottom: number,
): number {
  const maxW = screenW - H_PAD * 2;
  const usableH = screenH - insetTop - insetBottom - PIPS_BLOCK - 16;
  return Math.floor(Math.min(maxW, usableH * 0.52));
}

/** Taille d'un bouton Dicter / Déposer (demi-carré). */
export function getHomeButtonSize(
  screenW: number,
  screenH: number,
  insetTop: number,
  insetBottom: number,
): number {
  return getMainSquareSide(screenW, screenH, insetTop, insetBottom) / 2;
}
