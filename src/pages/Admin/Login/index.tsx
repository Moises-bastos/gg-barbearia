import "./style.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { erro, aviso } from "../../../utils/toast";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function fazerLogin() {
    if (!email || !senha) {
      aviso("Preencha todos os campos.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      erro("E-mail ou senha inválidos.");
      return;
    }

    const mensalidadeAtiva = await verificarMensalidade();

  if (!mensalidadeAtiva) {
  navigate("/mensalidade");
  return;
}

    navigate("/dashboard");
  }

  async function verificarMensalidade() {
    const { data, error } = await supabase
      .from("assinatura")
      .select("vence_em")
      .eq("id", 1)
      .single();

    if (error) {
      console.log("Erro ao verificar mensalidade:", error);
      return false;
    }

    const hoje = new Date();
    const vencimento = new Date(data.vence_em);

    return hoje <= vencimento;
  }

  return (
    <div className="login">
      <div className="login-box">
        <h1>Área do Barbeiro</h1>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button onClick={fazerLogin}>
          Entrar
        </button>
      </div>
    </div>
  );
}

export default Login;