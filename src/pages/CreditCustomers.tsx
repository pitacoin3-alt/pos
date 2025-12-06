import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/useCustomers";
import { useSettings } from "@/hooks/useSettings";

export default function CreditCustomers() {
  const { customers, loading, addCustomer, updateCustomer, addTransaction, deleteCustomer } = useCustomers();
  const { settings } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; customerId: string | null }>({
    open: false,
    customerId: null,
  });
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [paymentAmount, setPaymentAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await addCustomer({
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      total_credit: 0,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Customer added successfully!");
    resetForm();
    setIsDialogOpen(false);
  };

  const handlePayment = async () => {
    if (!paymentDialog.customerId) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const customer = customers.find(c => c.id === paymentDialog.customerId);
    if (!customer) return;

    if (amount > customer.total_credit) {
      toast.error("Payment amount cannot exceed total credit");
      return;
    }

    await addTransaction({
      customer_id: customer.id,
      date: new Date().toISOString(),
      amount: amount,
      type: 'payment',
      description: `Payment received`,
    });

    await updateCustomer(customer.id, {
      total_credit: customer.total_credit - amount,
    });

    toast.success("Payment recorded successfully!");
    setPaymentDialog({ open: false, customerId: null });
    setPaymentAmount("");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Customers</h1>
          <p className="text-muted-foreground">Manage customer credit accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Add Customer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {customers.map((customer) => (
          <Card key={customer.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{customer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={customer.total_credit > 0 ? "destructive" : "outline"}>
                    {settings.currency}{customer.total_credit.toFixed(2)}
                  </Badge>
                  {customer.total_credit > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setPaymentDialog({ open: true, customerId: customer.id })}
                    >
                      Record Payment
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {customer.transactions.length > 0 && (
              <CardContent>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-4 w-4" />
                    View Transaction History ({customer.transactions.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-2">
                    {customer.transactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((txn) => (
                        <div key={txn.id} className="flex justify-between text-sm p-2 rounded border">
                          <div>
                            <p className="font-medium">{txn.description}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(txn.date)}</p>
                          </div>
                          <span className={txn.type === 'sale' ? 'text-red-500' : 'text-green-500'}>
                            {txn.type === 'sale' ? '+' : '-'}{settings.currency}{txn.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            )}
          </Card>
        ))}

        {customers.length === 0 && (
          <Card className="p-12">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">No customers yet</p>
              <p className="text-muted-foreground">Add your first credit customer to get started</p>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Payment Amount ({settings.currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={handlePayment} className="w-full">
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}