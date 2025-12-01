import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LaunchDateProvider } from "@/contexts/LaunchDateContext";
import Header from "@/components/Header";

interface Reference {
  id: string;
  referencia: string;
  lanzamiento_capsula: string | null;
  color: string | null;
  curva: string;
}

const CalendarViewContent = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferences();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("references_calendar_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "references" },
        () => {
          fetchReferences();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("references")
        .select("id, referencia, lanzamiento_capsula, color, curva")
        .not("lanzamiento_capsula", "is", null)
        .order("lanzamiento_capsula", { ascending: true });

      if (error) throw error;
      setReferences(data || []);
    } catch (error) {
      console.error("Error fetching references:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las referencias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getReferencesForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return references.filter((ref) => ref.lanzamiento_capsula === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Generate calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-lg border border-border p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground capitalize flex items-center gap-2">
              <CalendarIcon className="h-6 w-6" />
              {monthName}
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              Cargando calendario...
            </div>
          ) : (
            <>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Week day headers */}
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="min-h-24" />;
                  }

                  const date = new Date(year, month, day);
                  const dayReferences = getReferencesForDate(date);
                  const isTodayDate = isToday(day);

                  return (
                    <div
                      key={day}
                      className={`
                        min-h-24 p-2 border border-border rounded-lg
                        ${isTodayDate ? "bg-primary/10 border-primary" : "bg-card"}
                        hover:bg-muted/50 transition-colors
                      `}
                    >
                      <div
                        className={`
                          text-sm font-medium mb-1
                          ${isTodayDate ? "text-primary font-bold" : "text-foreground"}
                        `}
                      >
                        {day}
                      </div>
                      
                      {/* References for this day */}
                      <div className="space-y-1">
                        {dayReferences.slice(0, 3).map((ref) => (
                          <div
                            key={ref.id}
                            className="text-xs px-2 py-1 bg-primary/20 text-primary rounded truncate"
                            title={ref.referencia}
                          >
                            {ref.referencia}
                          </div>
                        ))}
                        {dayReferences.length > 3 && (
                          <div className="text-xs text-muted-foreground px-2">
                            +{dayReferences.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Total de referencias con fecha de lanzamiento: {references.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary/20 rounded"></div>
                    <span className="text-sm text-muted-foreground">Referencias programadas</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CalendarView = () => {
  return (
    <LaunchDateProvider>
      <CalendarViewContent />
    </LaunchDateProvider>
  );
};

export default CalendarView;
