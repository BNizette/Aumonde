import { useContext } from 'react';
import { AuthContext } from '@/App';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Ship, FileText, AlertTriangle, Users, 
  Wrench, AlertCircle, Shield, Clipboard, Bot, LogOut, Menu
} from 'lucide-react';
import { useState } from 'react';

const Layout = ({ children }) => {
  const { user, logout, config } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/vessels', icon: Ship, label: 'Vessels' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/risk-assessment', icon: AlertTriangle, label: 'Risk Assessment' },
    { path: '/crew', icon: Users, label: 'Crew Management' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/incidents', icon: AlertCircle, label: 'Incidents' },
    { path: '/emergency', icon: Shield, label: 'Emergency' },
    { path: '/compliance', icon: Clipboard, label: 'Compliance' },
    { path: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-300 hover:text-white"
              data-testid="sidebar-toggle"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">AMSA SMS</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-slate-300 hover:text-red-400"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside 
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-slate-900 border-r border-slate-800 transition-all duration-300 overflow-hidden`}
          style={{ minHeight: 'calc(100vh - 73px)' }}
        >
          <div className="p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto" style={{ minHeight: 'calc(100vh - 73px)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;