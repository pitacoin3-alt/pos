import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSales } from "@/hooks/useSales";
import { useRefunds } from "@/hooks/useRefunds";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { SaleItem, Sale } from "@/types/database";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RefundNew() {
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number }>>({});
  const [saleSearchOpen, setSaleSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [saleSearchQuery, setSaleSearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const { sales } = useSales();
  const { createRefund } = useRefunds();
  const { products } = useProducts();
  const navigate = useNavigate();

  const selectedSale = sales.find(s => s.id === saleId);
  
  // Generate a simple sale number from index
  const getSaleNumber = (id: string) => {
    const index = sales.findIndex(s => s.id === id);
    return index >= 0 ? `#${sales.length - index}` : '';
  };

  // Calculate refund total based on selected items
  const refundTotal = saleItems.reduce((sum, item) => {
    const itemSelection = selectedItems[item.id];
    if (itemSelection?.selected) {
      return sum + (item.price * itemSelection.quantity);
    }
    return sum;
  }, 0);

  // Filter sales based on search query
  const filteredSales = sales.filter(sale => {
    const searchLower = saleSearchQuery.toLowerCase();
    return (
      sale.id.toLowerCase().includes(searchLower) ||
      new Date(sale.date).toLocaleDateString().includes(searchLower) ||
      sale.payment_method.toLowerCase().includes(searchLower) ||
      sale.total.toString().includes(searchLower)
    );
  });

  // Filter sales by product search
  const [productFilteredSales, setProductFilteredSales] = useState<Sale[]>([]);
  
  useEffect(() => {
    if (productSearchQuery.trim()) {
      const searchProducts = async () => {
        const { data: saleItemsData } = await supabase
          .from('sale_items')
          .select('sale_id, product_name')
          .ilike('product_name', `%${productSearchQuery}%`);
        
        if (saleItemsData) {
          const saleIds = [...new Set(saleItemsData.map(item => item.sale_id))];
          const filtered = sales.filter(sale => saleIds.includes(sale.id));
          setProductFilteredSales(filtered);
        }
      };
      searchProducts();
    } else {
      setProductFilteredSales(sales);
    }
  }, [productSearchQuery, sales]);

  useEffect(() => {
    if (saleId) {
      fetchSaleItems();
    } else {
      setSaleItems([]);
      setSelectedItems({});
    }
  }, [saleId]);

  const fetchSaleItems = async () => {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);
    
    if (!error && data) {
      setSaleItems(data);
      // Initialize all items as selected with full quantity
      const initialSelection: Record<string, { selected: boolean; quantity: number }> = {};
      data.forEach(item => {
        initialSelection[item.id] = { selected: true, quantity: item.quantity };
      });
      setSelectedItems(initialSelection);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected
      }
    }));
  };

  const updateItemQuantity = (itemId: string, quantity: number, maxQuantity: number) => {
    if (quantity < 1 || quantity > maxQuantity) return;
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) {
      toast.error("Please select a valid sale");
      return;
    }

    if (saleItems.length === 0) {
      toast.error("No items found for this sale");
      return;
    }

    // Filter only selected items
    const selectedRefundItems = saleItems
      .filter(item => selectedItems[item.id]?.selected)
      .map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: selectedItems[item.id].quantity,
        price: item.price,
        cost: item.cost,
      }));

    if (selectedRefundItems.length === 0) {
      toast.error("Please select at least one item to refund");
      return;
    }

    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const refundData = {
      sale_id: selectedSale.id,
      reason,
      total: refundTotal,
      date: new Date().toISOString(),
      created_by: user?.id,
    };

    const result = await createRefund(refundData, selectedRefundItems);
    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
    } else {
      toast.success("Refund processed successfully");
      navigate("/refunds");
    }
  };

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Process Refund</h1>
        <p className="text-sm md:text-base text-muted-foreground">Issue full or partial refunds for sales</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Refund Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="saleId" className="text-sm md:text-base">Select Sale</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="saleId"
                  value={selectedSale ? `Sale ${getSaleNumber(saleId)} - ${new Date(selectedSale.date).toLocaleDateString()} - ₹${selectedSale.total.toFixed(2)}` : ''}
                  placeholder="Click a search button to find a sale"
                  readOnly
                  className="flex-1 cursor-pointer"
                  onClick={() => setSaleSearchOpen(true)}
                />
                <div className="flex gap-2">
                  <Dialog open={saleSearchOpen} onOpenChange={setSaleSearchOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="flex-1 sm:flex-none">
                        <Search className="h-4 w-4 mr-2" />
                        By Date
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base md:text-lg">Search Sales by Date/Amount</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Search by date, amount, payment method..."
                        value={saleSearchQuery}
                        onChange={(e) => setSaleSearchQuery(e.target.value)}
                        className="text-sm"
                      />
                      <div className="overflow-x-auto -mx-6 px-6">
                        <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Sale #</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Total</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Payment</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                            <TableHead className="text-xs">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-medium text-xs">{getSaleNumber(sale.id)}</TableCell>
                              <TableCell className="text-xs">{new Date(sale.date).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs">₹{sale.total.toFixed(2)}</TableCell>
                              <TableCell className="text-xs capitalize hidden sm:table-cell">{sale.payment_method}</TableCell>
                              <TableCell className="text-xs hidden sm:table-cell">
                                {sale.refunded ? (
                                  <span className="text-destructive">Refunded</span>
                                ) : (
                                  <span className="text-green-600">Active</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  className="text-xs px-2 py-1"
                                  onClick={() => {
                                    setSaleId(sale.id);
                                    setSaleSearchOpen(false);
                                  }}
                                >
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                  <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="flex-1 sm:flex-none">
                        <Search className="h-4 w-4 mr-2" />
                        By Medicine
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-base md:text-lg">Search Sales by Medicine Name</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Type medicine name to find sales..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          className="text-sm"
                          autoFocus
                        />
                        <div className="overflow-x-auto -mx-6 px-6">
                          <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Sale #</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Total</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Payment</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                            <TableHead className="text-xs">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productFilteredSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-medium text-xs">{getSaleNumber(sale.id)}</TableCell>
                              <TableCell className="text-xs">{new Date(sale.date).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs">₹{sale.total.toFixed(2)}</TableCell>
                              <TableCell className="text-xs capitalize hidden sm:table-cell">{sale.payment_method}</TableCell>
                              <TableCell className="text-xs hidden sm:table-cell">
                                {sale.refunded ? (
                                  <span className="text-destructive">Refunded</span>
                                ) : (
                                  <span className="text-green-600">Active</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  className="text-xs px-2 py-1"
                                  onClick={() => {
                                    setSaleId(sale.id);
                                    setProductSearchOpen(false);
                                  }}
                                >
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            {selectedSale && (
              <div className="p-3 md:p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <p className="text-xs md:text-sm">
                    <strong>Sale:</strong> {getSaleNumber(selectedSale.id)}
                  </p>
                  <p className="text-xs md:text-sm">
                    <strong>Date:</strong> {new Date(selectedSale.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs md:text-sm">
                    <strong>Total:</strong> ₹{selectedSale.total.toFixed(2)}
                  </p>
                  <p className="text-xs md:text-sm">
                    <strong>Payment:</strong> {selectedSale.payment_method}
                  </p>
                  <p className="text-xs md:text-sm col-span-1 sm:col-span-2 text-primary font-medium">
                    <strong>Refund Total:</strong> ₹{refundTotal.toFixed(2)}
                  </p>
                </div>
                {selectedSale.refunded && (
                  <p className="text-xs md:text-sm text-destructive">⚠️ This sale has already been refunded</p>
                )}
                {saleItems.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm md:text-base font-medium mb-2">Select Items to Refund:</p>
                    <div className="space-y-2">
                      {saleItems.map(item => {
                        const isSelected = selectedItems[item.id]?.selected || false;
                        const quantity = selectedItems[item.id]?.quantity || item.quantity;
                        return (
                          <div key={item.id} className="flex items-start gap-2 p-2 border rounded bg-background">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(item.id)}
                              className="mt-1 h-4 w-4 rounded border-input"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs md:text-sm font-medium truncate">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">
                                ₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                              </p>
                              {isSelected && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs">Qty:</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => updateItemQuantity(item.id, quantity - 1, item.quantity)}
                                  >
                                    -
                                  </Button>
                                  <span className="text-xs w-8 text-center">{quantity}</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0"
                                    onClick={() => updateItemQuantity(item.id, quantity + 1, item.quantity)}
                                  >
                                    +
                                  </Button>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    Refund: ₹{(item.price * quantity).toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="reason" className="text-sm md:text-base">Refund Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for refund"
                required
                className="text-sm md:text-base min-h-[80px]"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full text-sm md:text-base" 
              disabled={loading || !selectedSale || selectedSale.refunded || refundTotal === 0}
            >
              {loading ? "Processing..." : `Process Refund (₹${refundTotal.toFixed(2)})`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}