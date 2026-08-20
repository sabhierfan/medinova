import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { authenticateUser } from "@/lib/localAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@medinova.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await authenticateUser({ email, password });
      if (!result.success || !result.user) {
         throw new Error(result.error || "Invalid credentials");
      }
      if (result.user.role !== "admin") {
         throw new Error("Unauthorized: Invalid Admin Credentials");
      }
      
      localStorage.setItem("admin_token", "dev_local"); // keep for backwards compatibility if needed
      const redirectTo = (location.state as any)?.from?.pathname || "/admin/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const description = err?.message?.toString?.() || "Invalid credentials";
      toast({ title: "Login failed", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background"></div>
      <Card className="w-full max-w-md bg-card border-border shadow-lg relative z-10">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm mb-1 block text-foreground">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@medinova.com"
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-sm mb-1 block text-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="********"
                className="bg-background border-border"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
