import { Dashboard } from "./pages/dashboard";
import { Signin } from "./pages/Signin";
import { Signup } from "./pages/Signup";
import { PublicView } from "./pages/PublicView";
import IntegrationCallback from "./pages/integrations/Callback";
import AuthCallback from "./pages/AuthCallback";
import Recents from "./pages/Recents";
import { Settings } from "./pages/Settings";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/share/:shareId" element={<PublicView />} />
          <Route path="/integrations/callback" element={<IntegrationCallback />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/recents" element={<Recents />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
export default App;
