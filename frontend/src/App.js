import React, { useState, useContext, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Textarea } from './components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { 
  Bell, 
  Users, 
  Calendar, 
  DollarSign, 
  Target, 
  ArrowLeft, 
  Plus, 
  Copy, 
  Edit,
  Trash2,
  Mail,
  Settings as SettingsIcon,
  ExternalLink,
  Upload,
  Download,
  FileText
} from 'lucide-react';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Settings Context
const SettingsContext = createContext(null);

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    branding: { app_name: "ConnectVault", logo_path: "" },
    quick_access_links: {
      chatgpt: "https://chatgpt.com/",
      instagram: "https://instagram.com/",
      tiktok: "https://tiktok.com/",
      youtube: "https://youtube.com/",
      facebook: "https://facebook.com/",
      pinterest: "https://pinterest.com/"
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings, loading, fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

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
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        try {
          await axios.get(`${API}/dashboard/summary`);
          // Token is valid, set user as authenticated
          setUser({ authenticated: true });
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Fetch user data after successful login
      try {
        const userResponse = await axios.get(`${API}/dashboard/summary`);
        // Set a simple user object to indicate authentication
        setUser({ username, authenticated: true });
      } catch (userError) {
        console.error('Failed to fetch user data:', userError);
        // Even if user data fetch fails, we have a valid token
        setUser({ username, authenticated: true });
      }
      
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

// ConnectVault Logo Component
const ConnectVaultLogo = ({ className = "" }) => {
  const { settings } = useSettings();
  const [logoExists, setLogoExists] = useState(false);

  useEffect(() => {
    // Check if logo.png exists
    // eslint-disable-next-line no-undef
    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = '/logo.png';
  }, []);
  
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {logoExists && (
        <img 
          src="/logo.png" 
          alt="ConnectVault" 
          className="connectvault-logo"
        />
      )}
      <div className="connectvault-text-logo">
        ConnectVault
      </div>
    </div>
  );
};

// Quick Access Strip Component
const QuickAccessStrip = () => {
  const quickLinks = [
    { key: 'chatgpt', label: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖' },
    { key: 'instagram', label: 'Instagram', url: 'https://instagram.com', icon: '📸' },
    { key: 'tiktok', label: 'TikTok', url: 'https://tiktok.com', icon: '🎵' },
    { key: 'youtube', label: 'YouTube', url: 'https://youtube.com', icon: '🎥' },
    { key: 'facebook', label: 'Facebook', url: 'https://facebook.com', icon: '👥' },
    { key: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com', icon: '💼' },
    { key: 'pinterest', label: 'Pinterest', url: 'https://pinterest.com', icon: '📌' }
  ];

  return (
    <div className="quick-access-strip">
      <div className="flex items-center justify-between flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 md:mb-0">Quick Access</h3>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <a
              key={link.key}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="quick-access-btn hover-lift"
              aria-label={`Open ${link.label} in new tab`}
            >
              <span className="text-base">{link.icon}</span>
              <ExternalLink className="h-3 w-3" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// Layout Component with Navigation
const Layout = ({ children, title = "ConnectVault" }) => {
  const { logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'task',
      message: 'Follow up with John Doe',
      time: '2 hours ago',
      read: false
    },
    {
      id: '2', 
      type: 'commission',
      message: 'New commission logged: $150',
      time: '1 day ago',
      read: false
    },
    {
      id: '3',
      type: 'task',
      message: 'Weekly commission summary available',
      time: '3 days ago',
      read: true
    }
  ]);

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
    }
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen dashboard-bg">
      {/* Header */}
      <header className="cv-header">
        <div className="cv-header__left">
          <img src="/logo.png" alt="ConnectVault" className="cv-logo" />
          <span className="cv-brand">ConnectVault</span>
        </div>
        <div className="cv-header__right">
          <div className="relative">
            <Button 
              variant="outline" 
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="View notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-secondary-gold text-primary-navy h-5 w-5 rounded-full text-xs flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-accent-gray rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-accent-gray">
                  <h3 className="font-semibold text-primary-navy">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNotifications(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/settings')} 
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={logout} aria-label="Logout">
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-accent-gray mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            Powered by Offer On Tap
          </p>
        </div>
      </footer>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create personalized greeting
  const getWelcomeMessage = () => {
    const first = user?.firstName || user?.name || user?.first_name || null;
    const email = user?.email || null;
    return first ? `Welcome back, ${first}!` : (email ? `Welcome back, ${email}!` : "Welcome back!");
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white rounded-lg shadow"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* Quick Access Strip */}
      <QuickAccessStrip />
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary-navy mb-2">Dashboard</h2>
        <p className="text-text-secondary">{getWelcomeMessage()} Here's your CRM overview.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="premium-card cursor-pointer" onClick={() => navigate('/contacts')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total Contacts</p>
                <p className="text-3xl font-bold text-primary-navy">{summary?.total_contacts || 0}</p>
              </div>
              <div className="p-3 bg-primary-navy-light rounded-full">
                <Users className="h-6 w-6 text-primary-navy" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer" onClick={() => navigate('/tasks')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Tasks Due Today</p>
                <p className="text-3xl font-bold text-primary-navy">{summary?.tasks_due_today || 0}</p>
              </div>
              <div className="p-3 bg-secondary-gold-light rounded-full">
                <Calendar className="h-6 w-6 text-primary-navy" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer" onClick={() => navigate('/promo-links')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Active Promo Links</p>
                <p className="text-3xl font-bold text-primary-navy">{summary?.active_promo_links || 0}</p>
              </div>
              <div className="p-3 bg-secondary-gold-light rounded-full">
                <Target className="h-6 w-6 text-primary-navy" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer" onClick={() => navigate('/commissions')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Commission Summary</p>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-green-600">
                    Paid: ${summary?.commission_summary?.total_paid?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-lg font-semibold text-red-600">
                    Unpaid: ${summary?.commission_summary?.total_unpaid?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-lg font-semibold text-gray-600">
                    Pending: ${summary?.commission_summary?.total_pending?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-secondary-gold-light rounded-full">
                <DollarSign className="h-6 w-6 text-primary-navy" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="premium-card bg-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-primary-navy text-3xl font-bold">Quick Actions</CardTitle>
          <CardDescription className="text-text-secondary text-lg">Get started with your CRM tasks</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Button 
              className="dashboard-tile-navy"
              onClick={() => navigate('/contacts')}
              aria-label="Go to Contacts"
            >
              <Users className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Contacts</span>
            </Button>
            <Button 
              className="dashboard-tile-gold"
              onClick={() => navigate('/promo-links')}
              aria-label="Go to Promo Links"
            >
              <Target className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Promo Links</span>
            </Button>
            <Button 
              className="dashboard-tile-navy"
              onClick={() => navigate('/tasks')}
              aria-label="Go to Tasks"
            >
              <Calendar className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Tasks</span>
            </Button>
            <Button 
              className="dashboard-tile-gold"
              onClick={() => navigate('/marketing-vault')}
              aria-label="Go to Marketing Vault"
            >
              <Mail className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Marketing Vault</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    if (result.success) {
      // Navigate using React Router instead of window.location
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center">
            <img 
              src="/logo.png" 
              alt="ConnectVault logo" 
              className="login-logo mb-3"
            />
            <h1 className="login-brand-text mb-2">ConnectVault</h1>
            <p className="login-subtitle">Access your CRM dashboard</p>
          </div>
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
                className="form-input"
                aria-label="Username"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                aria-label="Password"
              />
            </div>
            <Button 
              type="submit" 
              className="login-button"
              disabled={loading}
              aria-label={loading ? 'Logging in' : 'Login'}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <a 
              href="/forgot-password" 
              className="text-sm text-primary-navy hover:text-primary-navy-hover"
            >
              Forgot password?
            </a>
            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-primary-navy hover:text-primary-navy-hover font-medium">
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
  const { settings } = useSettings();

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
    <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center">
          <ConnectVaultLogo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-primary-navy">Create Account</CardTitle>
          <CardDescription>Join {settings.branding.app_name} CRM</CardDescription>
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
            <Input
              type="text"
              name="full_name"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="form-input"
              aria-label="Full Name"
            />
            <Input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              className="form-input"
              aria-label="Username"
            />
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
              aria-label="Email"
            />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-input"
              aria-label="Password"
            />
            <Button 
              type="submit" 
              className="login-button"
              disabled={loading}
              aria-label={loading ? 'Creating Account' : 'Create Account'}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-primary-navy hover:text-primary-navy-hover font-medium">
                Login
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Email Marketing Component (Updated for Brevo)
const EmailMarketing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    to: '',
    subject: 'Test Email from ConnectVault',
    content: 'This is a test email sent from your ConnectVault CRM.'
  });
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const stored = localStorage.getItem('marketing-vault');
      if (stored) {
        const allContent = JSON.parse(stored);
        // Filter to only email templates
        const emailTemplates = allContent.filter(item => item.type === 'email');
        setTemplates(emailTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        subject: template.subject,
        content: template.body
      });
      setSelectedTemplate(templateId);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    
    const apiKey = localStorage.getItem('brevo-api-key');
    if (!apiKey) {
      toast({
        title: "API Key Missing",
        description: "Please configure your Brevo API key in Settings first",
        variant: "destructive",
      });
      return;
    }

    if (!formData.to.trim()) {
      toast({
        title: "Missing Email",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Make actual Brevo API call
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: "ConnectVault CRM",
            email: "noreply@connectvault.com"
          },
          to: [
            {
              email: formData.to,
              name: "Test Recipient"
            }
          ],
          subject: formData.subject,
          textContent: formData.content
        })
      });

      if (response.ok) {
        toast({
          title: "Test Email Sent",
          description: `Test email sent successfully to ${formData.to}`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Brevo API error:', error);
      toast({
        title: "Error Sending Email",
        description: error.message || "Failed to send test email. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Email Marketing">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Email Marketing</h2>
          <p className="text-text-secondary">Send emails using your Brevo integration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Send Test Email */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-primary-navy">Send Test Email</CardTitle>
            <CardDescription>Send a test email using your Brevo API key</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">To Email *</label>
                <Input
                  type="email"
                  value={formData.to}
                  onChange={(e) => setFormData({...formData, to: e.target.value})}
                  placeholder="recipient@example.com"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Subject</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="Email subject"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Content</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Email content"
                  className="form-input"
                  rows="5"
                />
              </div>
              <Button type="submit" className="btn-primary-navy w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Test Email'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Choose Template */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-primary-navy">Choose Template from Marketing Vault</CardTitle>
            <CardDescription>Load a template into the email editor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Select Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">Choose a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </div>
              {templates.length === 0 && (
                <p className="text-sm text-gray-500">
                  No templates found. Visit the Marketing Vault to load templates.
                </p>
              )}
              <Button 
                onClick={() => navigate('/marketing-vault')} 
                variant="outline" 
                className="w-full"
              >
                Go to Marketing Vault
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Settings Component (Admin Only)
const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [systemeApiKey, setSystemeApiKey] = useState('');
  const [emailProvider, setEmailProvider] = useState('brevo');
  const [loading, setLoading] = useState(false);
  const [savedSysteme, setSavedSysteme] = useState(false);

  useEffect(() => {
    // Load saved data from localStorage
    const savedBrevo = localStorage.getItem('brevo-api-key');
    const savedSystemeKey = localStorage.getItem('systeme-api-key');
    const savedProvider = localStorage.getItem('email-provider');
    
    if (savedBrevo) {
      setBrevoApiKey(savedBrevo);
    }
    if (savedSystemeKey) {
      setSystemeApiKey(savedSystemeKey);
    }
    if (savedProvider) {
      setEmailProvider(savedProvider);
    }
  }, []);

  const handleBrevoSave = () => {
    if (!brevoApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Brevo API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('brevo-api-key', brevoApiKey);
    toast({
      title: "Success",
      description: "Brevo API key saved successfully",
    });
  };

  const handleSystemeSave = () => {
    if (!systemeApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Systeme.io API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('systeme-api-key', systemeApiKey);
    setSavedSysteme(true);
    setTimeout(() => setSavedSysteme(false), 3000);
    toast({
      title: "Success",
      description: "Systeme.io API key saved successfully",
    });
  };

  const handleProviderChange = (provider) => {
    setEmailProvider(provider);
    localStorage.setItem('email-provider', provider);
  };

  return (
    <Layout title="Settings">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Settings</h2>
          <p className="text-text-secondary">Configure your ConnectVault CRM</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Email Provider Selection */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-primary-navy">Default Email Provider</CardTitle>
            <CardDescription>Choose your preferred email service provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="emailProvider"
                  value="brevo"
                  checked={emailProvider === 'brevo'}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="form-radio"
                />
                <span>Brevo (default)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="emailProvider"
                  value="systeme"
                  checked={emailProvider === 'systeme'}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="form-radio"
                />
                <span>Systeme.io</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Brevo Configuration */}
        {emailProvider === 'brevo' && (
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-primary-navy">Email Integration (Brevo)</CardTitle>
              <CardDescription>Configure your Brevo API key for email marketing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Brevo API Key
                </label>
                <Input
                  type="password"
                  value={brevoApiKey}
                  onChange={(e) => setBrevoApiKey(e.target.value)}
                  placeholder="Enter your Brevo API key"
                  className="form-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from your Brevo dashboard under API & Integration section
                </p>
              </div>
              <Button onClick={handleBrevoSave} className="btn-primary-navy" disabled={loading}>
                {loading ? 'Saving...' : 'Save API Key'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Systeme.io Configuration */}
        {emailProvider === 'systeme' && (
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-primary-navy">Email Integration (Systeme.io)</CardTitle>
              <CardDescription>Configure your Systeme.io API key</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Systeme.io API Key
                </label>
                <Input
                  type="password"
                  value={systemeApiKey}
                  onChange={(e) => setSystemeApiKey(e.target.value)}
                  placeholder="Enter your Systeme.io API key"
                  className="form-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from your Systeme.io account settings
                </p>
              </div>
              <div className="flex space-x-4">
                <Button onClick={handleSystemeSave} className="btn-primary-navy">
                  Save API Key {savedSysteme && '✓'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open('https://systeme.io', '_blank')}
                  className="btn-outline-navy"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Systeme.io
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};



// Other existing components (simplified for brevity - Contacts, Tasks, etc.)
// These would need to be updated to use "Promo Links" instead of "Offers"

// Contacts Component (updated)
const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    platform: '',
    notes: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const stored = localStorage.getItem('contacts');
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please enter both name and email",
        variant: "destructive",
      });
      return;
    }

    const newContact = {
      id: Date.now().toString(),
      ...formData,
      created_at: new Date().toISOString()
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    localStorage.setItem('contacts', JSON.stringify(updatedContacts));

    toast({
      title: "Success",
      description: "Contact added successfully",
    });

    setFormData({ name: '', email: '', platform: '', notes: '' });
    setShowForm(false);
  };

  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Expected headers: name, email, platform, notes
        const expectedHeaders = ['name', 'email', 'platform', 'notes'];
        const hasValidHeaders = expectedHeaders.every(header => 
          headers.includes(header)
        );

        if (!hasValidHeaders) {
          toast({
            title: "Invalid CSV Format",
            description: "CSV must have columns: Name, Email, Platform, Notes",
            variant: "destructive",
          });
          return;
        }

        const newContacts = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim());
          const contact = {
            id: Date.now().toString() + i,
            name: values[headers.indexOf('name')] || '',
            email: values[headers.indexOf('email')] || '',
            platform: values[headers.indexOf('platform')] || '',
            notes: values[headers.indexOf('notes')] || '',
            created_at: new Date().toISOString()
          };
          
          if (contact.name && contact.email) {
            newContacts.push(contact);
          }
        }

        if (newContacts.length > 0) {
          const updatedContacts = [...contacts, ...newContacts];
          setContacts(updatedContacts);
          localStorage.setItem('contacts', JSON.stringify(updatedContacts));
          
          toast({
            title: "Import Successful",
            description: `Imported ${newContacts.length} contacts`,
          });
        } else {
          toast({
            title: "No Valid Contacts",
            description: "No valid contacts found in CSV file",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleCSVExport = () => {
    if (contacts.length === 0) {
      toast({
        title: "No Contacts",
        description: "No contacts to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Name', 'Email', 'Platform', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...contacts.map(contact => [
        contact.name,
        contact.email,
        contact.platform,
        contact.notes
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${contacts.length} contacts`,
    });
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['Name', 'Email', 'Platform', 'Notes'],
      ['John Doe', 'john@example.com', 'Instagram', 'Interested in product demo'],
      ['Jane Smith', 'jane@example.com', 'LinkedIn', 'Follow up next week']
    ];
    
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts-sample-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout title="Contacts">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Contacts</h2>
          <p className="text-text-secondary">Manage your contacts and outreach</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowForm(true)} className="btn-primary-navy">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* CSV Import/Export Section */}
      <Card className="premium-card mb-6">
        <CardHeader>
          <CardTitle className="text-primary-navy">Import/Export Contacts</CardTitle>
          <CardDescription>Import contacts from CSV or export your current contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
                id="csv-import"
              />
              <Button
                onClick={() => document.getElementById('csv-import').click()}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
            <Button onClick={handleCSVExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={downloadSampleCSV} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Download Sample CSV
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            CSV format: Name, Email, Platform, Notes (headers required)
          </p>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="premium-card mb-6">
          <CardHeader>
            <CardTitle className="text-primary-navy">Add New Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Contact name"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="contact@example.com"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Platform</label>
                <Input
                  value={formData.platform}
                  onChange={(e) => setFormData({...formData, platform: e.target.value})}
                  placeholder="Instagram, LinkedIn, etc."
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notes about this contact"
                  className="form-input"
                  rows="3"
                />
              </div>
              <div className="flex space-x-4">
                <Button type="submit" className="btn-primary-navy">
                  Add Contact
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-primary-navy">Your Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No contacts yet. Add your first contact or import from CSV to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{contact.name}</h3>
                      <p className="text-blue-600 text-sm">{contact.email}</p>
                      {contact.platform && (
                        <Badge variant="outline" className="mt-1">
                          {contact.platform}
                        </Badge>
                      )}
                      {contact.notes && (
                        <p className="text-sm text-gray-600 mt-2">{contact.notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Added: {new Date(contact.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

// Simplified placeholder components for other pages (Tasks, PromoLinks, MarketingVault, etc.)
const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    notes: '',
    priority: 'medium',
    assignee: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const stored = localStorage.getItem('tasks');
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      ...formData,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    toast({
      title: "Success",
      description: "Task added successfully",
    });

    setFormData({ title: '', due_date: '', notes: '', priority: 'medium', assignee: '' });
    setShowModal(false);
  };

  const moveTask = (taskId, newStatus) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <Layout title="Tasks">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Tasks</h2>
          <p className="text-text-secondary">Manage your tasks and follow-ups</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="btn-primary-navy">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md premium-card">
            <CardHeader>
              <CardTitle className="text-primary-navy">Add New Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Task title"
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Due Date</label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="form-input w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Assignee (Optional)</label>
                  <Input
                    value={formData.assignee}
                    onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                    placeholder="Assigned to"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Task notes"
                    className="form-input"
                    rows="3"
                  />
                </div>
                <div className="flex space-x-4">
                  <Button type="submit" className="btn-primary-navy">
                    Add Task
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['pending', 'in_progress', 'done'].map((status) => (
          <Card key={status} className="premium-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 capitalize">
                {status.replace('_', ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getTasksByStatus(status).map((task) => (
                  <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.due_date && (
                      <p className="text-xs text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                    )}
                    {task.priority && (
                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="mt-1">
                        {task.priority}
                      </Badge>
                    )}
                    <div className="flex space-x-1 mt-2">
                      {status !== 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => moveTask(task.id, 'pending')}>
                          ← Pending
                        </Button>
                      )}
                      {status !== 'in_progress' && (
                        <Button size="sm" variant="outline" onClick={() => moveTask(task.id, 'in_progress')}>
                          → Progress
                        </Button>
                      )}
                      {status !== 'done' && (
                        <Button size="sm" variant="outline" onClick={() => moveTask(task.id, 'done')}>
                          ✓ Done
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {getTasksByStatus(status).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No {status.replace('_', ' ')} tasks
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
};

const PromoLinks = () => {
  const [promoLinks, setPromoLinks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    destination_url: '',
    notes: '',
    active: true
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPromoLinks();
  }, []);

  const fetchPromoLinks = async () => {
    try {
      // For now, use localStorage to store promo links
      const stored = localStorage.getItem('promo-links');
      if (stored) {
        setPromoLinks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error fetching promo links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic URL validation
    try {
      new URL(formData.destination_url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter a name for the promo link",
        variant: "destructive",
      });
      return;
    }

    const newLink = {
      id: Date.now().toString(),
      ...formData,
      created_at: new Date().toISOString()
    };

    const updatedLinks = [...promoLinks, newLink];
    setPromoLinks(updatedLinks);
    localStorage.setItem('promo-links', JSON.stringify(updatedLinks));

    toast({
      title: "Success",
      description: "Promo link added successfully",
    });

    setFormData({ name: '', destination_url: '', notes: '', active: true });
    setShowForm(false);
  };

  const toggleActive = (id) => {
    const updatedLinks = promoLinks.map(link => 
      link.id === id ? { ...link, active: !link.active } : link
    );
    setPromoLinks(updatedLinks);
    localStorage.setItem('promo-links', JSON.stringify(updatedLinks));
  };

  return (
    <Layout title="Promo Links">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-secondary-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Promo Links</h2>
          <p className="text-text-secondary">Manage your promotional links</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="btn-secondary-gold">
          <Plus className="h-4 w-4 mr-2" />
          Add Promo Link
        </Button>
      </div>

      {showForm && (
        <Card className="premium-card mb-6">
          <CardHeader>
            <CardTitle className="text-primary-navy">Add New Promo Link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Summer Sale Campaign"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Destination URL *</label>
                <Input
                  type="url"
                  value={formData.destination_url}
                  onChange={(e) => setFormData({...formData, destination_url: e.target.value})}
                  placeholder="https://example.com/offer"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optional notes about this promo link"
                  className="form-input"
                  rows="3"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="active" className="text-sm font-medium text-text-primary">Active</label>
              </div>
              <div className="flex space-x-4">
                <Button type="submit" className="btn-secondary-gold">
                  Add Link
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-primary-navy">Your Promo Links</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : promoLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No promo links yet. Add your first promotional link to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {promoLinks.map((link) => (
                <div key={link.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-lg">{link.name}</h3>
                      <Badge variant={link.active ? "default" : "secondary"}>
                        {link.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-600 mb-2">
                      <a href={link.destination_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {link.destination_url}
                      </a>
                    </p>
                    {link.notes && <p className="text-sm text-gray-600">{link.notes}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      Created: {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleActive(link.id)}
                    >
                      {link.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

const MarketingVault = () => {
  const [allContent, setAllContent] = useState([]);
  const [activeTab, setActiveTab] = useState('emails');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSystemeModal, setShowSystemeModal] = useState(false);
  const [editingSwipe, setEditingSwipe] = useState(null);
  const [uploadData, setUploadData] = useState({
    file: null,
    pasteText: '',
    previewItems: [],
    validCount: 0,
    duplicateCount: 0,
    invalidCount: 0
  });
  const [editFormData, setEditFormData] = useState({
    title: '',
    subject: '',
    body: '',
    tags: '',
    category: '',
    purpose: ''
  });
  
  // Files tab state
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFileRename, setShowFileRename] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [fileFormData, setFileFormData] = useState({
    name: '',
    category: 'General'
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadMarketingVault();
  }, []);

  useEffect(() => {
    if (activeTab === 'files') {
      loadFiles();
      loadCategories();
    }
  }, [activeTab, searchQuery, selectedCategory]);

  const loadMarketingVault = async () => {
    try {
      // Check if we have content in localStorage
      let stored = localStorage.getItem('marketing-vault');
      
      if (!stored) {
        // Load seed data for first time
        const response = await fetch('/marketing_vault.json');
        const seedData = await response.json();
        localStorage.setItem('marketing-vault', JSON.stringify(seedData));
        setAllContent(seedData);
      } else {
        setAllContent(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading marketing vault:', error);
      // Fallback to empty array if can't load seed data
      setAllContent([]);
    } finally {
      setLoading(false);
    }
  };

  // File management functions
  const loadFiles = async () => {
    setFilesLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await axios.get(`${API}/files?${params.toString()}`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setFilesLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API}/files/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', fileFormData.category);

    try {
      await axios.post(`${API}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      
      setShowFileUpload(false);
      loadFiles();
      loadCategories();
      
      // Reset form
      setFileFormData({ name: '', category: 'General' });
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.detail || "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleFileRename = async () => {
    if (!selectedFile || !fileFormData.name.trim()) return;

    try {
      await axios.patch(`${API}/files/${selectedFile.id}`, {
        name: fileFormData.name,
        category: fileFormData.category
      });
      
      toast({
        title: "Success",
        description: "File updated successfully",
      });
      
      setShowFileRename(false);
      setSelectedFile(null);
      loadFiles();
      loadCategories();
    } catch (error) {
      console.error('Error updating file:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update file",
        variant: "destructive",
      });
    }
  };

  const handleFileDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    try {
      await axios.delete(`${API}/files/${file.id}`);
      
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      
      loadFiles();
      loadCategories();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleFileDownload = async (file) => {
    try {
      const response = await axios.get(`${API}/files/${file.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFiles = () => {
    return (
      <div>
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input flex-1"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-input md:w-48"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {filesLoading ? (
          <div className="text-center py-8">Loading files...</div>
        ) : files.length === 0 ? (
          <Card className="premium-card text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No files yet</h3>
              <p className="text-gray-500 mb-6">Click 'Upload PDF' to add your first document.</p>
              <Button onClick={() => setShowFileUpload(true)} className="btn-primary-navy">
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="premium-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">File Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-left py-3 px-4 font-semibold">Size</th>
                      <th className="text-left py-3 px-4 font-semibold">Uploaded</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-red-500 mr-2" />
                            <span className="font-medium">{file.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{file.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatFileSize(file.size_bytes)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(file.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFileDownload(file)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedFile(file);
                                setFileFormData({ name: file.name, category: file.category });
                                setShowFileRename(true);
                              }}
                              title="Rename/Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFileDelete(file)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
    });
  };

  const getContentByType = (type) => {
    return allContent.filter(item => item.type === type);
  };

  // Generate hash for deduplication
  const generateHash = (title, subject) => {
    return btoa(title.toLowerCase().trim() + '|' + subject.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '');
  };

  // Parse different file formats
  const parseImportData = (content, filename = '') => {
    const results = {
      items: [],
      valid: 0,
      invalid: 0,
      duplicates: 0
    };

    try {
      if (filename.endsWith('.json') || content.trim().startsWith('[') || content.trim().startsWith('{')) {
        // JSON format
        const jsonData = JSON.parse(content);
        const items = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        items.forEach(item => {
          if (item.title && item.subject && item.body) {
            results.items.push({
              title: item.title,
              subject: item.subject,
              body: item.body,
              tags: item.tags || '',
              category: item.category || '',
              purpose: item.purpose || '',
              source: item.source || 'import'
            });
            results.valid++;
          } else {
            results.invalid++;
          }
        });
      } else if (filename.endsWith('.csv') || content.includes(',')) {
        // CSV format
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) return results;
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const titleIdx = headers.indexOf('title');
        const subjectIdx = headers.indexOf('subject');
        const bodyIdx = headers.indexOf('body');
        const tagsIdx = headers.indexOf('tags');
        const categoryIdx = headers.indexOf('category');
        const purposeIdx = headers.indexOf('purpose');
        const sourceIdx = headers.indexOf('source');
        
        if (titleIdx === -1 || subjectIdx === -1 || bodyIdx === -1) {
          results.invalid = lines.length - 1;
          return results;
        }
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          if (values.length >= 3 && values[titleIdx] && values[subjectIdx] && values[bodyIdx]) {
            results.items.push({
              title: values[titleIdx],
              subject: values[subjectIdx],
              body: values[bodyIdx],
              tags: tagsIdx >= 0 ? values[tagsIdx] || '' : '',
              category: categoryIdx >= 0 ? values[categoryIdx] || '' : '',
              purpose: purposeIdx >= 0 ? values[purposeIdx] || '' : '',
              source: sourceIdx >= 0 ? values[sourceIdx] || 'import' : 'import'
            });
            results.valid++;
          } else {
            results.invalid++;
          }
        }
      } else {
        // TXT/MD format
        const blocks = content.split(/\n---\n|\n##/);
        
        blocks.forEach(block => {
          const lines = block.trim().split('\n');
          const item = { tags: '', category: '', purpose: '', source: 'import' };
          let bodyStartIndex = -1;
          
          lines.forEach((line, index) => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim().toLowerCase();
              const value = line.substring(colonIndex + 1).trim();
              
              if (key === 'title') item.title = value;
              else if (key === 'subject') item.subject = value;
              else if (key === 'tags') item.tags = value;
              else if (key === 'category') item.category = value;
              else if (key === 'purpose') item.purpose = value;
              else if (key === 'source') item.source = value;
              else if (key === 'body') bodyStartIndex = index + 1;
            }
          });
          
          if (bodyStartIndex >= 0) {
            item.body = lines.slice(bodyStartIndex).join('\n').trim();
          }
          
          if (item.title && item.subject && item.body) {
            results.items.push(item);
            results.valid++;
          } else {
            results.invalid++;
          }
        });
      }
    } catch (error) {
      console.error('Parse error:', error);
      results.invalid = 1;
    }

    // Check for duplicates
    const existingEmails = getContentByType('email');
    const existingHashes = existingEmails.map(email => generateHash(email.title, email.subject));
    
    results.items = results.items.filter(item => {
      const hash = generateHash(item.title, item.subject);
      if (existingHashes.includes(hash)) {
        results.duplicates++;
        results.valid--;
        return false;
      }
      existingHashes.push(hash);
      return true;
    });

    return results;
  };

  const handleContentFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const parsed = parseImportData(content, file.name);
      
      setUploadData({
        file,
        pasteText: '',
        previewItems: parsed.items,
        validCount: parsed.valid,
        duplicateCount: parsed.duplicates,
        invalidCount: parsed.invalid
      });
    };
    reader.readAsText(file);
  };

  const handlePasteUpload = (pasteText) => {
    if (!pasteText.trim()) {
      setUploadData(prev => ({
        ...prev,
        pasteText,
        previewItems: [],
        validCount: 0,
        duplicateCount: 0,
        invalidCount: 0
      }));
      return;
    }

    const parsed = parseImportData(pasteText);
    setUploadData({
      file: null,
      pasteText,
      previewItems: parsed.items,
      validCount: parsed.valid,
      duplicateCount: parsed.duplicates,
      invalidCount: parsed.invalid
    });
  };

  const handleImportSwipes = () => {
    if (uploadData.previewItems.length === 0) return;

    const newSwipes = uploadData.previewItems.map((item, index) => ({
      id: `import-${Date.now()}-${index}`,
      type: 'email',
      title: item.title,
      subject: item.subject,
      body: item.body,
      goal: item.purpose || 'Imported swipe',
      when_to_send: item.category || 'As needed',
      tags: item.tags,
      category: item.category,
      purpose: item.purpose,
      source: item.source
    }));

    const updatedContent = [...allContent, ...newSwipes];
    setAllContent(updatedContent);
    localStorage.setItem('marketing-vault', JSON.stringify(updatedContent));

    toast({
      title: "Import Successful",
      description: `Imported ${uploadData.validCount} swipes${uploadData.duplicateCount > 0 ? `. Skipped ${uploadData.duplicateCount} duplicates` : ''}`,
    });

    setShowUploadModal(false);
    setUploadData({
      file: null,
      pasteText: '',
      previewItems: [],
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0
    });
  };

  const handleEditSwipe = (swipe) => {
    setEditingSwipe(swipe);
    setEditFormData({
      title: swipe.title,
      subject: swipe.subject,
      body: swipe.body,
      tags: swipe.tags || '',
      category: swipe.category || swipe.when_to_send || '',
      purpose: swipe.purpose || swipe.goal || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingSwipe) return;

    const updatedContent = allContent.map(item => 
      item.id === editingSwipe.id 
        ? {
            ...item,
            title: editFormData.title,
            subject: editFormData.subject,
            body: editFormData.body,
            tags: editFormData.tags,
            category: editFormData.category,
            purpose: editFormData.purpose,
            goal: editFormData.purpose || item.goal,
            when_to_send: editFormData.category || item.when_to_send
          }
        : item
    );

    setAllContent(updatedContent);
    localStorage.setItem('marketing-vault', JSON.stringify(updatedContent));

    toast({
      title: "Success",
      description: "Swipe updated successfully",
    });

    setShowEditModal(false);
    setEditingSwipe(null);
  };

  const handleUseInEmail = () => {
    const emailProvider = localStorage.getItem('email-provider') || 'brevo';
    if (emailProvider === 'systeme') {
      setShowSystemeModal(true);
    } else {
      // Navigate to email page for Brevo
      navigate('/email');
    }
  };

  const handleDeleteSwipe = (swipe) => {
    if (window.confirm(`Delete "${swipe.title}"? This cannot be undone.`)) {
      const updatedContent = allContent.filter(item => item.id !== swipe.id);
      setAllContent(updatedContent);
      localStorage.setItem('marketing-vault', JSON.stringify(updatedContent));

      toast({
        title: "Deleted",
        description: "Swipe deleted successfully",
      });
    }
  };

  const handleExport = (format) => {
    const emailSwipes = getContentByType('email');
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
      const headers = ['Title', 'Subject', 'Body', 'Tags', 'Category', 'Purpose', 'Goal', 'When to Send'];
      const csvContent = [
        headers.join(','),
        ...emailSwipes.map(swipe => [
          `"${swipe.title}"`,
          `"${swipe.subject}"`,
          `"${swipe.body.replace(/"/g, '""')}"`,
          `"${swipe.tags || ''}"`,
          `"${swipe.category || swipe.when_to_send || ''}"`,
          `"${swipe.purpose || swipe.goal || ''}"`,
          `"${swipe.goal || ''}"`,
          `"${swipe.when_to_send || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marketing_swipes_${timestamp}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(emailSwipes.map(swipe => ({
        title: swipe.title,
        subject: swipe.subject,
        body: swipe.body,
        tags: swipe.tags || '',
        category: swipe.category || swipe.when_to_send || '',
        purpose: swipe.purpose || swipe.goal || '',
        goal: swipe.goal || '',
        when_to_send: swipe.when_to_send || ''
      })), null, 2);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marketing_swipes_${timestamp}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Successful",
      description: `Downloaded ${emailSwipes.length} swipes as ${format.toUpperCase()}`,
    });
  };

  const renderEmails = () => {
    const emails = getContentByType('email');
    
    return (
      <div className="space-y-6">
        {emails.map((template) => (
          <Card key={template.id} className="premium-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-primary-navy">{template.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{template.goal}</Badge>
                    <Badge variant="secondary">{template.when_to_send}</Badge>
                    {template.tags && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {template.tags}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleUseInEmail}
                    className="btn-primary-navy text-white"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Use in Email
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditSwipe(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(template.subject + '\n\n' + template.body)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteSwipe(template)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Subject Line:</h4>
                  <p className="text-sm bg-gray-50 p-2 rounded border">{template.subject}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Email Body:</h4>
                  <div className="text-sm bg-gray-50 p-4 rounded border whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {template.body}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Goal:</strong> {template.goal} | <strong>When to send:</strong> {template.when_to_send}
                  {template.source && <span> | <strong>Source:</strong> {template.source}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderHooks = () => {
    const hooks = getContentByType('hook');
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hooks.map((hook) => (
          <Card key={hook.id} className="premium-card">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-primary-navy mb-2">{hook.title}</p>
                  <Badge variant="outline" className="text-xs">{hook.category}</Badge>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(hook.title)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderPrompts = () => {
    const prompts = getContentByType('prompt');
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prompts.map((prompt) => (
          <Card key={prompt.id} className="premium-card">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-primary-navy mb-2">{prompt.title}</p>
                  <Badge variant="outline" className="text-xs">{prompt.category}</Badge>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(prompt.title)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Layout title="Marketing Vault">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-secondary-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Marketing Vault</h2>
          <p className="text-text-secondary">Your collection of email templates, hooks, and ChatGPT prompts</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading content...</div>
      ) : (
        <div>
          {/* Tabs */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('emails')}
                className={`tab-pill ${activeTab === 'emails' ? 'tab-pill-active' : 'tab-pill-inactive'}`}
              >
                Email Swipes ({getContentByType('email').length})
              </button>
              <button
                onClick={() => setActiveTab('hooks')}
                className={`tab-pill ${activeTab === 'hooks' ? 'tab-pill-active' : 'tab-pill-inactive'}`}
              >
                Hooks ({getContentByType('hook').length})
              </button>
              <button
                onClick={() => setActiveTab('prompts')}
                className={`tab-pill ${activeTab === 'prompts' ? 'tab-pill-active' : 'tab-pill-inactive'}`}
              >
                ChatGPT Prompts ({getContentByType('prompt').length})
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`tab-pill ${activeTab === 'files' ? 'tab-pill-active' : 'tab-pill-inactive'}`}
              >
                Files
              </button>
            </div>

            {/* Email Swipes Tab Actions */}
            {activeTab === 'emails' && (
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary-navy"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Swipes
                </Button>
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleExport(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="btn-outline-navy appearance-none bg-white border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">Export</option>
                    <option value="csv">Download as CSV</option>
                    <option value="json">Download as JSON</option>
                  </select>
                  <Download className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Files Tab Actions */}
            {activeTab === 'files' && (
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowFileUpload(true)}
                  className="btn-primary-navy"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload PDF
                </Button>
                <Button 
                  onClick={() => setShowCategoryModal(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          {activeTab === 'emails' && renderEmails()}
          {activeTab === 'hooks' && renderHooks()}
          {activeTab === 'prompts' && renderPrompts()}
          {activeTab === 'files' && renderFiles()}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto premium-card">
            <CardHeader>
              <CardTitle className="text-primary-navy">Upload Email Swipes</CardTitle>
              <CardDescription>Import email templates from files or paste content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Upload File</label>
                <input
                  type="file"
                  accept=".csv,.json,.txt,.md"
                  onChange={handleContentFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">Supported: CSV, JSON, TXT, MD</p>
              </div>

              {/* Paste Area */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Or Paste Content</label>
                <Textarea
                  value={uploadData.pasteText}
                  onChange={(e) => handlePasteUpload(e.target.value)}
                  placeholder="Paste your email templates here..."
                  className="form-input h-32"
                />
              </div>

              {/* Helper Text */}
              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-semibold text-sm mb-2">Supported Formats:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>CSV:</strong> Headers: title, subject, body, tags, category, purpose</p>
                  <p><strong>JSON:</strong> Array of objects with same properties</p>
                  <p><strong>TXT/MD:</strong> Blocks separated by "---" or "##" with key:value pairs</p>
                </div>
              </div>

              {/* Preview */}
              {uploadData.previewItems.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Preview ({uploadData.validCount} valid, {uploadData.duplicateCount} duplicates, {uploadData.invalidCount} invalid)</h4>
                  <div className="max-h-64 overflow-y-auto border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-left">Title</th>
                          <th className="p-2 text-left">Subject</th>
                          <th className="p-2 text-left">Tags</th>
                          <th className="p-2 text-left">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadData.previewItems.slice(0, 10).map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{item.title}</td>
                            <td className="p-2">{item.subject}</td>
                            <td className="p-2">{item.tags}</td>
                            <td className="p-2">{item.category}</td>
                          </tr>
                        ))}
                        {uploadData.previewItems.length > 10 && (
                          <tr className="border-t">
                            <td colSpan="4" className="p-2 text-center text-gray-500">
                              ...and {uploadData.previewItems.length - 10} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleImportSwipes}
                  disabled={uploadData.validCount === 0}
                  className="btn-primary-navy"
                >
                  Import {uploadData.validCount} Swipes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto premium-card">
            <CardHeader>
              <CardTitle className="text-primary-navy">Edit Email Swipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="form-label">Title *</label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Subject *</label>
                <Input
                  value={editFormData.subject}
                  onChange={(e) => setEditFormData({...editFormData, subject: e.target.value})}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Body *</label>
                <Textarea
                  value={editFormData.body}
                  onChange={(e) => setEditFormData({...editFormData, body: e.target.value})}
                  className="form-input h-32"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Tags</label>
                  <Input
                    value={editFormData.tags}
                    onChange={(e) => setEditFormData({...editFormData, tags: e.target.value})}
                    placeholder="tag1, tag2"
                    className="form-input"
                  />
                  <div className="form-help-text">Comma-separated tags</div>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <Input
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                    placeholder="Launch, Nurture, etc."
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Purpose</label>
                  <Input
                    value={editFormData.purpose}
                    onChange={(e) => setEditFormData({...editFormData, purpose: e.target.value})}
                    placeholder="Brief description"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  className="btn-primary-navy"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Systeme.io Modal */}
      {showSystemeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md premium-card">
            <CardHeader>
              <CardTitle className="text-primary-navy">Systeme.io Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Sending via Systeme.io is managed in your Systeme.io account. Click 'Open Systeme.io' to send.
              </p>
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSystemeModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    window.open('https://systeme.io', '_blank');
                    setShowSystemeModal(false);
                  }}
                  className="btn-primary-navy"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Systeme.io
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
};

// Commissions Component
const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCommission, setEditingCommission] = useState(null);
  const [formData, setFormData] = useState({
    program_name: '',
    amount: '',
    status: 'pending',
    expected_date: '',
    paid_date: '',
    promo_link_id: '',
    notes: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const response = await axios.get(`${API}/commissions`);
      setCommissions(response.data);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast({
        title: "Error",
        description: "Failed to load commissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.program_name.trim() || !formData.amount) {
      toast({
        title: "Missing Information",
        description: "Please enter program name and amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const submissionData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        expected_date: formData.expected_date || null,
        paid_date: formData.paid_date || null
      };

      if (editingCommission) {
        await axios.put(`${API}/commissions/${editingCommission.id}`, submissionData);
        toast({
          title: "Success",
          description: "Commission updated successfully",
        });
      } else {
        await axios.post(`${API}/commissions`, submissionData);
        toast({
          title: "Success",
          description: "Commission added successfully",
        });
      }

      setFormData({
        program_name: '',
        amount: '',
        status: 'pending',
        expected_date: '',
        paid_date: '',
        promo_link_id: '',
        notes: ''
      });
      setShowForm(false);
      setEditingCommission(null);
      fetchCommissions();
    } catch (error) {
      console.error('Error saving commission:', error);
      toast({
        title: "Error",
        description: "Failed to save commission",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (commission) => {
    setFormData({
      program_name: commission.program_name,
      amount: commission.amount.toString(),
      status: commission.status,
      expected_date: commission.expected_date ? commission.expected_date.split('T')[0] : '',
      paid_date: commission.paid_date ? commission.paid_date.split('T')[0] : '',
      promo_link_id: commission.promo_link_id || '',
      notes: commission.notes || ''
    });
    setEditingCommission(commission);
    setShowForm(true);
  };

  const handleDelete = async (commissionId) => {
    if (!window.confirm('Are you sure you want to delete this commission?')) {
      return;
    }

    try {
      await axios.delete(`${API}/commissions/${commissionId}`);
      toast({
        title: "Success",
        description: "Commission deleted successfully",
      });
      fetchCommissions();
    } catch (error) {
      console.error('Error deleting commission:', error);
      toast({
        title: "Error",
        description: "Failed to delete commission",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/commissions/export/csv`);
      const csvData = response.data.csv_data;
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'commissions.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Commissions exported successfully",
      });
    } catch (error) {
      console.error('Error exporting commissions:', error);
      toast({
        title: "Error",
        description: "Failed to export commissions",
        variant: "destructive",
      });
    }
  };

  const getSummary = () => {
    const total_paid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
    const total_unpaid = commissions.filter(c => c.status === 'unpaid').reduce((sum, c) => sum + c.amount, 0);
    const total_pending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    
    return { total_paid, total_unpaid, total_pending };
  };

  const summary = getSummary();

  return (
    <Layout title="Commissions">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Commissions</h2>
          <p className="text-text-secondary">Manage your commission earnings</p>
        </div>
        <div className="flex space-x-4">
          <Button onClick={handleExport} variant="outline" className="btn-secondary-gold">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => {
            setEditingCommission(null);
            setFormData({
              program_name: '',
              amount: '',
              status: 'pending',
              expected_date: '',
              paid_date: '',
              promo_link_id: '',
              notes: ''
            });
            setShowForm(true);
          }} className="btn-primary-navy">
            <Plus className="h-4 w-4 mr-2" />
            Add Commission
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Paid</p>
                <p className="text-2xl font-bold text-green-600">${summary.total_paid.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Unpaid</p>
                <p className="text-2xl font-bold text-red-600">${summary.total_unpaid.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Pending</p>
                <p className="text-2xl font-bold text-gray-600">${summary.total_pending.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <DollarSign className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="premium-card mb-6">
          <CardHeader>
            <CardTitle className="text-primary-navy">
              {editingCommission ? 'Edit Commission' : 'Add New Commission'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Program Name *</label>
                <Input
                  value={formData.program_name}
                  onChange={(e) => setFormData({...formData, program_name: e.target.value})}
                  placeholder="Program name"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="form-input w-full"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Expected Date</label>
                <Input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({...formData, expected_date: e.target.value})}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Paid Date</label>
                <Input
                  type="date"
                  value={formData.paid_date}
                  onChange={(e) => setFormData({...formData, paid_date: e.target.value})}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Promo Link ID</label>
                <Input
                  value={formData.promo_link_id}
                  onChange={(e) => setFormData({...formData, promo_link_id: e.target.value})}
                  placeholder="Optional"
                  className="form-input"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Commission notes"
                  className="form-input"
                  rows="3"
                />
              </div>
              <div className="md:col-span-2 flex space-x-4">
                <Button type="submit" className="btn-primary-navy">
                  {editingCommission ? 'Update Commission' : 'Add Commission'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setEditingCommission(null);
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Commissions Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-primary-navy">Commission History ({commissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No commissions yet. Add your first commission to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Program</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Expected Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Paid Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{commission.program_name}</div>
                          {commission.notes && (
                            <div className="text-sm text-gray-500">{commission.notes}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        ${commission.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            commission.status === 'paid' ? 'default' : 
                            commission.status === 'unpaid' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {commission.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {commission.expected_date ? new Date(commission.expected_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {commission.paid_date ? new Date(commission.paid_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(commission)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(commission.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

// Forgot Password Component
const ForgotPassword = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();
  const { settings } = useSettings();

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
    <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center">
          <ConnectVaultLogo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-primary-navy">Reset Password</CardTitle>
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
            <Input
              type="text"
              placeholder="Email or Username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              className="form-input"
            />
            <Button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-primary-navy hover:text-primary-navy-hover">
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
      <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
        <Card className="w-full max-w-md premium-card">
          <CardContent className="text-center pt-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                Invalid reset link. Please request a new password reset.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <a href="/forgot-password" className="text-primary-navy hover:text-primary-navy-hover">
                Request New Reset Link
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center">
          <ConnectVaultLogo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-primary-navy">Set New Password</CardTitle>
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
            <Input
              type="password"
              name="newPassword"
              placeholder="New Password"
              value={formData.newPassword}
              onChange={handleChange}
              required
              className="form-input"
            />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="form-input"
            />
            <Button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-primary-navy hover:text-primary-navy-hover">
              Back to Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return (token && user) ? children : <Navigate to="/login" />;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { token, user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return (token && user) ? <Navigate to="/dashboard" /> : children;
};

// Main App Component
function App() {
  return (
    <SettingsProvider>
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
              <Route path="/contacts" element={
                <ProtectedRoute>
                  <Contacts />
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              } />
              <Route path="/promo-links" element={
                <ProtectedRoute>
                  <PromoLinks />
                </ProtectedRoute>
              } />
              <Route path="/marketing-vault" element={
                <ProtectedRoute>
                  <MarketingVault />
                </ProtectedRoute>
              } />
              <Route path="/email" element={
                <ProtectedRoute>
                  <EmailMarketing />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/commissions" element={
                <ProtectedRoute>
                  <Commissions />
                </ProtectedRoute>
              } />
              {/* Legacy route redirect */}
              <Route path="/offers" element={<Navigate to="/promo-links" />} />
            </Routes>
            <Toaster />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;