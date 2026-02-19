import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // Home/Landing page
  index("routes/home.tsx"),

  // Public routes (authentication)
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("verify-email", "routes/verify-email.tsx"),
  route("accept-invitation", "routes/accept-invitation.tsx"),
  route("oauth/callback", "routes/oauth.callback.tsx"),

  // System Admin routes (separate from tenant app)
  route("system-admin/login", "routes/system-admin.login.tsx"),
  layout("routes/system-admin.tsx", [
    route("system-admin", "routes/system-admin._index.tsx", { index: true }),
    route("system-admin/dashboard", "routes/system-admin.dashboard.tsx"),
    route("system-admin/users", "routes/system-admin.users.tsx"),
    route("system-admin/tenants", "routes/system-admin.tenants.tsx"),
  ]),

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

    // Inventory module
    route("inventory/movements", "routes/_app.inventory.movements.tsx"),
    route("inventory/transfers", "routes/_app.inventory.transfers.tsx"),

    // Customers module
    route("customers", "routes/_app.customers.tsx"),
    route("customers/new", "routes/_app.customers.new.tsx"),
    route("customers/:id", "routes/_app.customers.$id.tsx"),
    route("customers/:id/edit", "routes/_app.customers.$id.edit.tsx"),

    // Quotations module
    route("quotations", "routes/_app.quotations.tsx"),
    route("quotations/new", "routes/_app.quotations.new.tsx"),
    route("quotations/:id", "routes/_app.quotations.$id.tsx"),
    route("quotations/:id/edit", "routes/_app.quotations.$id.edit.tsx"),

    // Suppliers module
    route("suppliers", "routes/_app.suppliers.tsx"),
    route("suppliers/new", "routes/_app.suppliers.new.tsx"),
    route("suppliers/:id", "routes/_app.suppliers.$id.tsx"),
    route("suppliers/:id/edit", "routes/_app.suppliers.$id.edit.tsx"),

    // Purchase Orders module
    route("purchases", "routes/_app.purchases.tsx"),
    route("purchases/new", "routes/_app.purchases.new.tsx"),
    route("purchases/:id", "routes/_app.purchases.$id.tsx"),
    route("purchases/:id/edit", "routes/_app.purchases.$id.edit.tsx"),

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

    // Team management
    route("team", "routes/_app.team.tsx"),

    // Notifications
    route("notifications", "routes/_app.notifications.tsx"),

    // Settings and Profile
    route("settings", "routes/_app.settings.tsx"),
    route("profile", "routes/_app.profile.tsx"),

    // Billing
    route("billing", "routes/_app.billing.tsx"),

    // POS module
    route("pos", "routes/_app.pos.tsx"),
    route("pos/open", "routes/_app.pos.open.tsx"),
    route("pos/close", "routes/_app.pos.close.tsx"),
    route("pos/sales", "routes/_app.pos.sales.tsx"),
    route("pos/sales/:id", "routes/_app.pos.sales.$id.tsx"),
    route("pos/sessions", "routes/_app.pos.sessions.tsx"),
    route("pos/sessions/:id", "routes/_app.pos.sessions.$id.tsx"),
    route("pos/cash-registers", "routes/_app.pos.cash-registers.tsx"),
    route("pos/cash-registers/new", "routes/_app.pos.cash-registers.new.tsx"),
    route(
      "pos/cash-registers/:id/edit",
      "routes/_app.pos.cash-registers.$id.edit.tsx",
    ),

    // DIAN Electronic Invoicing module
    route("dian", "routes/_app.dian.tsx"),
    route("dian/config", "routes/_app.dian.config.tsx"),
    route("dian/documents", "routes/_app.dian.documents.tsx"),
    route("dian/documents/:id", "routes/_app.dian.documents.$id.tsx"),
  ]),
] satisfies RouteConfig;
