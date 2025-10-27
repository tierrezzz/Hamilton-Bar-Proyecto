// Componentes
import Header from "./components/Header";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
// sections
import Reservas from "./sections/Reservas";
import Ubicacion from "./sections/Ubicacion";
import SobreNosotros from "./sections/SobreNosotros";
import Carta from "./sections/Carta";



function App() {

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50 to bg-orange-50">
      <Header />
      <Navbar />
      <main className="max-w-6xl mx-auto px-4">
        <Reservas />
        <Ubicacion />
        <SobreNosotros />
        <Carta />
      </main>
      <Footer />
    </div>
  )
}

export default App
