import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, CalendarCheck, Home, Users } from "lucide-react";

export const Layout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-accent"
        }`}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-primary p-2 rounded-lg shadow-elegant">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-foreground">Reserva Cargadores</div>
              <div className="text-xs text-muted-foreground">EPM · Edificio Inteligente</div>
            </div>
          </Link>

          {user && (
            <nav className="flex items-center gap-2">
              <NavItem to="/" icon={Home} label="Inicio" />
              <NavItem to="/mis-reservas" icon={CalendarCheck} label="Mis reservas" />
              <NavItem to="/usuarios" icon={Users} label="Usuarios" />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </nav>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};
