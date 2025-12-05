# Authentication Implementation Plan
## Imperium(L) AI Knowledge Hub - Enterprise Authentication

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Implementation Phases](#implementation-phases)
4. [Phase 1: AWS Cognito Setup](#phase-1-aws-cognito-setup)
5. [Phase 2: Frontend Authentication](#phase-2-frontend-authentication)
6. [Phase 3: Lambda Authorization](#phase-3-lambda-authorization)
7. [Phase 4: Database Migration](#phase-4-database-migration)
8. [Phase 5: Admin Panel Foundation](#phase-5-admin-panel-foundation)
9. [Testing Strategy](#testing-strategy)
10. [Security Considerations](#security-considerations)
11. [Cost Estimates](#cost-estimates)

---

## Overview

This plan outlines the step-by-step process to add enterprise-grade authentication to your AI Knowledge Hub, transitioning from localStorage to a persistent, multi-user system with role-based access control.

**Goals:**
- ✅ User signup, login, logout, password reset
- ✅ Secure API access with JWT tokens
- ✅ Role-based access (User, Admin)
- ✅ Persistent user data across devices
- ✅ Foundation for admin panel
- ✅ Zero downtime migration

---

## Architecture Design

### Current Architecture
```
┌─────────────────┐
│  React (Amplify)│
│  - localStorage │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Lambda Function│
│  (no auth)      │
└─────────────────┘
```

### Target Architecture
```
┌──────────────────────┐
│   React (Amplify)    │
│   + Amplify Auth     │
│   + JWT Token        │
└──────────┬───────────┘
           │ HTTPS + JWT
           ▼
┌──────────────────────┐
│   API Gateway        │
│   + JWT Authorizer   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────┐
│  Lambda Functions    │────▶│   AWS Cognito    │
│  - /process          │     │   User Pool      │
│  - /search           │     └──────────────────┘
│  - /rag              │
│  - /auth/*           │     ┌──────────────────┐
│  - /user/*           │────▶│   DynamoDB       │
│  - /admin/*          │     │   - Users        │
└──────────────────────┘     │   - Conversations│
                              │   - Documents    │
                              └──────────────────┘
```

---

## Implementation Phases

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| 1 | AWS Cognito Setup | 2-3 days | AWS Account |
| 2 | Frontend Auth Integration | 3-5 days | Phase 1 |
| 3 | Lambda Authorization | 3-4 days | Phase 1, 2 |
| 4 | Database Migration | 4-6 days | Phase 2, 3 |
| 5 | Admin Panel Foundation | 5-7 days | Phase 4 |

**Total Estimated Time:** 3-4 weeks

---

## Phase 1: AWS Cognito Setup

### 1.1 Create Cognito User Pool

**AWS Console Steps:**

1. Navigate to AWS Cognito → "Create User Pool"
2. Configure sign-in options:
   ```yaml
   Sign-in options:
     - Email ✓
     - Username ✗ (optional, can add later)

   Password policy:
     - Minimum length: 8
     - Require: lowercase, uppercase, numbers, special chars
     - Prevent password reuse

   MFA: Optional (recommended for admins)

   Account recovery: Email only
   ```

3. Configure sign-up experience:
   ```yaml
   Self-registration: Enabled

   Required attributes:
     - Email (verified) ✓
     - Name ✓
     - Custom:company (optional)

   Email verification: Required

   Verification message:
     "Your verification code is {####}"
   ```

4. Configure message delivery:
   ```yaml
   Email provider:
     - SES (production) or Cognito (dev)

   FROM email: no-reply@yourdomain.com
   REPLY-TO email: support@yourdomain.com
   ```

5. Integrate your app:
   ```yaml
   User pool name: imperium-ai-knowledge-hub-users

   App client:
     - Name: web-app-client
     - Client secret: No (SPA doesn't need it)
     - Auth flows: ALLOW_USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH
     - Token expiration:
         - ID token: 60 minutes
         - Access token: 60 minutes
         - Refresh token: 30 days
   ```

6. Add custom attributes:
   ```yaml
   Custom attributes:
     - company: String (mutable)
     - role: String (mutable) - values: "user", "admin"
     - subscription_tier: String (mutable) - values: "free", "pro", "enterprise"
   ```

### 1.2 Configure App Client

**Important Settings:**
```javascript
// OAuth 2.0 flows (for future SSO)
OAuth flows: Authorization code grant
OAuth scopes: email, openid, profile

// Callback URLs (update these)
Allowed callback URLs:
  - http://localhost:3000/callback (dev)
  - https://your-amplify-domain.amplifyapp.com/callback (prod)

// Sign out URLs
Allowed sign out URLs:
  - http://localhost:3000/
  - https://your-amplify-domain.amplifyapp.com/
```

### 1.3 Create Identity Pool (Optional for S3 access)

If users will upload files directly to S3:
```yaml
Identity pool name: imperium-ai-knowledge-hub-identity
Enable unauthenticated access: No
Authentication providers:
  - Cognito User Pool ID: [from step 1.1]
  - App client ID: [from step 1.2]
```

### 1.4 Configure Lambda Triggers (Optional)

Add custom logic during auth events:
```python
# Example: Pre-signup trigger - auto-verify corporate emails
def lambda_handler(event, context):
    # Auto-confirm corporate email domains
    email = event['request']['userAttributes']['email']
    if email.endswith('@yourcompany.com'):
        event['response']['autoConfirmUser'] = True
        event['response']['autoVerifyEmail'] = True

    return event

# Example: Post-confirmation trigger - create DynamoDB record
def lambda_handler(event, context):
    import boto3
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('Users')

    table.put_item(Item={
        'userId': event['request']['userAttributes']['sub'],
        'email': event['request']['userAttributes']['email'],
        'name': event['request']['userAttributes']['name'],
        'role': 'user',  # default role
        'createdAt': event['request']['userAttributes']['cognito:user_create_date'],
        'conversationCount': 0,
        'documentCount': 0
    })

    return event
```

---

## Phase 2: Frontend Authentication

### 2.1 Install Dependencies

```bash
npm install aws-amplify @aws-amplify/ui-react
```

### 2.2 Configure Amplify

Create `src/aws-config.js`:
```javascript
const awsConfig = {
  Auth: {
    region: 'eu-west-2',
    userPoolId: 'eu-west-2_XXXXXXXXX',  // From Cognito console
    userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',  // App client ID
    mandatorySignIn: true,
    authenticationFlowType: 'USER_PASSWORD_AUTH',

    // Optional: OAuth configuration
    oauth: {
      domain: 'your-domain.auth.eu-west-2.amazoncognito.com',
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: 'http://localhost:3000/callback',
      redirectSignOut: 'http://localhost:3000/',
      responseType: 'code'
    }
  }
};

export default awsConfig;
```

### 2.3 Initialize Amplify

Update `src/index.js`:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';

// Configure Amplify
Amplify.configure(awsConfig);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 2.4 Create Authentication Context

Create `src/contexts/AuthContext.js`:
```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();

      setUser({
        ...currentUser.attributes,
        userId: currentUser.attributes.sub,
        username: currentUser.username,
        token: session.getIdToken().getJwtToken(),
        role: currentUser.attributes['custom:role'] || 'user'
      });
    } catch (err) {
      console.log('Not authenticated:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, name, company = '') => {
    try {
      setError(null);
      const { user } = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          name,
          'custom:company': company,
          'custom:role': 'user'
        }
      });
      return { success: true, user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const confirmSignUp = async (email, code) => {
    try {
      setError(null);
      await Auth.confirmSignUp(email, code);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      const user = await Auth.signIn(email, password);
      await checkAuth();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const signOut = async () => {
    try {
      await Auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      await Auth.forgotPassword(email);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const forgotPasswordSubmit = async (email, code, newPassword) => {
    try {
      setError(null);
      await Auth.forgotPasswordSubmit(email, code, newPassword);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      setError(null);
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(user, oldPassword, newPassword);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateUserAttributes = async (attributes) => {
    try {
      setError(null);
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, attributes);
      await checkAuth(); // Refresh user data
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const getToken = async () => {
    try {
      const session = await Auth.currentSession();
      return session.getIdToken().getJwtToken();
    } catch (err) {
      console.error('Error getting token:', err);
      return null;
    }
  };

  const value = {
    user,
    loading,
    error,
    signUp,
    confirmSignUp,
    signIn,
    signOut,
    forgotPassword,
    forgotPasswordSubmit,
    changePassword,
    updateUserAttributes,
    getToken,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 2.5 Create Login Component

Create `src/components/Login.js`:
```javascript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Building, Loader, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = () => {
  const { signIn, signUp, confirmSignUp, forgotPassword, error } = useAuth();
  const [mode, setMode] = useState('signin'); // signin, signup, confirm, forgot
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    confirmPassword: '',
    code: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await signIn(formData.email, formData.password);

    if (!result.success) {
      setMessage({ type: 'error', text: result.error });
    }

    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await signUp(
      formData.email,
      formData.password,
      formData.name,
      formData.company
    );

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Account created! Check your email for verification code.'
      });
      setMode('confirm');
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setLoading(false);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await confirmSignUp(formData.email, formData.code);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Email verified! You can now sign in.'
      });
      setMode('signin');
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await forgotPassword(formData.email);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Password reset code sent to your email.'
      });
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <img src="/logo.png" alt="Logo" className="logo-image" />
          </div>
          <h1>Imperium(L) AI Knowledge Hub</h1>
          <p>Enterprise Knowledge Platform</p>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            <AlertCircle size={16} />
            <span>{message.text}</span>
          </div>
        )}

        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="login-form">
            <div className="form-group">
              <label>
                <Mail size={18} />
                <span>Email</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <Lock size={18} />
                <span>Password</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? <Loader size={20} className="spinning" /> : 'Sign In'}
            </button>

            <div className="form-footer">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="link-button"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="link-button"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="login-form">
            <div className="form-group">
              <label>
                <User size={18} />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <Mail size={18} />
                <span>Email</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <Building size={18} />
                <span>Company (Optional)</span>
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Your Company"
              />
            </div>

            <div className="form-group">
              <label>
                <Lock size={18} />
                <span>Password</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label>
                <Lock size={18} />
                <span>Confirm Password</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? <Loader size={20} className="spinning" /> : 'Create Account'}
            </button>

            <div className="form-footer">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="link-button"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'confirm' && (
          <form onSubmit={handleConfirm} className="login-form">
            <p className="confirm-message">
              Enter the verification code sent to {formData.email}
            </p>

            <div className="form-group">
              <label>
                <Lock size={18} />
                <span>Verification Code</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="123456"
                required
              />
            </div>

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? <Loader size={20} className="spinning" /> : 'Verify Email'}
            </button>

            <div className="form-footer">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="link-button"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="login-form">
            <p className="confirm-message">
              Enter your email to receive a password reset code
            </p>

            <div className="form-group">
              <label>
                <Mail size={18} />
                <span>Email</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? <Loader size={20} className="spinning" /> : 'Send Reset Code'}
            </button>

            <div className="form-footer">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="link-button"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
