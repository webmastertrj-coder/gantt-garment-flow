import { useEffect, useState } from "react";
import Header from "@/components/Header";
import GanttChart from "@/components/GanttChart";
import ReferenceTable from "@/components/ReferenceTable";
import { LaunchDateProvider, useLaunchDate } from "@/contexts/LaunchDateContext";
import { supabase } from "@/integrations/supabase/client";

interface Reference {
  id: string;
  referencia: string;
  fecha_desbloqueo: string | null;
  lanzamiento_capsula: string | null;
  dias_desbloqueado: number;
}

const IndexContent = () => {
  const [ganttItems, setGanttItems] = useState<Array<{
    id: string;
    start: Date;
    end: Date;
    progress: number;
  }>>([]);
  const { launchDate } = useLaunchDate();

  useEffect(() => {
    fetchReferences();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('gantt-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'references'
        },
        () => {
          fetchReferences();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [launchDate]);

  const fetchReferences = async () => {
    const { data, error } = await supabase
      .from('references')
      .select('id, referencia, lanzamiento_capsula, ingreso_a_bodega')
      .order('lanzamiento_capsula', { ascending: true });

    if (error) {
      console.error('Error fetching references:', error);
      return;
    }

    if (data) {
      const items = data
        .filter(ref => ref.lanzamiento_capsula && ref.ingreso_a_bodega)
        .map(ref => {
          const parseDate = (s?: string | null) => {
            if (!s) return null;
            const [y, m, d] = s.split('-').map(Number);
            if (!y || !m || !d) return null;
            return new Date(y, m - 1, d);
          };

          const launchDate = parseDate(ref.lanzamiento_capsula);
          const ingresoDate = parseDate(ref.ingreso_a_bodega);
          
          if (!launchDate || !ingresoDate) return null;

          // Start: Ingreso a bodega, End: Lanzamiento capsula
          const startDate = new Date(ingresoDate);
          const endDate = new Date(launchDate);
          
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);

          // Calculate progress (how many days have passed from ingreso to today)
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const progress = totalDays > 0 ? Math.max(0, Math.min(100, (daysPassed / totalDays) * 100)) : 0;

          return {
            id: ref.referencia,
            start: startDate,
            end: endDate,
            progress: Math.round(progress)
          };
        })
        .filter(item => item !== null);

      setGanttItems(items as any);
    }
  };

  return (
    <div className="min-h-screen bg-gantt-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <GanttChart items={ganttItems} />
        <ReferenceTable />
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <LaunchDateProvider>
      <IndexContent />
    </LaunchDateProvider>
  );
};

export default Index;
