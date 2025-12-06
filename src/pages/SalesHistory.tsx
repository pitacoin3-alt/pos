import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { useSettings } from "@/hooks/useSettings";

export default function SalesHistory() {
  const { sales, loading } = useSales();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSales = sales.filter(sale =>
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.items.some(item => item.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPaymentBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      cash: "default",
      card: "secondary",
      upi: "outline",
      credit: "outline",
    };
    return <Badge variant={variants[method] || "default"}>{method.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading sales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
        <p className="text-muted-foreground">View past transactions</p>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by sale ID or product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="space-y-4">
        {filteredSales.map((sale) => (
          <Card key={sale.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sale #{sale.id.slice(0, 8)}</CardTitle>
                <div className="flex gap-2">
                  {sale.refunded && <Badge variant="destructive">REFUNDED</Badge>}
                  {getPaymentBadge(sale.payment_method)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{formatDate(sale.date)}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {settings.currency}{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{settings.currency}{sale.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSales.length === 0 && (
          <Card className="p-12">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">No sales found</p>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}