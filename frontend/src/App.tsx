import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProgressoProvider } from "./hooks/useProgresso";
import { Dashboard } from "./pages/Dashboard";
import { Exercicio } from "./pages/Exercicio";
import { Login } from "./pages/Login";

function ProtectedLayout() {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" />;
  return (
    <ProgressoProvider>
      <Navbar />
      <Outlet />
    </ProgressoProvider>
  );
}

function App() {
  const token = localStorage.getItem("token");
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/exercicio" element={<Exercicio />} />
        </Route>
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
