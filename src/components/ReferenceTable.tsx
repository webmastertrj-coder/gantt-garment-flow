import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EditReferenceDialog from "./EditReferenceDialog";

interface Reference {
  id: string;
  referencia: string;
  curva: string;
  cantidad: number;
  ingreso_a_bodega: string | null;
  lanzamiento_capsula: string | null;
  fecha_desbloqueo: string | null;
  dias_desbloqueado: number | null;
  created_at: string;
  updated_at: string;
}

type SortField = keyof Reference;
type SortDirection = 'asc' | 'desc';

const ReferenceTable = () => {
  const [data, setData] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('referencia');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [referenceToDelete, setReferenceToDelete] = useState<Reference | null>(null);
  const { toast } = useToast();

  // Fetch references from Supabase
  const fetchReferences = async () => {
    try {
      setLoading(true);
      const { data: references, error } = await supabase
        .from('references')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching references:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las referencias.",
          variant: "destructive"
        });
        return;
      }

      setData(references || []);
    } catch (error) {
      console.error('Error fetching references:', error);
      toast({
        title: "Error",
        description: "Hubo un error al cargar las referencias.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferences();

    // Set up real-time subscription for new references
    const channel = supabase
      .channel('references-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'references'
        },
        (payload) => {
          console.log('New reference added:', payload);
          // Add the new reference to the current data
          setData(prevData => [payload.new as Reference, ...prevData]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (reference: Reference) => {
    setEditingReference(reference);
    setEditDialogOpen(true);
  };

  const handleDelete = (reference: Reference) => {
    setReferenceToDelete(reference);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!referenceToDelete) return;

    try {
      const { error } = await supabase
        .from('references')
        .delete()
        .eq('id', referenceToDelete.id);

      if (error) {
        console.error('Error deleting reference:', error);
        toast({
          title: "Error",
          description: "Hubo un error al eliminar la referencia.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Referencia eliminada",
        description: `La referencia ${referenceToDelete.referencia} ha sido eliminada exitosamente.`,
      });

      // Remove the reference from the local state
      setData(prevData => prevData.filter(ref => ref.id !== referenceToDelete.id));
      setDeleteDialogOpen(false);
      setReferenceToDelete(null);
    } catch (error) {
      console.error('Error deleting reference:', error);
      toast({
        title: "Error",
        description: "Hubo un error inesperado al eliminar la referencia.",
        variant: "destructive"
      });
    }
  };

  const handleReferenceUpdated = () => {
    fetchReferences();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-4 w-4 text-muted-foreground/50" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
      <ChevronDown className="h-4 w-4 text-muted-foreground" />;
  };

  const filteredAndSortedData = data
    .filter(item => {
      if (searchTerm && !item.referencia.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Detalles de la Referencia
        </h2>
        
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por Referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los Meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Meses</SelectItem>
              <SelectItem value="september">Septiembre</SelectItem>
              <SelectItem value="october">Octubre</SelectItem>
              <SelectItem value="november">Noviembre</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los Días" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Días</SelectItem>
              <SelectItem value="1-7">1-7 días</SelectItem>
              <SelectItem value="8-15">8-15 días</SelectItem>
              <SelectItem value="16-30">16-30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-table-header">
            <tr>
              <th className="px-6 py-3 text-left">
                <button 
                  onClick={() => handleSort('referencia')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  Referencia
                  <SortIcon field="referencia" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button 
                  onClick={() => handleSort('curva')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  Curva
                  <SortIcon field="curva" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button 
                  onClick={() => handleSort('cantidad')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  Cantidad
                  <SortIcon field="cantidad" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button 
                  onClick={() => handleSort('ingreso_a_bodega')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  Ingreso a Bodega
                  <SortIcon field="ingreso_a_bodega" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button 
                  onClick={() => handleSort('lanzamiento_capsula')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  Lanzamiento Cápsula
                  <SortIcon field="lanzamiento_capsula" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button 
                  onClick={() => handleSort('fecha_desbloqueo')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  Fecha Desbloqueo
                  <SortIcon field="fecha_desbloqueo" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button 
                  onClick={() => handleSort('dias_desbloqueado')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  Días Desbloqueado
                  <SortIcon field="dias_desbloqueado" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="text-sm font-medium text-foreground">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                  Cargando referencias...
                </td>
              </tr>
            ) : filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                  No se encontraron referencias
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-table-hover transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-foreground">
                    {item.referencia}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.curva}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {item.cantidad}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.ingreso_a_bodega || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.lanzamiento_capsula || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {(() => {
                      const today = new Date();
                      const launchDate = item.lanzamiento_capsula ? new Date(item.lanzamiento_capsula) : null;
                      
                      if (!launchDate) {
                        return '-';
                      }

                      // Si la fecha actual es menor a la fecha de lanzamiento, mostrar la fecha de lanzamiento
                      if (today < launchDate) {
                        return launchDate.toLocaleDateString('es-ES');
                      }

                      // Si ya pasó la fecha de lanzamiento, mostrar la fecha de desbloqueo (21 días después del lanzamiento)
                      const unlockDate = new Date(launchDate);
                      unlockDate.setDate(unlockDate.getDate() + 21);
                      return unlockDate.toLocaleDateString('es-ES');
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const today = new Date();
                      const launchDate = item.lanzamiento_capsula ? new Date(item.lanzamiento_capsula) : null;
                      
                      if (!launchDate) {
                        return (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground">
                            Sin fecha de lanzamiento
                          </span>
                        );
                      }

                      // Si la fecha inicial es mayor a la fecha de lanzamiento, mostrar días pendientes para lanzar
                      if (today > launchDate) {
                        const daysSinceLaunch = Math.floor((today.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24));
                        const daysRemaining = Math.max(0, 21 - daysSinceLaunch);
                        
                        if (daysRemaining > 0) {
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                              {daysRemaining} días restantes
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                              Desbloqueado
                            </span>
                          );
                        }
                      }

                      // Si la fecha actual es menor o igual a la fecha de lanzamiento
                      const daysUntilLaunch = Math.ceil((launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                          {daysUntilLaunch} días para lanzar
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditReferenceDialog
        reference={editingReference}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onReferenceUpdated={handleReferenceUpdated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la referencia{" "}
              <strong>{referenceToDelete?.referencia}</strong> de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReferenceTable;