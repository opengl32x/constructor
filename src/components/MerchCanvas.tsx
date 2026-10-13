import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as fabric from 'fabric';
import type { DesignLayer, DesignSide, CanvasArea, ProductType } from '@/types';
import { getMockupUrl } from '@/services/mockups';

// fabric v6 doesn't expose `data` on FabricObject by default — we extend it
type FabricObj = fabric.FabricObject & { data?: Record<string, unknown> };

export interface MerchCanvasHandle {
  addImage: (url: string) => Promise<void>;
  addText: (text?: string) => void;
  addClipart: (url: string) => Promise<void>;
  deleteSelected: () => void;
  duplicateSelected: () => Promise<void>;
  bringForward: () => void;
  sendBackward: () => void;
  exportToDataURL: () => string | null;
  exportWithoutGuides: () => string | null;
  getActiveLayer: () => DesignLayer | null;
  updateActiveLayer: (patch: Partial<DesignLayer>) => void;
  loadLayers: (layers: DesignLayer[]) => void;
  clearDesign: () => void;
  setBackgroundColor: (color: string) => void;
  getCanvas: () => fabric.Canvas | null;
  exportDesignTexture: () => string | null;
  moveActiveTo: (cx: number, cy: number) => void;
}

interface MerchCanvasProps {
  productType: string;
  side: DesignSide;
  color: string;
  canvasArea: CanvasArea;
  onLayerSelected: (layer: DesignLayer | null) => void;
  onLayersChanged: (layers: DesignLayer[]) => void;
}

export const FONTS = [
  'Arial', 'Arial Black', 'Arial Narrow', 'Avenir Next', 'Bebas Neue',
  'Brush Script MT', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS',
  'Consolas', 'Courier New', 'DM Sans', 'Futura', 'Garamond', 'Georgia',
  'Gill Sans', 'Helvetica', 'Impact', 'Inter', 'Lato', 'Liberation Sans',
  'Lucida Console', 'Lucida Sans', 'Montserrat', 'MS Gothic', 'Nunito',
  'Open Sans', 'Oswald', 'Palatino Linotype', 'Papyrus', 'Roboto',
  'Rockwell', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS',
  'Verdana', 'Anton', 'Monaco', 'cursive', 'fantasy', 'serif', 'sans-serif',
];

