import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, X, LayoutDashboard, Ship, Users, FileText, MapPin, AlertTriangle, Wrench, AlertCircle, ShieldAlert, CheckSquare, Bot, UserCog, LogOut } from 'lucide-react';

const Layout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/vessels', icon: Ship, label: 'Vessels' },
    { path: '/crew', icon: Users, label: 'Crew' },
    { path: '/trips', icon: MapPin, label: 'Trips' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/risk-assessment', icon: AlertTriangle, label: 'Risk Assessment' },
    { path: '/incidents', icon: AlertCircle, label: 'Incidents' },
    { path: '/emergency', icon: ShieldAlert, label: 'Emergency' },
    { path: '/compliance', icon: CheckSquare, label: 'Compliance' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
    { path: '/admin', icon: UserCog, label: 'Admin Panel' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link to="/dashboard">
          <h2 className="text-xl font-bold text-blue-900 cursor-pointer hover:text-blue-700 transition-colors">AMSA Safety</h2>
        </Link>
        <p className="text-sm text-gray-500 mt-1">{user?.full_name}</p>
        <p className="text-xs text-gray-400">{user?.role}</p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-white border-r">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <Link to="/dashboard">
              <h1 className="text-xl font-bold text-blue-900 cursor-pointer hover:text-blue-700 transition-colors">Safety Management System</h1>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="md:hidden">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;