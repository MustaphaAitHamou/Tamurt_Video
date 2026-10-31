/**
 * Tracés vectoriels originaux de l'identité Tamurt Vidéo.
 * Lettres géométriques dessinées sur une grille de 40 unités de hauteur.
 * Le « A » remplace sa barre par un losange, motif des poteries kabyles.
 */
export const LETTERS_TAMURT: { d: string; width: number }[] = [
  // T
  { d: "M0 0h32v8H20v32h-8V8H0z", width: 32 },
  // A (losange central)
  { d: "M0 40 15 0h8l15 40h-8.6L19 12.2 8.6 40z M19 23.5 23.5 28 19 32.5 14.5 28z", width: 38 },
  // M
  { d: "M0 40V0h8l12 18L32 0h8v40h-8V15L20 32 8 15v25z", width: 40 },
  // U
  { d: "M0 0h8v22a10 10 0 0 0 20 0V0h8v22a18 18 0 0 1-36 0z", width: 36 },
  // R
  { d: "M0 0h19a12 12 0 0 1 4.4 23.2L32 40h-9.2l-8-16H8v16H0z M8 8v8h11a4 4 0 0 0 0-8z", width: 32 },
  // T
  { d: "M0 0h32v8H20v32h-8V8H0z", width: 32 },
];

export const LETTERS_VIDEO: { d: string; width: number }[] = [
  // V
  { d: "M0 0h8.6L15 26.5 21.4 0H30L19.5 40h-9z", width: 30 },
  // I
  { d: "M0 0h8v40H0z", width: 8 },
  // D
  { d: "M0 0h14a20 20 0 0 1 0 40H0z M8 8v24h6a12 12 0 0 0 0-24z", width: 34 },
  // É (accent en losange)
  { d: "M0 6h26v7H8v7.5h16v7H8V33h18v7H0z M11 -6l5-5 5 5-5 5z", width: 26 },
  // O
  { d: "M20 0a20 20 0 1 1 0 40 20 20 0 1 1 0-40z M20 8a12 12 0 1 0 0 24 12 12 0 1 0 0-24z", width: 40 },
];

export const LETTER_GAP = 7;

export function layoutLetters(letters: { d: string; width: number }[], gap = LETTER_GAP) {
  let x = 0;
  const placed = letters.map((letter) => {
    const item = { d: letter.d, x };
    x += letter.width + gap;
    return item;
  });
  return { placed, width: x - gap };
}

/** Emblème : losange rouge, triangle de lecture et contour intérieur. */
export const MARK_VIEWBOX = "0 0 64 64";
export const MARK_DIAMOND = "M32 3.5a4 4 0 0 1 2.83 1.17l24.5 24.5a4 4 0 0 1 0 5.66l-24.5 24.5a4 4 0 0 1-5.66 0L4.67 34.83a4 4 0 0 1 0-5.66l24.5-24.5A4 4 0 0 1 32 3.5z";
export const MARK_INNER = "M32 12.5 51.5 32 32 51.5 12.5 32z";
export const MARK_PLAY = "M27.2 22.8a1.6 1.6 0 0 1 2.4-1.38l14.5 8.6a1.6 1.6 0 0 1 0 2.76l-14.5 8.6a1.6 1.6 0 0 1-2.4-1.38z";
