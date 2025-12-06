import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setSupabaseConfig } from "@/lib/supabaseConfig";
import { DATABASE_SCHEMA } from "@/lib/databaseSchema";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, Loader2, AlertTriangle, Database, Key, Link, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = 'credentials' | 'testing' | 'detecting' | 'success';

interface SchemaStatus {
  hasProducts: boolean;
  hasSales: boolean;
  hasProfiles: boolean;
  hasShopSettings: boolean;
  isComplete: boolean;
}

export default function Setup() {
  const [step, setStep] = useState<Step>('credentials');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  const addProgress = (message: string) => {
    setProgress(prev => [...prev, message]);
  };

  const detectSchema = async () => {
    if (!url || !anonKey) {
      toast.error('Please enter Supabase URL and Anon Key');
      return;
    }

    setIsLoading(true);
    setStep('detecting');
    setProgress([]);
    addProgress('Detecting existing schema...');

    try {
      const testClient = createClient(url, anonKey);
      
      // Check for key tables
      const checks = await Promise.all([
        testClient.from('products').select('id').limit(1),
        testClient.from('sales').select('id').limit(1),
        testClient.from('profiles').select('id').limit(1),
        testClient.from('shop_settings').select('id').limit(1),
      ]);

      const hasProducts = !checks[0].error || !checks[0].error.message.includes('does not exist');
      const hasSales = !checks[1].error || !checks[1].error.message.includes('does not exist');
      const hasProfiles = !checks[2].error || !checks[2].error.message.includes('does not exist');
      const hasShopSettings = !checks[3].error || !checks[3].error.message.includes('does not exist');

      const status: SchemaStatus = {
        hasProducts,
        hasSales,
        hasProfiles,
        hasShopSettings,
        isComplete: hasProducts && hasSales && hasProfiles && hasShopSettings,
      };

      setSchemaStatus(status);
      
      addProgress(`Products table: ${hasProducts ? '✓ Found' : '✗ Missing'}`);
      addProgress(`Sales table: ${hasSales ? '✓ Found' : '✗ Missing'}`);
      addProgress(`Profiles table: ${hasProfiles ? '✓ Found' : '✗ Missing'}`);
      addProgress(`Shop Settings table: ${hasShopSettings ? '✓ Found' : '✗ Missing'}`);
      
      if (status.isComplete) {
        addProgress('');
        addProgress('✓ Schema appears complete! You can connect directly.');
        toast.success('Existing schema detected!');
      } else {
        addProgress('');
        addProgress('Schema is incomplete. Run the SQL schema first.');
        toast.info('Schema incomplete - run SQL in Supabase first');
      }

      setStep('credentials');
    } catch (error: any) {
      addProgress('✗ Detection failed: ' + error.message);
      toast.error('Failed to detect schema');
      setStep('credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!url || !anonKey) {
      toast.error('Please enter Supabase URL and Anon Key');
      return;
    }

    setIsLoading(true);
    setStep('testing');
    addProgress('Testing connection to Supabase...');

    try {
      const testClient = createClient(url, anonKey);
      
      // Test basic connectivity
      const { error } = await testClient.from('_test_connection').select('*').limit(1);
      
      // Even if table doesn't exist, connection should work
      if (error && !error.message.includes('does not exist') && !error.message.includes('permission denied')) {
        throw new Error(error.message);
      }

      addProgress('✓ Connection successful!');
      toast.success('Connection to Supabase verified!');
      setStep('credentials');
      setIsLoading(false);
    } catch (error: any) {
      addProgress('✗ Connection failed: ' + error.message);
      toast.error('Failed to connect: ' + error.message);
      setStep('credentials');
      setIsLoading(false);
    }
  };

  const copySchemaToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(DATABASE_SCHEMA);
      toast.success('SQL schema copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getProjectIdFromUrl = () => {
    try {
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      return match ? match[1] : '_';
    } catch {
      return '_';
    }
  };

  const openSqlEditor = () => {
    const projectId = getProjectIdFromUrl();
    window.open(`https://supabase.com/dashboard/project/${projectId}/sql/new`, '_blank');
  };

  const saveAndContinue = () => {
    if (!url || !anonKey) {
      toast.error('Please enter Supabase URL and Anon Key');
      return;
    }

    setSupabaseConfig({ url, anonKey });
    toast.success('Configuration saved! Redirecting...');
    
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  const handleComplete = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Database Setup</CardTitle>
          <CardDescription>
            Connect your own Supabase project to use this POS system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'credentials' && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> You need a Supabase project. Get your credentials from{' '}
                  <a 
                    href="https://supabase.com/dashboard/project/_/settings/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline text-primary"
                  >
                    Supabase Dashboard → Settings → API
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="url" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Supabase URL
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://your-project.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="anonKey" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Anon Key (public)
                  </Label>
                  <Input
                    id="anonKey"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This key is safe to use in browser applications
                  </p>
                </div>
              </div>

              {schemaStatus && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-2">Schema Detection Results:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        {schemaStatus.hasProducts ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        Products
                      </div>
                      <div className="flex items-center gap-2">
                        {schemaStatus.hasSales ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        Sales
                      </div>
                      <div className="flex items-center gap-2">
                        {schemaStatus.hasProfiles ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        Profiles
                      </div>
                      <div className="flex items-center gap-2">
                        {schemaStatus.hasShopSettings ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        Shop Settings
                      </div>
                    </div>
                    {schemaStatus.isComplete ? (
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        ✓ Schema is complete! Click "Connect to Database" below.
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600 mt-2 font-medium">
                        ⚠ Schema incomplete. Copy and run the SQL schema first.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={testConnection}
                  disabled={!url || !anonKey || isLoading}
                  className="flex-1"
                >
                  Test Connection
                </Button>
                <Button 
                  variant="outline"
                  onClick={detectSchema}
                  disabled={!url || !anonKey || isLoading}
                  className="flex-1"
                >
                  Detect Schema
                </Button>
              </div>

              {/* Schema Section */}
              <Card className="border-dashed">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Database Schema (for new projects)</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSchema(!showSchema)}
                    >
                      {showSchema ? 'Hide' : 'Show'} SQL
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    For a new Supabase project, copy the SQL schema and run it in Supabase SQL Editor:
                  </p>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={copySchemaToClipboard}
                      className="flex-1"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy SQL Schema
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={openSqlEditor}
                      disabled={!url}
                      className="flex-1"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open SQL Editor
                    </Button>
                  </div>

                  {showSchema && (
                    <div className="bg-muted rounded-lg p-3 max-h-60 overflow-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                        {DATABASE_SCHEMA}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    After running SQL schema
                  </span>
                </div>
              </div>

              <Button 
                onClick={saveAndContinue}
                disabled={!url || !anonKey}
                className="w-full"
              >
                Connect to Database
              </Button>
            </>
          )}

          {(step === 'testing' || step === 'detecting') && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-4 max-h-60 overflow-y-auto">
                {progress.map((msg, i) => (
                  <p key={i} className="text-sm font-mono">
                    {msg}
                  </p>
                ))}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Setup Complete!</h3>
                <p className="text-muted-foreground">
                  Your database is connected. You can now create your first user account.
                </p>
              </div>
              <Button onClick={handleComplete} className="w-full">
                Continue to App
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
