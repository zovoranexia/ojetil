import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";

/*
 * Fonts are self-hosted by next/font and deliberately NOT preloaded: the browser
 * fetches a font file only when text actually uses it. In Low-Bandwidth Mode the
 * font stacks switch to Georgia/system-ui, so these files are never downloaded.
 * `latin-ext` covers Portuguese/Tetun diacritics (á ã ç é í ó õ ú ñ).
 */
export const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-source-serif",
});

export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-plus-jakarta",
});

export const fontVariables = `${sourceSerif.variable} ${plusJakarta.variable}`;
