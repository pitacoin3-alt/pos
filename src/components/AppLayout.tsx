import { ReactNode, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  Users,
  RotateCcw,
  FileText,
  TrendingUp,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { usePermissions } from "@/hooks/usePermissions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Billing / POS", href: "/pos", path: "/pos", icon: ShoppingCart },
  { name: "Products", href: "/products", path: "/products", icon: Package },
  { name: "Sales History", href: "/sales", path: "/sales", icon: History },
  { name: "Credit Customers", href: "/credit-customers", path: "/credit-customers", icon: Users },
  { name: "Refund", href: "/refund", path: "/refund", icon: RotateCcw },
  { name: "Refund History", href: "/refunds", path: "/refunds", icon: FileText },
  { name: "Profit Analysis", href: "/profit-analysis", path: "/profit-analysis", icon: TrendingUp },
  { name: "Settings", href: "/settings", path: "/settings", icon: Settings },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const { role } = useRole();
  const { hasAccess } = usePermissions();

  // Filter navigation based on user role and permissions
  const allowedNavigation = useMemo(() => {
    if (!role) return [];
    
    return navigation.filter(item => {
      // Use the path property for permission check
      return hasAccess(role, item.path);
    });
  }, [role, hasAccess]);

  const NavLinks = () => (
    <>
      {allowedNavigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent/50",
              isActive
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-card lg:block lg:w-64">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <h1 className="text-xl font-bold text-primary">{settings.name}</h1>
          </div>
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            <NavLinks />
          </nav>
          <div className="border-t p-4">
            <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center border-b px-6">
                <h1 className="text-xl font-bold text-primary">{settings.name}</h1>
              </div>
              <nav className="flex-1 space-y-1 p-4">
                <NavLinks />
              </nav>
              <div className="border-t p-4">
                <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold text-primary">{settings.name}</h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
