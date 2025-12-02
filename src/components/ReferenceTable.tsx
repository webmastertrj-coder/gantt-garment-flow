import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Edit, Trash2, Search, ImageIcon, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotification } from "@/hooks/use-notification";
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
  imagen_url: string | null;
  color: string | null;
  cantidad_colores: string | null;
  distribucion: string | null;
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
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'unlocked', 'locked'
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [referenceToDelete, setReferenceToDelete] = useState<Reference | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { toast } = useToast();
  const { permission, requestPermission, sendNotification } = useNotification();

  // Solicitar permisos de notificación al cargar
  useEffect(() => {
    if (permission === "default") {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Verificar referencias próximas a vencer (1 día antes)
  const checkExpiringReferences = (refs: Reference[]) => {
    const parseDate = (s?: string | null) => {
      if (!s) return null;
      const [y, m, d] = s.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    refs.forEach(ref => {
      const launchDate = parseDate(ref.lanzamiento_capsula);
      const ingresoDate = parseDate(ref.ingreso_a_bodega);
      
      if (!launchDate) return;

      const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;
      const unlockDate = new Date(baseDate);
      unlockDate.setDate(unlockDate.getDate() + 14);
      unlockDate.setHours(0, 0, 0, 0);

      const diffTime = unlockDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Notificar si vence en 1 día
      if (diffDays === 1) {
        sendNotification(
          `⚠️ Referencia por vencer`,
          {
            body: `${ref.referencia} - ${ref.curva} se desbloquea mañana (${unlockDate.toLocaleDateString('es-ES')})`,
            tag: `ref-${ref.id}`,
            requireInteraction: true,
          }
        );
      }
    });
  };

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

      setData((references as any) || []);
      // Verificar referencias próximas a vencer
      checkExpiringReferences((references as any) || []);
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

    // Set up real-time subscription for references changes
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'references'
        },
        (payload) => {
          console.log('Reference updated:', payload);
          // Update the existing reference in the data
          setData(prevData => 
            prevData.map(ref => 
              ref.id === payload.new.id ? payload.new as Reference : ref
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'references'
        },
        (payload) => {
          console.log('Reference deleted:', payload);
          // Remove the deleted reference from the data
          setData(prevData => 
            prevData.filter(ref => ref.id !== payload.old.id)
          );
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
      // Filtro por búsqueda de referencia
      if (searchTerm && !item.referencia.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Calcular días desbloqueado para los filtros
      const parseDate = (s?: string | null) => {
        if (!s) return null;
        const [y, m, d] = s.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const launchDate = parseDate(item.lanzamiento_capsula);
      const ingresoDate = parseDate(item.ingreso_a_bodega);

      // Filtro por estado de desbloqueo
      if (statusFilter !== 'all') {
        if (!launchDate) {
          if (statusFilter === 'unlocked') return false;
        } else {
          const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;
          const unlockDate = new Date(baseDate);
          unlockDate.setDate(unlockDate.getDate() + 14);
          unlockDate.setHours(0, 0, 0, 0);
          
          const isUnlocked = today >= unlockDate;
          
          if (statusFilter === 'unlocked' && !isUnlocked) return false;
          if (statusFilter === 'locked' && isUnlocked) return false;
        }
      }

      // Filtro por mes de desbloqueo
      if (monthFilter !== 'all' && launchDate) {
        const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;
        const unlockDate = new Date(baseDate);
        unlockDate.setDate(unlockDate.getDate() + 14);
        const month = unlockDate.getMonth();
        
        if (monthFilter === 'september' && month !== 8) return false;
        if (monthFilter === 'october' && month !== 9) return false;
        if (monthFilter === 'november' && month !== 10) return false;
      }

      // Filtro por rango de días hasta desbloqueo
      if (dayFilter !== 'all' && launchDate) {
        const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;
        const unlockDate = new Date(baseDate);
        unlockDate.setDate(unlockDate.getDate() + 14);
        unlockDate.setHours(0, 0, 0, 0);
        
        const diffTime = unlockDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (dayFilter === '1-7' && (diffDays < 1 || diffDays > 7)) return false;
        if (dayFilter === '8-15' && (diffDays < 8 || diffDays > 15)) return false;
        if (dayFilter === '16-30' && (diffDays < 16 || diffDays > 30)) return false;
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, monthFilter, dayFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleImageClick = (imageUrl: string | null) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setImageDialogOpen(true);
    }
  };

  const handleExportToExcel = () => {
    // Preparar datos para exportación
    const exportData = filteredAndSortedData.map(item => {
      const parseDate = (s?: string | null) => {
        if (!s) return null;
        const [y, m, d] = s.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const launchDate = parseDate(item.lanzamiento_capsula);
      const ingresoDate = parseDate(item.ingreso_a_bodega);
      
      // Calcular fecha de desbloqueo
      let fechaDesbloqueo = '';
      if (launchDate) {
        const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;
        const unlockDate = new Date(baseDate);
        unlockDate.setDate(unlockDate.getDate() + 14);
        fechaDesbloqueo = unlockDate.toLocaleDateString('es-ES');
      }

      // Calcular días desbloqueado/estado
      let diasEstado = '';
      if (!launchDate) {
        diasEstado = 'Sin fecha de lanzamiento';
      } else if (today < launchDate) {
        const daysUntilLaunch = Math.ceil((launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        diasEstado = `${daysUntilLaunch} días para lanzar`;
      } else {
        const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;
        if (today < baseDate) {
          const daysUntilBase = Math.ceil((baseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          diasEstado = `${daysUntilBase} días para ingresar`;
        } else {
          const daysSinceBase = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, 14 - daysSinceBase);
          diasEstado = daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Desbloqueado';
        }
      }

      return {
        'Referencia': item.referencia,
        'Curva': item.curva,
        'Cantidad': item.cantidad,
        'Color': item.color || '',
        'Cantidad de Colores': item.cantidad_colores || '',
        'Distribución': item.distribucion || '',
        'Ingreso a Bodega': item.ingreso_a_bodega || '',
        'Lanzamiento Cápsula': item.lanzamiento_capsula || '',
        'Fecha Desbloqueo': fechaDesbloqueo,
        'Estado': diasEstado
      };
    });

    // Crear libro de trabajo
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Referencias');

    // Generar archivo Excel
    const fileName = `referencias_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Exportación exitosa",
      description: `Se han exportado ${exportData.length} referencias a Excel.`,
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Detalles de la Referencia
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleExportToExcel}
            disabled={filteredAndSortedData.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>
        
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por Referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Referencias</SelectItem>
              <SelectItem value="unlocked">Desbloqueadas</SelectItem>
              <SelectItem value="locked">Bloqueadas</SelectItem>
            </SelectContent>
          </Select>
          
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
                <span className="text-sm font-medium text-foreground">Imagen</span>
              </th>
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
                <span className="text-sm font-medium text-foreground">Colores</span>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="text-sm font-medium text-foreground">Distribución</span>
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
                <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">
                  Cargando referencias...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">
                  No se encontraron referencias
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-table-hover transition-colors">
                  <td className="px-6 py-4">
                    {item.imagen_url ? (
                      <button
                        onClick={() => handleImageClick(item.imagen_url)}
                        className="relative w-12 h-12 rounded-md overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer"
                      >
                        <img 
                          src={item.imagen_url} 
                          alt={item.referencia}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-md border border-border bg-muted flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </td>
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
                    <div className="flex flex-col gap-1">
                      {item.color && (
                        <span className="font-medium text-foreground">{item.color}</span>
                      )}
                      {item.cantidad_colores && (
                        <span className="text-xs">({item.cantidad_colores} colores)</span>
                      )}
                      {!item.color && !item.cantidad_colores && '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.distribucion || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.ingreso_a_bodega || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.lanzamiento_capsula || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {(() => {
                      const parseDate = (s?: string | null) => {
                        if (!s) return null;
                        const [y, m, d] = s.split('-').map(Number);
                        if (!y || !m || !d) return null;
                        return new Date(y, m - 1, d);
                      };
                      const launchDate = parseDate(item.lanzamiento_capsula);
                      const ingresoDate = parseDate(item.ingreso_a_bodega);
                      if (!launchDate) {
                        return '-';
                      }
                      // Base para el desbloqueo: si el ingreso es posterior al lanzamiento, usar ingreso; de lo contrario, lanzamiento
                      const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;
                      const unlockDate = new Date(baseDate);
                      unlockDate.setDate(unlockDate.getDate() + 14);
                      return unlockDate.toLocaleDateString('es-ES');
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const parseDate = (s?: string | null) => {
                        if (!s) return null;
                        const [y, m, d] = s.split('-').map(Number);
                        if (!y || !m || !d) return null;
                        return new Date(y, m - 1, d);
                      };
                      const today = new Date();
                      const launchDate = parseDate(item.lanzamiento_capsula);
                      const ingresoDate = parseDate(item.ingreso_a_bodega);
                      
                      if (!launchDate) {
                        return (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground">
                            Sin fecha de lanzamiento
                          </span>
                        );
                      }

                      // Antes del lanzamiento: mostrar días para lanzar
                      if (today < launchDate) {
                        const daysUntilLaunch = Math.ceil((launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                            {daysUntilLaunch} días para lanzar
                          </span>
                        );
                      }

                      // Después del lanzamiento: el conteo de 14 días comienza en la fecha base
                      // Si el ingreso es posterior al lanzamiento, la base es la fecha de ingreso; si no, es la fecha de lanzamiento
                      const baseDate = ingresoDate && ingresoDate > launchDate ? ingresoDate : launchDate;

                      // Si aún no llega la fecha base (ej. ingreso futuro), mostrar días para ingresar
                      if (today < baseDate) {
                        const daysUntilBase = Math.ceil((baseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                            {daysUntilBase} días para ingresar
                          </span>
                        );
                      }

                      const daysSinceBase = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
                      const daysRemaining = Math.max(0, 14 - daysSinceBase);
                      
                      if (daysRemaining > 0) {
                        return (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                            {daysRemaining} días restantes
                          </span>
                        );
                      }

                      return (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                          Desbloqueado
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

      {/* Pagination Controls */}
      {filteredAndSortedData.length > itemsPerPage && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAndSortedData.length)} de {filteredAndSortedData.length} referencias
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 || 
                                page === totalPages || 
                                (page >= currentPage - 1 && page <= currentPage + 1);
                
                if (!showPage) {
                  // Show ellipsis only once between groups
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <span className="px-3 text-muted-foreground">...</span>
                      </PaginationItem>
                    );
                  }
                  return null;
                }
                
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

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

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <div className="flex items-center justify-center p-4">
              <img 
                src={selectedImage} 
                alt="Vista ampliada"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferenceTable;