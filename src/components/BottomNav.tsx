import { motion } from "motion/react";
import { Home, Book, Trophy, Calendar, User, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Book, label: "Bíblia", path: "/biblia" },
    { icon: Trophy, label: "Ranking", path: "/ranking" },
    { icon: Calendar, label: "Eventos", path: "/eventos" },
    { icon: User, label: "Você", path: "/perfil" },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-white/10 z-50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-[430px] mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full relative z-10",
                isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-[#a1a1aa]"
              )}
            >
              <item.icon 
                className="w-[22px] h-[22px]" 
                strokeWidth={isActive ? 2.5 : 2}
                fill={isActive && item.label !== 'Você' ? 'currentColor' : 'none'}
              />
              <span className="text-[10px] mt-1 font-semibold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
