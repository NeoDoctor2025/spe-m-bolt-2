import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-container mx-auto px-4 lg:px-6 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
