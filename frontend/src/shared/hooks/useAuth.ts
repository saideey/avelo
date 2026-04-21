import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTokens, setUser, logout as logoutAction } from '@/features/auth/authSlice';
import api from '@/shared/api/axios';

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, accessToken } = useAppSelector((s) => s.auth);

  const login = useCallback(
    (tokens: { access_token: string; refresh_token: string }) => {
      dispatch(setTokens(tokens));
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    dispatch(logoutAction());
    navigate('/login');
  }, [dispatch, navigate]);

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      dispatch(setUser(data));
      return data;
    } catch {
      return null;
    }
  }, [dispatch]);

  return { user, isAuthenticated, accessToken, login, logout, fetchUser };
}
