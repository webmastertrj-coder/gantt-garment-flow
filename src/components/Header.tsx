import { Download, BarChart3, Loader2, Calendar, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import NewReferenceDialog from "./NewReferenceDialog";
import ImportHistoryDialog from "./ImportHistoryDialog";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const Header = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleImportClick = () => {
    setShowImportDialog(true);
  };

  const handleProceedToFileSelect = () => {
    setShowImportDialog(false);
    fileInputRef.current?.click();
  };

  // Valid curva values from database constraint
  const validCurvaValues = [
    'XS-S-M-L-XL',
    'S-M-L-XL',
    'S-M-L',
    'XS-S-M-L',
    'XL-XXL-XXXL',
    'XL-XXL-3XL',
    '28-30-32-34-36',
    '28-30-32-34-36-40',
    '06-08-10-12',
    '06-08-10-12-14',
    '14-16-18-20',
    '14-16-18-20-22',
    'ONE-SIZE',
    'M-L-XL-XXL'
  ];

  // Helper function to convert Excel serial date to ISO date string
  const excelDateToISOString = (value: any): string | null => {
    if (!value) return null;
    
    // If it's already a string in YYYY-MM-DD format, return it
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.split('T')[0]; // Remove time part if present
    }
    
    // If it's a number (Excel serial date)
    if (typeof value === 'number') {
      // Excel dates start from 1900-01-01, but Excel incorrectly treats 1900 as a leap year
      // So dates before March 1, 1900 need adjustment
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Try to parse as Date object
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error('Error parsing date:', value, e);
    }
    
    return null;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log("File selected:", file?.name);
    
    if (!file) {
      console.log("No file selected");
      return;
    }

    setIsImporting(true);

    try {
      console.log("Reading file...");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log("Parsed data:", jsonData);

      const references = jsonData.map((row: any) => ({
        referencia: row.referencia || row.Referencia,
        cantidad: parseInt(row.cantidad || row.Cantidad) || 0,
        curva: row.curva || row.Curva,
        color: row.color || row.Color || null,
        cantidad_colores: row.cantidad_colores || row["Cantidad Colores"] || null,
        lanzamiento_capsula: excelDateToISOString(row.lanzamiento_capsula || row["Lanzamiento Capsula"]),
        ingreso_a_bodega: excelDateToISOString(row.ingreso_a_bodega || row["Ingreso a Bodega"]),
        fecha_desbloqueo: excelDateToISOString(row.fecha_desbloqueo || row["Fecha Desbloqueo"]),
        imagen_url: row.imagen_url || row["Imagen URL"] || null,
      }));

      // Validate curva values
      const invalidCurvas = references
        .map((ref, index) => ({ ref, index: index + 2 })) // +2 because Excel rows start at 1 and have header
        .filter(({ ref }) => !validCurvaValues.includes(ref.curva))
        .map(({ ref, index }) => `Fila ${index}: "${ref.curva}"`);

      if (invalidCurvas.length > 0) {
        throw new Error(
          `Valores de curva inválidos encontrados:\n${invalidCurvas.join('\n')}\n\nValores válidos: ${validCurvaValues.join(', ')}`
        );
      }

      console.log("References to insert:", references);

      // Check for duplicates within the CSV file
      const referenciasInCSV = references.map(r => r.referencia);
      const duplicatesInCSV = referenciasInCSV.filter((item, index) => referenciasInCSV.indexOf(item) !== index);
      
      if (duplicatesInCSV.length > 0) {
        const uniqueDuplicates = [...new Set(duplicatesInCSV)];
        throw new Error(
          `Referencias duplicadas en el archivo:\n${uniqueDuplicates.join('\n')}\n\nCada referencia debe aparecer solo una vez en el archivo.`
        );
      }

      // Check for existing references in the database
      const { data: existingRefs, error: checkError } = await supabase
        .from("references")
        .select("referencia")
        .in("referencia", referenciasInCSV);

      if (checkError) {
        console.error("Error checking existing references:", checkError);
        throw checkError;
      }

      if (existingRefs && existingRefs.length > 0) {
        const existingRefNames = existingRefs.map(r => r.referencia);
        throw new Error(
          `Las siguientes referencias ya existen en la base de datos:\n${existingRefNames.join('\n')}\n\nPor favor, elimine estas referencias del archivo o elimínelas de la base de datos primero.`
        );
      }

      const { data: insertedData, error } = await supabase
        .from("references")
        .insert(references)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Insert successful:", insertedData);

      // Save to import history
      await supabase.from("import_history").insert({
        file_name: file.name,
        records_count: references.length,
        status: 'success',
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Show success message
      toast({
        title: "✅ Importación exitosa",
        description: `Se importaron ${references.length} referencias correctamente.`,
        duration: 3000,
      });

      // Reload page after showing the toast
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error importing CSV:", error);
      
      // Save error to import history
      if (file) {
        await supabase.from("import_history").insert({
          file_name: file.name,
          records_count: 0,
          status: 'error',
          error_message: error?.message || "Error desconocido",
        });
      }
      
      // Reset input on error too
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "❌ Error al importar",
        description: error?.message || "Hubo un problema al importar el archivo CSV.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">GanttFlow</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant={location.pathname === '/' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => navigate('/')}
            >
              <BarChart3 className="h-4 w-4" />
              Gantt
            </Button>
            <Button
              variant={location.pathname === '/calendar' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => navigate('/calendar')}
            >
              <Calendar className="h-4 w-4" />
              Calendario
            </Button>
            <Button
              variant={location.pathname === '/cards' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => navigate('/cards')}
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <ImportHistoryDialog />
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2" 
              onClick={handleImportClick}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Importar CSV
                </>
              )}
            </Button>
            <NewReferenceDialog />
          </div>
        </div>
      </header>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Formato del archivo CSV</DialogTitle>
            <DialogDescription>
              El archivo debe contener las siguientes columnas:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="border border-border rounded-md p-4">
              <h4 className="font-semibold text-sm mb-2">Columnas requeridas:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><span className="font-medium text-foreground">referencia</span> - Código de referencia</li>
                <li><span className="font-medium text-foreground">cantidad</span> - Cantidad numérica</li>
                <li>
                  <span className="font-medium text-foreground">curva</span> - Tallas (valores válidos: XS-S-M-L-XL, S-M-L-XL, S-M-L, XS-S-M-L, XL-XXL-XXXL, XL-XXL-3XL, 28-30-32-34-36, 28-30-32-34-36-40, 06-08-10-12, 06-08-10-12-14, 14-16-18-20, 14-16-18-20-22, ONE-SIZE, M-L-XL-XXL)
                </li>
              </ul>
            </div>
            
            <div className="border border-border rounded-md p-4">
              <h4 className="font-semibold text-sm mb-2">Columnas opcionales:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><span className="font-medium text-foreground">color</span> - Color del producto</li>
                <li><span className="font-medium text-foreground">cantidad_colores</span> - Número de colores</li>
                <li><span className="font-medium text-foreground">lanzamiento_capsula</span> - Fecha (YYYY-MM-DD)</li>
                <li><span className="font-medium text-foreground">ingreso_a_bodega</span> - Fecha (YYYY-MM-DD)</li>
                <li><span className="font-medium text-foreground">fecha_desbloqueo</span> - Fecha (YYYY-MM-DD)</li>
                <li><span className="font-medium text-foreground">imagen_url</span> - URL de la imagen</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleProceedToFileSelect}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;