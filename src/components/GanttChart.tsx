import { useEffect, useRef } from "react";

interface GanttItem {
  id: string;
  start: Date;
  end: Date;
  progress: number;
}

interface GanttChartProps {
  items: GanttItem[];
}

const GanttChart = ({ items }: GanttChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  // Generate timeline dates based on actual data
  const generateTimeline = () => {
    if (items.length === 0) {
      // Default timeline if no items
      const dates = [];
      const startDate = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dates.push(date);
      }
      return dates;
    }

    // Find min and max dates from items
    let minDate = new Date(items[0].start);
    let maxDate = new Date(items[0].end);

    items.forEach(item => {
      if (item.start < minDate) minDate = new Date(item.start);
      if (item.end > maxDate) maxDate = new Date(item.end);
    });

    // Add buffer days
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);

    const dates = [];
    const currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const timeline = generateTimeline();
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      month: 'short', 
      day: 'numeric' 
    }).replace('.', '');
  };

  const calculatePosition = (date: Date) => {
    const startDate = timeline[0];
    const endDate = timeline[timeline.length - 1];
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  };

  const displayItems = items.length > 0 ? items : [];

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Resumen de la Cronología
      </h2>
      
      <div className="space-y-6">
        {/* Timeline */}
        <div className="relative">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            {timeline.length > 0 && timeline.filter((_, i) => {
              const step = Math.max(1, Math.floor(timeline.length / 5));
              return i % step === 0 || i === timeline.length - 1;
            }).map((date, i) => (
              <span key={i}>{formatDate(date)}</span>
            ))}
          </div>
          
          {/* Gantt bars */}
          <div className="relative min-h-[200px] bg-gantt-background rounded border border-border p-4">
            {displayItems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay referencias con fechas configuradas
              </div>
            ) : (
              <div className="space-y-3">
                {displayItems.map((item, index) => {
                  const startPos = calculatePosition(item.start);
                  const endPos = calculatePosition(item.end);
                  const width = endPos - startPos;
                  
                  return (
                    <div key={item.id} className="relative h-8">
                      <div 
                        className="absolute h-full bg-gantt-primary rounded-sm shadow-sm flex items-center justify-between px-2"
                        style={{
                          left: `${startPos}%`,
                          width: `${width}%`
                        }}
                      >
                        <span className="text-xs font-medium text-primary-foreground truncate">
                          {item.id}
                        </span>
                        <span className="text-xs text-primary-foreground/80">
                          {item.progress}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gantt-primary rounded-sm"></div>
              <span>Período de 21 días hasta desbloqueo</span>
            </div>
            <div className="text-muted-foreground/70">
              Inicio: Fecha de lanzamiento/ingreso | Fin: Fecha de desbloqueo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;