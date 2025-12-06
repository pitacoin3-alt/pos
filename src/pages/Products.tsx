import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { Plus, Pencil, Trash2, Package, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Product } from "@/types/database";

export default function Products() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts();
  const { settings } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    cost: "",
    stock: "",
    company: "",
    category: "",
  });

  const handleExport = () => {
    if (products.length === 0) {
      toast.error("No products to export");
      return;
    }

    const csvContent = [
      ["Name", "Price", "Cost", "Stock", "Company", "Category"].join(","),
      ...products.map(p => [
        `"${p.name}"`,
        p.price,
        p.cost,
        p.stock,
        `"${p.company || ""}"`,
        `"${p.category || ""}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Products exported successfully!");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error("Invalid CSV file");
          return;
        }

        const products = lines.slice(1).map(line => {
          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          if (!matches || matches.length < 4) return null;
          
          const cleanValue = (val: string) => val?.replace(/^"|"$/g, "").trim();
          
          return {
            name: cleanValue(matches[0]),
            price: parseFloat(matches[1]),
            cost: parseFloat(matches[2]),
            stock: parseInt(matches[3]),
            company: matches[4] ? cleanValue(matches[4]) : undefined,
            category: matches[5] ? cleanValue(matches[5]) : undefined,
          };
        }).filter(p => p && p.name && !isNaN(p.price) && !isNaN(p.cost) && !isNaN(p.stock));

        if (products.length === 0) {
          toast.error("No valid products found in CSV");
          return;
        }

        let successCount = 0;
        for (const product of products) {
          const { error } = await addProduct(product as any);
          if (!error) successCount++;
        }

        toast.success(`Successfully imported ${successCount} products!`);
        e.target.value = "";
      } catch (error) {
        toast.error("Error importing products");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.cost || !formData.stock) {
      toast.error("Please fill in all required fields");
      return;
    }

    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stock: parseInt(formData.stock),
      company: formData.company || undefined,
      category: formData.category || undefined,
    };

    let result;
    if (editingProduct) {
      result = await updateProduct(editingProduct.id, productData);
      if (!result.error) {
        toast.success("Product updated successfully!");
      }
    } else {
      result = await addProduct(productData);
      if (!result.error) {
        toast.success("Product added successfully!");
      }
    }

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      company: product.company || "",
      category: product.category || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      const { error } = await deleteProduct(id);
      if (!error) {
        toast.success("Product deleted successfully!");
      } else {
        toast.error(error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      cost: "",
      stock: "",
      company: "",
      category: "",
    });
    setEditingProduct(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products & Stock</h1>
          <p className="text-muted-foreground">Manage your inventory</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => document.getElementById("csv-upload")?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Sale Price * ({settings.currency})</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost">Cost Price * ({settings.currency})</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{product.name}</h3>
                  </div>
                  {product.category && (
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm pt-2">
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">{settings.currency}{product.price}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className={`font-medium ${product.stock < 10 ? 'text-destructive' : ''}`}>
                        {product.stock}
                      </p>
                    </div>
                  </div>
                  {product.company && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Company: {product.company}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">No products yet</h3>
            <p className="text-muted-foreground">Add your first product to get started</p>
          </div>
        </Card>
      )}
    </div>
  );
}