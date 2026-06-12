import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/state/authContext';
import Navbar from '@/shared/components/Navbar';
import { Toaster } from '@/shared/ui/toaster';
import AppRoutes from '@/appRoutes';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
