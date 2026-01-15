import Accommodations from './pages/Accommodations';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Financial from './pages/Financial';
import Guests from './pages/Guests';
import Reports from './pages/Reports';
import Reservations from './pages/Reservations';
import Settings from './pages/Settings';
import Reservas from './pages/Reservas';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accommodations": Accommodations,
    "Admin": Admin,
    "Dashboard": Dashboard,
    "Financial": Financial,
    "Guests": Guests,
    "Reports": Reports,
    "Reservations": Reservations,
    "Settings": Settings,
    "Reservas": Reservas,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};