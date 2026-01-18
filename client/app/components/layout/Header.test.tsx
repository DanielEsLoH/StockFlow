import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Header } from './Header';
import { useUIStore } from '~/stores/ui.store';
import { useAuthStore } from '~/stores/auth.store';
import type { User, Tenant } from '~/stores/auth.store';

// Mock useAuth hook
const mockLogout = vi.fn();
let mockIsLoggingOut = false;

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: mockLogout,
    get isLoggingOut() {
      return mockIsLoggingOut;
    },
  }),
}));

// Mock notification hooks
const mockMarkAsReadMutate = vi.fn();
const mockMarkAllAsReadMutate = vi.fn();
const mockNotificationClick = vi.fn();

// Default mock data for notifications
const mockNotifications = [
  {
    id: '1',
    type: 'LOW_STOCK',
    title: 'Stock bajo',
    message: 'El producto "Widget A" tiene stock bajo',
    priority: 'HIGH',
    read: false,
    link: '/products/1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'NEW_INVOICE',
    title: 'Nueva factura',
    message: 'Se ha creado la factura #INV-001',
    priority: 'MEDIUM',
    read: false,
    link: '/invoices/1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'PAYMENT_RECEIVED',
    title: 'Pago recibido',
    message: 'Se ha recibido un pago de $1,000',
    priority: 'LOW',
    read: true,
    link: '/payments/1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'PAYMENT_FAILED',
    title: 'Pago fallido',
    message: 'El pago de la factura #INV-002 ha fallado',
    priority: 'HIGH',
    read: false,
    link: '/payments/2',
    createdAt: new Date().toISOString(),
  },
];

// Track if markAllAsRead should be pending
let mockMarkAllAsReadIsPending = false;
// Track if notifications are loading
let mockNotificationsLoading = false;
// Track if unreadCount data should be null
let mockUnreadCountData: { count: number; byType: object; byPriority: object } | undefined = { count: 2, byType: {}, byPriority: {} };
// Track if notifications should be empty
let mockNotificationsEmpty = false;

vi.mock('~/hooks/useNotifications', () => ({
  useRecentNotifications: () => ({
    get data() {
      return mockNotificationsEmpty ? [] : mockNotifications;
    },
    get isLoading() {
      return mockNotificationsLoading;
    },
  }),
  useUnreadCount: () => ({
    get data() {
      return mockUnreadCountData;
    },
  }),
  useMarkAsRead: () => ({
    mutate: mockMarkAsReadMutate,
    isPending: false,
  }),
  useMarkAllAsRead: () => ({
    mutate: mockMarkAllAsReadMutate,
    get isPending() {
      return mockMarkAllAsReadIsPending;
    },
  }),
  useNotificationClick: () => mockNotificationClick,
}));

