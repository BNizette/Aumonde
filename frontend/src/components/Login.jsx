import { useState, useContext } from 'react';
import { AuthContext } from '@/App';
import { API } from '@/App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Anchor, Shield, Waves } from 'lucide-react';

const Login = () => {
  const { login, config } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'owner',
    organization: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API}${endpoint}`, formData);
      
      login(response.data.token, response.data.user);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #1a3a52 0%, #2c5f7f 100%)' }}>
      <div className="absolute inset-0 opacity-10 hidden md:block">
        <Waves className="absolute top-20 left-10 w-32 h-32 text-teal-300" />
        <Anchor className="absolute bottom-20 right-20 w-24 h-24 text-cyan-300" />
        <Shield className="absolute top-1/2 right-10 w-28 h-28 text-teal-200" />
      </div>
      
      <Card data-testid="login-card" className="w-full max-w-md relative z-10 bg-white shadow-2xl border-gray-200 mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
            <Anchor className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold" style={{ color: '#1a3a52' }}>
            {config?.organization_name || 'AMSA'} SMS
          </CardTitle>
          <CardDescription className="text-gray-600">
            Safety Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="full_name" className="text-gray-700">Full Name</Label>
                  <Input
                    id="full_name"
                    data-testid="full-name-input"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-gray-700">Role</Label>
                  <select
                    id="role"
                    data-testid="role-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2 rounded-md bg-white border-gray-300 text-gray-900 border"
                  >
                    <option value="owner">Owner/Operator</option>
                    <option value="master">Master</option>
                    <option value="crew">Crew</option>
                    <option value="designated_person">Designated Person</option>
                    <option value="inspector">AMSA Inspector</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="organization" className="text-gray-700">Organization</Label>
                  <Input
                    id="organization"
                    data-testid="organization-input"
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <Button 
              type="submit" 
              data-testid="submit-button"
              className="w-full text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #1dd1a1 0%, #00bcd4 100%)', border: 'none' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
            
            <div className="text-center space-y-2">
              {isLogin && (
                <div>
                  <a
                    href="/password-reset"
                    className="text-gray-600 hover:text-teal-600 text-sm"
                  >
                    Forgot password?
                  </a>
                </div>
              )}
              <div>
                <button
                  type="button"
                  data-testid="toggle-auth-button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;