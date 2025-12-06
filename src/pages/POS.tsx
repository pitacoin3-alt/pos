import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Trash2, ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { Product } from "@/types/database";

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  cost: number;
}

export default function POS() {
  const { products, updateProduct, refetch: refetchProducts } = useProducts();
  const { createSale } = useSales();
  const { customers, addTransaction, updateCustomer } = useCustomers();
  const { settings } = useSettings();
  const { user } = useAuth();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
  const [customerId, setCustomerId] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.stock < 1) {
      toast.error("Product out of stock!");
      return;
    }

    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error("Not enough stock!");
        return;
      }
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
        cost: product.cost,
      }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.product_id === productId);
    
    if (!product || !cartItem) return;

    const newQuantity = cartItem.quantity + change;
    
    if (newQuantity < 1) {
      setCart(cart.filter(item => item.product_id !== productId));
      return;
    }

    if (newQuantity > product.stock) {
      toast.error("Not enough stock!");
      return;
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }

    if (paymentMethod === 'credit' && !customerId) {
      toast.error("Please select a customer for credit sale!");
      return;
    }

    setIsProcessing(true);
    const total = calculateTotal();

    // Create sale
    const { error: saleError } = await createSale(
      {
        date: new Date().toISOString(),
        total,
        payment_method: paymentMethod,
        customer_id: paymentMethod === 'credit' ? customerId : undefined,
        refunded: false,
        created_by: user?.id,
      },
      cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        cost: item.cost,
      }))
    );

    if (saleError) {
      toast.error(saleError.message);
      setIsProcessing(false);
      return;
    }

    // Update stock
    for (const item of cart) {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        await updateProduct(item.product_id, { stock: product.stock - item.quantity });
      }
    }

    // Update customer credit if applicable
    if (paymentMethod === 'credit' && customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        await addTransaction({
          customer_id: customerId,
          date: new Date().toISOString(),
          amount: total,
          type: 'sale',
          description: `Sale on credit`,
        });

        await updateCustomer(customerId, {
          total_credit: customer.total_credit + total,
        });
      }
    }

    setCart([]);
    setCashReceived("");
    await refetchProducts();
    setIsProcessing(false);
    toast.success("Sale completed successfully!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-muted-foreground">Process sales and manage transactions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {!searchTerm && (
                <p className="text-center text-muted-foreground py-8">Search for products to add to cart</p>
              )}
              {searchTerm && filteredProducts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No products found</p>
              )}
              {searchTerm && filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.company && <span className="font-medium">{product.company}</span>}
                      {product.company && product.category && <span> • </span>}
                      {product.category && <span>{product.category}</span>}
                      {(product.company || product.category) && <span> • </span>}
                      Stock: {product.stock} | {settings.currency}{product.price}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {cart.map(item => {
                const product = products.find(p => p.id === item.product_id);
                return (
                  <div key={item.product_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      {product?.company && (
                        <p className="text-xs text-muted-foreground">{product.company}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {settings.currency}{item.price} × {item.quantity} = {settings.currency}{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(item.product_id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(item.product_id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">{settings.currency}{calculateTotal().toFixed(2)}</span>
              </div>

              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="credit">Credit (Udhar)</SelectItem>
                </SelectContent>
              </Select>

              {paymentMethod === 'credit' && (
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {paymentMethod === 'cash' && (
                <div className="space-y-2">
                  <Label htmlFor="cashReceived">Cash Received</Label>
                  <Input
                    id="cashReceived"
                    type="number"
                    placeholder="Enter cash amount"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                  />
                  {cashReceived && parseFloat(cashReceived) >= calculateTotal() && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Change:</span>
                        <span className="text-xl font-bold text-primary">
                          {settings.currency}{(parseFloat(cashReceived) - calculateTotal()).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  {cashReceived && parseFloat(cashReceived) < calculateTotal() && (
                    <p className="text-sm text-destructive">Insufficient cash amount</p>
                  )}
                </div>
              )}

              <Button
                onClick={completeSale}
                className="w-full"
                size="lg"
                disabled={
                  isProcessing ||
                  cart.length === 0 ||
                  (paymentMethod === 'cash' && cashReceived && parseFloat(cashReceived) < calculateTotal()) ||
                  (paymentMethod === 'credit' && !customerId)
                }
              >
                {isProcessing ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}