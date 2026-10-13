import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Logo } from '@/components/Logo';

export function Header() {
  const { count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center" aria-label="NarxozFab — на главную">
          <Logo className="text-[26px]" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
            Каталог
          </Link>
          <Link to="/constructor" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
            Конструктор
          </Link>
          <button
            onClick={() => navigate('/constructor')}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Создать свой
          </button>
        </nav>

        {/* Cart + mobile menu */}
        <div className="flex items-center gap-3">
          <Link
            to="/checkout"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600">
              Каталог
            </Link>
            <Link to="/constructor" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-600">
              Конструктор
            </Link>
            <button
              onClick={() => { setMenuOpen(false); navigate('/constructor'); }}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Создать свой
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo className="text-[22px]" />
            <p className="mt-3 max-w-sm text-sm text-gray-500">
              Студенческая мерч-мастерская Нархоз Колледж. Создавайте уникальный дизайн на худи,
              футболках, свитшотах и кепках: добавляйте принты, надписи и логотипы,
              а готовый мерч забирайте прямо в колледже.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Навигация</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link to="/" className="hover:text-gray-900">Каталог</Link></li>
              <li><Link to="/constructor" className="hover:text-gray-900">Конструктор</Link></li>
              <li><Link to="/checkout" className="hover:text-gray-900">Корзина</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Контакты</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li>Самовывоз: Нархоз Колледж, Алматы</li>
              <li>О готовности заказа сообщим по телефону или email</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          © 2026 NarxozFab · Нархоз Колледж
        </div>
      </div>
    </footer>
  );
}
