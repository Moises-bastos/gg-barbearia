import { useNavigate } from "react-router-dom";

import Navbar from "../../../components/Navbar";
import Hero from "../../../components/Hero";
import Services from "../../../components/Services";
import About from "../../../components/About";
import Footer from "../../../components/Footer";

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <button
        type="button"
        className="botao-cancelar-home"
        onClick={() =>
          navigate("/cancelar-agendamento")
        }
      >
         Cancelar agendamento
      </button>

      <Hero />

      <Services />

      <About />

      <Footer />
    </>
  );
}

export default Home;