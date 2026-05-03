import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase, type Perfil } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Users as UsersIcon } from "lucide-react";

export default function Usuarios() {
  const { user, loading: authLoading } = useAuth();
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("perfiles")
        .select("id, nombre, celular, placa, tipo_cargador")
        .order("nombre", { ascending: true });
      if (!error && data) setPerfiles(data as Perfil[]);
      setLoading(false);
    })();
  }, []);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-primary p-2 rounded-lg shadow-elegant">
            <UsersIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
            <p className="text-sm text-muted-foreground">
              Listado de usuarios registrados
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Perfiles</CardTitle>
            <CardDescription>
              {perfiles.length} usuario{perfiles.length === 1 ? "" : "s"} registrado{perfiles.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : perfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre completo</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Tipo de cargador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perfiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nombre || "—"}</TableCell>
                        <TableCell>{p.celular || "—"}</TableCell>
                        <TableCell className="uppercase">{p.placa || "—"}</TableCell>
                        <TableCell>{p.tipo_cargador || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
