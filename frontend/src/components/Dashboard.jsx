import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, Users, FileText, AlertCircle, MapPin, Wrench } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const statCards = [
    {
      title: 'Vessels',
      value: stats?.vessels || 0,
      description: 'Registered vessels',
      icon: Ship,
      color: 'bg-purple-500',
      link: '/vessels'
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
      title: 'Trips',
      value: stats?.trips || 0,
      description: `${stats?.active_trips || 0} active`,
      icon: MapPin,
      color: 'bg-blue-500',
      link: '/trips'
    },
    {
      title: 'Documents',
      value: stats?.documents || 0,
      description: 'Total documents',
      icon: FileText,
      color: 'bg-teal-500',
      link: '/documents'
    },
    {
      title: 'Maintenance',
      value: stats?.maintenance || 0,
      description: 'Pending tasks',
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
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your safety management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-400">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
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
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Access key features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">
            <p>• Manage vessels and crew in their respective sections</p>
            <p>• Track incidents and maintenance schedules</p>
            <p>• Review compliance and safety documents</p>
            <p>• Use the Admin Panel to manage users and view activity logs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;