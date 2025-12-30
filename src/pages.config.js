import Dashboard from './pages/Dashboard';
import Accommodations from './pages/Accommodations';
import Reservations from './pages/Reservations';
import Guests from './pages/Guests';
import Financial from './pages/Financial';
import Settings from './pages/Settings';
import PublicBooking from './pages/PublicBooking';


export const PAGES = {
    "Dashboard": Dashboard,
    "Accommodations": Accommodations,
    "Reservations": Reservations,
    "Guests": Guests,
    "Financial": Financial,
    "Settings": Settings,
    "PublicBooking": PublicBooking,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};