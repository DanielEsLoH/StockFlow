import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardDivider,
} from './Card';
import { createRef } from 'react';

describe('Card', () => {
  describe('rendering', () => {
    it('should render children correctly', () => {
      render(<Card>Card content</Card>);

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render as a div element', () => {
      render(<Card data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.tagName).toBe('DIV');
    });

    it('should forward ref correctly', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should pass additional props', () => {
      render(<Card data-testid="custom" role="article">Content</Card>);

      const card = screen.getByTestId('custom');
      expect(card).toHaveAttribute('role', 'article');
    });
  });

  describe('variants', () => {
    it('should render default variant', () => {
      render(<Card data-testid="card">Default</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('border');
    });

    it('should render elevated variant', () => {
      render(<Card variant="elevated" data-testid="card">Elevated</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('shadow-lg');
    });

    it('should render outlined variant', () => {
      render(<Card variant="outlined" data-testid="card">Outlined</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('bg-transparent');
      expect(card.className).toContain('border-2');
    });

    it('should render glass variant', () => {
      render(<Card variant="glass" data-testid="card">Glass</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('backdrop-blur-xl');
    });
  });

  describe('padding', () => {
    it('should render md padding by default', () => {
      render(<Card data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('p-6');
    });

    it('should render no padding', () => {
      render(<Card padding="none" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('p-0');
    });

    it('should render sm padding', () => {
      render(<Card padding="sm" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('p-4');
    });

    it('should render lg padding', () => {
      render(<Card padding="lg" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('p-8');
    });
  });

  describe('hover effects', () => {
    it('should have no hover effect by default', () => {
      render(<Card data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).not.toContain('hover:-translate-y');
      expect(card.className).not.toContain('hover:shadow-lg');
    });

    it('should render lift hover effect', () => {
      render(<Card hover="lift" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('hover:-translate-y-1');
      expect(card.className).toContain('hover:shadow-xl');
    });

    it('should render glow hover effect', () => {
      render(<Card hover="glow" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('hover:shadow-lg');
      expect(card.className).toContain('hover:shadow-primary-500/10');
    });

    it('should render border hover effect', () => {
      render(<Card hover="border" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('hover:border-primary-300');
    });
  });

  describe('custom className', () => {
    it('should merge custom className with variants', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('custom-class');
      expect(card.className).toContain('rounded-2xl');
    });
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header Content</CardHeader>);

    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('should apply flex layout with justify-between', () => {
    render(<CardHeader data-testid="header">Content</CardHeader>);

    const header = screen.getByTestId('header');
    expect(header.className).toContain('flex');
    expect(header.className).toContain('items-start');
    expect(header.className).toContain('justify-between');
  });

  it('should apply gap between children', () => {
    render(<CardHeader data-testid="header">Content</CardHeader>);

    const header = screen.getByTestId('header');
    expect(header.className).toContain('gap-4');
  });

  it('should forward ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardHeader ref={ref}>Content</CardHeader>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should accept custom className', () => {
    render(<CardHeader className="custom-header" data-testid="header">Content</CardHeader>);

    expect(screen.getByTestId('header')).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('should render as h3 by default', () => {
    render(<CardTitle>Title</CardTitle>);

    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('should render as custom heading level', () => {
    render(<CardTitle as="h1">Title</CardTitle>);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('should render as h2', () => {
    render(<CardTitle as="h2">Title</CardTitle>);

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('should apply typography styles', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);

    const title = screen.getByTestId('title');
    expect(title.className).toContain('text-lg');
    expect(title.className).toContain('font-semibold');
  });

  it('should forward ref correctly', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<CardTitle ref={ref}>Title</CardTitle>);

    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('should accept custom className', () => {
    render(<CardTitle className="custom-title" data-testid="title">Title</CardTitle>);

    expect(screen.getByTestId('title')).toHaveClass('custom-title');
  });
});

describe('CardDescription', () => {
  it('should render children', () => {
    render(<CardDescription>Description text</CardDescription>);

    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('should render as paragraph element', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);

    const desc = screen.getByTestId('desc');
    expect(desc.tagName).toBe('P');
  });

  it('should apply muted text styles', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);

    const desc = screen.getByTestId('desc');
    expect(desc.className).toContain('text-sm');
    expect(desc.className).toContain('text-neutral-500');
  });

  it('should forward ref correctly', () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<CardDescription ref={ref}>Description</CardDescription>);

    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it('should accept custom className', () => {
    render(<CardDescription className="custom-desc" data-testid="desc">Text</CardDescription>);

    expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
  });
});

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Content here</CardContent>);

    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('should render as div element', () => {
    render(<CardContent data-testid="content">Content</CardContent>);

    const content = screen.getByTestId('content');
    expect(content.tagName).toBe('DIV');
  });

  it('should forward ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardContent ref={ref}>Content</CardContent>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should accept custom className', () => {
    render(<CardContent className="custom-content" data-testid="content">Content</CardContent>);

    expect(screen.getByTestId('content')).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter>Footer content</CardFooter>);

    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should render as div element', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);

    const footer = screen.getByTestId('footer');
    expect(footer.tagName).toBe('DIV');
  });

  it('should apply flex and alignment styles', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);

    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
  });

  it('should apply top padding', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);

    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('pt-4');
  });

  it('should forward ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardFooter ref={ref}>Footer</CardFooter>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should accept custom className', () => {
    render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>);

    expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
  });
});

describe('Card composition', () => {
  it('should compose all subcomponents correctly', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle data-testid="title">Card Title</CardTitle>
          <CardDescription data-testid="description">Card description text</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">
          Main content goes here
        </CardContent>
        <CardFooter data-testid="footer">
          Footer actions
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('Card Title');
    expect(screen.getByTestId('description')).toHaveTextContent('Card description text');
    expect(screen.getByTestId('content')).toHaveTextContent('Main content goes here');
    expect(screen.getByTestId('footer')).toHaveTextContent('Footer actions');
  });

  it('should allow partial composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Simple Card</CardTitle>
        </CardHeader>
        <CardContent>Just content, no footer</CardContent>
      </Card>
    );

    expect(screen.getByText('Simple Card')).toBeInTheDocument();
    expect(screen.getByText('Just content, no footer')).toBeInTheDocument();
  });
});

describe('CardDivider', () => {
  it('should render as a div element', () => {
    render(<CardDivider data-testid="divider" />);

    const divider = screen.getByTestId('divider');
    expect(divider.tagName).toBe('DIV');
  });

  it('should apply gradient background styles', () => {
    render(<CardDivider data-testid="divider" />);

    const divider = screen.getByTestId('divider');
    expect(divider).toHaveClass('bg-gradient-to-r');
    expect(divider).toHaveClass('from-transparent');
    expect(divider).toHaveClass('via-neutral-200');
    expect(divider).toHaveClass('to-transparent');
  });

  it('should have 1px height', () => {
    render(<CardDivider data-testid="divider" />);

    const divider = screen.getByTestId('divider');
    expect(divider).toHaveClass('h-px');
  });

  it('should have vertical margin', () => {
    render(<CardDivider data-testid="divider" />);

    const divider = screen.getByTestId('divider');
    expect(divider).toHaveClass('my-4');
  });

  it('should forward ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardDivider ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should accept custom className', () => {
    render(<CardDivider className="custom-divider" data-testid="divider" />);

    expect(screen.getByTestId('divider')).toHaveClass('custom-divider');
  });
});

describe('Card additional variants', () => {
  it('should render glass-elevated variant', () => {
    render(<Card variant="glass-elevated" data-testid="card">Glass Elevated</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('backdrop-blur-xl');
    expect(card.className).toContain('shadow-xl');
  });

  it('should render gradient-border variant', () => {
    render(<Card variant="gradient-border" data-testid="card">Gradient Border</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-gradient-to-br');
    expect(card.className).toContain('from-primary-500');
  });

  it('should render soft variant', () => {
    render(<Card variant="soft" data-testid="card">Soft</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-neutral-50');
  });

  it('should render soft-primary variant', () => {
    render(<Card variant="soft-primary" data-testid="card">Soft Primary</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-primary-50/50');
  });

  it('should render soft-success variant', () => {
    render(<Card variant="soft-success" data-testid="card">Soft Success</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-success-50/50');
  });

  it('should render soft-warning variant', () => {
    render(<Card variant="soft-warning" data-testid="card">Soft Warning</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-warning-50/50');
  });

  it('should render soft-error variant', () => {
    render(<Card variant="soft-error" data-testid="card">Soft Error</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-error-50/50');
  });
});

describe('Card additional padding sizes', () => {
  it('should render xs padding', () => {
    render(<Card padding="xs" data-testid="card">Content</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('p-3');
  });

  it('should render xl padding', () => {
    render(<Card padding="xl" data-testid="card">Content</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('p-10');
  });
});

describe('Card additional hover effects', () => {
  it('should render glow-accent hover effect', () => {
    render(<Card hover="glow-accent" data-testid="card">Content</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('hover:shadow-accent-500/10');
  });

  it('should render scale hover effect', () => {
    render(<Card hover="scale" data-testid="card">Content</Card>);

    const card = screen.getByTestId('card');
    expect(card.className).toContain('hover:scale-[1.02]');
    expect(card.className).toContain('active:scale-[0.98]');
  });
});

describe('CardHeader action prop', () => {
  it('should render action slot when provided', () => {
    render(
      <CardHeader action={<button data-testid="action-btn">Action</button>}>
        Header Content
      </CardHeader>
    );

    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('should not render action container when action is not provided', () => {
    const { container } = render(
      <CardHeader data-testid="header">Header Content</CardHeader>
    );

    const header = screen.getByTestId('header');
    // Should have only one child div (the content wrapper)
    expect(header.children.length).toBe(1);
  });
});

describe('CardTitle gradient prop', () => {
  it('should apply gradient styles when gradient is true', () => {
    render(<CardTitle gradient data-testid="title">Gradient Title</CardTitle>);

    const title = screen.getByTestId('title');
    expect(title).toHaveClass('bg-gradient-to-r');
    expect(title).toHaveClass('bg-clip-text');
    expect(title).toHaveClass('text-transparent');
  });

  it('should not apply gradient styles when gradient is false', () => {
    render(<CardTitle data-testid="title">Normal Title</CardTitle>);

    const title = screen.getByTestId('title');
    expect(title).not.toHaveClass('bg-gradient-to-r');
    expect(title).toHaveClass('text-neutral-900');
  });
});

describe('CardFooter divider prop', () => {
  it('should render border when divider is true', () => {
    render(<CardFooter divider data-testid="footer">Footer</CardFooter>);

    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('mt-4');
  });

  it('should not render border when divider is false', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);

    const footer = screen.getByTestId('footer');
    expect(footer).not.toHaveClass('border-t');
    expect(footer).not.toHaveClass('mt-4');
  });
});

describe('CardTitle heading levels', () => {
  it('should render as h4', () => {
    render(<CardTitle as="h4">H4 Title</CardTitle>);

    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });

  it('should render as h5', () => {
    render(<CardTitle as="h5">H5 Title</CardTitle>);

    expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
  });

  it('should render as h6', () => {
    render(<CardTitle as="h6">H6 Title</CardTitle>);

    expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
  });
});