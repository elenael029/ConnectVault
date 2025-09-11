import React, { useState, useContext, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Bell, Users, Calendar, DollarSign, Target } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // You could verify token here by calling a /me endpoint
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const forgotPassword = async (emailOrUsername) => {
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { 
        email_or_username: emailOrUsername 
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Request failed' 
      };
    }
  };

  const resetPassword = async (token, newPassword, confirmPassword) => {
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Password reset failed' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_connect-vault-crm/artifacts/sgfxttrw_Applogo.png" 
            alt="ConnectVault Logo" 
            className="max-h-24 mx-auto mb-4 object-contain"
          />
          <CardTitle className="text-2xl font-bold text-navy-900">Login to ConnectVault</CardTitle>
          <CardDescription>Access your CRM dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700 text-white"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <a 
              href="/forgot-password" 
              className="text-sm text-navy-600 hover:text-navy-800"
            >
              Forgot password?
            </a>
            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-navy-600 hover:text-navy-800 font-medium">
                Sign up
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Register Component
const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await register(formData);
    if (result.success) {
      setSuccess('Account created successfully. Please log in');
      setFormData({ full_name: '', username: '', email: '', password: '', role: 'user' });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_connect-vault-crm/artifacts/sgfxttrw_Applogo.png" 
            alt="ConnectVault Logo" 
            className="max-h-24 mx-auto mb-4 object-contain"
          />
          <CardTitle className="text-2xl font-bold text-navy-900">Create Account</CardTitle>
          <CardDescription>Join ConnectVault CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            <div>
              <Input
                type="text"
                name="full_name"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <div>
              <Input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <div>
              <Input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <div>
              <Input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700 text-white"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-navy-600 hover:text-navy-800 font-medium">
                Login
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Forgot Password Component
const ForgotPassword = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setResetLink('');

    const result = await forgotPassword(emailOrUsername);
    if (result.success) {
      setMessage(result.data.message);
      if (result.data.reset_link) {
        setResetLink(result.data.reset_link);
      }
    } else {
      setMessage(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-navy-900">Reset Password</CardTitle>
          <CardDescription>Enter your email or username</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800">{message}</AlertDescription>
              </Alert>
            )}
            {resetLink && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  <a href={resetLink} className="underline font-medium">
                    Click here to reset your password
                  </a>
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Input
                type="text"
                placeholder="Email or Username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700 text-white"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-navy-600 hover:text-navy-800">
              Back to Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Reset Password Component
const ResetPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  
  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await resetPassword(token, formData.newPassword, formData.confirmPassword);
    if (result.success) {
      setSuccess('Password reset successfully. You can now login with your new password.');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center pt-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                Invalid reset link. Please request a new password reset.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <a href="/forgot-password" className="text-navy-600 hover:text-navy-800">
                Request New Reset Link
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-navy-900">Set New Password</CardTitle>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            <div>
              <Input
                type="password"
                name="newPassword"
                placeholder="New Password"
                value={formData.newPassword}
                onChange={handleChange}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <div>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Confirm New Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700 text-white"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-navy-600 hover:text-navy-800">
              Back to Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-navy-100">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-navy-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-white rounded-lg shadow"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-navy-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-navy-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_connect-vault-crm/artifacts/sgfxttrw_Applogo.png" 
                alt="ConnectVault" 
                className="h-8 w-auto cursor-pointer"
                onClick={() => window.location.href = '/dashboard'}
              />
              <h1 className="text-xl font-bold text-navy-900">ConnectVault</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="relative">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-2 -right-2 bg-gold-500 text-navy-900 h-5 w-5 rounded-full text-xs flex items-center justify-center">
                  {summary?.tasks_due_today || 0}
                </Badge>
              </Button>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-navy-900 mb-2">Dashboard</h2>
          <p className="text-navy-600">Welcome back! Here's your CRM overview.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-navy-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-600">Total Contacts</p>
                  <p className="text-3xl font-bold text-navy-900">{summary?.total_contacts || 0}</p>
                </div>
                <div className="p-3 bg-navy-100 rounded-full">
                  <Users className="h-6 w-6 text-navy-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-navy-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-600">Tasks Due Today</p>
                  <p className="text-3xl font-bold text-navy-900">{summary?.tasks_due_today || 0}</p>
                </div>
                <div className="p-3 bg-gold-100 rounded-full">
                  <Calendar className="h-6 w-6 text-gold-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-navy-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-600">Active Offers</p>
                  <p className="text-3xl font-bold text-navy-900">{summary?.active_offers || 0}</p>
                </div>
                <div className="p-3 bg-navy-100 rounded-full">
                  <Target className="h-6 w-6 text-navy-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-navy-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-600">Commission Summary</p>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-green-600">
                      Paid: ${summary?.commission_summary?.total_paid?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-lg font-semibold text-red-600">
                      Unpaid: ${summary?.commission_summary?.total_unpaid?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gold-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-gold-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-navy-200">
          <CardHeader>
            <CardTitle className="text-navy-900">Quick Actions</CardTitle>
            <CardDescription>Get started with your CRM tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="bg-navy-600 hover:bg-navy-700 text-white h-auto py-4 px-6 flex flex-col items-center space-y-2">
                <Users className="h-6 w-6" />
                <span>Add Contact</span>
              </Button>
              <Button className="bg-gold-600 hover:bg-gold-700 text-white h-auto py-4 px-6 flex flex-col items-center space-y-2">
                <Target className="h-6 w-6" />
                <span>Create Offer</span>
              </Button>
              <Button className="bg-navy-600 hover:bg-navy-700 text-white h-auto py-4 px-6 flex flex-col items-center space-y-2">
                <Calendar className="h-6 w-6" />
                <span>Add Task</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-navy-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-navy-600">
            Powered by Offer On Tap
          </p>
        </div>
      </footer>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return token ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return token ? <Navigate to="/dashboard" /> : children;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App font-sans">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            } />
            <Route path="/reset-password" element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;