```

### 2.6 Update Main App Component

Update `src/App.js`:
```javascript
// Add at top
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';

// Wrap main App in AuthProvider (in index.js or create wrapper)
function AppWrapper() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading, isAuthenticated, signOut, getToken } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="loading-container">
        <Loader size={48} className="spinning" />
        <p>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Original App component continues here...
  // Add user info to header
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-circle">
              <img src="/logo.png" alt="PTT Logo" className="logo-image" />
            </div>
            <h1>Imperium(L) <span className="gradient-text">AI Knowledge Hub</span></h1>
          </div>

          {/* Add user menu */}
          <div className="header-status">
            <div className="user-menu">
              <User size={20} />
              <span>{user.name || user.email}</span>
              {user.role === 'admin' && <span className="admin-badge">Admin</span>}
              <button onClick={signOut} className="icon-button">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Rest of your app */}
    </div>
  );
}

export default AppWrapper;
```

### 2.7 Update API Calls to Include JWT

Update all API calls in `App.js`:
```javascript
// Before (current)
const response = await fetch(`${API_BASE}/rag`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: currentQuery, top_k: settings.sourceCount })
});

// After (with authentication)
const token = await getToken();
const response = await fetch(`${API_BASE}/rag`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: currentQuery,
    top_k: settings.sourceCount,
    userId: user.userId  // Include user ID for tracking
  })
});
```

Create a helper function:
```javascript
const authenticatedFetch = async (url, options = {}) => {
  const token = await getToken();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

---

## Phase 3: Lambda Authorization

### 3.1 Create API Gateway

**AWS Console Steps:**

1. Go to API Gateway → Create API → REST API
2. Configure:
   ```yaml
   API name: imperium-ai-knowledge-hub-api
   Description: API for AI Knowledge Hub
   Endpoint Type: Regional
   ```

3. Create resources and methods:
   ```
   /
   ├── /process (POST)
   ├── /search (POST)
   ├── /rag (POST)
   │   └── /stream (POST)
   ├── /conversations
   │   ├── GET (list)
   │   ├── POST (create)
   │   └── /{id}
   │       ├── GET (retrieve)
   │       ├── PUT (update)
   │       └── DELETE (delete)
   ├── /documents
   │   ├── GET (list)
   │   ├── POST (upload)
   │   └── /{id}
   │       ├── GET (retrieve)
   │       └── DELETE (delete)
   └── /admin
       ├── /users (GET, PUT, DELETE)
       └── /analytics (GET)
   ```

### 3.2 Create Lambda Authorizer

Create new Lambda function `CognitoAuthorizer`:

```python
import json
import jwt
from jwt import PyJWKClient
import os

# Cognito settings (set as environment variables)
COGNITO_REGION = os.environ['COGNITO_REGION']
USER_POOL_ID = os.environ['USER_POOL_ID']
APP_CLIENT_ID = os.environ['APP_CLIENT_ID']

# JWK endpoint
JWK_URL = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'

def lambda_handler(event, context):
    token = event['authorizationToken'].replace('Bearer ', '')

    try:
        # Get signing key
        jwks_client = PyJWKClient(JWK_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Verify token
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256'],
            audience=APP_CLIENT_ID,
            options={'verify_exp': True}
        )

        # Extract user info
        user_id = decoded.get('sub')
        email = decoded.get('email')
        role = decoded.get('custom:role', 'user')

        # Build policy
        policy = generate_policy(
            user_id,
            'Allow',
            event['methodArn'],
            {
                'userId': user_id,
                'email': email,
                'role': role
            }
        )

        return policy

    except jwt.ExpiredSignatureError:
        raise Exception('Token expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')
    except Exception as e:
        print(f'Authorization error: {str(e)}')
        raise Exception('Unauthorized')

def generate_policy(principal_id, effect, resource, context=None):
    policy = {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                'Resource': resource
            }]
        }
    }

    if context:
        policy['context'] = context

    return policy
```

**Deploy requirements:**
```bash
# Create deployment package
pip install PyJWT cryptography -t package/
cd package && zip -r ../authorizer.zip . && cd ..
zip -g authorizer.zip lambda_function.py

# Upload to Lambda
aws lambda update-function-code \
  --function-name CognitoAuthorizer \
  --zip-file fileb://authorizer.zip
```

### 3.3 Attach Authorizer to API Gateway

1. In API Gateway → Authorizers → Create New Authorizer
2. Configure:
   ```yaml
   Name: CognitoJWTAuthorizer
   Type: Lambda
   Lambda Function: CognitoAuthorizer
   Lambda Event Payload: Token
   Token Source: Authorization
   Token Validation: (leave blank)
   Authorization Caching: Enabled
   TTL: 300 seconds
   ```

3. Attach to all API methods:
   - Select each method (POST /rag, etc.)
   - Method Request → Authorization → Select "CognitoJWTAuthorizer"

### 3.4 Update Existing Lambda Functions

Update your RAG Lambda function to use authenticated user context:

```python
import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
conversations_table = dynamodb.Table(os.environ['CONVERSATIONS_TABLE'])

def lambda_handler(event, context):
    # Extract user info from authorizer context
    user_id = event['requestContext']['authorizer']['userId']
    user_email = event['requestContext']['authorizer']['email']
    user_role = event['requestContext']['authorizer']['role']

    # Parse request body
    body = json.loads(event['body'])
    query = body.get('query')
    top_k = body.get('top_k', 5)

    # Your existing RAG logic here
    # ...
    answer = perform_rag(query, top_k)
    sources = get_sources(query, top_k)

    # Save conversation to DynamoDB
    conversation_id = f"{user_id}_{int(datetime.now().timestamp())}"
    conversations_table.put_item(Item={
        'conversationId': conversation_id,
        'userId': user_id,
        'userEmail': user_email,
        'query': query,
        'answer': answer,
        'sources': sources,
        'timestamp': datetime.now().isoformat(),
        'topK': top_k,
        'bookmarked': False,
        'rating': None
    })

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'answer': answer,
            'sources': sources,
            'conversationId': conversation_id,
            'retrieved_chunks': len(sources),
            'total_time_seconds': 2.5  # Calculate actual time
        })
    }

def perform_rag(query, top_k):
    # Your existing RAG implementation
    pass

def get_sources(query, top_k):
    # Your existing source retrieval
    pass
```

---

## Phase 4: Database Migration

### 4.1 Create DynamoDB Tables

**Users Table:**
```python
import boto3

dynamodb = boto3.client('dynamodb')

# Create Users table
dynamodb.create_table(
    TableName='Users',
    KeySchema=[
        {'AttributeName': 'userId', 'KeyType': 'HASH'}
    ],
    AttributeDefinitions=[
        {'AttributeName': 'userId', 'AttributeType': 'S'},
        {'AttributeName': 'email', 'AttributeType': 'S'}
    ],
    GlobalSecondaryIndexes=[{
        'IndexName': 'EmailIndex',
        'KeySchema': [
            {'AttributeName': 'email', 'KeyType': 'HASH'}
        ],
        'Projection': {'ProjectionType': 'ALL'},
        'ProvisionedThroughput': {
            'ReadCapacityUnits': 5,
            'WriteCapacityUnits': 5
        }
    }],
    ProvisionedThroughput={
        'ReadCapacityUnits': 5,
        'WriteCapacityUnits': 5
    }
)
```

**Conversations Table:**
```python
dynamodb.create_table(
    TableName='Conversations',
    KeySchema=[
        {'AttributeName': 'conversationId', 'KeyType': 'HASH'}
    ],
    AttributeDefinitions=[
        {'AttributeName': 'conversationId', 'AttributeType': 'S'},
        {'AttributeName': 'userId', 'AttributeType': 'S'},
        {'AttributeName': 'timestamp', 'AttributeType': 'S'}
    ],
    GlobalSecondaryIndexes=[{
        'IndexName': 'UserIdIndex',
        'KeySchema': [
            {'AttributeName': 'userId', 'KeyType': 'HASH'},
            {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
        ],
        'Projection': {'ProjectionType': 'ALL'},
        'ProvisionedThroughput': {
            'ReadCapacityUnits': 5,
            'WriteCapacityUnits': 5
        }
    }],
    ProvisionedThroughput={
        'ReadCapacityUnits': 5,
        'WriteCapacityUnits': 5
    }
)
```

**Documents Table:**
```python
dynamodb.create_table(
    TableName='Documents',
    KeySchema=[
        {'AttributeName': 'documentId', 'KeyType': 'HASH'}
    ],
    AttributeDefinitions=[
        {'AttributeName': 'documentId', 'AttributeType': 'S'},
        {'AttributeName': 'userId', 'AttributeType': 'S'},
        {'AttributeName': 'uploadedAt', 'AttributeType': 'S'}
    ],
    GlobalSecondaryIndexes=[{
        'IndexName': 'UserIdIndex',
        'KeySchema': [
            {'AttributeName': 'userId', 'KeyType': 'HASH'},
            {'AttributeName': 'uploadedAt', 'KeyType': 'RANGE'}
        ],
        'Projection': {'ProjectionType': 'ALL'},
        'ProvisionedThroughput': {
            'ReadCapacityUnits': 5,
            'WriteCapacityUnits': 5
        }
    }],
    ProvisionedThroughput={
        'ReadCapacityUnits': 5,
        'WriteCapacityUnits': 5
    }
)
```

### 4.2 Create API Endpoints for Data Management

**Conversations Lambda:**
```python
import json
import boto3
from boto3.dynamodb.conditions import Key
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['CONVERSATIONS_TABLE'])

def lambda_handler(event, context):
    user_id = event['requestContext']['authorizer']['userId']
    http_method = event['httpMethod']
    path = event['path']

    if http_method == 'GET' and path == '/conversations':
        return list_conversations(user_id)

    elif http_method == 'GET' and 'conversationId' in event['pathParameters']:
        conversation_id = event['pathParameters']['conversationId']
        return get_conversation(user_id, conversation_id)

    elif http_method == 'PUT':
        return update_conversation(user_id, event)

    elif http_method == 'DELETE':
        conversation_id = event['pathParameters']['conversationId']
        return delete_conversation(user_id, conversation_id)

    return error_response(400, 'Invalid request')

def list_conversations(user_id, limit=100):
    response = table.query(
        IndexName='UserIdIndex',
        KeyConditionExpression=Key('userId').eq(user_id),
        ScanIndexForward=False,  # Sort by timestamp descending
        Limit=limit
    )

    return success_response({
        'conversations': response.get('Items', []),
        'count': len(response.get('Items', []))
    })

def get_conversation(user_id, conversation_id):
    response = table.get_item(Key={'conversationId': conversation_id})

    item = response.get('Item')
    if not item or item.get('userId') != user_id:
        return error_response(404, 'Conversation not found')

    return success_response(item)

def update_conversation(user_id, event):
    body = json.loads(event['body'])
    conversation_id = event['pathParameters']['conversationId']

    # Check ownership
    item = table.get_item(Key={'conversationId': conversation_id}).get('Item')
    if not item or item.get('userId') != user_id:
        return error_response(403, 'Forbidden')

    # Update attributes
    update_expression = []
    expression_values = {}

    if 'bookmarked' in body:
        update_expression.append('bookmarked = :b')
        expression_values[':b'] = body['bookmarked']

    if 'rating' in body:
        update_expression.append('rating = :r')
        expression_values[':r'] = body['rating']

    if update_expression:
        table.update_item(
            Key={'conversationId': conversation_id},
            UpdateExpression='SET ' + ', '.join(update_expression),
            ExpressionAttributeValues=expression_values
        )

    return success_response({'message': 'Updated successfully'})

def delete_conversation(user_id, conversation_id):
    # Check ownership
    item = table.get_item(Key={'conversationId': conversation_id}).get('Item')
    if not item or item.get('userId') != user_id:
        return error_response(403, 'Forbidden')

    table.delete_item(Key={'conversationId': conversation_id})
    return success_response({'message': 'Deleted successfully'})

def success_response(data):
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(data)
    }

def error_response(code, message):
    return {
        'statusCode': code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({'error': message})
    }
```

### 4.3 Update Frontend to Use DynamoDB Instead of localStorage

Update `src/App.js`:
```javascript
// Remove localStorage-based history management
// Replace with API calls

const loadConversationHistory = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/conversations`);
    const data = await response.json();
    setConversationHistory(data.conversations);
  } catch (err) {
    console.error('Error loading history:', err);
  }
};

