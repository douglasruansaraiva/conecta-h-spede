import Accommodations from './pages/Accommodations';
import Financial from './pages/Financial';
import Guests from './pages/Guests';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Reports from './pages/Reports';
import Reservations from './pages/Reservations';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import PublicBooking from './pages/PublicBooking';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accommodations": Accommodations,
    "Financial": Financial,
    "Guests": Guests,
    "Home": Home,
    "Landing": Landing,
    "Reports": Reports,
    "Reservations": Reservations,
    "Dashboard": Dashboard,
    "Settings": Settings,
    "PublicBooking": PublicBooking,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};