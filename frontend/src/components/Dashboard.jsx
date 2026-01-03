import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Ship, Users, FileText, AlertCircle, MapPin, Wrench, AlertTriangle, Phone, Shield, UserPlus, Bot, UserCog, Plus, ChevronRight, ExternalLink, Link as LinkIcon } from 'lucide-react';
import HelpDialog from './HelpDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getIconTitle = (icon) => {
  switch (icon) {
    case '+': return 'Add, modify or delete';
    case '>': return 'Hyperlink to module';
    case '=': return 'Hyperlink to record';
    case '^': return 'Open in new tab';
    default: return '';
  }
};

// Menu item component with icon indicators - moved outside Dashboard
const MenuItem = ({ label, path, icons = [], navigate }) => (
  <div 
    className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm"
    onClick={() => navigate(path)}
    data-testid={`menu-item-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <span className="text-gray-700">{label}</span>
    <span className="flex items-center gap-1 text-xs text-gray-500">
      {icons.map((icon, idx) => (
        <span key={idx} title={getIconTitle(icon)}>{icon}</span>
      ))}
    </span>
  </div>
);

// Sub-menu item (nested under Edit/View) - moved outside Dashboard
const SubMenuItem = ({ label, path, icons = [], navigate }) => (
  <div 
    className="flex items-center justify-between py-1 px-3 hover:bg-gray-50 rounded cursor-pointer text-sm ml-4"
    onClick={() => navigate(path)}
    data-testid={`submenu-item-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <span className="text-gray-600">{label}</span>
    <span className="flex items-center gap-1 text-xs text-gray-400">
      {icons.map((icon, idx) => (
        <span key={idx}>{icon}</span>
      ))}
    </span>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.access_level === 'Admin';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  // Stat cards ordered to match menu structure
  const statCards = [
    {
      title: 'Trips',
      value: stats?.trips || 0,
      description: `${stats?.active_trips || 0} active`,
      icon: MapPin,
      color: 'bg-blue-500',
      link: '/trips'
    },
    {
      title: 'Passengers',
      value: stats?.passengers || 0,
      description: 'Total passengers',
      icon: UserPlus,
      color: 'bg-cyan-500',
      link: '/passengers'
    },
    {
      title: 'Crew Members',
      value: stats?.crew_members || 0,
      description: 'Total crew',
      icon: Users,
      color: 'bg-orange-500',
      link: '/crew'
    },
    {
      title: 'Vessels',
      value: stats?.vessels || 0,
      description: 'Registered vessels',
      icon: Ship,
      color: 'bg-purple-500',
      link: '/vessels'
    },
    {
      title: 'Maintenance',
      value: stats?.maintenance || 0,
      description: `${stats?.pending_maintenance || 0} pending`,
      icon: Wrench,
      color: 'bg-green-500',
      link: '/maintenance'
    },
    {
      title: 'Incidents',
      value: stats?.incidents || 0,
      description: 'Reported incidents',
      icon: AlertCircle,
      color: 'bg-red-500',
      link: '/incidents'
    },
    {
      title: 'Emergency',
      value: (stats?.emergency_contacts || 0) + (stats?.emergency_procedures || 0),
      description: `${stats?.emergency_contacts || 0} contacts, ${stats?.emergency_procedures || 0} procedures`,
      icon: Phone,
      color: 'bg-red-600',
      link: '/emergency'
    },
    {
      title: 'Risk Assessments',
      value: stats?.risks || 0,
      description: `${stats?.critical_risks || 0} critical`,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      link: '/risk-assessment'
    },
    {
      title: 'Compliance',
      value: stats?.certificates || 0,
      description: `${stats?.expiring_certificates || 0} expiring soon`,
      icon: Shield,
      color: 'bg-indigo-500',
      link: '/compliance'
    },
    {
      title: 'Documents',
      value: stats?.documents || 0,
      description: 'Total documents',
      icon: FileText,
      color: 'bg-teal-500',
      link: '/documents'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <HelpDialog 
          moduleKey="dashboard"
          title="Dashboard Help"
          defaultContent="Welcome to the Safety Management System Dashboard. Here you can see an overview of all modules and quickly navigate to any section."
          isAdmin={isAdmin}
        />
      </div>
      <p className="text-gray-500 mt-1">Overview of your safety management system</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link} data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-400">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium">{stat.title}</CardTitle>
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg font-bold">{stat.value}</div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {stats?.users_by_role && (
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
            <CardDescription>Distribution of user roles in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Owners</span>
                <span className="text-sm text-gray-500">{stats.users_by_role.owners}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Masters</span>
                <span className="text-sm text-gray-500">{stats.users_by_role.masters}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Crew</span>
                <span className="text-sm text-gray-500">{stats.users_by_role.crew}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Menu Structure</CardTitle>
          <CardDescription>Navigate to any module quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" data-testid="quick-links-accordion">
            {/* Trips */}
            <AccordionItem value="trips">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  Trips
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <MenuItem label="Edit Summary details" path="/trips" icons={['+']} />
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">View logs</div>
                    <SubMenuItem label="Crew" path="/trips" icons={['+', '=']} />
                    <SubMenuItem label="Shifts" path="/trips" icons={['+', '^']} />
                    <SubMenuItem label="Passengers" path="/trips" icons={['=', '+']} />
                    <SubMenuItem label="Expenditure APA" path="/trips" icons={['+', '^']} />
                    <SubMenuItem label="Pre-departure checklist" path="/trips" icons={['+']} />
                    <SubMenuItem label="Safety Briefing" path="/trips" icons={['+']} />
                    <SubMenuItem label="Running Logs" path="/trips" icons={['+', '^']} />
                    <SubMenuItem label="Engine Logs" path="/trips" icons={['+', '^']} />
                    <SubMenuItem label="Incidents" path="/trips" icons={['=']} />
                    <SubMenuItem label="Drills" path="/trips" icons={['=']} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Passengers */}
            <AccordionItem value="passengers">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-cyan-500" />
                  Passengers
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Edit</div>
                    <SubMenuItem label="Details" path="/passengers" icons={['+']} />
                    <SubMenuItem label="Medical & Dietary" path="/passengers" icons={['+']} />
                    <SubMenuItem label="Preferences" path="/passengers" icons={['+']} />
                    <SubMenuItem label="Entertainment" path="/passengers" icons={['+']} />
                    <SubMenuItem label="Photo" path="/passengers" icons={['+']} />
                  </div>
                  <MenuItem label="View Trip History" path="/passengers" icons={['+']} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Crew */}
            <AccordionItem value="crew">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  Crew
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Edit</div>
                    <SubMenuItem label="Details" path="/crew" icons={['+']} />
                    <SubMenuItem label="Qualifications" path="/crew" icons={['+']} />
                    <SubMenuItem label="Training" path="/crew" icons={['+']} />
                    <SubMenuItem label="Induction per Vessel" path="/crew" icons={['+']} />
                    <SubMenuItem label="Medical & Dietary" path="/crew" icons={['+']} />
                    <SubMenuItem label="Preferences" path="/crew" icons={['+']} />
                    <SubMenuItem label="Entertainment" path="/crew" icons={['+']} />
                    <SubMenuItem label="Photo" path="/crew" icons={['+']} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Vessels */}
            <AccordionItem value="vessels">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-purple-500" />
                  Vessels
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Edit</div>
                    <SubMenuItem label="Basic & Specs" path="/vessels" icons={['+']} />
                    <SubMenuItem label="Certificates" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Emergency" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Induction" path="/vessels" icons={['+']} />
                    <SubMenuItem label="Photo" path="/vessels" icons={['+']} />
                  </div>
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">View</div>
                    <SubMenuItem label="Details" path="/vessels" icons={[]} />
                    <SubMenuItem label="Trips" path="/vessels" icons={['+', '=']} />
                    <SubMenuItem label="Passengers" path="/vessels" icons={['=']} />
                    <SubMenuItem label="Shift Logs" path="/vessels" icons={['=']} />
                    <SubMenuItem label="Running Logs" path="/vessels" icons={['=']} />
                    <SubMenuItem label="Engine Logs" path="/vessels" icons={['=']} />
                    <SubMenuItem label="Maintenance" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Risk Assessment" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Incidents" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Compliance Certificates" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Compliance Requirements" path="/vessels" icons={[]} />
                    <SubMenuItem label="Induction" path="/vessels" icons={[]} />
                    <SubMenuItem label="Emergency Contacts" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Emergency Procedures" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Drill Logs" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Vessel Documents" path="/vessels" icons={['>']} />
                    <SubMenuItem label="Global Documents" path="/vessels" icons={['>']} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Maintenance */}
            <AccordionItem value="maintenance">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-green-500" />
                  Maintenance
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <MenuItem label="Edit" path="/maintenance" icons={['+']} />
                  <MenuItem label="View" path="/maintenance" icons={[]} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Incidents */}
            <AccordionItem value="incidents">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Incidents
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <MenuItem label="Edit" path="/incidents" icons={['+']} />
                  <MenuItem label="View" path="/incidents" icons={[]} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Emergency */}
            <AccordionItem value="emergency">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-red-600" />
                  Emergency
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <MenuItem label="Contacts" path="/emergency" icons={['+']} />
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Procedures</div>
                    <SubMenuItem label="Edit" path="/emergency" icons={['+']} />
                    <div className="ml-4 border-l pl-2 space-y-1">
                      <div className="text-xs font-medium text-gray-400 py-1">View</div>
                      <SubMenuItem label="Details" path="/emergency" icons={[]} />
                      <SubMenuItem label="Drills" path="/emergency" icons={['+']} />
                    </div>
                  </div>
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Drills</div>
                    <SubMenuItem label="Edit" path="/emergency" icons={[]} />
                    <div className="ml-4 border-l pl-2 space-y-1">
                      <div className="text-xs font-medium text-gray-400 py-1">View</div>
                      <SubMenuItem label="Details" path="/emergency" icons={[]} />
                      <SubMenuItem label="Records" path="/emergency" icons={['+']} />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Risk Assessment */}
            <AccordionItem value="risk-assessment">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Risk Assessment
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <MenuItem label="Edit" path="/risk-assessment" icons={['+']} />
                  <MenuItem label="View" path="/risk-assessment" icons={[]} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Compliance */}
            <AccordionItem value="compliance">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  Compliance
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Certificates</div>
                    <SubMenuItem label="Edit" path="/compliance" icons={['+']} />
                    <SubMenuItem label="View Cert" path="/compliance" icons={['^']} />
                  </div>
                  <MenuItem label="Requirements" path="/compliance" icons={['+']} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Documents */}
            <AccordionItem value="documents">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-500" />
                  Documents
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <MenuItem label="Manage Documents" path="/documents" icons={['+', '^']} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* AI Assistant */}
            <AccordionItem value="ai-assistant">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-500" />
                  AI Assistant
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <MenuItem label="Smart Suggestions" path="/ai-assistant" icons={[]} />
                  <MenuItem label="AI Chat" path="/ai-assistant" icons={[]} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Admin Panel */}
            <AccordionItem value="admin">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                <span className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-gray-600" />
                  Admin Panel
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  <MenuItem label="Users" path="/admin" icons={['+']} />
                  <MenuItem label="Activity Logs" path="/admin" icons={[]} />
                  <MenuItem label="Audit Trail" path="/admin" icons={[]} />
                  <MenuItem label="Sessions" path="/admin" icons={[]} />
                  <MenuItem label="SMS Revisions" path="/admin" icons={['+']} />
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Email Config</div>
                    <SubMenuItem label="Config" path="/admin" icons={[]} />
                    <SubMenuItem label="Test" path="/admin" icons={[]} />
                    <SubMenuItem label="Email Templates" path="/admin" icons={[]} />
                  </div>
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Backup & Restore</div>
                    <SubMenuItem label="Create" path="/admin" icons={['+']} />
                    <SubMenuItem label="Restore" path="/admin" icons={['+']} />
                    <SubMenuItem label="Export" path="/admin" icons={['+']} />
                    <SubMenuItem label="Schedule" path="/admin" icons={['+']} />
                    <SubMenuItem label="History" path="/admin" icons={[]} />
                  </div>
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Branding</div>
                    <SubMenuItem label="Favicon" path="/admin" icons={[]} />
                    <SubMenuItem label="Logo" path="/admin" icons={[]} />
                    <SubMenuItem label="Live URL" path="/admin" icons={[]} />
                  </div>
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <div className="text-xs font-medium text-gray-500 py-1">Settings</div>
                    <SubMenuItem label="Dropdown lists by module" path="/admin" icons={['+']} />
                  </div>
                  <MenuItem label="Roles & Permissions" path="/admin" icons={['+']} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Menu Key/Legend */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs font-medium text-gray-600 mb-2">KEY</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">+</span>
                <span>Add, modify or delete</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">&gt;</span>
                <span>Hyperlink to module</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">=</span>
                <span>Hyperlink to record</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">^</span>
                <span>Open in new tab</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
