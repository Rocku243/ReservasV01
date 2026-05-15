import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Reservar from "./pages/Reservar.tsx";
import MisReservas from "./pages/MisReservas.tsx";
import Usuarios from "./pages/Usuarios.tsx";
import ContrasenaOlvidada from "./pages/ContraseñaOlvidada.tsx";
import RestablecerContrasena from "./pages/RestablecerContrasena.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/has-olvidado-tu-contrasena" element={<ContrasenaOlvidada />} />
          <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
          <Route
            path="*"
            element={
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reservar/:id" element={<Reservar />} />
                  <Route path="/mis-reservas" element={<MisReservas />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
