import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { authenticateUser, getCurrentUser, setCurrentUser } from "@/lib/localAuth";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<"patient" | "doctor">("patient");

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      navigate(user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await authenticateUser({ email, password });
      if (!result.success || !result.user) {
        toast.error(result.error || "Invalid credentials");
        return;
      }

      if (result.user.role !== role && result.user.role !== "admin") {
        toast.error(`This account is registered as a ${result.user.role}. Please switch role.`);
        return;
      }

      toast.success("Login successful!");
      navigate(result.user.role === "admin" ? "/admin/dashboard" : (role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard"));
    } catch (error: any) {
      toast.error("An error occurred during login");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="p-2 bg-primary rounded-lg">
              <Brain className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              AI-Medico
            </span>
          </Link>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-foreground">Login as</Label>
              <Tabs value={role} onValueChange={(v) => setRole(v as any)}>
                <TabsList className="bg-muted">
                  <TabsTrigger value="patient">Patient</TabsTrigger>
                  <TabsTrigger value="doctor">Doctor</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background border-border focus:border-foreground transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background border-border focus:border-foreground transition-colors"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6">
            <div className="text-sm font-medium text-foreground mb-3">Demo quick login</div>
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRole("patient");
                  setEmail("patient@example.com");
                  setPassword("patient123");
                  toast.message("Filled Patient demo credentials");
                }}
              >
                Use Patient demo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRole("doctor");
                  setEmail("doctor@example.com");
                  setPassword("doctor123");
                  toast.message("Filled Doctor demo credentials");
                }}
              >
                Use Doctor demo
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Tip: Admin can create these in MongoDB via <span className="font-medium">Admin Dashboard → Seed Demo Accounts</span>.
            </div>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="text-foreground hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