const updateConversation = async (conversationId, updates) => {
  try {
    await authenticatedFetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    // Refresh list
    loadConversationHistory();
  } catch (err) {
    showNotification('Failed to update conversation', 'error');
  }
};

const deleteConversation = async (conversationId) => {
  try {
    await authenticatedFetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    loadConversationHistory();
    showNotification('Conversation deleted', 'success');
  } catch (err) {
    showNotification('Failed to delete conversation', 'error');
  }
};

// Load on mount
useEffect(() => {
  if (isAuthenticated) {
    loadConversationHistory();
  }
}, [isAuthenticated]);
```

---

## Phase 5: Admin Panel Foundation

### 5.1 Create Admin Route Protection

Create `src/components/AdminRoute.js`:
```javascript
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <AlertCircle size={64} />
        <h2>Access Denied</h2>
        <p>You need administrator privileges to access this page.</p>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
```

### 5.2 Create Admin Dashboard Component

Create `src/components/AdminDashboard.js`:
```javascript
import React, { useState, useEffect } from 'react';
import { Users, FileText, MessageSquare, TrendingUp, Database } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        authenticatedFetch(`${API_BASE}/admin/stats`),
        authenticatedFetch(`${API_BASE}/admin/users`)
      ]);

      setStats(await statsRes.json());
      setUsers(await usersRes.json());
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <Users size={32} />
          <div>
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className="stat-card">
          <MessageSquare size={32} />
          <div>
            <h3>{stats.totalConversations}</h3>
            <p>Conversations</p>
          </div>
        </div>

        <div className="stat-card">
          <FileText size={32} />
          <div>
            <h3>{stats.totalDocuments}</h3>
            <p>Documents</p>
          </div>
        </div>

        <div className="stat-card">
          <TrendingUp size={32} />
          <div>
            <h3>{stats.queriesThisMonth}</h3>
            <p>Queries This Month</p>
          </div>
        </div>
      </div>

      <div className="users-section">
        <h2>User Management</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Conversations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.userId}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>{user.conversationCount}</td>
                <td>
                  <button className="icon-button">Edit</button>
                  <button className="icon-button danger">Disable</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

