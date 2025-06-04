import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import AppLayout from "@/components/app-layout";
import EnhancedNoteEditor from "@/components/enhanced-note-editor";
import ConverterPage from "@/pages/converter";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={EnhancedNoteEditor} />
        <Route path="/notes/:id" component={EnhancedNoteEditor} />
        <Route path="/converter" component={ConverterPage} />
        <Route component={EnhancedNoteEditor} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="markdown-converter-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
