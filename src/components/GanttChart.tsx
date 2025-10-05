import { useState } from "react";

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
  const [hoveredItem, setHoveredItem] = useState<GanttItem | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPosition = timeline.length > 0 ? calculatePosition(today) : 0;

  const handleMouseEnter = (item: GanttItem, e: React.MouseEvent) => {
    setHoveredItem(item);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredItem) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const calculateDuration = (start: Date, end: Date) => {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

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
          <div 
            className="relative min-h-[200px] bg-gantt-background rounded border border-border p-4"
            onMouseMove={handleMouseMove}
          >
            {displayItems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay referencias con fechas configuradas
              </div>
            ) : (
              <>
                {/* Today line */}
                {todayPosition >= 0 && todayPosition <= 100 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10 pointer-events-none"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {displayItems.map((item) => {
                    const startPos = calculatePosition(item.start);
                    const endPos = calculatePosition(item.end);
                    const width = endPos - startPos;
                    
                    return (
                      <div key={item.id} className="relative h-8">
                        <div 
                          className="absolute h-full bg-gantt-primary rounded-sm shadow-sm flex items-center justify-between px-2 cursor-pointer hover:bg-gantt-primary/80 transition-colors"
                          style={{
                            left: `${startPos}%`,
                            width: `${width}%`
                          }}
                          onMouseEnter={(e) => handleMouseEnter(item, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <span className="text-xs font-medium text-primary-foreground truncate">
                            {item.id}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gantt-primary rounded-sm"></div>
              <span>Tiempo hasta Lanzamiento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-3 bg-yellow-500"></div>
              <span>Hoy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredItem && (
        <div 
          className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-4 pointer-events-none"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y + 10}px`,
          }}
        >
          <div className="font-semibold text-foreground mb-2">{hoveredItem.id}</div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Ingreso: {formatDate(hoveredItem.start)}</div>
            <div>Lanzamiento: {formatDate(hoveredItem.end)}</div>
            <div>Duración: {calculateDuration(hoveredItem.start, hoveredItem.end)} día(s)</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;