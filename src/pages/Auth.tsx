import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Zap } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipoCargador, setTipoCargador] = useState<"Tipo 1" | "Tipo 2">("Tipo 2");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; celular?: string; placa?: string }>({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const celularRegex = /^3\d{9}$/;
  const placaRegex = /^[A-Z]{3}\d{3}$/;

  const validateSignup = () => {
    const e: { email?: string; celular?: string; placa?: string } = {};
    if (!emailRegex.test(email.trim())) e.email = "Ingresa un correo electrónico válido";
    if (!celularRegex.test(celular.trim()))
      e.celular = "Ingresa un número de celular válido (10 dígitos, debe comenzar por 3)";
    if (!placaRegex.test(placa.trim().toUpperCase()))
      e.placa = "Ingresa una placa válida (formato: ABC123)";
    return e;
  };

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("¡Bienvenido!");
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("Completa todos los campos");
      return;
    }
    const v = validateSignup();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setSubmitting(true);
    const perfilData = {
      nombre: nombre.trim(),
      celular: celular.trim(),
      placa: placa.trim().toUpperCase(),
      tipo_cargador: tipoCargador,
    };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        // Guardamos los datos del perfil en metadata para que el listener
        // SIGNED_IN cree el registro en `perfiles` con la sesión activa.
        data: perfilData,
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    // Si Supabase devolvió sesión inmediata (auto-confirm activo),
    // intentamos crear el perfil ahora mismo.
    if (data.session?.user) {
      const userId = data.session.user.id;
      const { error: perfilError } = await supabase
        .from("perfiles")
        .upsert({ id: userId, ...perfilData });
      setSubmitting(false);
      if (perfilError) {
        toast.error("Cuenta creada, pero no se guardó el perfil: " + perfilError.message);
        return;
      }
      toast.success("¡Cuenta creada!");
      navigate("/");
      return;
    }

    // Sin sesión: requiere confirmación por email. El perfil se creará
    // automáticamente en el primer login (listener SIGNED_IN).
    setSubmitting(false);
    toast.success("Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.");
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto bg-gradient-primary p-3 rounded-2xl shadow-elegant w-fit">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Reserva Cargadores EPM</CardTitle>
          <CardDescription>Edificio Inteligente · Medellín</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="celular">Número de celular</Label>
                  <Input
                    id="celular"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={celular}
                    onChange={(e) => {
                      setCelular(e.target.value.replace(/\D/g, "").slice(0, 10));
                      if (errors.celular) setErrors((p) => ({ ...p, celular: undefined }));
                    }}
                    placeholder="3001234567"
                  />
                  {errors.celular && <p className="text-sm text-destructive mt-1">{errors.celular}</p>}
                </div>
                <div>
                  <Label htmlFor="placa">Placa del vehículo</Label>
                  <Input
                    id="placa"
                    required
                    maxLength={6}
                    value={placa}
                    onChange={(e) => {
                      setPlaca(e.target.value.toUpperCase().slice(0, 6));
                      if (errors.placa) setErrors((p) => ({ ...p, placa: undefined }));
                    }}
                    placeholder="ABC123"
                  />
                  {errors.placa && <p className="text-sm text-destructive mt-1">{errors.placa}</p>}
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo de cargador de tu carro</Label>
                  <select
                    id="tipo"
                    value={tipoCargador}
                    onChange={(e) => setTipoCargador(e.target.value as "Tipo 1" | "Tipo 2")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Tipo 1">Tipo 1</option>
                    <option value="Tipo 2">Tipo 2</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="email-s">Correo electrónico</Label>
                  <Input id="email-s" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password-s">Contraseña</Label>
                  <Input id="password-s" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creando..." : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
