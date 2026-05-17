import { Dashboard } from "./pages/dashboard";
import { Signin } from "./pages/Signin";
import { Signup } from "./pages/Signup";
import { PublicView } from "./pages/PublicView";
import IntegrationCallback from "./pages/integrations/Callback";
import AuthCallback from "./pages/AuthCallback";
import Recents from "./pages/Recents";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents excessive re-fetching
      retry: 1, // Fail fast in dev
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/share/:shareId" element={<PublicView />} />
          <Route path="/integrations/callback" element={<IntegrationCallback />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/recents" element={/* lazy page for recents */ <Recents />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
export default App;
