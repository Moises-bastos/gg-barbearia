import "./style.css";

function Mensalidade() {
  const chavePix = "86994458479";

  async function copiarPix() {
    await navigator.clipboard.writeText(chavePix);
    alert("Chave PIX copiada!");
  }

  return (
    <div className="mensalidade">

      <h1>💈 GG Barbearia</h1>

      <h2>Mensalidade vencida</h2>

      <p>
        Sua mensalidade está vencida e o acesso ao sistema está bloqueado.
      </p>

      <div className="pagamento">

        <h3>💰 Valor da mensalidade</h3>

        <strong>R$ 30,00</strong>

        <h3>📱 Pagamento via PIX</h3>

        <p>Chave PIX:</p>

        <div className="pix">
          <span>{chavePix}</span>

          <button onClick={copiarPix}>
            📋 Copiar PIX
          </button>
        </div>

        <p>
          Após realizar o pagamento, entre em contato para que o acesso
          seja liberado.
        </p>

      </div>

    </div>
  );
}

export default Mensalidade;