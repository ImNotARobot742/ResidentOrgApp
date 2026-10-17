import { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../../shared/types';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, updateProfilePicture as updatePictureRequest } from '../api';

interface UserContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfilePicture: (picture: string | null) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((response) => setCurrentUserState(response.data))
      .catch(() => setCurrentUserState(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    setCurrentUserState(response.data);
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      setCurrentUserState(null);
    }
  };

  const updateProfilePicture = async (picture: string | null) => {
    const response = await updatePictureRequest(picture);
    setCurrentUserState(response.data);
  };

  return (
    <UserContext.Provider value={{ currentUser, loading, login, logout, updateProfilePicture }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
