import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r p-4 space-y-2">
      <nav className="flex flex-col gap-2">
        <Link to="/" className="text-blue-700">Kalendarz</Link>
        <Link to="/admin" className="text-blue-700">Panel Admin</Link>
        <Link to="/admin/settings" className="text-blue-700">Ustawienia</Link>
        <Link to="/admin/requests" className="text-blue-700">Zapytania</Link>
        <Link to="/admin/trainer-bookings" className="text-blue-700">Rezerwacje trenerów</Link>
        <Link to="/admin/calendar" className="text-blue-700">Kalendarz (admin)</Link>
        <Link to="/request" className="text-blue-700">Wynajem bez konta</Link>
      </nav>
    </aside>
  );
}
