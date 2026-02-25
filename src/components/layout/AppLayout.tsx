import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-editorial-paper editorial-grid relative">
      <div className="watermark-rb" aria-hidden="true">S</div>
      <Navbar />
      <main className="pt-16 relative z-10">
        <div className="max-w-container mx-auto px-4 lg:px-8 py-8 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
