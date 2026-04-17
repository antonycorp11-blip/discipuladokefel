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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="max-w-[430px] mx-auto"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}
