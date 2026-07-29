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

  useEffect(() => {
    async function verificarUsuario() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setLogado(!!session);
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

  return children;
}

export default ProtectedRoute;