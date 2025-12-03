import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/App';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Ship, FileText, AlertTriangle, Users, 
  Wrench, AlertCircle, Shield, Clipboard, Bot, LogOut, Menu, UserCog
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, config } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm" style={{ backgroundColor: '#1a3a52' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:text-teal-300"
              data-testid="sidebar-toggle"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">{config?.organization_name || 'AMSA'} SMS</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user?.full_name}</p>
              <p className="text-xs text-teal-200 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="text-white hover:text-red-300"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`${
            isMobile ? 'fixed left-0 top-[73px] z-50 h-[calc(100vh-73px)]' : 'relative'
          } ${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden`}
          style={{ minHeight: 'calc(100vh - 73px)' }}
        >
          <div className="p-4 space-y-2 overflow-y-auto h-full">
            {menuItems.map((item) => (
              <button
                key={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={isActive(item.path) ? { backgroundColor: '#1dd1a1' } : {}}
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