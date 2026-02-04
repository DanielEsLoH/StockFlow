import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "./Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): (number | "ellipsis")[] {
  const totalNumbers = siblingCount * 2 + 3;
  const totalBlocks = totalNumbers + 2;

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "ellipsis", totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1,
    );
    return [1, "ellipsis", ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  );
  return [1, "ellipsis", ...middleRange, "ellipsis", totalPages];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const paginationRange = generatePaginationRange(
    currentPage,
    totalPages,
    siblingCount,
  );

  if (totalPages <= 1) {
    return null;
  }

  const onPrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const onNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Paginacion"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {/* Previous button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onPrevious}
        disabled={currentPage === 1}
        aria-label="Pagina anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {paginationRange.map((pageNumber, index) => {
          if (pageNumber === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex h-8 w-8 items-center justify-center text-neutral-400"
                aria-hidden
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }

          return (
            <Button
              key={pageNumber}
              variant={currentPage === pageNumber ? "primary" : "ghost"}
              size="icon-sm"
              onClick={() => onPageChange(pageNumber)}
              aria-label={`Pagina ${pageNumber}`}
              aria-current={currentPage === pageNumber ? "page" : undefined}
            >
              {pageNumber}
            </Button>
          );
        })}
      </div>

      {/* Next button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onNext}
        disabled={currentPage === totalPages}
        aria-label="Pagina siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

// Pagination info component
interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className,
}: PaginationInfoProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <p
      className={cn(
        "text-sm text-neutral-500 dark:text-neutral-400",
        className,
      )}
    >
      Mostrando <span className="font-medium">{start}</span> a{" "}
      <span className="font-medium">{end}</span> de{" "}
      <span className="font-medium">{totalItems}</span> resultados
    </p>
  );
}
