import "./style.css";

function Hero() {
  return (
    <section className="hero">
      <h1>GG Barbearia</h1>

      <p>
        Tradição, estilo e atendimento de qualidade para você.
      </p>

      <button
        onClick={() =>
          document
            .getElementById("servicos")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      >
        Agendar Horário
      </button>
    </section>
  );
}

export default Hero;