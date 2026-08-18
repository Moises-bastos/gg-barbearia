import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [logado, setLogado] = useState(false);
  const [mensalidadeAtiva, setMensalidadeAtiva] = useState(false);

  useEffect(() => {
    async function verificarUsuario() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLogado(false);
        setLoading(false);
        return;
      }

      setLogado(true);

      const { data, error } = await supabase
        .from("assinatura")
        .select("vence_em")
        .eq("id", 1)
        .single();

      if (error) {
        console.log("Erro ao verificar mensalidade:", error);
        setMensalidadeAtiva(false);
        setLoading(false);
        return;
      }

      const hoje = new Date().toISOString().split("T")[0];

      setMensalidadeAtiva(hoje <= data.vence_em);

      setLoading(false);
    }

    verificarUsuario();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#26241f",
          color: "#E6D2B5",
          fontSize: "22px",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!logado) {
    return <Navigate to="/login" replace />;
  }

  if (!mensalidadeAtiva) {
    return <Navigate to="/mensalidade" />;
  }

  return children;
}

export default ProtectedRoute;