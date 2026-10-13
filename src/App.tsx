import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from '@/context/CartContext';
import { Header, Footer } from '@/components/Layout';
import { CatalogPage } from '@/pages/CatalogPage';
import { ConstructorPage } from '@/pages/ConstructorPage';
import { CheckoutPage } from '@/pages/CheckoutPage';

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <div className="flex min-h-screen flex-col bg-white">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<CatalogPage />} />
              <Route path="/constructor" element={<ConstructorPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
