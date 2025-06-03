import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-900 animate-fade-in">
      <Card className="w-full max-w-md mx-4 animate-scale-in animate-delay-100 transition-all hover-lift">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 animate-slide-in-left animate-delay-200">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 animate-slide-in-right animate-delay-300">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
