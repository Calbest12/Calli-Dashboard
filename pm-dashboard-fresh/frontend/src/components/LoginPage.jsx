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
    firstName: '',
    lastName: '',
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
          console.log('✅ Login successful:', response.user.name, 'as', response.user.role);
          onLogin(response.user);
        } else {
          setError(response.error || 'Login failed');
        }

      } else {
        // REGISTRATION
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
          setError('Please fill in all fields');
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        // Combine first and last name for backend
        const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

        const response = await apiService.register({
          name: fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });

        if (response.success && response.user) {
          console.log('✅ Registration successful:', response.user.name, 'as', response.user.role);
          onLogin(response.user);
        } else {
          setError(response.error || 'Registration failed');
        }
      }

    } catch (error) {
      console.error('❌ Auth error:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        width: '100%',
        maxWidth: '400px',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#667eea',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Brain size={30} color="white" />
          </div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            EPM
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: '0 0 0.5rem 0'
          }}>
            PROJECT MANAGEMENT
          </p>
          <p style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            margin: 0,
            fontStyle: 'italic'
          }}>
            Assess and develop your project capabilities across multiple frameworks
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '0.5rem',
          padding: '0.25rem',
          display: 'flex',
          marginBottom: '1.5rem'
        }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
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
          {/* Name Fields - Only for Registration - Split into First and Last */}
          {!isLogin && (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    First Name
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
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
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
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Last Name
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
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
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
              </div>
            </>
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
                marginBottom: '0.5rem'
              }}>
                Choose Your Role
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  border: `2px solid ${formData.role === 'Team Member' ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: formData.role === 'Team Member' ? '#eff6ff' : 'white',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="Team Member"
                    checked={formData.role === 'Team Member'}
                    onChange={handleInputChange}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <User size={20} style={{ marginRight: '0.75rem', color: '#2563eb' }} />
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827' }}>Team Member</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Access to assigned projects and personal development</div>
                  </div>
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  border: `2px solid ${formData.role === 'Executive Leader' ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: formData.role === 'Executive Leader' ? '#eff6ff' : 'white',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="Executive Leader"
                    checked={formData.role === 'Executive Leader'}
                    onChange={handleInputChange}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <Crown size={20} style={{ marginRight: '0.75rem', color: '#7c3aed' }} />
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827' }}>Executive Leader</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Full organizational oversight and team management</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
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
              background: isLoading ? '#9ca3af' : 'linear-gradient(to right, #2563eb, #1d4ed8)',
              color: 'white',
              padding: '0.875rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;