// Builds a single self-contained HTML file of the app (no server, no Next.js
// routing) for sharing as a hosted preview. Output: dist-preview/zignal.html
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "dist-preview");
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: [resolve(root, "preview/main.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  logLevel: "error",
  alias: {
    "@": resolve(root, "src"),
    "next/link": resolve(root, "preview/shims/next-link.tsx"),
    "next/navigation": resolve(root, "preview/shims/next-navigation.ts"),
    "geist/font/sans": resolve(root, "preview/shims/geist.ts"),
    "geist/font/mono": resolve(root, "preview/shims/geist.ts"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_EMBED": '"1"',
  },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const css = execSync(
  `npx tailwindcss -c tailwind.config.ts -i src/app/globals.css --minify --content "./src/**/*.{ts,tsx},./preview/**/*.{ts,tsx}"`,
  { cwd: root, stdio: ["ignore", "pipe", "ignore"] },
).toString();

const font = (p) => readFileSync(resolve(root, "node_modules/geist/dist/fonts", p)).toString("base64");
const fonts = `
@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("geist-sans/Geist-Variable.woff2")}) format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("geist-mono/GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900;font-display:swap}
:root{--font-geist-sans:"Geist";--font-geist-mono:"Geist Mono"}`;

const html = `<title>Zignal</title>
<meta name="description" content="See how AI recommends your business — and learn how to become the business it recommends.">
<style>${fonts}${css}</style>
<div id="zignal-root" class="min-h-screen font-sans"></div>
<script>${js}</script>
`;
writeFileSync(resolve(out, "zignal.html"), html);
console.log(`dist-preview/zignal.html  ${(html.length / 1024).toFixed(0)} KB`);
