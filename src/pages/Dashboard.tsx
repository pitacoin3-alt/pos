import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, TrendingUp, Users } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useSettings } from "@/hooks/useSettings";

export default function Dashboard() {
  const { sales, loading: salesLoading } = useSales();
  const { products, loading: productsLoading } = useProducts();
  const { customers, loading: customersLoading } = useCustomers();
  const { settings } = useSettings();
  
  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    todayProfit: 0,
    lowStock: 0,
    totalCredit: 0,
    customersWithCredit: 0,
  });

  useEffect(() => {
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.date).toDateString() === today);
    
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const todayProfit = todaySales.reduce((sum, sale) => {
      const saleProfit = sale.items.reduce((itemSum, item) => 
        itemSum + ((item.price - item.cost) * item.quantity), 0
      );
      return sum + saleProfit;
    }, 0);

    const lowStock = products.filter(p => p.stock < 10).length;
    const totalCredit = customers.reduce((sum, c) => sum + c.total_credit, 0);
    const customersWithCredit = customers.filter(c => c.total_credit > 0).length;

    setStats({
      todaySales: todaySales.length,
      todayRevenue,
      todayProfit,
      lowStock,
      totalCredit,
      customersWithCredit,
    });
  }, [sales, products, customers]);

  const loading = salesLoading || productsLoading || customersLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Today's Sales",
      value: stats.todaySales,
      icon: DollarSign,
      color: "text-blue-500",
    },
    {
      title: "Today's Revenue",
      value: `${settings.currency}${stats.todayRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      title: "Today's Profit",
      value: `${settings.currency}${stats.todayProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStock,
      icon: Package,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.customersWithCredit > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Outstanding</CardTitle>
            <Users className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {settings.currency}{stats.totalCredit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.customersWithCredit} customer{stats.customersWithCredit > 1 ? 's' : ''} with outstanding credit
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}