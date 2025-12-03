import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API } from '@/App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Mail } from 'lucide-react';

const PasswordReset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState(token ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState(token || '');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/password-reset-request`, { email });
      
      // In development, show the token
      if (response.data.token) {
        setResetToken(response.data.token);
        setStep('reset');
        toast.success('Reset token generated! (Check console in production, this would be emailed)');
      } else {
        toast.success('If the email exists, a reset link has been sent');
      }
    } catch (error) {
      toast.error('Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/password-reset`, {
        token: resetToken,
        new_password: newPassword
      });
      
      toast.success('Password reset successfully! You can now login.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #1a3a52 0%, #2c5f7f 100%)' }}>
      <Card data-testid="password-reset-card" className="w-full max-w-md relative z-10 bg-white shadow-2xl border-gray-200 mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
            {step === 'request' ? <Mail className="w-8 h-8 text-white" /> : <KeyRound className="w-8 h-8 text-white" />}
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold" style={{ color: '#1a3a52' }}>
            {step === 'request' ? 'Reset Password' : 'Set New Password'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {step === 'request' 
              ? 'Enter your email to receive a reset link' 
              : 'Enter your new password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  data-testid="reset-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your.email@example.com"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              
              <Button 
                type="submit" 
                data-testid="request-reset-button"
                className="w-full text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #1dd1a1 0%, #00bcd4 100%)', border: 'none' }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="text-gray-700">New Password</Label>
                <Input
                  id="newPassword"
                  data-testid="new-password-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  data-testid="confirm-password-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              
              <Button 
                type="submit" 
                data-testid="reset-password-button"
                className="w-full text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #1dd1a1 0%, #00bcd4 100%)', border: 'none' }}
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordReset;
