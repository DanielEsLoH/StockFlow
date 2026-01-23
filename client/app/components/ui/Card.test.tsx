import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
      expect(card.className).toContain('hover:border-primary-500');
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

  it('should apply flex column layout', () => {
    render(<CardHeader data-testid="header">Content</CardHeader>);

    const header = screen.getByTestId('header');
    expect(header.className).toContain('flex');
    expect(header.className).toContain('flex-col');
  });

  it('should apply spacing between children', () => {
    render(<CardHeader data-testid="header">Content</CardHeader>);

    const header = screen.getByTestId('header');
    expect(header.className).toContain('space-y-1.5');
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