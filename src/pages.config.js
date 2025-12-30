import Dashboard from './pages/Dashboard';
import Accommodations from './pages/Accommodations';
import Reservations from './pages/Reservations';
import Guests from './pages/Guests';


export const PAGES = {
    "Dashboard": Dashboard,
    "Accommodations": Accommodations,
    "Reservations": Reservations,
    "Guests": Guests,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};