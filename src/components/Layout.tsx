import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router-dom";

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-transparent pb-24 selection:bg-indigo-100 italic transition-soft">
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -10 }}
          transition={{ duration: 0.3, cubicBezier: [0.4, 0, 0.2, 1] }}
          className="max-w-[430px] mx-auto"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}
