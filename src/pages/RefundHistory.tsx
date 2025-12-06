import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRefunds } from "@/hooks/useRefunds";
import { useSettings } from "@/hooks/useSettings";

export default function RefundHistory() {
  const { refunds, loading } = useRefunds();
  const { settings } = useSettings();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading refunds...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Refund History</h1>
        <p className="text-muted-foreground">View processed refunds</p>
      </div>

      <div className="space-y-4">
        {refunds.map((refund) => (
          <Card key={refund.id}>
            <CardHeader>
              <CardTitle className="text-lg">Refund #{refund.id.slice(0, 8)}</CardTitle>
              <p className="text-sm text-muted-foreground">{formatDate(refund.date)}</p>
              <p className="text-sm text-muted-foreground">Original Sale: #{refund.sale_id.slice(0, 8)}</p>
              <p className="text-sm font-medium">Reason: {refund.reason}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {refund.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {settings.currency}{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold text-destructive">
                  <span>Total Refund</span>
                  <span>{settings.currency}{refund.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {refunds.length === 0 && (
          <Card className="p-12">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">No refunds yet</p>
              <p className="text-muted-foreground">Processed refunds will appear here</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}