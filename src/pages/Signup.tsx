import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser, registerUser } from "@/lib/localAuth";

const Signup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<"patient" | "doctor">("patient");

  useEffect(() => {
    const current = getCurrentUser();
    if (current) {
      navigate(current.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerUser({ fullName, email, password, role, specialization: role === "doctor" ? specialization : undefined });
      if (!result.success) {
        toast.error(result.error || "Unable to create account");
        return;
      }

      if (result.user) {
        toast.success("Account created successfully! Please log in.");
        navigate("/login", { replace: true });
      }
    } catch (error: any) {
      toast.error("An error occurred during signup");
      console.error("Signup error:", error);
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
          <h1 className="text-3xl font-bold mb-2 text-foreground">Create Account</h1>
          <p className="text-muted-foreground">
            Join AI-Medico to get started
          </p>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-foreground">Sign up as</Label>
              <Tabs value={role} onValueChange={(value) => setRole(value as "patient" | "doctor")}>
                <TabsList className="bg-muted">
                  <TabsTrigger value="patient">Patient</TabsTrigger>
                  <TabsTrigger value="doctor">Doctor</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 bg-background border-border focus:border-foreground transition-colors"
                  required
                />
              </div>
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
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-background border-border focus:border-foreground transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {role === "doctor" && (
              <div className="space-y-2">
                <Label htmlFor="specialization" className="text-foreground">Specialization</Label>
                <Input
                  id="specialization"
                  type="text"
                  placeholder="e.g. Cardiologist, General Practice"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="bg-background border-border focus:border-foreground transition-colors"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-foreground hover:underline font-medium">
              Sign in
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

export default Signup;
