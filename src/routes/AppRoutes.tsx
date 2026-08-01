import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Cliente/Home";
import Agendamento from "../pages/Cliente/Agendamento";

import Login from "../pages/Admin/Login";
import Dashboard from "../pages/Admin/Dashboard";

import ProtectedRoute from "../components/ProtectedRoute";
import Historico from "../pages/Admin/Historico";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/agendamento"
          element={<Agendamento />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }

        />

        <Route
          path="/historico"
          element={
            <ProtectedRoute>
              <Historico />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>


  );
}

export default AppRoutes;