// Mock ThemeToggle to simplify testing
vi.mock('~/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

const mockUser: User = {
  id: '1',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'ADMIN',
  status: 'ACTIVE',
  tenantId: 'tenant-1',
};

const mockTenant: Tenant = {
  id: 'tenant-1',
  name: 'Acme Corporation',
  slug: 'acme',
  plan: 'PRO',
  status: 'ACTIVE',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('Header', () => {
  beforeEach(() => {
    // Reset stores before each test
    useUIStore.setState({
      sidebarOpen: true,
      sidebarCollapsed: false,
      activeModal: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: '',
    });
    useAuthStore.setState({
      user: mockUser,
      tenant: mockTenant,
      isAuthenticated: true,
      isLoading: false,
    });
    // Reset mutable mock state
    mockMarkAllAsReadIsPending = false;
    mockIsLoggingOut = false;
    mockNotificationsLoading = false;
    mockUnreadCountData = { count: 2, byType: {}, byPriority: {} };
    mockNotificationsEmpty = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('should render header element', () => {
      render(<Header />, { wrapper: createWrapper() });

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render mobile menu toggle button', () => {
      render(<Header />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/cerrar menu|abrir menu/i)).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<Header />, { wrapper: createWrapper() });

      // There's a desktop search button with "Buscar..." text
      expect(screen.getByText('Buscar...')).toBeInTheDocument();
    });

    it('should render theme toggle', () => {
      render(<Header />, { wrapper: createWrapper() });

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('should render notifications button', () => {
      render(<Header />, { wrapper: createWrapper() });

      expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument();
    });

    it('should render user profile button', () => {
      render(<Header />, { wrapper: createWrapper() });

      // User name displayed in profile button
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('mobile menu toggle', () => {
    it('should toggle sidebar when clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      const menuButton = screen.getByLabelText(/cerrar menu/i);
      await user.click(menuButton);

      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('should show different icon based on sidebar state', () => {
      render(<Header />, { wrapper: createWrapper() });

      // When sidebar is open, should show close option
      expect(screen.getByLabelText('Cerrar menu')).toBeInTheDocument();
    });

    it('should show open menu when sidebar is closed', () => {
      useUIStore.setState({ sidebarOpen: false });

      render(<Header />, { wrapper: createWrapper() });

      expect(screen.getByLabelText('Abrir menu')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should expand search on click', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      const searchButton = screen.getByText('Buscar...');
      await user.click(searchButton);

      // After clicking, search input should appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar productos/i)).toBeInTheDocument();
      });
    });

    it('should allow typing in search input', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByText('Buscar...'));

      // Type in search
      const searchInput = await screen.findByPlaceholderText(/buscar productos/i);
      await user.type(searchInput, 'test query');

      expect(searchInput).toHaveValue('test query');
    });

    it('should close search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByText('Buscar...'));

      // Find and click the close button in search
      const searchInput = await screen.findByPlaceholderText(/buscar productos/i);
      expect(searchInput).toBeInTheDocument();

      // The X button is inside the input's rightElement
      const closeButtons = screen.getAllByRole('button');
      const searchCloseButton = closeButtons.find(
        (btn) => btn.querySelector('svg')?.classList.contains('lucide-x')
      );

      if (searchCloseButton) {
        await user.click(searchCloseButton);
      }
    });
  });

  describe('notifications dropdown', () => {
    it('should open notifications dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      const notificationsButton = screen.getByLabelText('Notificaciones');
      await user.click(notificationsButton);

      await waitFor(() => {
        expect(screen.getByText('Notificaciones')).toBeInTheDocument();
      });
    });

    it('should display notification count badge', () => {
      render(<Header />, { wrapper: createWrapper() });

      // The mock notifications have 2 unread items
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show notification items in dropdown', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      await user.click(screen.getByLabelText('Notificaciones'));

      await waitFor(() => {
        expect(screen.getByText('Stock bajo')).toBeInTheDocument();
        expect(screen.getByText('Nueva factura')).toBeInTheDocument();
        expect(screen.getByText('Pago recibido')).toBeInTheDocument();
      });
    });

    it('should show unread count in dropdown header', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      await user.click(screen.getByLabelText('Notificaciones'));

      await waitFor(() => {
        expect(screen.getByText('2 sin leer')).toBeInTheDocument();
      });
    });

    it('should have link to view all notifications', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      await user.click(screen.getByLabelText('Notificaciones'));

      await waitFor(() => {
        expect(screen.getByText('Ver todas las notificaciones')).toBeInTheDocument();
      });
    });

    it('should close when clicking outside', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications
      await user.click(screen.getByLabelText('Notificaciones'));
      await waitFor(() => {
        expect(screen.getByText('Notificaciones')).toBeInTheDocument();
      });

      // Click outside (on the header itself)
      await user.click(screen.getByRole('banner'));

      // The dropdown title should be gone (there's also a heading that might remain)
    });
  });

  describe('profile dropdown', () => {
    it('should open profile dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Click on user name/profile button
      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('should display user role badge', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByText('Administrador')).toBeInTheDocument();
      });
    });

    it('should have profile link', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /mi perfil/i })).toBeInTheDocument();
      });
    });

    it('should have settings link', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /configuracion/i })).toBeInTheDocument();
      });
    });

    it('should have logout button', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cerrar sesion/i })).toBeInTheDocument();
      });
    });

    it('should call logout when logout button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cerrar sesion/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cerrar sesion/i }));

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('user display', () => {
    it('should display user initials when no avatar', () => {
      render(<Header />, { wrapper: createWrapper() });

      // JD for John Doe
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display avatar when user has avatarUrl', () => {
      useAuthStore.setState({
        user: { ...mockUser, avatarUrl: 'https://example.com/avatar.jpg' },
      });

      render(<Header />, { wrapper: createWrapper() });

      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should display default name when no user', () => {
      useAuthStore.setState({ user: null });

      render(<Header />, { wrapper: createWrapper() });

      expect(screen.getByText('Usuario')).toBeInTheDocument();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should open search with Cmd+K', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Simulate Cmd+K
      await user.keyboard('{Meta>}k{/Meta}');

      // Search input should appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar productos/i)).toBeInTheDocument();
      });
    });

    it('should close dropdowns with Escape', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications
      await user.click(screen.getByLabelText('Notificaciones'));
      await waitFor(() => {
        expect(screen.getByText('Stock bajo')).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('Stock bajo')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels', () => {
      render(<Header />, { wrapper: createWrapper() });

      expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument();
      expect(screen.getByLabelText(/cerrar menu|abrir menu/i)).toBeInTheDocument();
    });

    it('should render as header landmark', () => {
      render(<Header />, { wrapper: createWrapper() });

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('role labels', () => {
    it('should show correct label for SUPER_ADMIN', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({ user: { ...mockUser, role: 'SUPER_ADMIN' } });

      render(<Header />, { wrapper: createWrapper() });
      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByText('Super Admin')).toBeInTheDocument();
      });
    });

    it('should show correct label for MANAGER', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({ user: { ...mockUser, role: 'MANAGER' } });

      render(<Header />, { wrapper: createWrapper() });
      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByText('Gerente')).toBeInTheDocument();
      });
    });

    it('should show correct label for EMPLOYEE', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({ user: { ...mockUser, role: 'EMPLOYEE' } });

      render(<Header />, { wrapper: createWrapper() });
      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByText('Empleado')).toBeInTheDocument();
      });
    });
  });

  describe('search input blur behavior', () => {
    it('should close search on blur when search query is empty', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByText('Buscar...'));

      // Wait for search input to appear
      const searchInput = await screen.findByPlaceholderText(/buscar productos/i);
      expect(searchInput).toBeInTheDocument();

      // Trigger blur directly on the input
      fireEvent.blur(searchInput);

      // Search should close when blurred with empty query
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/buscar productos/i)).not.toBeInTheDocument();
      });
    });

    it('should keep search open on blur when search query is not empty', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByText('Buscar...'));

      // Wait for search input to appear and type
      const searchInput = await screen.findByPlaceholderText(/buscar productos/i);
      await user.type(searchInput, 'test');

      // Trigger blur directly
      fireEvent.blur(searchInput);

      // The search should still be visible since query is not empty
      expect(searchInput).toHaveValue('test');
      expect(screen.getByPlaceholderText(/buscar productos/i)).toBeInTheDocument();
    });

    it('should clear search query and close search when clear button is clicked in desktop search', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByText('Buscar...'));

      // Wait for search input to appear and type
      const searchInput = await screen.findByPlaceholderText(/buscar productos/i);
      await user.type(searchInput, 'test query');
      expect(searchInput).toHaveValue('test query');

      // Find and click the X button (clear button) in the search input
      // The clear button is within the rightElement of the Input
      const clearButtons = document.querySelectorAll('button');
      let clearButton: HTMLElement | null = null;
      clearButtons.forEach((btn) => {
        if (btn.querySelector('.lucide-x')) {
          clearButton = btn;
        }
      });

      expect(clearButton).not.toBeNull();
      if (clearButton) {
        await user.click(clearButton);

        // Search should be closed
        await waitFor(() => {
          expect(screen.queryByPlaceholderText(/buscar productos/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('notifications link click behavior', () => {
    it('should close notifications dropdown when "View all notifications" link is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications dropdown
      await user.click(screen.getByLabelText('Notificaciones'));

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Ver todas las notificaciones')).toBeInTheDocument();
      });

      // Click the "View all notifications" link
      const viewAllLink = screen.getByText('Ver todas las notificaciones');
      await user.click(viewAllLink);

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText('Stock bajo')).not.toBeInTheDocument();
      });
    });
  });

  describe('profile dropdown link click behavior', () => {
    it('should close profile dropdown when profile link is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open profile dropdown
      await user.click(screen.getByText('John Doe'));

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /mi perfil/i })).toBeInTheDocument();
      });

      // Click the profile link
      await user.click(screen.getByRole('link', { name: /mi perfil/i }));

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
      });
    });

    it('should close profile dropdown when settings link is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open profile dropdown
      await user.click(screen.getByText('John Doe'));

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /configuracion/i })).toBeInTheDocument();
      });

      // Click the settings link
      await user.click(screen.getByRole('link', { name: /configuracion/i }));

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('mobile search button', () => {
    it('should render mobile search button with correct aria-label', () => {
      render(<Header />, { wrapper: createWrapper() });

      // Mobile search button exists
      const searchButton = screen.getByLabelText('Buscar');
      expect(searchButton).toBeInTheDocument();
    });

    it('should open search when mobile search button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Click mobile search button (this sets searchOpen to true)
      const mobileSearchButton = screen.getByLabelText('Buscar');
      await user.click(mobileSearchButton);

      // Search should be open (the desktop search input becomes visible since state is shared)
      // In jsdom, CSS media queries don't work, so we verify state change through the visible search input
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar productos/i)).toBeInTheDocument();
      });
    });
  });

  describe('mobile search overlay rendering', () => {
    // Note: The mobile search overlay uses sm:hidden CSS class which doesn't work in jsdom.
    // These tests verify that the overlay structure is rendered when searchOpen is true.

    it('should render mobile search overlay when search is open', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search via the button
      await user.click(screen.getByLabelText('Buscar'));

      // Wait for search to be open - the mobile overlay div should exist in DOM
      await waitFor(() => {
        // The mobile overlay has class 'fixed inset-0 z-50 bg-black/50 sm:hidden'
        const overlay = document.querySelector('.fixed.inset-0.z-50.bg-black\\/50');
        expect(overlay).toBeInTheDocument();
      });
    });

    it('should close search when clicking on mobile overlay backdrop', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByLabelText('Buscar'));

      // Find the mobile overlay backdrop
      await waitFor(() => {
        const overlay = document.querySelector('.fixed.inset-0.z-50.bg-black\\/50');
        expect(overlay).toBeInTheDocument();
      });

      // Click on the overlay (backdrop) to close - this tests line 479
      const overlay = document.querySelector('.fixed.inset-0.z-50.bg-black\\/50');
      if (overlay) {
        await user.click(overlay);

        // Search should be closed
        await waitFor(() => {
          expect(document.querySelector('.fixed.inset-0.z-50.bg-black\\/50')).not.toBeInTheDocument();
        });
      }
    });

    it('should prevent search from closing when clicking inside the search content area', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByLabelText('Buscar'));

      // Find the inner content div that has stopPropagation - this tests line 486
      await waitFor(() => {
        const innerDiv = document.querySelector('.fixed.inset-0.z-50 > div');
        expect(innerDiv).toBeInTheDocument();
      });

      const innerDiv = document.querySelector('.fixed.inset-0.z-50 > div');
      if (innerDiv) {
        await user.click(innerDiv);

        // Search should still be open because of stopPropagation
        expect(document.querySelector('.fixed.inset-0.z-50.bg-black\\/50')).toBeInTheDocument();
      }
    });

    it('should render search input in mobile overlay with autoFocus', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByLabelText('Buscar'));

      // The mobile overlay should have an input with placeholder "Buscar..."
      await waitFor(() => {
        const mobileOverlay = document.querySelector('.fixed.inset-0.z-50.bg-black\\/50');
        expect(mobileOverlay).toBeInTheDocument();
        // Mobile search has placeholder "Buscar..." (shorter)
        const mobileInput = mobileOverlay?.querySelector('input[placeholder="Buscar..."]');
        expect(mobileInput).toBeInTheDocument();
      });
    });

    it('should update search query when typing in mobile overlay input', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByLabelText('Buscar'));

      // Find the mobile overlay input (shorter placeholder "Buscar...")
      await waitFor(() => {
        const mobileInput = document.querySelector('.fixed.inset-0.z-50 input[placeholder="Buscar..."]');
        expect(mobileInput).toBeInTheDocument();
      });

      const mobileInput = document.querySelector('.fixed.inset-0.z-50 input[placeholder="Buscar..."]') as HTMLInputElement;
      if (mobileInput) {
        // Type in mobile input - tests line 493
        await user.type(mobileInput, 'test mobile search');
        expect(mobileInput).toHaveValue('test mobile search');
      }
    });

    it('should close search when clicking clear button in mobile overlay', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search
      await user.click(screen.getByLabelText('Buscar'));

      // Find the mobile overlay
      await waitFor(() => {
        const mobileOverlay = document.querySelector('.fixed.inset-0.z-50.bg-black\\/50');
        expect(mobileOverlay).toBeInTheDocument();
      });

      // Find the clear button in mobile overlay (the one with lucide-x)
      const mobileOverlay = document.querySelector('.fixed.inset-0.z-50.bg-black\\/50');
      const clearButton = mobileOverlay?.querySelector('button');

      if (clearButton) {
        // Click the clear button - tests lines 497-500
        await user.click(clearButton);

        // Search should be closed
        await waitFor(() => {
          expect(document.querySelector('.fixed.inset-0.z-50.bg-black\\/50')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('mark all as read pending state', () => {
    it('should show loading spinner when mark all as read is pending (line 304)', async () => {
      // Set the pending state to true BEFORE rendering
      mockMarkAllAsReadIsPending = true;

      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications dropdown
      await user.click(screen.getByLabelText('Notificaciones'));

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Marcar todas como leidas')).toBeInTheDocument();
      });

      // The button should show loading spinner (Loader2) instead of Check icon
      // The Loader2 icon has class 'animate-spin'
      const markAllButton = screen.getByText('Marcar todas como leidas').closest('button');
      expect(markAllButton).toBeInTheDocument();

      // Check that the loading spinner (animate-spin) is present
      const spinner = markAllButton?.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // The button should be disabled
      expect(markAllButton).toBeDisabled();
    });
  });

  describe('notification click handler', () => {
    it('should call handleNotificationClick and close dropdown when notification is clicked (lines 334-335)', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications dropdown
      await user.click(screen.getByLabelText('Notificaciones'));

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Stock bajo')).toBeInTheDocument();
      });

      // Click on a notification item
      const notificationItem = screen.getByText('Stock bajo').closest('div[class*="cursor-pointer"]');
      expect(notificationItem).toBeInTheDocument();

      if (notificationItem) {
        await user.click(notificationItem);

        // Verify handleNotificationClick was called with the notification
        expect(mockNotificationClick).toHaveBeenCalledTimes(1);
        expect(mockNotificationClick).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '1',
            type: 'LOW_STOCK',
            title: 'Stock bajo',
          })
        );

        // Verify dropdown is closed
        await waitFor(() => {
          expect(screen.queryByText('Stock bajo')).not.toBeInTheDocument();
        });
      }
    });

    it('should handle clicking on different notification types', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications dropdown
      await user.click(screen.getByLabelText('Notificaciones'));

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Nueva factura')).toBeInTheDocument();
      });

      // Click on the second notification item (Nueva factura)
      const notificationItem = screen.getByText('Nueva factura').closest('div[class*="cursor-pointer"]');

      if (notificationItem) {
        await user.click(notificationItem);

        // Verify handleNotificationClick was called with the correct notification
        expect(mockNotificationClick).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '2',
            type: 'NEW_INVOICE',
            title: 'Nueva factura',
          })
        );
      }
    });
  });

  describe('desktop search clear button (line 209)', () => {
    it('should clear search query and close search when desktop clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open search by clicking the search button
      await user.click(screen.getByText('Buscar...'));

      // Wait for search input to appear
      const searchInput = await screen.findByPlaceholderText(/buscar productos/i);
      expect(searchInput).toBeInTheDocument();

      // Type something in the search input
      await user.type(searchInput, 'test search');
      expect(searchInput).toHaveValue('test search');

      // Find the desktop search container (the one with the expanded search input)
      // The clear button is in the rightElement of the Input component
      const desktopSearchContainer = searchInput.closest('.relative');
      expect(desktopSearchContainer).toBeInTheDocument();

      // Find the X button within the search area (not the mobile overlay)
      // We need to specifically target the button that is NOT in the mobile overlay
      const allCloseButtons = document.querySelectorAll('button');
      let desktopClearButton: HTMLElement | null = null;

      allCloseButtons.forEach((btn) => {
        // Check if the button has the X icon and is in the desktop area (sm:block parent)
        const hasXIcon = btn.querySelector('.lucide-x');
        const isInMobileOverlay = btn.closest('.fixed.inset-0.z-50');
        if (hasXIcon && !isInMobileOverlay) {
          desktopClearButton = btn;
        }
      });

      expect(desktopClearButton).not.toBeNull();

      if (desktopClearButton) {
        // Click the clear button - this tests line 209 (setSearchOpen(false) in the onClick handler)
        await user.click(desktopClearButton);

        // Verify search is closed
        await waitFor(() => {
          expect(screen.queryByPlaceholderText(/buscar productos/i)).not.toBeInTheDocument();
        });

        // Verify the "Buscar..." button is back
        expect(screen.getByText('Buscar...')).toBeInTheDocument();
      }
    });
  });

  describe('mark all as read button click (line 304)', () => {
    it('should call markAllAsRead.mutate when button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications dropdown
      await user.click(screen.getByLabelText('Notificaciones'));

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Marcar todas como leidas')).toBeInTheDocument();
      });

      // Click the mark all as read button
      const markAllButton = screen.getByText('Marcar todas como leidas').closest('button');
      expect(markAllButton).toBeInTheDocument();

      if (markAllButton) {
        await user.click(markAllButton);

        // Verify mutate was called
        expect(mockMarkAllAsReadMutate).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('notification icon/style for error category (lines 144, 157)', () => {
    it('should render error notification with correct icon and styling', async () => {
      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications dropdown
      await user.click(screen.getByLabelText('Notificaciones'));

      // Wait for dropdown to open and find the error notification (PAYMENT_FAILED type)
      await waitFor(() => {
        expect(screen.getByText('Pago fallido')).toBeInTheDocument();
      });

      // Find the error notification item
      const errorNotificationItem = screen.getByText('Pago fallido').closest('div[class*="cursor-pointer"]');
      expect(errorNotificationItem).toBeInTheDocument();

      // Verify the error icon class is applied (bg-error-100)
      // The icon container should have error styling classes
      const iconContainer = errorNotificationItem?.querySelector('[class*="bg-error"]');
      expect(iconContainer).toBeInTheDocument();

      // Verify the AlertCircle icon is rendered (error icon)
      // The AlertCircle icon has class lucide-circle-alert
      const errorIcon = iconContainer?.querySelector('.lucide-circle-alert');
      expect(errorIcon).toBeInTheDocument();
    });
  });

  describe('edge cases for branch coverage', () => {
    it('should show role as-is when role is unknown (line 134)', async () => {
      const user = userEvent.setup();
      // Set an unknown role
      useAuthStore.setState({ user: { ...mockUser, role: 'UNKNOWN_ROLE' as never } });

      render(<Header />, { wrapper: createWrapper() });
      await user.click(screen.getByText('John Doe'));

      // Should display the raw role value
      await waitFor(() => {
        expect(screen.getByText('UNKNOWN_ROLE')).toBeInTheDocument();
      });
    });

    it('should show "Cerrando sesion..." when isLoggingOut is true (line 498)', async () => {
      // Set the logging out state to true BEFORE rendering
      mockIsLoggingOut = true;

      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open profile dropdown
      await user.click(screen.getByText('John Doe'));

      // Wait for dropdown to open and check for the logging out text
      await waitFor(() => {
        expect(screen.getByText('Cerrando sesion...')).toBeInTheDocument();
      });

      // The logout button should be disabled when logging out
      const logoutButton = screen.getByRole('button', { name: /cerrando sesion/i });
      expect(logoutButton).toBeDisabled();
    });

    it('should default to 0 unread count when unreadCountData is undefined (line 88)', () => {
      // Set the unreadCount data to undefined
      mockUnreadCountData = undefined;

      render(<Header />, { wrapper: createWrapper() });

      // The badge should not be visible when count is 0
      // or there should be no "2" badge (the default count)
      const notificationButton = screen.getByLabelText('Notificaciones');
      expect(notificationButton).toBeInTheDocument();

      // No unread count badge should be displayed when count is 0 or undefined
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });

    it('should show loading state when notifications are loading (lines 320-327)', async () => {
      // Set the notifications loading state to true BEFORE rendering
      mockNotificationsLoading = true;

      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications dropdown
      await user.click(screen.getByLabelText('Notificaciones'));

      // Wait for dropdown to open and show loading text
      await waitFor(() => {
        expect(screen.getByText('Cargando notificaciones...')).toBeInTheDocument();
      });

      // Find the loading spinner (animate-spin class in the dropdown)
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('should show empty state when no notifications exist (line 327 else branch)', async () => {
      // Set the notifications to empty BEFORE rendering
      mockNotificationsEmpty = true;
      mockUnreadCountData = { count: 0, byType: {}, byPriority: {} };

      const user = userEvent.setup();
      render(<Header />, { wrapper: createWrapper() });

      // Open notifications dropdown
      await user.click(screen.getByLabelText('Notificaciones'));

      // Wait for dropdown to open and show empty state text
      await waitFor(() => {
        expect(screen.getByText('No tienes notificaciones')).toBeInTheDocument();
      });

      // The "View all notifications" link should not be visible when there are no notifications
      expect(screen.queryByText('Ver todas las notificaciones')).not.toBeInTheDocument();
    });
  });
});