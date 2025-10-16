import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE = 'http://localhost:8080/api';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('adminToken'));
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (token) {
            const userData = localStorage.getItem('adminUser');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        }
    }, [token]);

    const login = async (username, password) => {
        try {
            const response = await axios.post(`${API_BASE}/auth/login`, {
                username,
                password
            });

            const { token: newToken, user: userData } = response.data;

            localStorage.setItem('adminToken', newToken);
            localStorage.setItem('adminUser', JSON.stringify(userData));
            setToken(newToken);
            setUser(userData);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setToken(null);
        setUser(null);
    };

    const getAuthHeader = () => {
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    return (
        <AuthContext.Provider value={{
            token,
            user,
            login,
            logout,
            getAuthHeader
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}