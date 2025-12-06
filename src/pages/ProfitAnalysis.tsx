import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useSales } from "@/hooks/useSales";
import { useRefunds } from "@/hooks/useRefunds";
import { useSettings } from "@/hooks/useSettings";

export default function ProfitAnalysis() {
  const { sales, loading: salesLoading } = useSales();
  const { refunds, loading: refundsLoading } = useRefunds();
  const { settings } = useSettings();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    profitMargin: 0,
    refundedRevenue: 0,
    refundedCost: 0,
    netProfit: 0,
  });

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;

    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= dateRange.from! && saleDate <= dateRange.to!;
    });

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCost = filteredSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0), 0
    );
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const filteredRefunds = refunds.filter(refund => {
      const refundDate = new Date(refund.date);
      return refundDate >= dateRange.from! && refundDate <= dateRange.to!;
    });

    const refundedRevenue = filteredRefunds.reduce((sum, refund) => sum + refund.total, 0);
    const refundedCost = filteredRefunds.reduce((sum, refund) => 
      sum + refund.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0), 0
    );

    const netProfit = grossProfit - (refundedRevenue - refundedCost);

    setStats({
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      refundedRevenue,
      refundedCost,
      netProfit,
    });
  }, [sales, refunds, dateRange]);

  const loading = salesLoading || refundsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading profit data...</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Revenue",
      value: `${settings.currency}${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-blue-500",
    },
    {
      title: "Total Cost",
      value: `${settings.currency}${stats.totalCost.toFixed(2)}`,
      icon: TrendingDown,
      color: "text-orange-500",
    },
    {
      title: "Gross Profit",
      value: `${settings.currency}${stats.grossProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      title: "Profit Margin",
      value: `${stats.profitMargin.toFixed(2)}%`,
      icon: TrendingUp,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit Analysis</h1>
          <p className="text-muted-foreground">Track your profitability</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                : "Select date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium">{settings.currency}{stats.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">Cost</span>
              <span className="font-medium text-orange-500">-{settings.currency}{stats.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="font-medium">Gross Profit</span>
              <span className="font-bold text-green-500">{settings.currency}{stats.grossProfit.toFixed(2)}</span>
            </div>
            {stats.refundedRevenue > 0 && (
              <>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Refunded Loss</span>
                  <span className="font-medium text-red-500">
                    -{settings.currency}{(stats.refundedRevenue - stats.refundedCost).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold">Net Profit</span>
                  <span className="text-2xl font-bold text-primary">
                    {settings.currency}{stats.netProfit.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}