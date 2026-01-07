export default function Dashboard() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Panel Administratora</h2>
      <p className="mb-4">Przegląd oczekujących rezerwacji, zapytań i ustawień.</p>
      <div className="grid grid-cols-2 gap-4">
        <a href="/admin/requests" className="block p-4 bg-white border rounded">Zapytania o wynajem</a>
        <a href="/admin/trainer-bookings" className="block p-4 bg-white border rounded">Rezerwacje trenerów</a>
        <a href="/admin/settings" className="block p-4 bg-white border rounded">Ustawienia opłat i godzin</a>
      </div>
    </div>
  );
}
