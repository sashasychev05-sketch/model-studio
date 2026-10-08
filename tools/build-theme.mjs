import fs from 'node:fs/promises';
import {paletteCSS,diagramThemeCSS,palettes} from '../lib/theme.js';
const defaults=Object.entries(palettes.light).map(([key,value])=>`--studio-${key}:${value}`).join(';');
const controls='.theme-picker{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--studio-muted);white-space:nowrap}.theme-picker select{border:1px solid var(--studio-line);background:var(--studio-surface);color:var(--studio-ink);padding:8px 10px;border-radius:8px;font-size:13px;cursor:pointer}.theme-picker select:focus-visible{outline:3px solid var(--studio-accent)}.theme-picker span{font-size:12px}@media(max-width:650px){.theme-picker span{display:none}.theme-picker select{max-width:100px;padding:8px 6px}}';
await fs.writeFile(new URL('../web/theme.css',import.meta.url),`:root{color-scheme:light;${defaults}}\n${paletteCSS()}\n${diagramThemeCSS}\n${controls}\n`);
