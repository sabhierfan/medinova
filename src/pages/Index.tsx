import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { FeatureCard } from "@/components/FeatureCard";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Brain, 
  Calendar, 
  BarChart3, 
  Zap, 
  CheckCircle2,
  Users,
  ArrowRight,
  Star
} from "lucide-react";
import heroImage from "@/assets/hero-medical-ai.jpg";
import { MedinovaChatbot } from "@/components/MedinovaChatbot";


const Index = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Scheduling",
      description: "Intelligent appointment management that learns from patterns and optimizes booking times automatically."
    },
    {
      icon: Calendar,
      title: "Smart Reminders",
      description: "Automated reminders and conflict detection to reduce no-shows and scheduling conflicts."
    },
    {
      icon: BarChart3,
      title: "Predictive Analytics",
      description: "Data-driven insights that help predict patient trends and optimize resource allocation."
    },
    {
      icon: Zap,
      title: "Resource Optimization",
      description: "Maximize efficiency with AI-powered resource management and capacity planning."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Patient Books",
      description: "Patient schedules appointment through intuitive interface"
    },
    {
      number: "02",
      title: "AI Optimizes",
      description: "System predicts optimal time based on historical data"
    },
    {
      number: "03",
      title: "Auto Reminders",
      description: "Smart notifications sent at perfect intervals"
    },
    {
      number: "04",
      title: "Analytics Insight",
      description: "Doctors view comprehensive analytics dashboard"
    }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Chief of Medicine",
      content: "AI-Medico reduced our no-show rates by 45% and improved patient satisfaction significantly.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Healthcare Administrator",
      content: "The predictive analytics have been game-changing for our resource planning and staff scheduling.",
      rating: 5
    },
    {
      name: "Dr. James Wilson",
      role: "Family Practitioner",
      content: "Finally, a scheduling system that understands the complexity of modern healthcare practices.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background"></div>
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-foreground">
                Revolutionizing Medical Appointments with{" "}
                <span className="text-foreground underline decoration-2 underline-offset-4">
                  AI Intelligence
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                AI-Medico helps patients and healthcare providers manage appointments smarter, 
                faster, and more efficiently with cutting-edge artificial intelligence.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="hero" size="lg" className="group">
                  Book Appointment
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </div>
            </div>
            <div className="animate-slide-up">
              <img 
                src={heroImage} 
                alt="AI-powered medical scheduling dashboard" 
                className="rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              The Challenge with Traditional Scheduling
            </h2>
            <p className="text-lg text-muted-foreground">
              Healthcare providers lose thousands of hours yearly to inefficient appointment management, 
              missed appointments, and manual scheduling conflicts. AI-Medico solves this with intelligent automation.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Powered by Advanced AI
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our intelligent features work together to create a seamless scheduling experience
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <FeatureCard {...feature} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics Dashboard Preview */}
      <section id="analytics" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-lg">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                  Data-Driven Decision Making
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Get comprehensive insights into patient trends, appointment patterns, 
                  and resource utilization with our advanced analytics dashboard.
                </p>
                <ul className="space-y-4">
                  {[
                    "Real-time appointment analytics",
                    "Patient flow predictions",
                    "Resource utilization metrics",
                    "Custom reporting tools"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-muted rounded-xl p-6 border border-border">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Weekly Appointments</span>
                    <span className="text-2xl font-bold text-foreground">+24%</span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-foreground rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">156</div>
                      <div className="text-xs text-muted-foreground">This Week</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">12</div>
                      <div className="text-xs text-muted-foreground">Cancelled</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">98%</div>
                      <div className="text-xs text-muted-foreground">Show Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Four simple steps to transform your healthcare scheduling
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-card rounded-xl p-6 border border-border hover:border-foreground/30 transition-all duration-300 hover:shadow-lg">
                  <div className="text-5xl font-bold text-muted-foreground/30 mb-4">{step.number}</div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Trusted by Healthcare Professionals
            </h2>
            <p className="text-lg text-muted-foreground">
              See what doctors and administrators are saying
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card border-border hover:border-foreground/20 transition-all duration-300 hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-foreground text-foreground" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-primary rounded-2xl p-12 text-center">
            <Users className="h-16 w-16 text-primary-foreground mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
              Bring Intelligence to Healthcare Scheduling
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join hundreds of healthcare providers already using AI-Medico to transform their practice
            </p>
            <Button variant="secondary" size="lg" className="group">
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-primary rounded-lg">
                  <Brain className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">AI-Medico</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Revolutionizing healthcare scheduling with AI intelligence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#analytics" className="hover:text-foreground transition-colors">Analytics</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#about" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#contact" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2025 AI-Medico. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
      <MedinovaChatbot />
    </div>
  );
};

export default Index;
