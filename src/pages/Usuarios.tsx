import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Phone, Search, SearchX } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, type ResultadoPlaca } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const normalizar = (valor: string) => valor.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export default function BuscarPlaca() {
  const { user, loading: authLoading } = useAuth();
  const [placa, setPlaca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoPlaca[] | null>(null);
  const [consultada, setConsultada] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpia = normalizar(placa);
    setResultados(null);
    if (limpia.length !== 6) {
      setError("Escribe la placa completa (6 caracteres), por ejemplo ABC123.");
      return;
    }
    setError(null);
    setBuscando(true);
    const { data, error: rpcError } = await supabase.rpc("buscar_placa", { p_placa: limpia });
    setBuscando(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setConsultada(limpia);
    setResultados((data ?? []) as ResultadoPlaca[]);
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-primary p-2 rounded-lg shadow-elegant">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Buscar placa</h1>
            <p className="text-sm text-muted-foreground">
              Consulta el nombre y el celular de quien tiene registrada una placa
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Placa del vehículo</CardTitle>
            <CardDescription>Escribe la placa completa. Solo se muestran resultados exactos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={buscar} className="space-y-4">
              <div>
                <Label htmlFor="placa">Placa</Label>
                <Input
                  id="placa"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={8}
                  autoComplete="off"
                  className="uppercase tracking-wider"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={buscando}>
                {buscando ? "Buscando..." : "Buscar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {resultados && resultados.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center space-y-2">
              <SearchX className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-medium">La placa {consultada} no está registrada.</p>
            </CardContent>
          </Card>
        )}

        {resultados && resultados.length > 0 && (
          <div className="space-y-3">
            {resultados.map((r, i) => (
              <Card key={`${r.placa}-${i}`} className="shadow-card">
                <CardContent className="py-4 space-y-2">
                  <div className="text-lg font-semibold">{r.nombre || "—"}</div>
                  <div className="text-sm text-muted-foreground">
                    Placa <span className="uppercase font-medium text-foreground">{r.placa}</span>
                  </div>
                  {r.celular ? (
                    <a
                      href={`tel:${r.celular}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {r.celular}
                    </a>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sin celular registrado</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
