import Accommodations from './pages/Accommodations';
import Dashboard from './pages/Dashboard';
import Financial from './pages/Financial';
import Guests from './pages/Guests';
import PublicBooking from './pages/PublicBooking';
import Reports from './pages/Reports';
import Reservations from './pages/Reservations';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accommodations": Accommodations,
    "Dashboard": Dashboard,
    "Financial": Financial,
    "Guests": Guests,
    "PublicBooking": PublicBooking,
    "Reports": Reports,
    "Reservations": Reservations,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};