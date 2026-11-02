import "./style.css";

function Hero() {
  return (
    <section className="hero">
      {/* Tesoura decorativa */}
      <div className="hero-scissors" aria-hidden="true">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="25"
            cy="78"
            r="13"
            stroke="currentColor"
            strokeWidth="4"
          />

          <circle
            cx="75"
            cy="78"
            r="13"
            stroke="currentColor"
            strokeWidth="4"
          />

          <path
            d="M43 57 L15 13"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M57 57 L85 13"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M43 57 L25 78"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M57 57 L75 78"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <circle cx="50" cy="55" r="5" fill="currentColor" />
        </svg>
      </div>

      <h1>GG Barbearia</h1>

      <p>Tradição, estilo e atendimento de qualidade para você.</p>

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
