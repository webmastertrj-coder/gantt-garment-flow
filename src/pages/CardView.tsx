import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LaunchDateProvider } from "@/contexts/LaunchDateContext";
import Header from "@/components/Header";
import EditReferenceDialog from "@/components/EditReferenceDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Unlock, MapPin, LayoutGrid, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Reference {
  id: string;
  referencia: string;
  lanzamiento_capsula: string | null;
  ingreso_a_bodega: string | null;
  imagen_url: string | null;
  curva: string;
  color: string | null;
  ubicacion: string | null;
  distribucion: string | null;
  cantidad: number;
  cantidad_colores: string | null;
  fecha_desbloqueo: string | null;
  dias_desbloqueado: number | null;
  created_at: string;
  updated_at: string;
}
const CardViewContent = () => {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRef, setSearchRef] = useState("");
  const [filterUbicacion, setFilterUbicacion] = useState("all");
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Get unique ubicaciones for the filter dropdown
  const ubicaciones = useMemo(() => {
    const unique = [...new Set(references.map(r => r.ubicacion).filter(Boolean))] as string[];
    return unique.sort();
  }, [references]);

  // Filter references based on search and filter
  const filteredReferences = useMemo(() => {
    return references.filter(ref => {
      const matchesSearch = searchRef === "" || 
        ref.referencia.toLowerCase().includes(searchRef.toLowerCase());
      const matchesUbicacion = filterUbicacion === "all" || ref.ubicacion === filterUbicacion;
      return matchesSearch && matchesUbicacion;
    });
  }, [references, searchRef, filterUbicacion]);

  useEffect(() => {
    fetchReferences();

    // Subscribe to real-time changes
    const channel = supabase.channel('card-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'references'
    }, () => {
      fetchReferences();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchReferences = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('references').select('*').order('lanzamiento_capsula', {
        ascending: true
      });
      if (error) throw error;
      setReferences(data || []);
    } catch (error) {
      console.error('Error fetching references:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No definida';
    try {
      return format(new Date(dateString), 'dd MMM yyyy', {
        locale: es
      });
    } catch {
      return 'Fecha inválida';
    }
  };
  const calculateUnlockDate = (ref: Reference): string | null => {
    const parseDate = (s?: string | null) => {
      if (!s) return null;
      const [y, m, d] = s.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };
    const launchDate = parseDate(ref.lanzamiento_capsula);
    const ingresoDate = parseDate(ref.ingreso_a_bodega);
    if (!launchDate) return null;
    const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;
    const unlockDate = new Date(baseDate);
    unlockDate.setDate(unlockDate.getDate() + 14);
    return unlockDate.toISOString().split('T')[0];
  };

  const handleCardClick = (ref: Reference) => {
    setSelectedReference(ref);
    setEditDialogOpen(true);
  };
  if (loading) {
    return <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>)}
          </div>
        </main>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Referencias</h1>
          <p className="text-muted-foreground mt-1">
            {filteredReferences.length} de {references.length} referencias
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar referencia..."
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={filterUbicacion} onValueChange={setFilterUbicacion}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Ubicación" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas las ubicaciones</SelectItem>
                {ubicaciones.map((ub) => (
                  <SelectItem key={ub} value={ub}>{ub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReferences.map(ref => <Card key={ref.id} onClick={() => handleCardClick(ref)} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-border bg-card cursor-pointer">
              <CardHeader className="space-y-2 pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl font-semibold text-card-foreground">
                    {ref.referencia}
                  </CardTitle>
                  {ref.color && <Badge variant="outline" className="text-xs">
                      {ref.color}
                    </Badge>}
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  {ref.curva}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Image */}
                <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                  {ref.imagen_url ? <img src={ref.imagen_url} alt={ref.referencia} onError={e => {
                e.currentTarget.src = '/placeholder.svg';
              }} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Sin imagen
                    </div>}
                </div>

                {/* Info - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Left column */}
                  <div className="flex items-start gap-2">
                    <LayoutGrid className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        Distribución
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {ref.distribucion || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        Lanzamiento
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatDate(ref.lanzamiento_capsula)}
                      </p>
                    </div>
                  </div>

                  {/* Left column */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-violet-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        Ubicación
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {ref.ubicacion || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex items-start gap-2">
                    <Unlock className="w-4 h-4 mt-0.5 text-success flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        Desbloqueo
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatDate(calculateUnlockDate(ref))}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>

        {filteredReferences.length === 0 && <div className="text-center py-12">
            <p className="text-muted-foreground">
              {references.length === 0 ? "No hay referencias para mostrar" : "No se encontraron referencias con los filtros aplicados"}
            </p>
          </div>}

        <EditReferenceDialog
          reference={selectedReference}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onReferenceUpdated={fetchReferences}
        />
      </main>
    </div>;
};
const CardView = () => {
  return <LaunchDateProvider>
      <CardViewContent />
    </LaunchDateProvider>;
};
export default CardView;