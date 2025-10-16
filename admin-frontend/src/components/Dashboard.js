import React from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Button
} from '@mui/material';
import { Link } from 'react-router-dom';
import StoreIcon from '@mui/icons-material/Store';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import MapIcon from '@mui/icons-material/Map';

function Dashboard() {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Панель управления
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <StoreIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Управление магазинами
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                                Добавление, редактирование и удаление магазинов
                            </Typography>
                            <Button
                                variant="contained"
                                component={Link}
                                to="/stores"
                            >
                                Перейти
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <MapIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Редактор карт
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                                Создание и редактирование карт магазинов
                            </Typography>
                            <Button
                                variant="contained"
                                color="secondary"
                                component={Link}
                                to="/stores"
                            >
                                Перейти
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <BluetoothIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Управление маячками
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                                Настройка BLE маячков для навигации
                            </Typography>
                            <Button
                                variant="contained"
                                color="success"
                                component={Link}
                                to="/beacons"
                            >
                                Перейти
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

export default Dashboard;