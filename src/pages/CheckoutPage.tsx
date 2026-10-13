import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, CheckCircle2, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { createOrder } from '@/services/database';
import { getMockupUrl } from '@/services/mockups';
import type { OrderInsert } from '@/types';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.customer_name.trim()) e.customer_name = 'Введите имя';
    if (!form.customer_email.trim()) e.customer_email = 'Введите email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email))
      e.customer_email = 'Неверный формат email';
    if (!form.customer_phone.trim()) e.customer_phone = 'Введите телефон';
    if (!form.shipping_address.trim()) e.shipping_address = 'Введите адрес доставки';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || items.length === 0) return;
    setSubmitting(true);
    try {
      const order: OrderInsert = {
        ...form,
        items,
        total_amount: total,
        status: 'pending',
      };
      const result = await createOrder(order);
      setOrderId(result.id);
      setSuccess(true);
      clearCart();
    } catch (err) {
      console.error('Order submission failed:', err);
      setErrors({ form: 'Не удалось оформить заказ. Попробуйте ещё раз.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">Заказ оформлен!</h1>
          <p className="mt-3 text-gray-500">
            Спасибо за заказ. Мы свяжемся с вами в течение часа для подтверждения.
          </p>
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-6 py-4">
            <div className="text-sm text-gray-500">Номер заказа</div>
            <div className="mt-1 font-mono text-lg font-bold text-gray-900">
              #{orderId.slice(0, 8).toUpperCase()}
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              На главную
            </button>
            <button
              onClick={() => navigate('/constructor')}
              className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Новый дизайн
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <ShoppingCart className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Корзина пуста</h1>
          <p className="mt-2 text-gray-500">
            Создайте свой мерч в конструкторе и добавьте сюда.
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              В каталог
            </button>
            <button
              onClick={() => navigate('/constructor')}
              className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Открыть конструктор
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Checkout form ──
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate('/')}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-gray-900">
        Оформление заказа
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
        {/* ── Cart items ── */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Ваш заказ ({items.length})
          </h2>
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4"
              >
                {/* Preview */}
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
                  <img
                    src={item.previewUrl || getMockupUrl(item.productType, item.side, item.color)}
                    alt={item.productName}
                    className="h-full w-full rounded-xl object-contain p-1"
                  />
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{item.productName}</h3>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {item.side === 'front' ? 'Спереди' : 'Сзади'} · {item.colorName} · Размер {item.size}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 transition hover:text-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Design info */}
                  <div className="mt-2 text-xs text-gray-400">
                    {item.designConfig[item.side]?.layers?.length ?? 0} элемент(ов) на дизайне
                  </div>

                  {/* Quantity + price */}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="inline-flex items-center rounded-lg border border-gray-200">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
                      >−</button>
                      <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
                      >+</button>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-gray-900">
                        {(item.basePrice * item.quantity).toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.basePrice.toLocaleString('ru-RU')} ₽/шт
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Form + summary ── */}
        <div className="space-y-4">
          {errors.form && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Данные получателя</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Имя</label>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${
                    errors.customer_name ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
                  }`}
                  placeholder="Иван Иванов"
                />
                {errors.customer_name && <p className="mt-1 text-xs text-red-500">{errors.customer_name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                <input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${
                    errors.customer_email ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
                  }`}
                  placeholder="ivan@example.com"
                />
                {errors.customer_email && <p className="mt-1 text-xs text-red-500">{errors.customer_email}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Телефон</label>
                <input
                  type="tel"
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${
                    errors.customer_phone ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
                  }`}
                  placeholder="+7 (999) 123-45-67"
                />
                {errors.customer_phone && <p className="mt-1 text-xs text-red-500">{errors.customer_phone}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Адрес доставки</label>
                <textarea
                  value={form.shipping_address}
                  onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                  rows={2}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${
                    errors.shipping_address ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'
                  }`}
                  placeholder="Город, улица, дом, квартира, индекс"
                />
                {errors.shipping_address && <p className="mt-1 text-xs text-red-500">{errors.shipping_address}</p>}
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Товары ({items.reduce((s, i) => s + i.quantity, 0)} шт)</span>
                  <span>{total.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Доставка</span>
                  <span className="text-green-600">Бесплатно</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-lg font-extrabold text-gray-900">
                  <span>Итого</span>
                  <span>{total.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              <ShoppingBag className="h-5 w-5" />
              {submitting ? 'Оформление…' : 'Оформить заказ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
