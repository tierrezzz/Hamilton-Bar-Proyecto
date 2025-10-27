import { useState } from "react";

function Reservas() {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedPeople, setSelectedPeople] = useState(2);
    const [selectedTime, setSelectedTime] = useState('');

    const peopleOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const timeSlots = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00']

    // Obtener la fecha mínima (hoy)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayLocal = `${yyyy}-${mm}-${dd}`;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedDate && selectedTime) {
            alert(`Reserva para ${selectedPeople} persona(s) el ${selectedDate} a las ${selectedTime}`)
            // Aca luego para ir al backend
        }
    }

    return (
        <section id="reservas" className="py-16 bg-amber-900 mt-8 rounded-lg shadow-lg">
            <div className="max-w-2xl mx-auto px-4">
                <h2 className="text-4xl font-bold text-amber-100 mb-8 text-center">Reservas</h2>
            <div className="bg-white border-amber-700 rounded-lg p-8 shadow-2xl">

                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="flex gap-4">
                        {/* Nombre */}
                        <div className="w-1/2">
                            <label className="block text-amber-900 font-semibold mb-2 text-base">Nombre</label>
                            <input 
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                className="w-full bg-amber-700 text-white rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:opacity-70 "
                            />
                        </div>

                        {/* Apellido */}
                        <div className="w-1/2">
                            <label className="block text-amber-900 font-semibold mb-2 text-base">Apellido</label>
                            <input 
                                type="text"
                                value={apellido}
                                onChange={(e) => setApellido(e.target.value)}
                                required
                                className="w-full bg-amber-700 text-white rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:opacity-70 "
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        {/* Teléfono */}
                        <div className="w-1/2">
                            <label className="block text-amber-900 font-semibold mb-2 text-base">Teléfono</label>
                            <input 
                                type="tel"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                required
                                className="w-full bg-amber-700 text-white rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:opacity-70 "
                            />
                        </div>

                        {/* Mail */}
                        <div className="w-1/2">
                            <label className="block text-amber-900 font-semibold mb-2 text-base">E-mail</label>
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-amber-700 text-white rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        {/* Fecha */}
                        <div className="w-1/2">
                            <label className="block text-amber-900 font-semibold mb-2 text-base">
                                Fecha
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={todayLocal}
                                required
                                className="w-full bg-amber-700 text-white rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>

                        {/* Personas */}
                        <div className="w-1/2">
                            <label className="block text-amber-900 font-semibold mb-2 text-base">
                                Personas
                            </label>
                            <select 
                                value={selectedPeople}
                                onChange={(e) => setSelectedPeople(e.target.value)}
                                className="w-full bg-amber-700 text-white rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                {peopleOptions.map(num => (
                                <option key={num} value={num}>
                                    {num} persona{num > 1 ? 's' : ''}
                                </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Hora */}
                    <div>
                        <label className="block text-amber-900 font-semibold mb-2 text-base">
                            Hora
                        </label>
                        <select 
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            required
                            className="w-full bg-amber-700 text-white rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="">Seleccione una hora</option>
                            {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                    </div>

                    {/* Botón Reservar */}
                    <button 
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-4 rounded-lg transition-colors shadow-lg text-lg"
                    >
                    Reservar
                    </button>
                </form>
            </div>
        </div>
    </section>
    )
}

export default Reservas