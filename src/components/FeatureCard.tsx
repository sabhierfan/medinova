import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <Card className="bg-card border border-border hover:border-foreground/20 transition-all duration-300 hover:shadow-lg group">
      <CardHeader>
        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4 group-hover:bg-primary/80 transition-all duration-300">
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};