const MerchCanvas = forwardRef<MerchCanvasHandle, MerchCanvasProps>(
  function MerchCanvas(
    { productType, side, color, canvasArea, onLayerSelected, onLayersChanged },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const mockupRequest = useRef(0);
    const mockupRef = useRef<FabricObj | null>(null);
    const printAreaRef = useRef<FabricObj | null>(null);
    const colorRef = useRef(color);
    const sideRef = useRef(side);
    const productTypeRef = useRef(productType);
    const skipEventRef = useRef(false);

    function serializeLayers(): DesignLayer[] {
      const canvas = fabricRef.current;
      if (!canvas) return [];
      const layers: DesignLayer[] = [];
      canvas.getObjects().forEach((objRaw) => {
        const obj = objRaw as FabricObj;
        if (obj === mockupRef.current || obj === printAreaRef.current) return;
        if (obj instanceof fabric.Textbox) {
          const d = (obj as FabricObj).data;
          layers.push({
            id: (d?.id as string) ?? crypto.randomUUID(),
            type: 'text',
            text: obj.text ?? '',
            fontFamily: obj.fontFamily ?? 'Arial',
            fontSize: obj.fontSize ?? 24,
            fontWeight: String(obj.fontWeight ?? 'normal'),
            fontStyle: String(obj.fontStyle ?? 'normal'),
            textAlign: String(obj.textAlign ?? 'left'),
            lineHeight: obj.lineHeight ?? 1.16,
            fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
            left: Math.round(obj.left ?? 0),
            top: Math.round(obj.top ?? 0),
            scaleX: obj.scaleX ?? 1,
            scaleY: obj.scaleY ?? 1,
            angle: obj.angle ?? 0,
            opacity: obj.opacity ?? 1,
            flipX: obj.flipX ?? false,
            flipY: obj.flipY ?? false,
          });
        } else if (obj instanceof fabric.FabricImage) {
          const d = (obj as FabricObj).data;
          layers.push({
            id: (d?.id as string) ?? crypto.randomUUID(),
            type: 'image',
            src: (d?.src as string) ?? '',
            left: Math.round(obj.left ?? 0),
            top: Math.round(obj.top ?? 0),
            scaleX: obj.scaleX ?? 1,
            scaleY: obj.scaleY ?? 1,
            angle: obj.angle ?? 0,
            opacity: obj.opacity ?? 1,
            flipX: obj.flipX ?? false,
            flipY: obj.flipY ?? false,
          });
        }
      });
      return layers;
    }

    function emitLayersChanged() {
      if (skipEventRef.current) return;
      onLayersChanged(serializeLayers());
    }

    function getActiveLayer(): DesignLayer | null {
      const canvas = fabricRef.current;
      if (!canvas) return null;
      const active = canvas.getActiveObject() as FabricObj;
      if (!active || active === mockupRef.current || active === printAreaRef.current)
        return null;
      const layers = serializeLayers();
      const id = (active.data?.id as string) ?? '';
      return layers.find((l) => l.id === id) ?? null;
    }

    // ── Fabric helpers ─────────────────────────

    async function loadImage(
      url: string,
    ): Promise<fabric.FabricImage | null> {
      try {
        const img = await fabric.FabricImage.fromURL(url, {
          crossOrigin: 'anonymous',
        });
        return img;
      } catch (e) {
        console.error('loadImage error', e);
        return null;
      }
    }

    function scaleToWidth(
      obj: fabric.FabricObject,
      target: number,
      canvas: fabric.Canvas,
    ) {
      const w = obj.width ?? 100;
      const scale = Math.min(target / w, (canvas.width ?? 400) / w);
      obj.scale(scale);
    }

    function centerObject(obj: fabric.FabricObject, canvas: fabric.Canvas) {
      const area = canvasArea;
      obj.set({
        left: area.x + area.width / 2 - (obj.width ?? 100) * (obj.scaleX ?? 1) / 2,
        top: area.y + area.height / 2 - (obj.height ?? 100) * (obj.scaleY ?? 1) / 2,
      });
      obj.setCoords();
    }

    // ── Mockup loading ─────────────────────────

    async function reloadMockup() {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const request = ++mockupRequest.current;
      try {
        const url = await getMockupUrl(
          productTypeRef.current as ProductType,
          sideRef.current,
          colorRef.current,
        );

        const img = await loadImage(url);
        if (!img || request !== mockupRequest.current || fabricRef.current !== canvas) return;

        if (mockupRef.current) {
          canvas.remove(mockupRef.current);
          mockupRef.current = null;
        }

        const scale = Math.min(
          (canvas.width ?? 400) / (img.width ?? 400),
          (canvas.height ?? 480) / (img.height ?? 480),
        );
        img.scale(scale);
        img.set({
          left: ((canvas.width ?? 400) - (img.width ?? 400) * scale) / 2,
          top: ((canvas.height ?? 480) - (img.height ?? 480) * scale) / 2,
          selectable: false,
          evented: false,
          hoverCursor: 'default',
        });
        (img as FabricObj).data = { type: 'mockup' };

        canvas.add(img);
        canvas.sendObjectToBack(img);
        mockupRef.current = img as FabricObj;

        if (printAreaRef.current) {
          canvas.remove(printAreaRef.current);
        }
        const pa = new fabric.Rect({
          left: canvasArea.x,
          top: canvasArea.y,
          width: canvasArea.width,
          height: canvasArea.height,
          fill: 'transparent',
          stroke: 'rgba(99,102,241,0.3)',
          strokeWidth: 1,
          strokeDashArray: [6, 4],
          selectable: false,
          evented: false,
          objectCaching: false,
        });
        (pa as FabricObj).data = { type: 'printArea' };
        canvas.add(pa);
        printAreaRef.current = pa as FabricObj;

        canvas.renderAll();
      } catch (e) {
        console.error('reloadMockup error', e);
      }
    }

    // ── Imperative handle ──────────────────────

    useImperativeHandle(ref, () => ({
      addImage: async (url: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        try {
          const img = await loadImage(url);
          if (!img) throw new Error('Не удалось прочитать изображение.');
          scaleToWidth(img, 150, canvas);
          centerObject(img, canvas);
          (img as FabricObj).data = { id: crypto.randomUUID(), type: 'image', src: url };
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          emitLayersChanged();
        } catch (e) {
          console.error('addImage error', e);
          throw e;
        }
      },

      addText: (text = 'Новый текст') => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const textbox = new fabric.Textbox(text, {
          width: 200,
          fontSize: 28,
          fontFamily: 'Arial Black',
          fill: '#ffffff',
          textAlign: 'center',
          editable: true,
        });
        (textbox as FabricObj).data = { id: crypto.randomUUID(), type: 'text' };
        centerObject(textbox, canvas);
        canvas.add(textbox);
        canvas.setActiveObject(textbox);
        canvas.renderAll();
        emitLayersChanged();
      },

      addClipart: async (url: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        try {
          const img = await loadImage(url);
          if (!img) return;
          scaleToWidth(img, 80, canvas);
          centerObject(img, canvas);
          (img as FabricObj).data = { id: crypto.randomUUID(), type: 'clipart', src: url };
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          emitLayersChanged();
        } catch (e) {
          console.error('addClipart error', e);
        }
      },

      deleteSelected: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject() as FabricObj;
        if (!active || active === mockupRef.current || active === printAreaRef.current)
          return;
        canvas.remove(active);
        canvas.discardActiveObject();
        canvas.renderAll();
        onLayerSelected(null);
        emitLayersChanged();
      },

      duplicateSelected: async () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject() as FabricObj;
        if (!active || active === mockupRef.current || active === printAreaRef.current)
          return;
        const clone = await active.clone();
        clone.set({ left: (active.left ?? 0) + 20, top: (active.top ?? 0) + 20 });
        (clone as FabricObj).data = {
          id: crypto.randomUUID(),
          type: (active.data?.type as string) ?? 'image',
          src: (active.data?.src as string) ?? undefined,
        };
        canvas.add(clone);
        canvas.setActiveObject(clone);
        canvas.renderAll();
        emitLayersChanged();
      },

      bringForward: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;
        canvas.bringObjectForward(active);
        canvas.renderAll();
        emitLayersChanged();
      },

      sendBackward: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;
        const idx = canvas.getObjects().indexOf(active);
        if (idx <= 2) return;
        canvas.sendObjectBackwards(active);
        canvas.renderAll();
        emitLayersChanged();
      },

      exportToDataURL: () => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        return canvas.toDataURL({ format: 'png', multiplier: 2 });
      },

      exportWithoutGuides: () => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        const printArea = printAreaRef.current;
        const wasVisible = printArea?.visible;
        if (printArea) printArea.visible = false;
        canvas.discardActiveObject();
        canvas.renderAll();
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        if (printArea) printArea.visible = wasVisible ?? true;
        canvas.renderAll();
        return url;
      },

      getActiveLayer,

      updateActiveLayer: (patch: Partial<DesignLayer>) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;

        if (patch.text !== undefined && active instanceof fabric.Textbox) {
          active.set('text', patch.text);
        }
        if (patch.fontFamily !== undefined && active instanceof fabric.Textbox) {
          active.set('fontFamily', patch.fontFamily);
        }
        if (patch.fontSize !== undefined && active instanceof fabric.Textbox) {
          active.set('fontSize', patch.fontSize);
        }
        if (patch.fill !== undefined) {
          active.set('fill', patch.fill);
        }
        if (patch.opacity !== undefined) {
          active.set('opacity', patch.opacity);
        }
        if (patch.angle !== undefined) {
          active.set('angle', patch.angle);
        }
        if (patch.textAlign !== undefined && active instanceof fabric.Textbox) {
          active.set('textAlign', patch.textAlign);
        }
        if (patch.lineHeight !== undefined && active instanceof fabric.Textbox) {
          active.set('lineHeight', patch.lineHeight);
        }
        if (patch.fontWeight !== undefined && active instanceof fabric.Textbox) {
          active.set('fontWeight', patch.fontWeight);
        }
        if (patch.fontStyle !== undefined && active instanceof fabric.Textbox) {
          active.set('fontStyle', patch.fontStyle);
        }
        if (patch.left !== undefined) active.set('left', patch.left);
        if (patch.top !== undefined) active.set('top', patch.top);
        if (patch.scaleX !== undefined) active.set('scaleX', patch.scaleX);
        if (patch.scaleY !== undefined) active.set('scaleY', patch.scaleY);
        if (patch.flipX !== undefined) active.set('flipX', patch.flipX);
        if (patch.flipY !== undefined) active.set('flipY', patch.flipY);

        active.setCoords();
        canvas.renderAll();
        emitLayersChanged();
      },

      loadLayers: (layers: DesignLayer[]) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        skipEventRef.current = true;
        const toRemove = canvas
          .getObjects()
          .filter((o) => o !== mockupRef.current && o !== printAreaRef.current);
        toRemove.forEach((o) => canvas.remove(o));
        canvas.discardActiveObject();

        layers.forEach(async (layer) => {
          if (layer.type === 'text') {
            const tb = new fabric.Textbox(layer.text ?? 'Текст', {
              width: 200,
              fontSize: layer.fontSize ?? 28,
              fontFamily: layer.fontFamily ?? 'Arial',
              fontWeight: (layer.fontWeight ?? 'normal') as string,
              fontStyle: (layer.fontStyle ?? 'normal') as string,
              textAlign: (layer.textAlign ?? 'left') as string,
              lineHeight: layer.lineHeight ?? 1.16,
              fill: layer.fill ?? '#000000',
              left: layer.left,
              top: layer.top,
              scaleX: layer.scaleX ?? 1,
              scaleY: layer.scaleY ?? 1,
              angle: layer.angle ?? 0,
              opacity: layer.opacity ?? 1,
              flipX: layer.flipX ?? false,
              flipY: layer.flipY ?? false,
            });
            (tb as FabricObj).data = { id: layer.id, type: 'text' };
            canvas.add(tb);
            canvas.renderAll();
          } else if ((layer.type === 'image' || layer.type === 'clipart') && layer.src) {
            try {
              const img = await loadImage(layer.src);
              if (!img) return;
              img.set({
                left: layer.left,
                top: layer.top,
                scaleX: layer.scaleX ?? 1,
                scaleY: layer.scaleY ?? 1,
                angle: layer.angle ?? 0,
                opacity: layer.opacity ?? 1,
                flipX: layer.flipX ?? false,
                flipY: layer.flipY ?? false,
              });
              (img as FabricObj).data = { id: layer.id, type: layer.type, src: layer.src };
              canvas.add(img);
              canvas.renderAll();
            } catch (e) {
              console.error('loadLayers image error', e);
            }
          }
        });
        skipEventRef.current = false;
        setTimeout(() => emitLayersChanged(), 100);
      },

      clearDesign: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const toRemove = canvas
          .getObjects()
          .filter((o) => o !== mockupRef.current && o !== printAreaRef.current);
        toRemove.forEach((o) => canvas.remove(o));
        canvas.discardActiveObject();
        canvas.renderAll();
        emitLayersChanged();
      },

      setBackgroundColor: (c: string) => {
        colorRef.current = c;
        reloadMockup();
      },

      getCanvas: () => fabricRef.current,

      // Transparent PNG of just the print area (used as the 3D decal texture)
      exportDesignTexture: () => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        const hidden = [mockupRef.current, printAreaRef.current].filter(Boolean) as FabricObj[];
        hidden.forEach((o) => (o.visible = false));
        const bg = canvas.backgroundColor;
        canvas.backgroundColor = '';
        canvas.renderAll();
        const url = canvas.toDataURL({
          format: 'png', multiplier: 2,
          left: canvasArea.x, top: canvasArea.y,
          width: canvasArea.width, height: canvasArea.height,
        });
        hidden.forEach((o) => (o.visible = true));
        canvas.backgroundColor = bg;
        canvas.renderAll();
        return url;
      },

      // Move the selected layer's centre (used by drag-in-3D)
      moveActiveTo: (cx: number, cy: number) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;
        active.setPositionByOrigin(new fabric.Point(cx, cy), 'center', 'center');
        active.setCoords();
        canvas.renderAll();
        emitLayersChanged();
      },
    }));

    // ── Init canvas ────────────────────────────

    useEffect(() => {
      if (!canvasRef.current) return;
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 400,
        height: 480,
        backgroundColor: '#f8f8f8',
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = canvas;

      const onSelectionCreated = (e: { selected?: fabric.FabricObject[] }) => {
        const obj = e.selected?.[0] as FabricObj | undefined;
        if (!obj || obj === mockupRef.current || obj === printAreaRef.current) {
          onLayerSelected(null);
          return;
        }
        onLayerSelected(getActiveLayer());
      };

      const onSelectionUpdated = (e: { selected?: fabric.FabricObject[] }) => {
        const obj = e.selected?.[0] as FabricObj | undefined;
        if (!obj || obj === mockupRef.current || obj === printAreaRef.current) {
          onLayerSelected(null);
          return;
        }
        onLayerSelected(getActiveLayer());
      };

      const onCleared = () => {
        onLayerSelected(null);
      };

      const onModified = () => {
        emitLayersChanged();
        onLayerSelected(getActiveLayer());
      };

      const onTextChanged = () => {
        emitLayersChanged();
      };

      canvas.on('selection:created', onSelectionCreated);
      canvas.on('selection:updated', onSelectionUpdated);
      canvas.on('selection:cleared', onCleared);
      canvas.on('object:modified', onModified);
      canvas.on('text:changed', onTextChanged);
      canvas.on('object:moving', onTextChanged);
      canvas.on('object:scaling', onTextChanged);
      canvas.on('object:rotating', onTextChanged);

      reloadMockup();

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Update mockup when product/side/color changes ──

    useEffect(() => {
      productTypeRef.current = productType;
      sideRef.current = side;
      colorRef.current = color;
      reloadMockup();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productType, side, color, canvasArea.x, canvasArea.y, canvasArea.width, canvasArea.height]);

    return (
      <div className="relative inline-block">
        <canvas ref={canvasRef} width={400} height={480} />
      </div>
    );
  },
);

export default MerchCanvas;
