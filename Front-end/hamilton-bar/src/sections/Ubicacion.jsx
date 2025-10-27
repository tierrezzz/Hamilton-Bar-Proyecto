function Ubicacion() {
    return (
        <section id="ubicacion" className="py-16">
            <div className="bg-linear-to-r from-orange-500 to-amber-600 rounded-lg shadow-lg p-12 text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Ubicación</h2>
                <p className="mb-6 text-orange-50">Visitanos en nuestro local</p>
                <a 
                href="https://maps.app.goo.gl/gUeUAyKQ2ytpKRu77"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-orange-600 px-8 py-3 rounded-full font-semibold hover:bg-orange-100 cursor-pointer transition-all shadow-md hover:shadow-lg">
                    Ver en el mapa
                </a>
            </div>
        </section>
    );
}

export default Ubicacion