### 5.3 Create Admin Lambda Functions

**Admin Stats Lambda:**
```python
import json
import boto3
from boto3.dynamodb.conditions import Attr
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    # Verify admin role
    user_role = event['requestContext']['authorizer']['role']
    if user_role != 'admin':
        return error_response(403, 'Admin access required')

    # Get stats from DynamoDB
    users_table = dynamodb.Table('Users')
    conversations_table = dynamodb.Table('Conversations')
    documents_table = dynamodb.Table('Documents')

    # Count totals
    total_users = users_table.scan(Select='COUNT')['Count']
    total_conversations = conversations_table.scan(Select='COUNT')['Count']
    total_documents = documents_table.scan(Select='COUNT')['Count']

    # Count queries this month
    month_ago = (datetime.now() - timedelta(days=30)).isoformat()
    queries_this_month = conversations_table.scan(
        Select='COUNT',
        FilterExpression=Attr('timestamp').gte(month_ago)
    )['Count']

    return success_response({
        'totalUsers': total_users,
        'totalConversations': total_conversations,
        'totalDocuments': total_documents,
        'queriesThisMonth': queries_this_month
    })
```

### 5.4 Update App.js to Include Admin Tab

```javascript
// Add to navigation
{user.role === 'admin' && (
  <button
    className={`nav-button ${activeTab === 'admin' ? 'active' : ''}`}
    onClick={() => setActiveTab('admin')}
  >
    <Shield size={20} />
    <span>Admin</span>
  </button>
)}

// Add to content area
{activeTab === 'admin' && (
  <AdminRoute>
    <AdminDashboard />
  </AdminRoute>
)}
```

