import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

interface CustomPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
    showText?: boolean;
}

const CustomPagination = ({
    currentPage,
    totalPages,
    onPageChange,
    className,
    showText = true,
}: CustomPaginationProps) => {
    if (totalPages <= 1) return null;

    return (
        <Pagination className={className}>
            <PaginationContent>
                {/* Previous Button */}
                <PaginationItem>
                    <PaginationPrevious
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        className={`
              cursor-pointer select-none transition-all duration-200
              ${currentPage === 1 ? "opacity-50 pointer-events-none" : "hover:bg-primary/5 hover:text-primary"}
            `}
                    >
                        {showText ? "Anterior" : ""}
                    </PaginationPrevious>
                </PaginationItem>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and surrounding pages
                    if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                        return (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    onClick={() => onPageChange(page)}
                                    isActive={currentPage === page}
                                    className={`
                    cursor-pointer select-none
                    ${currentPage === page
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-md shadow-indigo-500/20"
                                            : "hover:bg-primary/5 hover:text-primary"
                                        }
                  `}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        );
                    } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                    ) {
                        return (
                            <PaginationItem key={page}>
                                <PaginationEllipsis className="text-muted-foreground/50" />
                            </PaginationItem>
                        );
                    }
                    return null;
                })}

                {/* Next Button */}
                <PaginationItem>
                    <PaginationNext
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        className={`
              cursor-pointer select-none transition-all duration-200
              ${currentPage === totalPages ? "opacity-50 pointer-events-none" : "hover:bg-primary/5 hover:text-primary"}
            `}
                    >
                        {showText ? "Siguiente" : ""}
                    </PaginationNext>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
};

export default CustomPagination;
