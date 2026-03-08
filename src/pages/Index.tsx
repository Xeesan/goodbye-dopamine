import { useState, useCallback } from 'react';
import Storage from '@/lib/storage';
import { generateUniqueId } from '@/lib/helpers';
import AuthScreen from '@/components/gbd/AuthScreen';
import AppShell from '@/components/gbd/AppShell';

const Index = () => {
  const [user, setUser] = useState(() => Storage.getUser());

  const handleLogin = useCallback((uid: string, password: string) => {
    if (!uid || !password) {
      alert('Please enter both Unique ID and Password');
      return;
    }
    const users = Storage.get('users', []);
    const found = users.find((u: any) => u.uid === uid && u.password === password);
    if (found) {
      Storage.setUser(found);
      setUser(found);
    } else {
      alert('Invalid credentials. Please check your Unique ID and Password.');
    }
  }, []);

  const handleSignup = useCallback((name: string, password: string) => {
    if (!name || !password) {
      alert('Please enter both Full Name and Password');
      return;
    }
    if (password.length < 3) {
      alert('Password must be at least 3 characters');
      return;
    }
    const uid = generateUniqueId();
    const newUser = { name, password, uid, createdAt: new Date().toISOString() };
    const users = Storage.get('users', []);
    users.push(newUser);
    Storage.set('users', users);
    Storage.setUser(newUser);
    alert(`Account created! Your Unique ID is: ${uid}\nSave this ID to login later.`);
    setUser(newUser);
  }, []);

  const handleLogout = useCallback(() => {
    Storage.clearUser();
    setUser(null);
  }, []);

  if (!user) {
    return <AuthScreen onLogin={handleLogin} onSignup={handleSignup} />;
  }

  return <AppShell user={user} onLogout={handleLogout} />;
};

export default Index;
