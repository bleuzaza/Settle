import { Entry } from "../storage";
import { STACK_GAP } from "../theme";

export type MosaicItem = {
  themeName: string;
  entries: Entry[];
  x: number;
  y: number;
  width: number;
  height: number;
};

type ThemeSlice = {
  themeName: string;
  entries: Entry[];
  count: number;
  weight: number;
};

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const MIN_SIDE = 76;

function sliceTreemap(
  items: ThemeSlice[],
  rect: Rect,
  gap: number,
  output: MosaicItem[],
): void {
  if (items.length === 0 || rect.w < 4 || rect.h < 4) return;

  if (items.length === 1) {
    const theme = items[0];
    output.push({
      themeName: theme.themeName,
      entries: theme.entries,
      x: rect.x,
      y: rect.y,
      width: Math.floor(rect.w),
      height: Math.floor(rect.h),
    });
    return;
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const horizontal = rect.w >= rect.h;

  let splitAt = 1;
  let bestBalance = Infinity;
  let leftWeight = 0;
  for (let i = 1; i < items.length; i += 1) {
    leftWeight += items[i - 1].weight;
    const balance = Math.abs(leftWeight / totalWeight - 0.5);
    if (balance < bestBalance) {
      bestBalance = balance;
      splitAt = i;
    }
  }

  const left = items.slice(0, splitAt);
  const right = items.slice(splitAt);
  const leftShare = left.reduce((sum, item) => sum + item.weight, 0) / totalWeight;

  if (horizontal) {
    const leftWidth = Math.min(
      Math.max(MIN_SIDE, Math.floor(rect.w * leftShare)),
      rect.w - gap - MIN_SIDE,
    );
    const rightWidth = rect.w - leftWidth - gap;
    sliceTreemap(left, { x: rect.x, y: rect.y, w: leftWidth, h: rect.h }, gap, output);
    sliceTreemap(
      right,
      { x: rect.x + leftWidth + gap, y: rect.y, w: rightWidth, h: rect.h },
      gap,
      output,
    );
  } else {
    const leftHeight = Math.min(
      Math.max(MIN_SIDE, Math.floor(rect.h * leftShare)),
      rect.h - gap - MIN_SIDE,
    );
    const rightHeight = rect.h - leftHeight - gap;
    sliceTreemap(left, { x: rect.x, y: rect.y, w: rect.w, h: leftHeight }, gap, output);
    sliceTreemap(
      right,
      { x: rect.x, y: rect.y + leftHeight + gap, w: rect.w, h: rightHeight },
      gap,
      output,
    );
  }
}

export function buildMosaicLayout(
  grouped: Record<string, Entry[]>,
  containerWidth: number,
  options?: { gap?: number; cellSize?: number },
): { items: MosaicItem[]; totalHeight: number } {
  const gap = options?.gap ?? STACK_GAP;
  const refCell = options?.cellSize ?? Math.floor((containerWidth - gap) / 2);

  const themes = Object.entries(grouped).map(([themeName, entries]) => ({
    themeName,
    entries,
    count: entries.length,
  }));

  if (themes.length === 0) {
    return { items: [], totalHeight: 0 };
  }

  const totalNotes = themes.reduce((sum, theme) => sum + theme.count, 0);
  const average = totalNotes / themes.length;
  const minWeight = Math.max(1, average * 0.38);

  const weighted: ThemeSlice[] = themes
    .map((theme) => ({
      ...theme,
      weight: Math.max(theme.count, minWeight),
    }))
    .sort((a, b) => b.count - a.count);

  const areaPerNote = Math.max(refCell * refCell * 0.58, MIN_SIDE * MIN_SIDE);
  const canvasHeight = Math.max(
    refCell,
    Math.ceil((totalNotes * areaPerNote) / containerWidth),
  );

  const items: MosaicItem[] = [];
  sliceTreemap(weighted, { x: 0, y: 0, w: containerWidth, h: canvasHeight }, gap, items);

  const totalHeight = items.reduce((max, item) => Math.max(max, item.y + item.height), 0);

  return { items, totalHeight };
}

export function previewLinesForHeight(height: number, width?: number): number {
  const side = width ? Math.min(height, width) : height;
  if (side < 88) return 2;
  if (side < 120) return 3;
  if (side < 170) return 4;
  if (side < 240) return 6;
  return 8;
}

/** Conservé pour compatibilité — le treemap ne dépend plus du seed. */
export function mosaicLayoutSeed(grouped: Record<string, Entry[]>, salt: number): number {
  const signature = Object.entries(grouped)
    .map(([name, entries]) => `${name}:${entries.length}`)
    .sort()
    .join("|");
  let hash = salt;
  for (let i = 0; i < signature.length; i += 1) {
    hash = (hash * 31 + signature.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
