function Navbar() {

    return (
        <nav className="sticky top-0 bg-white shadow-md z-50 border-b border-orange-200">
            <ul className="flex justify-center items-center gap-12 py-4 max-w-4xl mx-auto">
                <li><a href="#inicio" className="text-2xl text-amber-900 hover:text-orange-500 transition-colors font-medium">Inicio</a></li>
                <li><a href="#reservas" className="text-2xl text-amber-900 hover:text-orange-500 transition-colors font-medium">Reservas</a></li>
                <li><a href="#ubicacion" className="text-2xl text-amber-900 hover:text-orange-500 transition-colors font-medium">Ubicacion</a></li>
                <li><a href="#sobrenosotros" className="text-2xl text-amber-900 hover:text-orange-500 transition-colors font-medium">Sobre Nosotros</a></li>
                <li><a href="#carta" className="text-2xl text-amber-900 hover:text-orange-500 transition-colors font-medium">Carta</a></li>
            </ul>
        </nav>
    );
}

export default Navbar