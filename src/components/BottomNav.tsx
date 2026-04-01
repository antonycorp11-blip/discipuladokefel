import { Home, Book, Trophy, Calendar, User, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isMaster = user?.role === "master";

  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Book, label: "Bíblia", path: "/biblia" },
    { icon: Trophy, label: "Ranking", path: "/ranking" },
    { icon: Calendar, label: "Eventos", path: "/eventos" },
    ...(isMaster ? [{ icon: Users, label: "Células", path: "/celulas" }] : []),
    { icon: User, label: "Perfil", path: "/perfil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive ? "text-blue-600" : "text-gray-400"
              )}
            >
              <item.icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
              <span className={cn("text-[10px] mt-1 font-medium", isActive && "font-bold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
