import { h, VNode } from 'preact';
import { html } from 'htm/preact';

type IconFn = (size?: number, style?: Record<string, string>) => VNode;

const svg = (size: number, style: Record<string, string>, children: VNode[]) => {
  const styleStr = Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';');
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style=${styleStr || undefined}>${children}</svg>`;
};

const icon = (...children: VNode[]): IconFn => (size = 15, style = {}) => svg(size, style, children);

const p = (d: string) => html`<path d=${d} />`;
const c = (cx: number, cy: number, r: number) => html`<circle cx=${cx} cy=${cy} r=${r} />`;
const li = (x1: number, y1: number, x2: number, y2: number) => html`<line x1=${x1} y1=${y1} x2=${x2} y2=${y2} />`;
const rx = (x: number, y: number, w: number, h: number, r?: number) => html`<rect x=${x} y=${y} width=${w} height=${h} rx=${r} />`;

export const Target: IconFn = icon(c(12, 12, 10), c(12, 12, 6), c(12, 12, 2));
export const Flame: IconFn = icon(p('M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z'));
export const Network: IconFn = icon(rx(16, 2, 4, 4, 1), rx(2, 16, 4, 4, 1), rx(16, 16, 4, 4, 1), li(12, 6, 6, 16), li(12, 6, 18, 16));
export const Search: IconFn = icon(c(11, 11, 8), li(21, 21, 16.65, 16.65));
export const RotateCw: IconFn = icon(p('M21 2v6h-6'), p('M3 12a9 9 0 0115.48-6.36L21 8'), p('M3 22v-6h6'), p('M21 12a9 9 0 01-15.48 6.36L3 16'));
export const Maximize2: IconFn = icon(p('M15 3h6v6'), p('M9 21H3v-6'), p('M21 3l-7 7'), p('M3 21l7-7'));
export const ExternalLink: IconFn = icon(p('M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6'), p('M15 3h6v6'), li(10, 14, 21, 3));
export const HelpCircle: IconFn = icon(c(12, 12, 10), p('M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3'), li(12, 17, 12.01, 0));
export const AlertTriangle: IconFn = icon(p('M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'), li(12, 9, 12, 13), li(12, 17, 12.01, 17));
export const GitBranch: IconFn = icon(p('M6 3v12'), c(18, 18, 3), c(6, 18, 3), p('M18 9a9 9 0 01-9 9'));
export const Camera: IconFn = icon(p('M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z'), c(12, 13, 4));
export const Download: IconFn = icon(p('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4'), p('M7 10l5 5 5-5'), li(12, 15, 12, 3));
export const Copy: IconFn = icon(rx(9, 9, 13, 13, 2), p('M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1'));
export const Ghost: IconFn = icon(p('M9 10h.01'), p('M15 10h.01'), p('M12 2a8 8 0 00-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 00-8-8z'));
export const FileText: IconFn = icon(p('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'), p('M14 2v6h6'), li(16, 13, 8, 13), li(16, 17, 8, 17), li(10, 9, 8, 9));
export const ArrowLeft: IconFn = icon(p('M19 12H5'), p('M12 19l-7-7 7-7'));
export const ArrowRight: IconFn = icon(p('M5 12h14'), p('M12 5l7 7-7 7'));
export const Filter: IconFn = icon(p('M22 3H2l8 9.46V19l4 2v-8.54L22 3z'));
export const EyeOff: IconFn = icon(p('M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24'), li(1, 1, 23, 23));
export const FolderTree: IconFn = icon(p('M13 10h7a1 1 0 001-1V6a1 1 0 00-1-1h-2.5a1 1 0 01-.8-.4l-.9-1.2A1 1 0 0015 3h-2a1 1 0 00-1 1v5a1 1 0 001 1z'), p('M13 21h7a1 1 0 001-1v-3a1 1 0 00-1-1h-2.88a1 1 0 01-.83-.45l-.86-1.15a1 1 0 00-.83-.45H13a1 1 0 00-1 1v4a1 1 0 001 1z'), p('M3 3v18'));
export const Layers: IconFn = icon(p('M12 2L2 7l10 5 10-5-10-5z'), p('M2 17l10 5 10-5'), p('M2 12l10 5 10-5'));
export const Server: IconFn = icon(rx(2, 2, 20, 8, 2), rx(2, 14, 20, 8, 2), li(6, 6, 6.01, 6), li(6, 18, 6.01, 18));
export const Globe: IconFn = icon(c(12, 12, 10), li(2, 12, 22, 12), p('M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'));
export const Wrench: IconFn = icon(p('M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z'));
export const Database: IconFn = icon(c(12, 12, 3), p('M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'), p('M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'));
export const Settings: IconFn = icon(c(12, 12, 3), p('M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'));
export const Compass: IconFn = icon(c(12, 12, 10), p('M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z'));
export const ChevronDown: IconFn = icon(p('M6 9l6 6 6-6'));
export const ChevronUp: IconFn = icon(p('M18 15l-6-6-6 6'));
export const FileCode: IconFn = icon(p('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'), p('M14 2v6h6'), p('M10 13l-2 2 2 2'), p('M14 17l2-2-2-2'));
export const ArrowUpRight: IconFn = icon(p('M7 17l9.2-9.2M17 17V7H7'));
export const ArrowDownLeft: IconFn = icon(p('M7 7l9.2 9.2M17 7v10H7'));
export const ChevronRight: IconFn = icon(p('M9 18l6-6-6-6'));
export const Info: IconFn = icon(c(12, 12, 10), li(12, 16, 12, 12));
export const X: IconFn = icon(li(18, 6, 6, 18), li(6, 6, 18, 18));
export const ShieldCheck: IconFn = icon(p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'), p('M9 12l2 2 4-4'));
export const AlertOctagon: IconFn = icon(p('M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z'), li(12, 8, 12, 12), li(12, 16, 12.01, 16));
export const CheckCircle2: IconFn = icon(c(12, 12, 10), p('M16 8l-8 8'), p('M9.5 12.5L7 10'));
export const BookOpen: IconFn = icon(p('M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z'), p('M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'));
export const ZoomIn: IconFn = icon(c(11, 11, 8), li(21, 21, 16.65, 16.65), li(11, 8, 11, 14), li(8, 11, 14, 11));
export const ZoomOut: IconFn = icon(c(11, 11, 8), li(21, 21, 16.65, 16.65), li(8, 11, 14, 11));
