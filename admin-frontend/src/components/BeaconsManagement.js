import React from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button
} from '@mui/material';
import { Add } from '@mui/icons-material';

function BeaconsManagement() {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Управление маячками</Typography>
                <Button variant="contained" startIcon={<Add />}>
                    Добавить маячок
                </Button>
            </Box>

            <Paper sx={{ p: 3, textAlign: 'center', height: '400px' }}>
                <Typography variant="h6" color="textSecondary" sx={{ mt: 10 }}>
                    📡 Управление BLE маячками
                </Typography>
                <Typography color="textSecondary" sx={{ mt: 2 }}>
                    Этот компонент будет содержать интерфейс для настройки и управления Bluetooth маячками
                </Typography>
                <Button variant="contained" sx={{ mt: 3 }}>
                    Настроить маячки
                </Button>
            </Paper>
        </Container>
    );
}

export default BeaconsManagement;