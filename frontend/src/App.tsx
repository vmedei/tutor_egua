import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProgressoProvider } from "./hooks/useProgresso";
import { Dashboard } from "./pages/Dashboard";
import { Exercicio } from "./pages/Exercicio";
import { Historico } from "./pages/Historico";
import { Login } from "./pages/Login";
import { Tutor } from "./pages/Tutor";

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <ProgressoProvider>
        <div className="protected-layout">
          <Navbar />
          <div className="protected-content">
            <Outlet />
          </div>
        </div>
      </ProgressoProvider>
    </ProtectedRoute>
  );
}

function App() {
  const token = localStorage.getItem("token");
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/tutor" element={<Tutor />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/exercicio" element={<Exercicio />} />
          <Route path="/historico" element={<Historico />} />
        </Route>
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
