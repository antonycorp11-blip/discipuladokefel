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
    { icon: User, label: "Perfil", path: "/perfil" },
  ];

  return (
    <nav className="fixed bottom-6 left-6 right-6 glass-panel rounded-[2.5rem] shadow-premium shadow-[#1B3B6B]/10 z-50 border-white/60 p-2 border-2 max-w-[380px] mx-auto">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-soft relative z-10",
                isActive ? "text-[#1B3B6B]" : "text-gray-400"
              )}
            >
              {isActive && (
                <motion.div 
                   layoutId="nav-glow"
                   className="absolute inset-0 bg-[#1B3B6B]/5 rounded-3xl -z-10" 
                   transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn("w-6 h-6 transition-soft", isActive && "scale-110")} />
              <span className={cn("text-[8px] mt-1 font-black uppercase tracking-widest", isActive && "text-[#1B3B6B]")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
