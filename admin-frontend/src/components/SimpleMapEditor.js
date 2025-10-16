import React, { useState, useEffect, useRef } from 'react';
import {
    Container, Paper, Typography, Box, Button, Alert, Grid, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function SimpleMapEditor() {
    const { storeId } = useParams();
    const [elements, setElements] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentTool, setCurrentTool] = useState('sector');
    const canvasRef = useRef(null);
    const { getAuthHeader } = useAuth();

    const elementTypes = [
        { value: 'sector', label: 'Сектор', color: '#4CAF50' },
        { value: 'wall', label: 'Стена', color: '#795548' },
        { value: 'cashier', label: 'Касса', color: '#FF9800' },
        { value: 'beacon', label: 'Маячок', color: '#2196F3' },
        { value: 'entrance', label: 'Вход', color: '#8BC34A' },
        { value: 'exit', label: 'Выход', color: '#F44336' }
    ];

    // Простая загрузка данных
    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log('Fetching data for store:', storeId);

                const [sectorsRes, elementsRes] = await Promise.all([
                    axios.get(`http://localhost:8080/api/admin/stores/${storeId}/sectors`, {
                        headers: getAuthHeader()
                    }),
                    axios.get(`http://localhost:8080/api/admin/stores/${storeId}/map-elements`, {
                        headers: getAuthHeader()
                    })
                ]);

                console.log('Sectors:', sectorsRes.data);
                console.log('Elements:', elementsRes.data);

                setSectors(sectorsRes.data.sectors || []);
                setElements(elementsRes.data.elements || []);

            } catch (error) {
                console.error('Error loading data:', error);
                setError('Ошибка загрузки данных: ' + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [storeId, getAuthHeader]);

    // Простая отрисовка
    useEffect(() => {
        if (loading) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Устанавливаем размеры canvas
        canvas.width = 1000;
        canvas.height = 600;

        // Рисуем фон
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Рисуем сетку
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Рисуем границы
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Рисуем сектора (просто как прямоугольники)
        console.log('Drawing sectors:', sectors);
        sectors.forEach(sector => {
            const x = sector.positionX * 20 || 50; // Простой масштаб
            const y = sector.positionY * 20 || 50;
            const width = sector.width * 20 || 100;
            const height = sector.height * 20 || 60;

            console.log(`Drawing sector at ${x},${y} size ${width}x${height}`);

            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 2;

            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);

            // Текст
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.fillText(sector.name, x + 10, y + 20);
            ctx.fillText(`${sector.width || 0}×${sector.height || 0}м`, x + 10, y + 40);
        });

        // Рисуем элементы карты
        console.log('Drawing elements:', elements);
        elements.forEach(element => {
            const typeConfig = elementTypes.find(t => t.value === element.type);
            const x = element.positionX * 20 || 100;
            const y = element.positionY * 20 || 100;
            const width = element.width * 20 || 40;
            const height = element.height * 20 || 40;

            console.log(`Drawing element ${element.type} at ${x},${y}`);

            ctx.fillStyle = typeConfig?.color || '#4CAF50';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;

            switch (element.type) {
                case 'sector':
                    ctx.fillRect(x, y, width, height);
                    ctx.strokeRect(x, y, width, height);
                    ctx.fillStyle = '#000000';
                    ctx.font = '12px Arial';
                    ctx.fillText(element.name, x + 5, y + 15);
                    break;

                case 'wall':
                    ctx.fillRect(x, y, width, height);
                    ctx.strokeRect(x, y, width, height);
                    break;

                case 'cashier':
                    ctx.fillRect(x, y, width, height);
                    ctx.strokeRect(x, y, width, height);
                    ctx.fillStyle = '#000000';
                    ctx.font = '10px Arial';
                    ctx.fillText('💰', x + width / 2 - 5, y + height / 2 + 5);
                    break;

                case 'beacon':
                    ctx.beginPath();
                    ctx.arc(x, y, 15, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('BLE', x, y + 5);
                    ctx.textAlign = 'left';
                    break;

                case 'entrance':
                    ctx.strokeStyle = '#8BC34A';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + width, y);
                    ctx.stroke();
                    ctx.fillStyle = '#000000';
                    ctx.font = '12px Arial';
                    ctx.fillText('ВХОД', x, y - 10);
                    break;

                case 'exit':
                    ctx.strokeStyle = '#F44336';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + width, y);
                    ctx.stroke();
                    ctx.fillStyle = '#000000';
                    ctx.font = '12px Arial';
                    ctx.fillText('ВЫХОД', x, y - 10);
                    break;

                default:
                    ctx.fillRect(x, y, width, height);
                    ctx.strokeRect(x, y, width, height);
            }
        });

        // Отладочная информация на canvas
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.fillText(`Секторов: ${sectors.length}, Элементов: ${elements.length}`, 10, 20);

    }, [sectors, elements, loading]);

    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / 20; // Преобразуем в "метры"
        const y = (e.clientY - rect.top) / 20;

        console.log(`Canvas click at ${x},${y} meters`);

        const typeConfig = elementTypes.find(t => t.value === currentTool);

        const newElement = {
            type: currentTool,
            name: `${typeConfig?.label} ${elements.length + 1}`,
            positionX: x,
            positionY: y,
            width: typeConfig?.value === 'beacon' ? 0.5 : 2,
            height: typeConfig?.value === 'beacon' ? 0.5 : 1,
            color: typeConfig?.color
        };

        createElement(newElement);
    };

    const createElement = async (elementData) => {
        try {
            const response = await axios.post(
                `http://localhost:8080/api/admin/stores/${storeId}/map-elements`,
                elementData,
                { headers: getAuthHeader() }
            );
            setElements([...elements, response.data]);
            setSuccess('Элемент создан');
        } catch (error) {
            console.error('Error creating element:', error);
            setError('Ошибка создания элемента: ' + error.message);
        }
    };

    const clearCanvas = () => {
        setElements([]);
        setSuccess('Холст очищен');
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography>Загрузка карты...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Простой редактор карты</Typography>
                <Button variant="outlined" onClick={clearCanvas}>
                    Очистить
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={3}>
                <Grid item xs={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Инструменты
                            </Typography>

                            <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel>Тип элемента</InputLabel>
                                <Select
                                    value={currentTool}
                                    label="Тип элемента"
                                    onChange={(e) => setCurrentTool(e.target.value)}
                                >
                                    {elementTypes.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Box
                                                    sx={{
                                                        width: 20,
                                                        height: 20,
                                                        backgroundColor: type.color,
                                                        mr: 2,
                                                        border: '1px solid #000'
                                                    }}
                                                />
                                                {type.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Typography variant="subtitle2" gutterBottom>
                                Статистика:
                            </Typography>
                            <Typography variant="body2">
                                Секторов: {sectors.length}
                            </Typography>
                            <Typography variant="body2">
                                Элементов: {elements.length}
                            </Typography>

                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                Инструкция:
                            </Typography>
                            <Typography variant="body2">
                                1. Выберите тип элемента
                            </Typography>
                            <Typography variant="body2">
                                2. Кликните на карту для размещения
                            </Typography>
                            <Typography variant="body2">
                                3. Масштаб: 20 пикселей = 1 метр
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={9}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Карта магазина
                            </Typography>
                            <Paper
                                sx={{
                                    border: '1px solid #ccc',
                                    height: '600px',
                                    overflow: 'auto'
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        cursor: 'crosshair',
                                        display: 'block',
                                        width: '100%',
                                        height: '100%'
                                    }}
                                    onClick={handleCanvasClick}
                                />
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

export default SimpleMapEditor;