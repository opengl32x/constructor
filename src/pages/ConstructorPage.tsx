import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Type, Image as ImageIcon, Shapes, Trash2, Copy,
  ChevronUp, ChevronDown, FlipHorizontal, FlipVertical,
  ArrowLeft, ShoppingBag, Save, Upload, Eye,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
} from 'lucide-react';
import MerchCanvas, { FONTS, type MerchCanvasHandle } from '@/components/MerchCanvas';
import type { Product, Clipart, DesignLayer, DesignSide, DesignConfig, CartItem } from '@/types';
import { fetchProductById, fetchCliparts, savePreset } from '@/services/database';
import { uploadToCloudinary, dataUrlToBlob } from '@/services/cloudinary';
import { useCart } from '@/context/CartContext';
import { prepareImageFile } from '@/services/imageUpload';

const Garment3D = lazy(() => import('@/components/Garment3D'));
type ViewMode = '2d' | '3d' | 'split';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export function ConstructorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const canvasRef = useRef<MerchCanvasHandle>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [cliparts, setCliparts] = useState<Clipart[]>([]);
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<DesignSide>('front');
  const [selectedColor, setSelectedColor] = useState('#1a1a1a');
  const [selectedColorName, setSelectedColorName] = useState('Чёрный');
  const [activeLayer, setActiveLayer] = useState<DesignLayer | null>(null);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [size, setSize] = useState('L');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'add' | 'layers' | 'properties'>('add');
  const [clipartFilter, setClipartFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [texture, setTexture] = useState<string | null>(null);

  // Load product from URL params
  useEffect(() => {
    (async () => {
      const productId = searchParams.get('product');
      if (!productId) {
        setError('Не указан товар. Вернитесь в каталог.');
        setLoading(false);
        return;
      }
      try {
        const [prod, clips] = await Promise.all([
          fetchProductById(productId),
          fetchCliparts(),
        ]);
        if (!prod) {
          setError('Товар не найден.');
          setLoading(false);
          return;
        }
        setProduct(prod);
        setCliparts(clips);

        // Color from URL or first available
        const colorParam = searchParams.get('color');
        const matchedColor = prod.available_colors.find((c) => c.hex === colorParam);
        if (matchedColor) {
          setSelectedColor(matchedColor.hex);
          setSelectedColorName(matchedColor.name);
        } else if (prod.available_colors[0]) {
          setSelectedColor(prod.available_colors[0].hex);
          setSelectedColorName(prod.available_colors[0].name);
        }

        // Load preset if provided
        const presetParam = searchParams.get('preset');
        if (presetParam) {
          try {
            const config = JSON.parse(presetParam) as {
              side?: DesignSide;
              color?: string;
              layers?: DesignLayer[];
            };
            if (config.side) setSide(config.side);
            if (config.color) {
              setSelectedColor(config.color);
              const mc = prod.available_colors.find((c) => c.hex === config.color);
              if (mc) setSelectedColorName(mc.name);
            }
            // Load layers after canvas is ready (next tick)
            if (config.layers) {
              setTimeout(() => {
                canvasRef.current?.loadLayers(config.layers!);
              }, 300);
            }
          } catch (e) {
            console.error('Failed to parse preset:', e);
          }
        }
      } catch (e) {
        console.error('Failed to load:', e);
        setError('Ошибка загрузки данных.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Handlers ────────────────────────────────

  const handleLayerSelected = useCallback((layer: DesignLayer | null) => {
    setActiveLayer(layer);
    if (layer) setActiveTab('properties');
  }, []);

  const handleLayersChanged = useCallback((newLayers: DesignLayer[]) => {
    setLayers(newLayers);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const dataUrl = await prepareImageFile(file);
      await canvasRef.current?.addImage(dataUrl);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить изображение.');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const handleAddClipart = async (url: string) => {
    await canvasRef.current?.addClipart(url);
  };

  const handleDelete = () => {
    canvasRef.current?.deleteSelected();
    setActiveLayer(null);
  };

  const handleDuplicate = async () => {
    await canvasRef.current?.duplicateSelected();
  };

  const handleBringForward = () => canvasRef.current?.bringForward();
  const handleSendBackward = () => canvasRef.current?.sendBackward();

  const handleFlipH = () => {
    if (!activeLayer) return;
    canvasRef.current?.updateActiveLayer({ flipX: !activeLayer.flipX });
    refreshActive();
  };

  const handleFlipV = () => {
    if (!activeLayer) return;
    canvasRef.current?.updateActiveLayer({ flipY: !activeLayer.flipY });
    refreshActive();
  };

  const refreshActive = () => {
    setTimeout(() => setActiveLayer(canvasRef.current?.getActiveLayer() ?? null), 50);
  };

  const updateLayerProp = (patch: Partial<DesignLayer>) => {
    canvasRef.current?.updateActiveLayer(patch);
    refreshActive();
  };

  // ── 3D: live texture from the 2D canvas + drag-to-move on the model ──
  useEffect(() => {
    if (viewMode === '2d') return;
    const id = requestAnimationFrame(() => setTexture(canvasRef.current?.exportDesignTexture() ?? null));
    return () => cancelAnimationFrame(id);
  }, [layers, viewMode, side]);

  const handleDrag3D = useCallback((u: number, v: number) => {
    const a = product?.canvas_area;
    if (a) canvasRef.current?.moveActiveTo(a.x + u * a.width, a.y + (1 - v) * a.height);
  }, [product]);

  // ── Side switch: save current, load other ──

  const designStateRef = useRef<{ front: DesignLayer[]; back: DesignLayer[] }>({
    front: [],
    back: [],
  });

  const switchSide = (newSide: DesignSide) => {
    // Save current side's layers
    designStateRef.current[side] = canvasRef.current
      ? canvasRef.current.getActiveLayer()
        ? layers
        : layers
      : [];
    // Actually serialize from canvas
    designStateRef.current[side] = layers;

    setSide(newSide);
    // Load other side's layers
    setTimeout(() => {
      const saved = designStateRef.current[newSide];
      if (saved && saved.length > 0) {
        canvasRef.current?.loadLayers(saved);
      } else {
        canvasRef.current?.clearDesign();
      }
    }, 100);
  };

  // ── Add to cart ─────────────────────────────

  const buildDesignConfig = (): DesignConfig => {
    return {
      front: { side: 'front', color: selectedColor, layers: designStateRef.current.front },
      back: { side: 'back', color: selectedColor, layers: designStateRef.current.back },
      productId: product?.id ?? '',
      productName: product?.name ?? '',
      productType: product?.product_type ?? 'tshirt',
    };
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      // Save current side layers
      designStateRef.current[side] = layers;

      // Export canvas preview (without guides)
      const preview = canvasRef.current?.exportWithoutGuides();
      if (!preview) throw new Error('Не удалось создать превью');

      // Try uploading to Cloudinary, fallback to data URL
      let previewUrl = preview;
      try {
        const blob = dataUrlToBlob(preview);
        const uploaded = await uploadToCloudinary(blob, `preview-${Date.now()}`);
        previewUrl = uploaded.url;
      } catch {
        // Use data URL as fallback
      }

      const cartItem: CartItem = {
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        productType: product.product_type,
        basePrice: product.base_price,
        size,
        color: selectedColor,
        colorName: selectedColorName,
        quantity,
        designConfig: buildDesignConfig(),
        previewUrl,
        previewFront: previewUrl,
        previewBack: previewUrl,
        side,
      };

      addItem(cartItem);
      navigate('/checkout');
    } catch (e) {
      console.error('Add to cart failed:', e);
      setError('Не удалось добавить в корзину.');
    } finally {
      setAddingToCart(false);
    }
  };

  // ── Save preset ─────────────────────────────

  const handleSavePreset = async () => {
    if (!product || !presetName.trim()) return;
    setSavingPreset(true);
    try {
      const preview = canvasRef.current?.exportWithoutGuides() ?? '';
      await savePreset(product.id, presetName, buildDesignConfig(), preview);
      setShowSaveModal(false);
      setPresetName('');
    } catch (e) {
      console.error('Save preset failed:', e);
      setError('Не удалось сохранить пресет.');
    } finally {
      setSavingPreset(false);
    }
  };

  // ── Render ──────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-400">Загрузка конструктора…</div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="text-gray-500">{error}</div>
        <button onClick={() => navigate('/')} className="rounded-lg bg-gray-900 px-4 py-2 text-white">
          В каталог
        </button>
      </div>
    );
  }

  if (!product) return null;

  const filteredCliparts = clipartFilter === 'all'
    ? cliparts
    : cliparts.filter((c) => c.category === clipartFilter);

  const clipartCategories = [...new Set(cliparts.map((c) => c.category))];

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 lg:px-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к каталогу
        </button>
        <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
          Конструктор — {product.name}
        </h1>
        <div className="flex-1" />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Main layout: canvas center, right panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* ── Canvas area ── */}
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50 p-4">
          {/* Side toggle */}
          <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {(['front', 'back'] as DesignSide[]).map((s) => (
              <button
                key={s}
                onClick={() => switchSide(s)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                  side === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s === 'front' ? 'Спереди' : 'Сзади'}
              </button>
            ))}
          </div>

          {/* View mode */}
          <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {([['2d', '2D'], ['split', '2D + 3D'], ['3d', '3D']] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  viewMode === m ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Canvas (stays mounted so edits are never lost) + 3D viewer */}
          <div className="flex w-full flex-wrap items-start justify-center gap-4">
            <div className={`rounded-xl bg-white shadow-sm ring-1 ring-gray-200 ${viewMode === '3d' ? 'hidden' : ''}`}>
              <MerchCanvas
                ref={canvasRef}
                productType={product.product_type}
                side={side}
                color={selectedColor}
                canvasArea={product.canvas_area}
                onLayerSelected={handleLayerSelected}
                onLayersChanged={handleLayersChanged}
              />
            </div>
            {viewMode !== '2d' && (
              <div
                className={`h-[480px] overflow-hidden rounded-xl bg-gradient-to-b from-gray-100 to-gray-300 ring-1 ring-gray-200 ${
                  viewMode === '3d' ? 'w-full max-w-[680px]' : 'w-[400px] max-w-full'
                }`}
              >
                <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-gray-400">Загрузка 3D…</div>}>
                  <Garment3D
                    productType={product.product_type}
                    color={selectedColor}
                    side={side}
                    texture={texture}
                    canvasArea={product.canvas_area}
                    onDrag={activeLayer ? handleDrag3D : undefined}
                  />
                </Suspense>
              </div>
            )}
          </div>
          {viewMode !== '2d' && (
            <p className="mt-2 text-center text-xs text-gray-400">
              3D: крутите мышью, колесо — зум. Выберите элемент и тяните по изделию, чтобы переместить принт.
            </p>
          )}

          {/* Quick actions under canvas */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleDelete}
              disabled={!activeLayer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </button>
            <button
              onClick={handleDuplicate}
              disabled={!activeLayer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" />
              Дублировать
            </button>
            <button
              onClick={handleBringForward}
              disabled={!activeLayer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronUp className="h-4 w-4" />
              Вперёд
            </button>
            <button
              onClick={handleSendBackward}
              disabled={!activeLayer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronDown className="h-4 w-4" />
              Назад
            </button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {([
              { id: 'add', label: 'Добавить', icon: null },
              { id: 'layers', label: 'Слои', icon: null },
              { id: 'properties', label: 'Свойства', icon: null },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  activeTab === tab.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Add tab */}
          {activeTab === 'add' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              {/* Color picker */}
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Цвет основы</h3>
                <div className="flex flex-wrap gap-2">
                  {product.available_colors.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => {
                        setSelectedColor(c.hex);
                        setSelectedColorName(c.name);
                        canvasRef.current?.setBackgroundColor(c.hex);
                      }}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        selectedColor === c.hex
                          ? 'border-gray-900 ring-2 ring-brand-300 ring-offset-1'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-400">{selectedColorName}</p>
              </div>

              {/* Add buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => canvasRef.current?.addText()}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 py-3 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                >
                  <Type className="h-5 w-5 text-brand-500" />
                  Текст
                </button>
                <label className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 py-3 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 cursor-pointer">
                  {uploading ? (
                    <span className="text-xs text-gray-400">Загрузка…</span>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 text-brand-500" />
                      Принт / лого
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
                <button
                  onClick={() => setActiveTab('add')}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 py-3 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                >
                  <Shapes className="h-5 w-5 text-brand-500" />
                  Иконки
                </button>
              </div>

              {/* Clipart library */}
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">Библиотека графики</h3>
                </div>
                {/* Category filter */}
                <div className="mb-2 flex flex-wrap gap-1">
                  <button
                    onClick={() => setClipartFilter('all')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      clipartFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Все
                  </button>
                  {clipartCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setClipartFilter(cat)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        clipartFilter === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {/* Grid */}
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                  {filteredCliparts.map((clip) => (
                    <button
                      key={clip.id}
                      onClick={() => handleAddClipart(clip.image_url)}
                      className="flex aspect-square items-center justify-center rounded-lg border border-gray-200 bg-white p-2 transition hover:border-brand-400 hover:bg-brand-50"
                      title={clip.name}
                    >
                      <img src={clip.image_url} alt={clip.name} className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Layers tab */}
          {activeTab === 'layers' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Слои ({layers.length})
              </h3>
              {layers.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Нет слоёв. Добавьте текст, картинку или иконку.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {[...layers].reverse().map((layer) => (
                    <div
                      key={layer.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        activeLayer?.id === layer.id
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                        {layer.type === 'text' ? <Type className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      </span>
                      <span className="flex-1 truncate text-gray-700">
                        {layer.type === 'text' ? layer.text : layer.type === 'clipart' ? 'Иконка' : 'Изображение'}
                      </span>
                      <button
                        onClick={() => canvasRef.current?.deleteSelected()}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Properties tab */}
          {activeTab === 'properties' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Свойства элемента</h3>
              {!activeLayer ? (
                <p className="text-sm text-gray-400">
                  Выберите элемент на холсте, чтобы изменить его свойства.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Text content */}
                  {activeLayer.type === 'text' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Текст</label>
                        <input
                          type="text"
                          value={activeLayer.text ?? ''}
                          onChange={(e) => updateLayerProp({ text: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Шрифт</label>
                        <select
                          value={activeLayer.fontFamily ?? 'Arial'}
                          onChange={(e) => updateLayerProp({ fontFamily: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                        >
                          {FONTS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                          Размер: {activeLayer.fontSize ?? 28}px
                        </label>
                        <input
                          type="range"
                          min={10}
                          max={80}
                          value={activeLayer.fontSize ?? 28}
                          onChange={(e) => updateLayerProp({ fontSize: Number(e.target.value) })}
                          className="w-full accent-brand-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateLayerProp({ fontWeight: activeLayer.fontWeight === 'bold' ? 'normal' : 'bold' })}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                            activeLayer.fontWeight === 'bold' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Bold className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateLayerProp({ fontStyle: activeLayer.fontStyle === 'italic' ? 'normal' : 'italic' })}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                            activeLayer.fontStyle === 'italic' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Italic className="h-4 w-4" />
                        </button>
                        <div className="flex gap-1">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              onClick={() => updateLayerProp({ textAlign: align })}
                              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                                activeLayer.textAlign === align ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {align === 'left' ? <AlignLeft className="h-4 w-4" /> : align === 'center' ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                          Межстрочный: {(activeLayer.lineHeight ?? 1.16).toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min={0.8}
                          max={2.5}
                          step={0.01}
                          value={activeLayer.lineHeight ?? 1.16}
                          onChange={(e) => updateLayerProp({ lineHeight: Number(e.target.value) })}
                          className="w-full accent-brand-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Цвет текста</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={activeLayer.fill ?? '#000000'}
                            onChange={(e) => updateLayerProp({ fill: e.target.value })}
                            className="h-9 w-12 rounded border border-gray-200"
                          />
                          <input
                            type="text"
                            value={activeLayer.fill ?? '#000000'}
                            onChange={(e) => updateLayerProp({ fill: e.target.value })}
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Common: opacity, angle, flips */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Прозрачность: {Math.round((activeLayer.opacity ?? 1) * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={activeLayer.opacity ?? 1}
                      onChange={(e) => updateLayerProp({ opacity: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Угол: {Math.round(activeLayer.angle ?? 0)}°
                    </label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={activeLayer.angle ?? 0}
                      onChange={(e) => updateLayerProp({ angle: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFlipH}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <FlipHorizontal className="h-4 w-4" />
                      Гор.
                    </button>
                    <button
                      onClick={handleFlipV}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <FlipVertical className="h-4 w-4" />
                      Верт.
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Order section (always visible) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Параметры заказа</h3>

            {/* Size */}
            {product.product_type !== 'cap' && (
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Размер</label>
                <div className="flex gap-1.5">
                  {(product.sizes.length > 0 ? product.sizes : SIZES).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-medium transition ${
                        size === s ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Количество</label>
              <div className="inline-flex items-center rounded-lg border border-gray-200">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                >−</button>
                <span className="min-w-10 text-center text-sm font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                >+</button>
              </div>
            </div>

            {/* Price */}
            <div className="mb-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm text-gray-500">Итого:</span>
              <span className="text-xl font-extrabold text-gray-900">
                {(product.base_price * quantity).toLocaleString('ru-RU')} ₸
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                <ShoppingBag className="h-5 w-5" />
                {addingToCart ? 'Добавление…' : 'В корзину'}
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Save className="h-5 w-5" />
                Сохранить пресет
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save preset modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-lg font-bold text-gray-900">Сохранить дизайн</h3>
            <p className="mt-1 text-sm text-gray-500">
              Назовите свой дизайн, чтобы сохранить его и вернуться к нему позже.
            </p>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Например: Принт нашей группы"
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim() || savingPreset}
                className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {savingPreset ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
