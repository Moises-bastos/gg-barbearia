import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Cliente/Home";
import Agendamento from "../pages/Cliente/Agendamento";

import Login from "../pages/Admin/Login";
import Dashboard from "../pages/Admin/Dashboard";

import ProtectedRoute from "../components/ProtectedRoute";
import Historico from "../pages/Admin/Historico";
import DiasBloqueados from "../pages/Admin/DiasBloqueados";
import CancelarAgendamento from "../pages/Cliente/CancelarAgendamento";

import Mensalidade from "../pages/Mensalidade/Mensalidade";

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
          path="/cancelar-agendamento"
          element={<CancelarAgendamento />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/mensalidade"
          element={<Mensalidade />}
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
        <Route
          path="/dias-bloqueados"
          element={<DiasBloqueados />}
        />

      </Routes>
    </BrowserRouter>


  );
}

export default AppRoutes;