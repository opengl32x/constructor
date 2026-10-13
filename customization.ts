import type { Product, Clipart } from '@/types';

const extraColors = [
  { name: 'Бордовый', hex: '#7b233a' },
  { name: 'Лесной зелёный', hex: '#28594b' },
  { name: 'Лавандовый', hex: '#b5a1d2' },
  { name: 'Небесно-голубой', hex: '#82b9de' },
];
export function customizeProduct(product: Product): Product {
  return { ...product, available_colors: [...product.available_colors,
    ...extraColors.filter(c => !product.available_colors.some(p => p.hex.toLowerCase() === c.hex))] };
}
const svg = (body: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="320" viewBox="0 0 600 320">${body}</svg>`);
export const narxozLogos: Clipart[] = [
  { id: "narxoz-varsity", name: "Narxoz · EST.1963", category: "Narxoz", image_url: svg(`<text x="300" y="150" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="106" letter-spacing="5" fill="#c5ac55" stroke="#fff9df" stroke-width="7" paint-order="stroke">NARXOZ</text><text x="300" y="218" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="46" fill="#fff9df" stroke="#5d341c" stroke-width="1" paint-order="stroke">EST.1963</text><g fill="none" stroke="#fff9df" stroke-width="5"><path d="M35 202H165M435 202H565"/><path d="M50 190l12 12-12 12m20-24l12 12-12 12m20-24l12 12-12 12m20-24l12 12-12 12m20-24l12 12-12 12M550 190l-12 12 12 12m-20-24l-12 12 12 12m-20-24l-12 12 12 12m-20-24l-12 12 12 12m-20-24l-12 12 12 12"/></g>`), thumbnail_url: "", created_at: "2026-10-14" },
  { id: "narxoz-monogram", name: "Narxoz · Монограмма", category: "Narxoz", image_url: svg(`<path d="M195 50H265L350 190V50H410V250H342L255 108V250H195Z" fill="#d71935" stroke="#fff" stroke-width="5"/><text x="300" y="290" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="bold" letter-spacing="10" fill="#d71935">NARXOZ</text>`), thumbnail_url: "", created_at: "2026-10-14" },
  { id: "narxoz-campus", name: "Narxoz · Campus Club", category: "Narxoz", image_url: svg(`<rect x="55" y="47" width="490" height="226" rx="32" fill="#172c47" stroke="#f3d49a" stroke-width="7"/><text x="300" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" letter-spacing="9" fill="#f3d49a">CAMPUS CLUB</text><text x="300" y="183" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="80" fill="#fff3da">NARXOZ</text><path d="M108 218H220M380 218H492" stroke="#f3d49a" stroke-width="3"/><text x="300" y="231" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" fill="#f3d49a">1963</text>`), thumbnail_url: "", created_at: "2026-10-14" },
  { id: "narxoz-almaty", name: "Narxoz · Almaty", category: "Narxoz", image_url: svg(`<path d="M90 160L195 50 262 125 335 33 510 160" fill="none" stroke="#d71935" stroke-width="15" stroke-linejoin="round"/><path d="M167 80l28 25 25-26m90-14 25 25 28-25" fill="none" stroke="#d71935" stroke-width="8"/><text x="300" y="236" text-anchor="middle" font-family="Arial,sans-serif" font-size="83" font-weight="900" letter-spacing="4" fill="#d71935" stroke="#fff" stroke-width="3" paint-order="stroke">NARXOZ</text><text x="300" y="285" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" letter-spacing="12" fill="#d71935">ALMATY</text>`), thumbnail_url: "", created_at: "2026-10-14" },
];
