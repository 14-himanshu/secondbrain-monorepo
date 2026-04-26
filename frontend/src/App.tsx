import { Dashboard } from "./pages/dashboard";
import { Signin } from "./pages/Signin";
import { Signup } from "./pages/Signup";
import { PublicView } from "./pages/PublicView";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/share/:hash" element={<PublicView />} />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
