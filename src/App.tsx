import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './lib/store';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';

// Route-level code splitting: each page (especially the large admin panel and
// landing page) is loaded on demand instead of shipping in the initial bundle.
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ProductLandingPage = lazy(() => import('./pages/ProductLandingPage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AboutPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.TermsPage })));
const ContactPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.ContactPage })));
const DataProtectionPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.DataProtectionPage })));

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { lang } = useStore();
  return (
    <div className="min-h-screen flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Header />
      <Navigation />
      <main className="flex-1">
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

function AdminRoute() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AdminPage />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
        <Route path="/products" element={<AppLayout><ProductsPage /></AppLayout>} />
        <Route path="/product/:id" element={<AppLayout><ProductDetailPage /></AppLayout>} />
        <Route path="/landing/:id" element={<AppLayout><ProductLandingPage /></AppLayout>} />
        <Route path="/order/:id" element={<AppLayout><OrderPage /></AppLayout>} />
        <Route path="/cart" element={<AppLayout><CartPage /></AppLayout>} />
        <Route path="/invoice/:orderId" element={<AppLayout><InvoicePage /></AppLayout>} />
        <Route path="/track-order" element={<AppLayout><TrackOrderPage /></AppLayout>} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/about" element={<AppLayout><AboutPage /></AppLayout>} />
        <Route path="/privacy" element={<AppLayout><PrivacyPage /></AppLayout>} />
        <Route path="/terms" element={<AppLayout><TermsPage /></AppLayout>} />
        <Route path="/contact" element={<AppLayout><ContactPage /></AppLayout>} />
        <Route path="/data-protection" element={<AppLayout><DataProtectionPage /></AppLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
