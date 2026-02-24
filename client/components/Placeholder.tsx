import { Lightbulb, MessageCircle } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function Placeholder({
  title,
  description,
  icon: Icon = Lightbulb,
}: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-primary/10 p-4 rounded-2xl mb-6">
        <Icon className="w-12 h-12 text-primary" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
        {title}
      </h2>

      <p className="text-muted-foreground text-center max-w-md mb-8">
        {description}
      </p>

      <div className="bg-clippy-50 border-l-4 border-primary rounded-lg p-4 flex items-start gap-3 max-w-md">
        <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground mb-1">Want to fill this in?</p>
          <p className="text-muted-foreground">
            Continue prompting to build out this page with full functionality.
          </p>
        </div>
      </div>
    </div>
  );
}
