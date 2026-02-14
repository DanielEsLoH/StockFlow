import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import React from 'react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Reset localStorage between tests
beforeEach(() => {
  localStorageMock.clear();
});

// Mock window.matchMedia with configurable return
export function mockMatchMedia(matches: boolean = false) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia(false),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock Framer Motion to avoid animation timing issues
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.ComponentProps<'div'>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...props, ref }, children)
    ),
    button: React.forwardRef(({ children, ...props }: React.ComponentProps<'button'>, ref: React.Ref<HTMLButtonElement>) =>
      React.createElement('button', { ...props, ref }, children)
    ),
    a: React.forwardRef(({ children, ...props }: React.ComponentProps<'a'>, ref: React.Ref<HTMLAnchorElement>) =>
      React.createElement('a', { ...props, ref }, children)
    ),
    span: React.forwardRef(({ children, ...props }: React.ComponentProps<'span'>, ref: React.Ref<HTMLSpanElement>) =>
      React.createElement('span', { ...props, ref }, children)
    ),
    aside: React.forwardRef(({ children, ...props }: React.ComponentProps<'aside'>, ref: React.Ref<HTMLElement>) =>
      React.createElement('aside', { ...props, ref }, children)
    ),
    nav: React.forwardRef(({ children, ...props }: React.ComponentProps<'nav'>, ref: React.Ref<HTMLElement>) =>
      React.createElement('nav', { ...props, ref }, children)
    ),
    ul: React.forwardRef(({ children, ...props }: React.ComponentProps<'ul'>, ref: React.Ref<HTMLUListElement>) =>
      React.createElement('ul', { ...props, ref }, children)
    ),
    li: React.forwardRef(({ children, ...props }: React.ComponentProps<'li'>, ref: React.Ref<HTMLLIElement>) =>
      React.createElement('li', { ...props, ref }, children)
    ),
    header: React.forwardRef(({ children, ...props }: React.ComponentProps<'header'>, ref: React.Ref<HTMLElement>) =>
      React.createElement('header', { ...props, ref }, children)
    ),
    p: React.forwardRef(({ children, ...props }: React.ComponentProps<'p'>, ref: React.Ref<HTMLParagraphElement>) =>
      React.createElement('p', { ...props, ref }, children)
    ),
    img: React.forwardRef((props: React.ComponentProps<'img'>, ref: React.Ref<HTMLImageElement>) =>
      React.createElement('img', { ...props, ref })
    ),
    tr: React.forwardRef(({ children, ...props }: React.ComponentProps<'tr'>, ref: React.Ref<HTMLTableRowElement>) =>
      React.createElement('tr', { ...props, ref }, children)
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));