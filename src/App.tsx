import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import Catalogos from "./pages/Catalogos.tsx";
import CatalogoDestaques from "./pages/CatalogoDestaques.tsx";
import CatalogoKilomat from "./pages/CatalogoKilomat.tsx";
import TermosCondicoes from "./pages/TermosCondicoes.tsx";
import PoliticaCookies from "./pages/PoliticaCookies.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import { CookieConsentBanner } from "./components/CookieConsentBanner.tsx";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, user } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/catalogos" element={<Catalogos />} />
              <Route path="/catalogos/destaques" element={<CatalogoDestaques />} />
              <Route path="/catalogos/kilomat" element={<CatalogoKilomat />} />
              <Route path="/termos-e-condicoes" element={<TermosCondicoes />} />
              <Route path="/politica-de-cookies" element={<PoliticaCookies />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsentBanner />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
