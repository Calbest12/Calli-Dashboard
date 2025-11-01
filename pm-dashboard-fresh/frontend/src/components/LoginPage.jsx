// frontend/src/components/LoginPage.jsx
import React, { useState } from 'react';
import { Brain, Eye, EyeOff, Lock, Mail, User, Shield, Crown } from 'lucide-react';
import apiService from '../services/apiService';
import logo from '../assets/logo.png';

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'Team Member'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        // LOGIN
        if (!formData.email || !formData.password) {
          setError('Email and password are required');
          setIsLoading(false);
          return;
        }

        const response = await apiService.login({
          email: formData.email,
          password: formData.password
        });

        if (response.success && response.user) {
          console.log('âœ… Login successful:', response.user.name, 'as', response.user.role);
          onLogin(response.user);
        } else {
          setError(response.error || 'Login failed');
        }

      } else {
        // REGISTRATION
        if (!formData.name || !formData.email || !formData.password) {
          setError('Please fill in all fields');
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        const response = await apiService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });

        if (response.success && response.user) {
          console.log('âœ… Registration successful:', response.user.name, 'as', response.user.role);
          onLogin(response.user);
        } else {
          setError(response.error || 'Registration failed');
        }
      }

    } catch (error) {
      console.error('âŒ Auth error:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    {
      value: 'Team Member',
      label: 'Team Member',
      icon: User,
      description: 'Access to assigned projects and personal career development',
      color: '#6b7280'
    },
    {
      value: 'Executive Leader',
      label: 'Executive Leader', 
      icon: Crown,
      description: 'Team management and organizational oversight',
      color: '#dc2626'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        padding: '2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        width: '100%',
        maxWidth: '420px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src={logo} 
            alt="Company Logo" 
            style={{ 
              width: '250px',
              height: 'auto',
              marginBottom: '1rem',
              objectFit: 'contain'
            }} 
          />
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            {isLogin ? '' : 'Create your account'}
          </p>
        </div>

        {/* Auth Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f3f4f6',
          borderRadius: '0.75rem',
          padding: '0.25rem',
          marginBottom: '2rem'
        }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
              setFormData({ ...formData, name: '', role: 'Team Member' });
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: isLogin ? 'white' : 'transparent',
              color: isLogin ? '#2563eb' : '#6b7280',
              boxShadow: isLogin ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: !isLogin ? 'white' : 'transparent',
              color: !isLogin ? '#2563eb' : '#6b7280',
              boxShadow: !isLogin ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name Field - Only for Registration */}
          {!isLogin && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 3rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 3rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: isLogin ? '2rem' : '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '0.75rem 3rem 0.75rem 3rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#9ca3af'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role Selection - Only for Registration */}
          {!isLogin && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.75rem'
              }}>
                Choose Your Role
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {roleOptions.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = formData.role === option.value;
                  
                  return (
                    <div
                      key={option.value}
                      onClick={() => setFormData({ ...formData, role: option.value })}
                      style={{
                        padding: '1rem',
                        border: `2px solid ${isSelected ? option.color : '#e5e7eb'}`,
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: isSelected ? `${option.color}10` : 'white'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                      }}>
                        <div style={{
                          width: '2rem',
                          height: '2rem',
                          backgroundColor: isSelected ? option.color : '#f3f4f6',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <IconComponent 
                            size={16} 
                            style={{ color: isSelected ? 'white' : '#6b7280' }} 
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: isSelected ? option.color : '#111827',
                            margin: '0 0 0.25rem 0'
                          }}>
                            {option.label}
                          </h4>
                          <p style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            margin: 0,
                            lineHeight: '1.4'
                          }}>
                            {option.description}
                          </p>
                        </div>
                        <div style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? option.color : '#d1d5db'}`,
                          backgroundColor: isSelected ? option.color : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSelected && (
                            <div style={{
                              width: '0.5rem',
                              height: '0.5rem',
                              backgroundColor: 'white',
                              borderRadius: '50%'
                            }} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: isLoading
                ? 'linear-gradient(to right, #9ca3af, #6b7280)'
                : 'linear-gradient(to right, #667eea, #764ba2)',
              color: 'white',
              padding: '0.875rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.8 : 1
            }}
          >
            {isLoading 
              ? (isLogin ? 'Signing In...' : 'Creating Account...') 
              : (isLogin ? 'Sign In' : 'Create Account')
            }
          </button>
        </form>

        {/* Footer Info */}
        {!isLogin && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            color: '#6b7280',
            lineHeight: '1.4'
          }}>
            <strong>Note:</strong> When you create a project, you automatically become that project's manager with full access to all dashboard features. Executive Leaders can manage teams across multiple projects.
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;