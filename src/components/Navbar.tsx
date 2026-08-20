import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Brain } from "lucide-react";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Features", path: "#features" },
    { name: "Analytics", path: "#analytics" },
    { name: "About", path: "#about" },
    { name: "Contact", path: "#contact" },
  ];

  const handleNavClick = (path: string) => {
    if (path.startsWith("#")) {
      const element = document.querySelector(path);
      element?.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-sm shadow-sm border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-primary rounded-lg group-hover:bg-primary/80 transition-all duration-300">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              AI-Medico
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.path)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
              >
                {link.name}
              </button>
            ))}
            <Link to="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
            <Link to="/admin-login">
              <Button variant="default" size="sm">
                Admin
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 bg-card rounded-lg mt-2 mb-2 border border-border">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.path)}
                className="block w-full text-left px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {link.name}
              </button>
            ))}
            <div className="px-4 pt-2 space-y-2">
              <Link to="/login" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  Login
                </Button>
              </Link>
              <Link to="/admin-login" className="block">
                <Button variant="default" size="sm" className="w-full">
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
