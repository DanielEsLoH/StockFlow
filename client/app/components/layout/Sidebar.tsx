import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "~/stores/ui.store";
import { SidebarContent } from "./sidebar/SidebarContent";
import { CollapsedSidebar } from "./sidebar/CollapsedSidebar";

export function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebarCollapse,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUIStore();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40">
        {sidebarCollapsed ? (
          <CollapsedSidebar onToggleCollapse={toggleSidebarCollapse} />
        ) : (
          <SidebarContent
            onToggleCollapse={toggleSidebarCollapse}
            showCollapseButton
          />
        )}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px]"
            >
              <SidebarContent
                onClose={() => setMobileSidebarOpen(false)}
                showCloseButton
                isMobile
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
