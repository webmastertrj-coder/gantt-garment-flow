import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, CheckCircle2, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ImportRecord {
  id: string;
  file_name: string;
  records_count: number;
  status: 'success' | 'error';
  error_message: string | null;
  created_at: string;
}

const ImportHistoryDialog = () => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("import_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []) as ImportRecord[]);
    } catch (error) {
      console.error("Error fetching import history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Historial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial de Importaciones</DialogTitle>
          <DialogDescription>
            Registro de archivos CSV importados al sistema
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay importaciones registradas
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="border border-border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {record.status === 'success' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                        <p className="font-medium text-sm truncate">
                          {record.file_name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.created_at), "PPpp", { locale: es })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {record.status === 'success' ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">
                          {record.records_count} registros
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Error
                        </Badge>
                      )}
                    </div>
                  </div>
                  {record.error_message && (
                    <div className="bg-destructive/10 text-destructive text-xs p-2 rounded border border-destructive/20">
                      <strong>Error:</strong> {record.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ImportHistoryDialog;
