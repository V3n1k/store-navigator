import React from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button
} from '@mui/material';
import { useParams } from 'react-router-dom';

function StoreEditor() {
    const { storeId } = useParams();

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    Редактор карты магазина #{storeId}
                </Typography>
            </Box>

            <Paper sx={{ p: 3, textAlign: 'center', height: '400px' }}>
                <Typography variant="h6" color="textSecondary" sx={{ mt: 10 }}>
                    🎨 Визуальный редактор карт магазина
                </Typography>
                <Typography color="textSecondary" sx={{ mt: 2 }}>
                    Этот компонент будет содержать интерактивный редактор для создания карт магазина
                </Typography>
                <Button variant="contained" sx={{ mt: 3 }}>
                    Начать создание карты
                </Button>
            </Paper>
        </Container>
    );
}

export default StoreEditor;