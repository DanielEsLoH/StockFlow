import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Home, { meta } from './home';

// Mock ThemeToggle
vi.mock('~/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

// Mock framer-motion to avoid SSR issues in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filterMotionProps = (props: Record<string, any>) => {
  const motionProps = ['initial', 'animate', 'transition', 'variants', 'whileHover', 'whileTap', 'whileInView', 'viewport'];
  return Object.fromEntries(Object.entries(props).filter(([key]) => !motionProps.includes(key)));
};

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <div {...filterMotionProps(props)}>{children}</div>;
    },
    section: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <section {...filterMotionProps(props)}>{children}</section>;
    },
    h2: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <h2 {...filterMotionProps(props)}>{children}</h2>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <p {...filterMotionProps(props)}>{children}</p>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <span {...filterMotionProps(props)}>{children}</span>;
    },
    a: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <a {...filterMotionProps(props)}>{children}</a>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('Home route', () => {
  function renderHome() {
    const routes = [
      {
        path: '/',
        element: <Home />,
      },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ['/'],
    });

    return render(<RouterProvider router={router} />);
  }

  describe('meta function', () => {
    it('returns correct title', () => {
      const result = meta();
      expect(result).toContainEqual({
        title: 'StockFlow - Sistema de Inventario y Facturación',
      });
    });

    it('returns correct description', () => {
      const result = meta();
      expect(result).toContainEqual({
        name: 'description',
        content:
          'Plataforma multi-tenant para PYMEs colombianas. Control total de inventario, facturación electrónica DIAN y reportes en tiempo real.',
      });
    });

    it('returns exactly 2 meta entries', () => {
      const result = meta();
      expect(result).toHaveLength(2);
    });
  });

  describe('component rendering', () => {
    it('renders the main heading', () => {
      renderHome();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        /Gestiona tu inventario de forma/i
      );
    });

    it('renders the StockFlow logo text', () => {
      renderHome();
      expect(screen.getAllByText('Stock').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Flow').length).toBeGreaterThan(0);
    });

    it('renders the description text', () => {
      renderHome();
      expect(
        screen.getByText(/Plataforma multi-tenant para PYMEs colombianas/i)
      ).toBeInTheDocument();
    });

    it('renders Iniciar Sesión link', () => {
      renderHome();
      const links = screen.getAllByRole('link', { name: /Iniciar Sesión/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/login');
    });

    it('renders Comenzar Gratis link', () => {
      renderHome();
      const links = screen.getAllByRole('link', { name: /Comenzar Gratis/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/register');
    });

    it('renders the ThemeToggle component', () => {
      renderHome();
      expect(screen.getAllByTestId('theme-toggle').length).toBeGreaterThan(0);
    });

    it('displays DIAN badge', () => {
      renderHome();
      expect(screen.getAllByText(/Facturación electrónica DIAN/i).length).toBeGreaterThan(0);
    });
  });

  describe('layout and structure', () => {
    it('renders main container', () => {
      renderHome();
      const container = screen.getByRole('heading', { level: 1 }).closest('div');
      expect(container).toBeInTheDocument();
    });

    it('renders navigation links', () => {
      renderHome();
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(2);
    });

    it('renders SVG icons', () => {
      renderHome();
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('navigation', () => {
    it('renders Características link', () => {
      renderHome();
      expect(screen.getAllByText('Características').length).toBeGreaterThan(0);
    });

    it('renders Tecnología link', () => {
      renderHome();
      expect(screen.getAllByText('Tecnología').length).toBeGreaterThan(0);
    });

    it('renders Precios link', () => {
      renderHome();
      expect(screen.getAllByText('Precios').length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('has proper heading hierarchy', () => {
      renderHome();
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('links have accessible names', () => {
      renderHome();
      const loginLinks = screen.getAllByRole('link', { name: /Iniciar Sesión/i });
      const registerLinks = screen.getAllByRole('link', { name: /Comenzar Gratis/i });

      expect(loginLinks[0]).toHaveAccessibleName();
      expect(registerLinks[0]).toHaveAccessibleName();
    });
  });
});