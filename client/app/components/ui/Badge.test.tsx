import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, StatusBadge } from './Badge';

describe('Badge', () => {
  describe('Basic Rendering', () => {
    it('should render badge with text content', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render as a span element', () => {
      render(<Badge data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.tagName).toBe('SPAN');
    });

    it('should have default styling classes', () => {
      render(<Badge data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      render(<Badge data-testid="badge">Default</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-neutral-100');
      expect(badge).toHaveClass('text-neutral-800');
    });

    it('should apply primary variant styles', () => {
      render(
        <Badge data-testid="badge" variant="primary">
          Primary
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-primary-100');
      expect(badge).toHaveClass('text-primary-800');
    });

    it('should apply secondary variant styles', () => {
      render(
        <Badge data-testid="badge" variant="secondary">
          Secondary
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-neutral-100');
      expect(badge).toHaveClass('text-neutral-600');
    });

    it('should apply success variant styles', () => {
      render(
        <Badge data-testid="badge" variant="success">
          Success
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-success-100');
      expect(badge).toHaveClass('text-success-800');
    });

    it('should apply warning variant styles', () => {
      render(
        <Badge data-testid="badge" variant="warning">
          Warning
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-warning-100');
      expect(badge).toHaveClass('text-warning-800');
    });

    it('should apply error variant styles', () => {
      render(
        <Badge data-testid="badge" variant="error">
          Error
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-error-100');
      expect(badge).toHaveClass('text-error-800');
    });

    it('should apply outline variant styles', () => {
      render(
        <Badge data-testid="badge" variant="outline">
          Outline
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('border-neutral-200');
    });
  });

  describe('Sizes', () => {
    it('should apply small size styles', () => {
      render(
        <Badge data-testid="badge" size="sm">
          Small
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-xs');
    });

    it('should apply medium size styles (default)', () => {
      render(
        <Badge data-testid="badge" size="md">
          Medium
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-0.5');
    });

    it('should apply large size styles', () => {
      render(
        <Badge data-testid="badge" size="lg">
          Large
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-sm');
    });
  });

  describe('Dot', () => {
    it('should render dot when dot prop is true', () => {
      const { container } = render(
        <Badge dot>
          With Dot
        </Badge>
      );

      // The dot is a span inside the badge
      const dots = container.querySelectorAll('span span');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should apply dot styles', () => {
      render(
        <Badge dot data-testid="badge">
          With Dot
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      const dot = badge.querySelector('span');
      expect(dot).toHaveClass('rounded-full');
      expect(dot).toHaveClass('h-1.5');
      expect(dot).toHaveClass('w-1.5');
    });

    it('should apply custom dot color', () => {
      render(
        <Badge dot dotColor="bg-red-500" data-testid="badge">
          Custom Dot
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      const dot = badge.querySelector('span');
      expect(dot).toHaveClass('bg-red-500');
    });

    it('should not render dot when dot prop is false or not provided', () => {
      render(
        <Badge data-testid="badge">
          No Dot
        </Badge>
      );

      const badge = screen.getByTestId('badge');
      // Should only have the text, no nested span for dot
      expect(badge.childElementCount).toBe(0);
    });
  });

  describe('Custom ClassName', () => {
    it('should accept custom className', () => {
      render(
        <Badge data-testid="badge" className="custom-class">
          Custom
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      render(
        <Badge data-testid="badge" className="ml-2">
          Custom
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('ml-2');
      expect(badge).toHaveClass('inline-flex');
    });
  });
});

describe('StatusBadge', () => {
  describe('ACTIVE Status', () => {
    it('should render with success variant and correct label', () => {
      render(<StatusBadge status="ACTIVE" data-testid="badge" />);
      const badge = screen.getByTestId('badge');

      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-success-100');
      expect(badge).toHaveClass('text-success-800');
    });
  });

  describe('INACTIVE Status', () => {
    it('should render with secondary variant and correct label', () => {
      render(<StatusBadge status="INACTIVE" data-testid="badge" />);
      const badge = screen.getByTestId('badge');

      expect(screen.getByText('Inactivo')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-neutral-100');
      expect(badge).toHaveClass('text-neutral-600');
    });
  });

  describe('DISCONTINUED Status', () => {
    it('should render with error variant and correct label', () => {
      render(<StatusBadge status="DISCONTINUED" data-testid="badge" />);
      const badge = screen.getByTestId('badge');

      expect(screen.getByText('Descontinuado')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-error-100');
      expect(badge).toHaveClass('text-error-800');
    });
  });

  describe('PAID Status', () => {
    it('should render with success variant and correct label', () => {
      render(<StatusBadge status="PAID" data-testid="badge" />);
      const badge = screen.getByTestId('badge');

      expect(screen.getByText('Pagada')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-success-100');
    });
  });

  describe('PENDING Status', () => {
    it('should render with warning variant and correct label', () => {
      render(<StatusBadge status="PENDING" data-testid="badge" />);
      const badge = screen.getByTestId('badge');

      expect(screen.getByText('Pendiente')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-warning-100');
      expect(badge).toHaveClass('text-warning-800');
    });
  });

  describe('OVERDUE Status', () => {
    it('should render with error variant and correct label', () => {
      render(<StatusBadge status="OVERDUE" data-testid="badge" />);
      const badge = screen.getByTestId('badge');

      expect(screen.getByText('Vencida')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-error-100');
    });
  });

  describe('CANCELLED Status', () => {
    it('should render with secondary variant and correct label', () => {
      render(<StatusBadge status="CANCELLED" data-testid="badge" />);
      const badge = screen.getByTestId('badge');

      expect(screen.getByText('Cancelada')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-neutral-100');
    });
  });

  describe('Custom ClassName', () => {
    it('should accept custom className', () => {
      render(
        <StatusBadge status="ACTIVE" data-testid="badge" className="custom-status" />
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('custom-status');
    });
  });

  describe('Unknown Status', () => {
    it('should fallback to default variant and use status as label for unknown status', () => {
      // Test the fallback branch when status is not in statusConfig
      const unknownStatus = 'UNKNOWN_STATUS' as 'ACTIVE';
      render(<StatusBadge status={unknownStatus} data-testid="badge" />);
      const badge = screen.getByTestId('badge');

      // Should display the raw status value as the label
      expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
      // Should apply default variant styles
      expect(badge).toHaveClass('bg-neutral-100');
      expect(badge).toHaveClass('text-neutral-800');
    });
  });
});