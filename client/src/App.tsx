import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import ConverterPage from "@/pages/converter";
import NoteEditorPage from "@/pages/note-editor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ConverterPage} />
      <Route path="/notes/:id" component={NoteEditorPage} />
      <Route component={ConverterPage} />
    </Switch>
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
