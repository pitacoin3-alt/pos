import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Printer, Upload, Users, Shield, Database, AlertTriangle, Link2, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { ShopSettings } from "@/lib/storage";
import { useUsers, UserRole } from "@/hooks/useUsers";
import { useRole } from "@/hooks/useRole";
import { usePermissions } from "@/hooks/usePermissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useResetData, DataType } from "@/hooks/useResetData";
import { getCurrentSupabaseUrl, isUsingCustomConfig, supabase } from "@/integrations/supabase/client";
import { clearSupabaseConfig } from "@/lib/supabaseConfig";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { settings: currentSettings, updateSettings, loading } = useSettings();
  const [settings, setSettings] = useState<ShopSettings>(currentSettings);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(currentSettings.logo);
  const { users, loading: usersLoading, updateUserRole } = useUsers();
  const { role: currentUserRole } = useRole();
  const { permissions, loading: permissionsLoading, updatePermission } = usePermissions();
  const { isResetting, resetSelectedData, resetAllData } = useResetData();
  
  const isAdmin = currentUserRole === 'admin';

  // Sync local state when settings load from database
  useEffect(() => {
    if (!loading) {
      setSettings(currentSettings);
      setLogoPreview(currentSettings.logo);
    }
  }, [loading, currentSettings]);
  
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>([]);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetAllConfirmText, setResetAllConfirmText] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const exportAllData = async () => {
    setIsExporting(true);
    try {
      // Fetch all data
      const [
        productsRes,
        salesRes,
        saleItemsRes,
        refundsRes,
        refundItemsRes,
        creditCustomersRes,
        creditTransactionsRes,
        shopSettingsRes,
      ] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('sale_items').select('*'),
        supabase.from('refunds').select('*'),
        supabase.from('refund_items').select('*'),
        supabase.from('credit_customers').select('*'),
        supabase.from('credit_transactions').select('*'),
        supabase.from('shop_settings').select('*'),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: {
          products: productsRes.data || [],
          sales: salesRes.data || [],
          sale_items: saleItemsRes.data || [],
          refunds: refundsRes.data || [],
          refund_items: refundItemsRes.data || [],
          credit_customers: creditCustomersRes.data || [],
          credit_transactions: creditTransactionsRes.data || [],
          shop_settings: shopSettingsRes.data || [],
        },
        summary: {
          products: productsRes.data?.length || 0,
          sales: salesRes.data?.length || 0,
          refunds: refundsRes.data?.length || 0,
          credit_customers: creditCustomersRes.data?.length || 0,
        }
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.summary.products} products, ${exportData.summary.sales} sales, ${exportData.summary.credit_customers} customers`);
    } catch (error: any) {
      toast.error('Failed to export data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const pages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/pos', name: 'POS' },
    { path: '/products', name: 'Products' },
    { path: '/sales', name: 'Sales History' },
    { path: '/credit-customers', name: 'Credit Customers' },
    { path: '/refund', name: 'Process Refund' },
    { path: '/refunds', name: 'Refund History' },
    { path: '/profit-analysis', name: 'Profit Analysis' },
    { path: '/settings', name: 'Settings' },
  ];

  const roles: Array<'admin' | 'manager' | 'cashier' | 'viewer'> = ['admin', 'manager', 'cashier', 'viewer'];

  const getPermission = (role: string, pagePath: string) => {
    return permissions.find(p => p.role === role && p.page_path === pagePath);
  };

  const handleResetSelected = async () => {
    if (confirmText !== "RESET") {
      toast.error("Please type RESET to confirm");
      return;
    }
    
    const { error } = await resetSelectedData(selectedDataTypes);
    
    if (error) {
      toast.error("Failed to reset data: " + error.message);
    } else {
      toast.success("Selected data reset successfully! Refreshing...");
      setSelectedDataTypes([]);
      setConfirmText("");
      setShowResetDialog(false);
      // Reload page to refresh all data
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleResetAll = async () => {
    if (resetAllConfirmText !== "RESET ALL") {
      toast.error("Please type RESET ALL to confirm");
      return;
    }
    
    const { error } = await resetAllData();
    
    if (error) {
      toast.error("Failed to reset all data: " + error.message);
    } else {
      toast.success("All data reset successfully! Refreshing...");
      setResetAllConfirmText("");
      setShowResetAllDialog(false);
      // Reload page to refresh all data
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const toggleDataType = (type: DataType) => {
    setSelectedDataTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await updateSettings(settings);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Settings saved successfully!");
      window.location.reload();
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSettings({ ...settings, logo: base64 });
        setLogoPreview(base64);
        toast.success("Logo uploaded! Don't forget to save settings.");
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your shop</p>
      </div>

      <Tabs defaultValue="shop" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-2'}`}>
          <TabsTrigger value="shop" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Shop
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Printer
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data
              </TabsTrigger>
              <TabsTrigger value="connection" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Connection
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="shop">
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
              <CardDescription>Update your shop name, logo, and currency settings</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Shop Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="logo">Shop Logo</Label>
                  <div className="mt-2 space-y-3">
                    {logoPreview && (
                      <div className="flex items-center gap-4">
                        <img 
                          src={logoPreview} 
                          alt="Shop logo" 
                          className="h-20 w-20 object-contain rounded border bg-muted/30"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSettings({ ...settings, logo: undefined });
                            setLogoPreview(undefined);
                          }}
                        >
                          Remove Logo
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('logo')?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {logoPreview ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      <span className="text-sm text-muted-foreground">Max 2MB, JPG/PNG</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency Symbol</Label>
                    <Input
                      id="currency"
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      required
                      placeholder="e.g., ₹, $, €"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      value={settings.tax_rate}
                      onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Save Shop Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printer">
          <Card>
            <CardHeader>
              <CardTitle>Printer Settings</CardTitle>
              <CardDescription>Configure default printer options for receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="printer_name">Printer Name</Label>
                  <Input
                    id="printer_name"
                    value={settings.printer_name || ""}
                    onChange={(e) => setSettings({ ...settings, printer_name: e.target.value })}
                    placeholder="e.g., Thermal Printer"
                  />
                </div>

                <div>
                  <Label htmlFor="printer_width">Paper Width</Label>
                  <Select
                    value={settings.printer_width || "80mm"}
                    onValueChange={(value) => setSettings({ ...settings, printer_width: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm (Small)</SelectItem>
                      <SelectItem value="80mm">80mm (Standard)</SelectItem>
                      <SelectItem value="a4">A4 (Full Page)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Print Receipts</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically print receipt after each sale
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_print || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, auto_print: checked })}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Save Printer Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user roles and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <p className="text-muted-foreground">Loading users...</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>
                              {user.role ? (
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {user.role}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No Role</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role || 'none'}
                                onValueChange={async (value) => {
                                  if (value === 'none') return;
                                  const { error } = await updateUserRole(user.id, value as UserRole);
                                  if (error) {
                                    toast.error('Failed to update role');
                                  } else {
                                    toast.success('Role updated successfully');
                                  }
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="cashier">Cashier</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle>Page Access Permissions</CardTitle>
                  <CardDescription>Configure which pages each role can access</CardDescription>
                </CardHeader>
                <CardContent>
                  {permissionsLoading ? (
                    <p className="text-muted-foreground">Loading permissions...</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Page</TableHead>
                            {roles.map(role => (
                              <TableHead key={role} className="text-center capitalize">
                                <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                                  {role}
                                </Badge>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pages.map(page => (
                            <TableRow key={page.path}>
                              <TableCell className="font-medium">{page.name}</TableCell>
                              {roles.map(role => {
                                const permission = getPermission(role, page.path);
                                const isChecked = permission?.can_access ?? false;
                                const isAdminRole = role === 'admin';
                                
                                return (
                                  <TableCell key={role} className="text-center">
                                    <Checkbox
                                      checked={isChecked}
                                      disabled={isAdminRole}
                                      onCheckedChange={async (checked) => {
                                        const { error } = await updatePermission(
                                          role,
                                          page.path,
                                          checked as boolean
                                        );
                                        if (error) {
                                          toast.error('Failed to update permission');
                                        } else {
                                          toast.success('Permission updated');
                                        }
                                      }}
                                      className="mx-auto"
                                    />
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <p className="text-xs text-muted-foreground mt-4">
                        Note: Admin role always has access to all pages
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Data Management (Danger Zone)
                  </CardTitle>
                  <CardDescription>
                    Permanently delete data from your system. This action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Selective Reset */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Select data to reset:</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="products"
                            checked={selectedDataTypes.includes('products')}
                            onCheckedChange={() => toggleDataType('products')}
                          />
                          <Label htmlFor="products" className="cursor-pointer">
                            Products - All products and inventory
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sales"
                            checked={selectedDataTypes.includes('sales')}
                            onCheckedChange={() => toggleDataType('sales')}
                          />
                          <Label htmlFor="sales" className="cursor-pointer">
                            Sales History - All sales and sale items
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="refunds"
                            checked={selectedDataTypes.includes('refunds')}
                            onCheckedChange={() => toggleDataType('refunds')}
                          />
                          <Label htmlFor="refunds" className="cursor-pointer">
                            Refund History - All refunds and refund items
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="credit_customers"
                            checked={selectedDataTypes.includes('credit_customers')}
                            onCheckedChange={() => toggleDataType('credit_customers')}
                          />
                          <Label htmlFor="credit_customers" className="cursor-pointer">
                            Credit Customers - All credit customers and transactions
                          </Label>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      onClick={() => setShowResetDialog(true)}
                      disabled={selectedDataTypes.length === 0 || isResetting}
                      className="w-full"
                    >
                      <Database className="mr-2 h-4 w-4" />
                      {isResetting ? "Resetting..." : "Reset Selected Data"}
                    </Button>
                  </div>

                  <div className="border-t pt-6">
                    <div className="rounded-lg border-2 border-destructive/20 bg-destructive/5 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-destructive">Reset All Data</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            This will delete all products, sales, refunds, and credit customers. 
                            Shop settings and user accounts will be preserved.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setShowResetAllDialog(true)}
                        disabled={isResetting}
                        className="w-full"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {isResetting ? "Resetting..." : "Reset Everything"}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> User accounts, roles, and shop settings will NOT be deleted.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connection">
              <Card>
                <CardHeader>
                  <CardTitle>Database Connection</CardTitle>
                  <CardDescription>Manage your Supabase database connection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Current Supabase URL</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                      {getCurrentSupabaseUrl() || 'Not configured'}
                    </div>
                  </div>

                  <div>
                    <Label>Configuration Source</Label>
                    <div className="mt-1">
                      <Badge variant={isUsingCustomConfig() ? "default" : "secondary"}>
                        {isUsingCustomConfig() ? "Custom Configuration" : "Default (Environment)"}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <Alert>
                      <Download className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Before switching:</strong> Export your data to avoid losing any information.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={exportAllData}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {isExporting ? 'Exporting...' : 'Export All Data (JSON)'}
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/setup`, '_blank')}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Setup New Database Connection
                    </Button>

                    {isUsingCustomConfig() && (
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => {
                          if (confirm('Are you sure? This will reset to default database connection.')) {
                            clearSupabaseConfig();
                            toast.success('Configuration cleared. Reloading...');
                            setTimeout(() => window.location.reload(), 1000);
                          }
                        }}
                      >
                        Reset to Default Connection
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Use the setup page to connect this app to a different Supabase project for another store.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Reset Selected Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {selectedDataTypes.includes('products') && <li>All products and inventory</li>}
                {selectedDataTypes.includes('sales') && <li>All sales history</li>}
                {selectedDataTypes.includes('refunds') && <li>All refund history</li>}
                {selectedDataTypes.includes('credit_customers') && <li>All credit customers and transactions</li>}
              </ul>
              <p className="font-semibold text-destructive">This action cannot be undone!</p>
              <div className="mt-4">
                <Label htmlFor="confirm-reset">Type <strong>RESET</strong> to confirm:</Label>
                <Input
                  id="confirm-reset"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESET"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetSelected}
              disabled={confirmText !== "RESET" || isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? "Resetting..." : "Delete Selected Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset All Dialog */}
      <AlertDialog open={showResetAllDialog} onOpenChange={setShowResetAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset ALL Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold">This is the most destructive action!</p>
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All products and inventory</li>
                <li>Complete sales history</li>
                <li>All refund records</li>
                <li>All credit customers and transactions</li>
              </ul>
              <p className="font-semibold text-destructive">
                User accounts and shop settings will be preserved.
              </p>
              <p className="font-semibold text-destructive">
                THIS ACTION CANNOT BE UNDONE!
              </p>
              <div className="mt-4">
                <Label htmlFor="confirm-reset-all">Type <strong>RESET ALL</strong> to confirm:</Label>
                <Input
                  id="confirm-reset-all"
                  value={resetAllConfirmText}
                  onChange={(e) => setResetAllConfirmText(e.target.value)}
                  placeholder="RESET ALL"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetAllConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAll}
              disabled={resetAllConfirmText !== "RESET ALL" || isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? "Resetting..." : "Delete All Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}