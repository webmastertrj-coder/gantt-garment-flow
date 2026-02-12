import { useState } from "react";
import { Search, Phone, Globe, MapPin, Star, Loader2, Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import * as XLSX from "xlsx";

interface Lead {
  name: string;
  address: string;
  phone: string | null;
  whatsappLink: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number;
  googleMapsUrl: string | null;
  status: string;
}

const LeadsSearch = () => {
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!city.trim() || !query.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Ingresa la ciudad y el tipo de negocio.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-leads", {
        body: { city: city.trim(), query: query.trim() },
      });

      if (error) throw error;

      setResults(data.results || []);

      toast({
        title: `${data.total || 0} resultados encontrados`,
        description: `Búsqueda: "${query}" en ${city}`,
      });
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Error en la búsqueda",
        description: error.message || "No se pudieron obtener los resultados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;

    const exportData = results.map((lead) => ({
      Nombre: lead.name,
      Dirección: lead.address,
      Teléfono: lead.phone || "",
      "Enlace WhatsApp": lead.whatsappLink || "",
      "Sitio Web": lead.website || "",
      Rating: lead.rating || "",
      "Cantidad Reseñas": lead.ratingCount,
      "Google Maps": lead.googleMapsUrl || "",
      Estado: lead.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads_${city}_${query}_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({ title: "Exportado", description: `${results.length} leads exportados a Excel.` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Buscador de Leads
            </CardTitle>
            <CardDescription>
              Busca tiendas físicas por ciudad para encontrar clientes potenciales con teléfono o sitio web.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Ciudad (ej: Bogotá, Medellín)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Input
                placeholder="Tipo de negocio (ej: tiendas de ropa, boutiques)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading} className="gap-2 primary-gradient">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasSearched && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{results.length} resultados</CardTitle>
                <CardDescription>Tiendas con teléfono o sitio web</CardDescription>
              </div>
              {results.length > 0 && (
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron resultados con teléfono o sitio web.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Web</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((lead, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {lead.name}
                              {lead.googleMapsUrl && (
                                <a href={lead.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {lead.address}
                          </TableCell>
                          <TableCell>
                            {lead.phone ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{lead.phone}</span>
                                {lead.whatsappLink && (
                                  <a href={lead.whatsappLink} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-4 w-4 text-green-600 hover:text-green-500" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {lead.website ? (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm flex items-center gap-1"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                Ver sitio
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {lead.rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm">{lead.rating}</span>
                                <span className="text-muted-foreground text-xs">({lead.ratingCount})</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={lead.status === "Abierto" ? "default" : "secondary"} className="text-xs">
                              {lead.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default LeadsSearch;
