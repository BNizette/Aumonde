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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <Waves className="absolute top-20 left-10 w-32 h-32 text-blue-400" />
        <Anchor className="absolute bottom-20 right-20 w-24 h-24 text-teal-400" />
        <Shield className="absolute top-1/2 right-10 w-28 h-28 text-blue-300" />
      </div>
      
      <Card data-testid="login-card" className="w-full max-w-md relative z-10 bg-slate-900/80 backdrop-blur-xl border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
            <Anchor className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">
            AMSA SMS
          </CardTitle>
          <CardDescription className="text-slate-300">
            Safety Management System for Australian Maritime
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="full_name" className="text-slate-200">Full Name</Label>
                  <Input
                    id="full_name"
                    data-testid="full-name-input"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-slate-200">Role</Label>
                  <select
                    id="role"
                    data-testid="role-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2 rounded-md bg-slate-800 border-slate-700 text-white border"
                  >
                    <option value="owner">Owner/Operator</option>
                    <option value="master">Master</option>
                    <option value="crew">Crew</option>
                    <option value="designated_person">Designated Person</option>
                    <option value="inspector">AMSA Inspector</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="organization" className="text-slate-200">Organization</Label>
                  <Input
                    id="organization"
                    data-testid="organization-input"
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            
            <Button 
              type="submit" 
              data-testid="submit-button"
              className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
            
            <div className="text-center">
              <button
                type="button"
                data-testid="toggle-auth-button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;