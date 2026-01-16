import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // Home/Landing page
  index("routes/home.tsx"),

  // Public routes (authentication)
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),

  // Protected app routes with layout
  layout("routes/_app.tsx", [
    route("dashboard", "routes/_app.dashboard.tsx"),

    // Products module
    route("products", "routes/_app.products.tsx"),
    route("products/new", "routes/_app.products.new.tsx"),
    route("products/:id", "routes/_app.products.$id.tsx"),
    route("products/:id/edit", "routes/_app.products.$id.edit.tsx"),

    // Categories module
    route("categories", "routes/_app.categories.tsx"),

    // Warehouses module
    route("warehouses", "routes/_app.warehouses.tsx"),
    route("warehouses/new", "routes/_app.warehouses.new.tsx"),
    route("warehouses/:id", "routes/_app.warehouses.$id.tsx"),
    route("warehouses/:id/edit", "routes/_app.warehouses.$id.edit.tsx"),

    // Customers module
    route("customers", "routes/_app.customers.tsx"),
    route("customers/new", "routes/_app.customers.new.tsx"),
    route("customers/:id", "routes/_app.customers.$id.tsx"),
    route("customers/:id/edit", "routes/_app.customers.$id.edit.tsx"),

    // Invoices module
    route("invoices", "routes/_app.invoices.tsx"),
    route("invoices/new", "routes/_app.invoices.new.tsx"),
    route("invoices/:id", "routes/_app.invoices.$id.tsx"),
    route("invoices/:id/edit", "routes/_app.invoices.$id.edit.tsx"),

    // Payments module
    route("payments", "routes/_app.payments.tsx"),
    route("payments/new", "routes/_app.payments.new.tsx"),
    route("payments/:id", "routes/_app.payments.$id.tsx"),

    // Reports module
    route("reports", "routes/_app.reports.tsx"),

    // Future routes will be added here:
    // route("settings", "routes/_app.settings.tsx"),
    // route("profile", "routes/_app.profile.tsx"),
  ]),
] satisfies RouteConfig;