import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Container
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout({ children }) {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Store Navigator Admin
                    </Typography>
                    <Button
                        color="inherit"
                        component={Link}
                        to="/"
                        variant={location.pathname === '/' ? 'outlined' : 'text'}
                    >
                        Дашборд
                    </Button>
                    <Button
                        color="inherit"
                        component={Link}
                        to="/stores"
                        variant={location.pathname === '/stores' ? 'outlined' : 'text'}
                    >
                        Магазины
                    </Button>
                    <Button
                        color="inherit"
                        component={Link}
                        to="/beacons"
                        variant={location.pathname === '/beacons' ? 'outlined' : 'text'}
                    >
                        Маячки
                    </Button>
                    {user && (
                        <>
                            <Typography sx={{ mx: 2 }}>
                                {user.username}
                            </Typography>
                            <Button color="inherit" onClick={logout}>
                                Выйти
                            </Button>
                        </>
                    )}
                </Toolbar>
            </AppBar>
            <Container component="main">
                {children}
            </Container>
        </>
    );
}

export default Layout;