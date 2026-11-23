/*
 * Self-hosted fonts (Fontsource variable builds, served from our own domain).
 *
 * Previously next/font/google downloaded the files from Google at BUILD time.
 * That made every deploy depend on Google answering the build server in the
 * expected format — and it did not always (production build failed with
 * "An error occurred in `next/font`" when Google returned font URLs without a
 * file extension). Now nothing is fetched at build time.
 *
 * The CSS below declares @font-face rules split by unicode-range (latin,
 * latin-ext, …) with font-display: swap, so a browser downloads only the
 * subsets the page actually uses. In Low-Bandwidth Mode the font stacks switch
 * to Georgia/system-ui (globals.css), so these files are never downloaded.
 * The variable axes cover every weight in use (400–800).
 */
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/source-serif-4";

/** Kept for the root layouts' <html className>; the families are set in globals.css. */
export const fontVariables = "";