---

## Testing Strategy

### Unit Tests
```javascript
// tests/auth.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import Login from '../components/Login';

test('login form submits correctly', async () => {
  render(
    <AuthProvider>
      <Login />
    </AuthProvider>
  );

  fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
    target: { value: 'test@example.com' }
  });

  fireEvent.change(screen.getByPlaceholderText('••••••••'), {
    target: { value: 'password123' }
  });

  fireEvent.click(screen.getByText('Sign In'));

  await waitFor(() => {
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Integration Tests
```python
# tests/test_api.py
import boto3
import requests
import pytest

@pytest.fixture
def cognito_user():
    # Create test user in Cognito
    client = boto3.client('cognito-idp')
    response = client.admin_create_user(
        UserPoolId='your-pool-id',
        Username='test@example.com',
        TemporaryPassword='TempPass123!',
        MessageAction='SUPPRESS'
    )

    # Set permanent password
    client.admin_set_user_password(
        UserPoolId='your-pool-id',
        Username='test@example.com',
        Password='TestPass123!',
        Permanent=True
    )

    yield 'test@example.com'

    # Cleanup
    client.admin_delete_user(
        UserPoolId='your-pool-id',
        Username='test@example.com'
    )

def test_rag_endpoint_requires_auth(cognito_user):
    # Without token - should fail
    response = requests.post(
        'https://your-api-gateway.amazonaws.com/rag',
        json={'query': 'test'}
    )
    assert response.status_code == 401

    # With token - should succeed
    token = get_auth_token('test@example.com', 'TestPass123!')
    response = requests.post(
        'https://your-api-gateway.amazonaws.com/rag',
        json={'query': 'test'},
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
```

---

## Security Considerations

### 1. Token Security
- Store tokens in memory only (not localStorage)
- Implement automatic token refresh
- Clear tokens on logout
- Use HTTPS everywhere

### 2. API Security
- Rate limiting per user
- Input validation on all endpoints
- SQL injection prevention (if using RDS)
- CORS configuration

### 3. Data Privacy
- Encrypt sensitive data at rest
- Use VPC for Lambda functions
- Implement data retention policies
- GDPR compliance (if EU users)

### 4. Admin Access
- Multi-factor authentication for admins
- Audit logging of admin actions
- Principle of least privilege
- Regular access reviews

---

## Cost Estimates

### Development Phase (1 month)
```
AWS Cognito: FREE (first 50k MAU)
API Gateway: ~$3.50 (1M requests)
Lambda: ~$5-10 (compute time)
DynamoDB: ~$5-10 (provisioned capacity)
Total: ~$13-25/month
```

### Production (1,000 active users)
```
Cognito: FREE (< 50k MAU)
API Gateway: ~$35 (10M requests)
Lambda: ~$50-100 (increased usage)
DynamoDB: ~$25-50 (on-demand pricing)
Amplify: ~$10-20 (hosting)
Total: ~$120-205/month
```

### Enterprise Scale (10,000 users)
```
Cognito: ~$50 (beyond free tier)
API Gateway: ~$350 (100M requests)
Lambda: ~$500-1000
DynamoDB: ~$200-500
Amplify: ~$30-50
Total: ~$1,130-1,950/month
```

---

## Deployment Checklist

### Pre-deployment
- [ ] All environment variables configured
- [ ] Cognito user pool created
- [ ] API Gateway deployed
- [ ] Lambda functions deployed
- [ ] DynamoDB tables created
- [ ] IAM roles configured
- [ ] CORS enabled on API Gateway

### Deployment
- [ ] Build React app (`npm run build`)
- [ ] Deploy to Amplify
- [ ] Update API_BASE URL
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test API calls with authentication
- [ ] Verify conversation saving to DynamoDB

### Post-deployment
- [ ] Monitor CloudWatch logs
- [ ] Check error rates
- [ ] Verify user can't access others' data
- [ ] Test admin panel (if deployed)
- [ ] Document API endpoints
- [ ] Update README

---

## Migration Path for Existing Users

Since you currently use localStorage, you'll need a migration strategy:

### Option 1: Fresh Start
- Launch new authenticated version
- Users create accounts
- Previous localStorage data can be exported/imported manually

### Option 2: Migration Tool
- Build migration endpoint
- Users login → trigger migration
- Upload localStorage JSON → import to DynamoDB

**Recommended:** Option 1 for simplicity, or provide export before launch.

---

## Next Steps

1. **Start with Cognito setup** (Phase 1)
2. **Test authentication flow locally** (Phase 2)
3. **Deploy Lambda authorizer** (Phase 3)
4. **Create DynamoDB tables** (Phase 4)
5. **Build admin panel iteratively** (Phase 5)

This plan provides a complete roadmap to transform your app from a single-user prototype to an enterprise-grade multi-tenant system with proper authentication, authorization, and persistent storage.
