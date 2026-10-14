import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wand2, Palette, Layers, ShoppingBag, MapPin } from 'lucide-react';
import type { Product, Preset, ProductColor } from '@/types';
import { fetchProducts, fetchFeaturedPresets } from '@/services/database';
import { GarmentPhoto } from '@/components/GarmentPhoto';

export function CatalogPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColors, setSelectedColors] = useState<Record<string, ProductColor>>({});

  useEffect(() => {
    (async () => {
      try {
        const [prods, pres] = await Promise.all([
          fetchProducts(),
          fetchFeaturedPresets(),
        ]);
        setProducts(prods);
        setPresets(pres);
        // Initialize selected colors
        const colors: Record<string, ProductColor> = {};
        prods.forEach((p) => {
          if (p.available_colors.length > 0) colors[p.id] = p.available_colors[0];
        });
        setSelectedColors(colors);
      } catch (e) {
        console.error('Failed to load catalog:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openConstructor = (
    productId: string,
    color?: string,
    presetConfig?: unknown,
  ) => {
    const params = new URLSearchParams();
    params.set('product', productId);
    if (color) params.set('color', color);
    if (presetConfig) params.set('preset', JSON.stringify(presetConfig));
    navigate(`/constructor?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-400">Загрузка каталога…</div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#0a0d1c] text-white lg:min-h-[640px]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-brand-500 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl items-center px-4 pb-6 pt-20 sm:px-6 lg:min-h-[640px] lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Создай свой<br />
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                уникальный мерч
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-gray-300">
              Добавляй принты, надписи и логотипы, выбирай цвет и оформляй заказ — всё прямо в браузере,
              без специальных программ. Готовый мерч ты заберёшь в колледже.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/constructor')}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-600"
              >
                <Wand2 className="h-5 w-5" />
                Создать свой мерч
              </button>
              <button
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Выбрать вещь
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        {/* Hero artwork */}
        <img
          src="/hero-girls.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none relative z-0 mx-auto block h-[420px] w-auto max-w-full select-none object-contain sm:h-[520px] lg:absolute lg:bottom-0 lg:right-0 lg:mx-0 lg:h-full lg:max-w-none"
        />
      </section>

      {/* Features strip */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: Palette, label: 'Любые цвета', desc: 'Выбери цвет худи или футболки' },
            { icon: Layers, label: 'Свой дизайн', desc: 'Принты, надписи, логотипы' },
            { icon: ShoppingBag, label: 'От 1 штуки', desc: 'Без минимального заказа' },
            { icon: MapPin, label: 'Получение в колледже', desc: 'Самовывоз, без доставки' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{f.label}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Базовые вещи
            </h2>
            <p className="mt-2 text-gray-500">Выберите вещь и начните создавать свой дизайн</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const color = selectedColors[product.id] ?? product.available_colors[0];
            return (
              <div
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-lg"
              >
                {/* Image */}
                <div
                  className="relative flex h-64 cursor-pointer items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"
                  onClick={() => openConstructor(product.id, color.hex)}
                >
                  <GarmentPhoto
                    type={product.product_type} color={color.hex}
                    alt={product.name}
                    className="h-full w-full object-contain p-4 transition group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/0 opacity-0 transition group-hover:bg-gray-900/5 group-hover:opacity-100">
                    <span className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
                      Открыть конструктор
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{product.description}</p>

                  {/* Color dots */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {product.available_colors.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() =>
                          setSelectedColors((prev) => ({ ...prev, [product.id]: c }))
                        }
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          color?.hex === c.hex
                            ? 'border-gray-900 ring-2 ring-brand-300 ring-offset-1'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>

                  {/* Price + CTA */}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <span className="text-xs text-gray-400">от</span>
                      <span className="ml-1 text-xl font-extrabold text-gray-900">
                        {product.base_price.toLocaleString('ru-RU')} ₸
                      </span>
                    </div>
                    <button
                      onClick={() => openConstructor(product.id, color.hex)}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                      <Wand2 className="h-4 w-4" />
                      Дизайн
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured presets */}
      {presets.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
                  Готовые дизайны
                </h2>
                <p className="mt-2 text-gray-500">Идеи от студентов — выбери готовый дизайн и доработай под себя</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {presets.map((preset) => {
                const product = products.find((p) => p.id === preset.product_id);
                if (!product) return null;
                const dc = preset.design_config as { color?: string };
                const presetColor = dc?.color ?? product.available_colors[0]?.hex ?? '#1a1a1a';
                return (
                  <button
                    key={preset.id}
                    onClick={() => openConstructor(product.id, presetColor, preset.design_config)}
                    className="group relative flex flex-col items-center overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-2">
                      <GarmentPhoto
                        type={product.product_type} color={presetColor}
                        alt={preset.name}
                        className="h-full w-full object-contain transition group-hover:scale-105"
                      />
                    </div>
                    <div className="w-full px-2 py-2 text-center">
                      <span className="text-sm font-semibold text-gray-700">{preset.name}</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/0 opacity-0 transition group-hover:bg-gray-900/5 group-hover:opacity-100">
                      <span className="rounded-lg bg-gray-900/90 px-3 py-1.5 text-xs font-semibold text-white">
                        Открыть
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
