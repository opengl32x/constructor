import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from '@/context/CartContext';
import { Header, Footer } from '@/components/Layout';
import { CatalogPage } from '@/pages/CatalogPage';
import { ConstructorPage } from '@/pages/ConstructorPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { DynamicBackground } from '@/components/DynamicBackground';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/constructor" element={<ConstructorPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <div className="relative flex min-h-screen flex-col">
          <DynamicBackground />
          <Header />
          <main className="flex-1">
            <AnimatedRoutes />
          </main>
          <Footer />
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
