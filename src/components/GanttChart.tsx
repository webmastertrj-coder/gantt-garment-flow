import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface GanttItem {
  id: string;
  start: Date;
  end: Date;
  progress: number;
}

interface GanttChartProps {
  items: GanttItem[];
  launchDate?: Date;
}

const ITEMS_PER_PAGE = 15;

const GanttChart = ({ items, launchDate }: GanttChartProps) => {
  const [hoveredItem, setHoveredItem] = useState<GanttItem | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = useState(1);

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

  const calculatePosition = (date: Date | undefined) => {
    if (!date || !timeline[0] || !timeline[timeline.length - 1]) return 0;
    const startDate = timeline[0];
    const endDate = timeline[timeline.length - 1];
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  };

  // Pagination logic
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayItems = items.length > 0 ? items.slice(startIndex, endIndex) : [];
  
  const launchDateNormalized = launchDate ? new Date(launchDate) : null;
  if (launchDateNormalized) {
    launchDateNormalized.setHours(0, 0, 0, 0);
  }
  const launchPosition = launchDateNormalized && timeline.length > 0 ? calculatePosition(launchDateNormalized) : -1;

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
        {displayItems.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground bg-gantt-background rounded border border-border">
            No hay referencias con fechas configuradas
          </div>
        ) : (
          <div className="relative">
            {/* Gantt chart with labels on left */}
            <div className="flex gap-4">
              {/* Reference names column */}
              <div className="w-32 flex-shrink-0 space-y-3 pt-8">
                {displayItems.map((item) => (
                  <div key={item.id} className="h-8 flex items-center">
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.id}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Chart area */}
              <div className="flex-1">
                {/* Gantt bars */}
                <div 
                  className="relative min-h-[200px] bg-gantt-background rounded border border-border p-4"
                  onMouseMove={handleMouseMove}
                >
                  {/* Launch date line */}
                  {launchPosition >= 0 && launchPosition <= 100 && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10 pointer-events-none"
                      style={{ left: `${launchPosition}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-500 rounded-full"></div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {displayItems.map((item) => {
                      if (!item.start || !item.end) return null;
                      
                      const startPos = calculatePosition(item.start);
                      const endPos = calculatePosition(item.end);
                      const width = endPos - startPos;
                      
                      return (
                        <div key={item.id} className="relative h-8">
                          <div 
                            className="absolute h-full bg-gantt-primary rounded-sm shadow-sm cursor-pointer hover:bg-gantt-primary/80 transition-colors"
                            style={{
                              left: `${startPos}%`,
                              width: `${width}%`
                            }}
                            onMouseEnter={(e) => handleMouseEnter(item, e)}
                            onMouseLeave={handleMouseLeave}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Timeline at bottom */}
                <div className="flex justify-between text-xs text-muted-foreground mt-2 px-4">
                  {timeline.length > 0 && timeline.filter((_, i) => {
                    const step = Math.max(1, Math.floor(timeline.length / 5));
                    return i % step === 0 || i === timeline.length - 1;
                  }).map((date, i) => (
                    <span key={i}>{formatDate(date)}</span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gantt-primary rounded-sm"></div>
                <span>Tiempo hasta Lanzamiento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3 bg-yellow-500"></div>
                <span>Fecha de Lanzamiento</span>
              </div>
            </div>

            {/* Pagination */}
            {items.length > ITEMS_PER_PAGE && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, items.length)} de {items.length} referencias
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
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