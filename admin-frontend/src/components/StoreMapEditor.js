import React, { useState, useEffect, useRef } from 'react';
import {
    Container, Paper, Typography, Box, Button, Alert, Grid, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Switch, FormControlLabel, Slider, IconButton,
    List, ListItem, ListItemText, ListItemSecondaryAction, Divider
} from '@mui/material';
import {
    Save, Clear, Delete, Add, Settings, ZoomIn, ZoomOut, FitScreen,
    ContentCopy, ContentPaste, Edit, PanTool
} from '@mui/icons-material';
import SquareIcon from '@mui/icons-material/Square';
import DoorFront from '@mui/icons-material/DoorFront';
import Bluetooth from '@mui/icons-material/Bluetooth';
import PointOfSale from '@mui/icons-material/PointOfSale';
import ExitToApp from '@mui/icons-material/ExitToApp';
import SquareFoot from '@mui/icons-material/SquareFoot';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function StoreMapEditor() {
    const { storeId } = useParams();
    const [mapData, setMapData] = useState({
        elements: [],
        sectors: [],
        walls: [],
        config: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedElement, setSelectedElement] = useState(null);
    const [currentTool, setCurrentTool] = useState('select');
    const [clipboard, setClipboard] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
    const [editingSector, setEditingSector] = useState(null);
    const [zoom, setZoom] = useState(1.0);
    const canvasRef = useRef(null);
    const { getAuthHeader } = useAuth();

    // Конфигурация
    const defaultConfig = {
        scale: 20,
        width: 1200,
        height: 800
    };

    const elementTypes = [
        { value: 'sector', label: 'Сектор', color: '#4CAF50', width: 5, height: 3 },
        { value: 'cashier', label: 'Касса', color: '#FF9800', width: 1.5, height: 1 },
        { value: 'beacon', label: 'Маячок', color: '#2196F3', width: 0.5, height: 0.5 },
        { value: 'entrance', label: 'Вход', color: '#8BC34A', width: 2, height: 0.2 },
        { value: 'exit', label: 'Выход', color: '#F44336', width: 2, height: 0.2 }
    ];

    // Загрузка данных
    useEffect(() => {
        loadMapData();
    }, [storeId]);

    const loadMapData = async () => {
        try {
            setLoading(true);

            const [elementsRes, sectorsRes] = await Promise.all([
                axios.get(`http://localhost:8080/api/admin/stores/${storeId}/map-elements`, {
                    headers: getAuthHeader()
                }),
                axios.get(`http://localhost:8080/api/admin/stores/${storeId}/sectors`, {
                    headers: getAuthHeader()
                })
            ]);

            setMapData({
                elements: elementsRes.data.elements || [],
                sectors: sectorsRes.data.sectors || [],
                walls: [],
                config: defaultConfig
            });

        } catch (error) {
            console.error('Error loading map data:', error);
            setError('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    // Отрисовка canvas
    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const config = mapData.config || defaultConfig;

        // Устанавливаем размеры с учетом zoom
        canvas.width = config.width * zoom;
        canvas.height = config.height * zoom;

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Рисуем фон
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Рисуем сетку
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        const gridSize = config.scale * zoom;

        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Рисуем сектора
        mapData.sectors.forEach(sector => {
            const x = (sector.positionX || 0) * config.scale * zoom;
            const y = (sector.positionY || 0) * config.scale * zoom;
            const width = (sector.width || 5) * config.scale * zoom;
            const height = (sector.height || 3) * config.scale * zoom;

            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.strokeStyle = selectedElement?.id === sector.id ? '#FF0000' : '#4CAF50';
            ctx.lineWidth = selectedElement?.id === sector.id ? 3 : 2;

            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);

            // Текст
            ctx.fillStyle = '#000000';
            ctx.font = `${12 * zoom}px Arial`;
            ctx.fillText(sector.name || 'Сектор', x + 5, y + 15);
        });

        // Рисуем элементы
        mapData.elements.forEach(element => {
            // Пропускаем выбранный элемент если он перемещается
            if (selectedElement?.id === element.id && isDragging) {
                return;
            }

            const typeConfig = elementTypes.find(t => t.value === element.type);
            const x = (element.positionX || 0) * config.scale * zoom;
            const y = (element.positionY || 0) * config.scale * zoom;
            const width = (element.width || 1) * config.scale * zoom;
            const height = (element.height || 1) * config.scale * zoom;

            ctx.fillStyle = element.color || typeConfig?.color || '#4CAF50';
            ctx.strokeStyle = selectedElement?.id === element.id ? '#FF0000' : '#000000';
            ctx.lineWidth = selectedElement?.id === element.id ? 3 : 1;

            drawElement(ctx, element, x, y, width, height, zoom);
        });

        // Рисуем перемещаемый элемент поверх всех
        if (selectedElement && isDragging) {
            const typeConfig = elementTypes.find(t => t.value === selectedElement.type);
            const x = (selectedElement.positionX || 0) * config.scale * zoom;
            const y = (selectedElement.positionY || 0) * config.scale * zoom;
            const width = (selectedElement.width || 1) * config.scale * zoom;
            const height = (selectedElement.height || 1) * config.scale * zoom;

            ctx.fillStyle = (selectedElement.color || typeConfig?.color || '#4CAF50') + '80'; // полупрозрачный
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);

            drawElement(ctx, selectedElement, x, y, width, height, zoom);

            ctx.setLineDash([]);
        }
    };

    // Функция для отрисовки элемента
    const drawElement = (ctx, element, x, y, width, height, zoom) => {
        const typeConfig = elementTypes.find(t => t.value === element.type);

        switch (element.type) {
            case 'cashier':
                ctx.fillRect(x, y, width, height);
                ctx.strokeRect(x, y, width, height);
                ctx.fillStyle = '#000000';
                ctx.font = `${10 * zoom}px Arial`;
                ctx.fillText('💰 КАССА', x + 5, y + 15);
                break;

            case 'beacon':
                ctx.beginPath();
                ctx.arc(x, y, 8 * zoom, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `${8 * zoom}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText('BLE', x, y + 3);
                ctx.textAlign = 'left';
                break;

            case 'entrance':
                ctx.strokeStyle = '#8BC34A';
                ctx.lineWidth = 4 * zoom;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + width, y);
                ctx.stroke();
                ctx.fillStyle = '#000000';
                ctx.font = `${10 * zoom}px Arial`;
                ctx.fillText('ВХОД', x, y - 5);
                break;

            case 'exit':
                ctx.strokeStyle = '#F44336';
                ctx.lineWidth = 4 * zoom;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + width, y);
                ctx.stroke();
                ctx.fillStyle = '#000000';
                ctx.font = `${10 * zoom}px Arial`;
                ctx.fillText('ВЫХОД', x, y - 5);
                break;

            default:
                ctx.fillRect(x, y, width, height);
                ctx.strokeRect(x, y, width, height);
        }
    };

    // Перерисовываем при изменении данных
    useEffect(() => {
        drawCanvas();
    }, [mapData, selectedElement, isDragging, zoom]);

    const getMousePosInMeters = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const config = mapData.config || defaultConfig;

        const x = (e.clientX - rect.left) / (config.scale * zoom);
        const y = (e.clientY - rect.top) / (config.scale * zoom);

        return { x, y };
    };

    const handleCanvasMouseDown = (e) => {
        const pos = getMousePosInMeters(e);

        if (currentTool === 'select' || currentTool === 'move') {
            // Поиск элемента по координатам
            const allElements = [...mapData.elements, ...mapData.sectors.map(s => ({ ...s, isSector: true }))];
            const clicked = allElements.find(item => {
                const endX = (item.positionX || 0) + (item.width || 0);
                const endY = (item.positionY || 0) + (item.height || 0);
                return pos.x >= (item.positionX || 0) && pos.x <= endX &&
                    pos.y >= (item.positionY || 0) && pos.y <= endY;
            });

            if (clicked) {
                setSelectedElement(clicked);
                if (currentTool === 'move') {
                    setIsDragging(true);
                    setDragOffset({
                        x: pos.x - (clicked.positionX || 0),
                        y: pos.y - (clicked.positionY || 0)
                    });
                }
            } else {
                setSelectedElement(null);
            }
        } else {
            // Создание нового элемента - ИСПРАВЛЕНИЕ: создаем именно в месте клика
            const typeConfig = elementTypes.find(t => t.value === currentTool);
            createElement({
                type: currentTool,
                name: `${typeConfig.label} ${mapData.elements.length + 1}`,
                positionX: pos.x, // Используем правильные координаты
                positionY: pos.y,
                width: typeConfig.width,
                height: typeConfig.height,
                color: typeConfig.color
            });
        }
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDragging || !selectedElement) return;

        const pos = getMousePosInMeters(e);
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;

        // Обновляем позицию выбранного элемента
        const updatedElement = {
            ...selectedElement,
            positionX: newX,
            positionY: newY
        };
        setSelectedElement(updatedElement);

        // Обновляем данные в состоянии
        if (selectedElement.isSector) {
            setMapData(prev => ({
                ...prev,
                sectors: prev.sectors.map(s =>
                    s.id === selectedElement.id
                        ? { ...s, positionX: newX, positionY: newY }
                        : s
                )
            }));
        } else {
            setMapData(prev => ({
                ...prev,
                elements: prev.elements.map(el =>
                    el.id === selectedElement.id
                        ? { ...el, positionX: newX, positionY: newY }
                        : el
                )
            }));
        }
    };

    const handleCanvasMouseUp = async () => {
        if (isDragging && selectedElement) {
            // Сохраняем новую позицию
            try {
                await saveElementPosition(selectedElement, selectedElement.positionX, selectedElement.positionY);
                setSuccess('Позиция обновлена');
            } catch (error) {
                console.error('Error saving position:', error);
                setError('Ошибка сохранения позиции: ' + (error.response?.data?.error || error.message));
            }
        }
        setIsDragging(false);
    };

    const saveElementPosition = async (element, newX, newY) => {
        const url = element.isSector
            ? `http://localhost:8080/api/admin/sectors/${element.id}`
            : `http://localhost:8080/api/admin/map-elements/${element.id}`;

        const response = await axios.put(
            url,
            {
                positionX: newX,
                positionY: newY
            },
            { headers: getAuthHeader() }
        );
        return response.data;
    };

    const createElement = async (elementData) => {
        try {
            const response = await axios.post(
                `http://localhost:8080/api/admin/stores/${storeId}/map-elements`,
                elementData,
                { headers: getAuthHeader() }
            );

            setMapData(prev => ({
                ...prev,
                elements: [...prev.elements, response.data]
            }));
            setSuccess('Элемент создан');
        } catch (error) {
            console.error('Error creating element:', error);
            setError('Ошибка создания элемента: ' + (error.response?.data?.error || error.message));
        }
    };

    const deleteElement = async () => {
        if (!selectedElement) return;

        try {
            if (selectedElement.isSector) {
                await axios.delete(
                    `http://localhost:8080/api/admin/sectors/${selectedElement.id}`,
                    { headers: getAuthHeader() }
                );
                setMapData(prev => ({
                    ...prev,
                    sectors: prev.sectors.filter(s => s.id !== selectedElement.id)
                }));
            } else {
                await axios.delete(
                    `http://localhost:8080/api/admin/map-elements/${selectedElement.id}`,
                    { headers: getAuthHeader() }
                );
                setMapData(prev => ({
                    ...prev,
                    elements: prev.elements.filter(el => el.id !== selectedElement.id)
                }));
            }

            setSelectedElement(null);
            setSuccess('Элемент удален');
        } catch (error) {
            console.error('Error deleting element:', error);
            setError('Ошибка удаления элемента: ' + (error.response?.data?.error || error.message));
        }
    };

    const copyElement = () => {
        if (selectedElement && !selectedElement.isSector) {
            setClipboard(selectedElement);
            setSuccess('Элемент скопирован в буфер');
        } else if (selectedElement?.isSector) {
            setError('Нельзя копировать секторы');
        } else {
            setError('Не выбран элемент для копирования');
        }
    };

    const pasteElement = () => {
        if (!clipboard) {
            setError('Буфер обмена пуст');
            return;
        }

        const newElement = {
            ...clipboard,
            id: undefined, // Новый ID будет создан на сервере
            positionX: (clipboard.positionX || 0) + 0.5, // Смещаем для видимости
            positionY: (clipboard.positionY || 0) + 0.5,
            name: `${clipboard.name} (копия)`
        };

        createElement(newElement);
    };

    const editSector = (sector) => {
        setEditingSector(sector);
        setSectorDialogOpen(true);
    };

    const saveSector = async () => {
        if (!editingSector) return;

        try {
            await axios.put(
                `http://localhost:8080/api/admin/sectors/${editingSector.id}`,
                editingSector,
                { headers: getAuthHeader() }
            );

            setMapData(prev => ({
                ...prev,
                sectors: prev.sectors.map(s =>
                    s.id === editingSector.id ? editingSector : s
                )
            }));
            setSectorDialogOpen(false);
            setEditingSector(null);
            setSuccess('Сектор обновлен');
        } catch (error) {
            console.error('Error updating sector:', error);
            setError('Ошибка обновления сектора: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleToolChange = (tool) => {
        setCurrentTool(tool);
        setSelectedElement(null);
    };

    const clearSelection = () => {
        setSelectedElement(null);
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3.0));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
    const handleFitToScreen = () => setZoom(1.0);

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
                <Typography variant="h4">
                    Редактор карты магазина
                </Typography>
                <Button variant="outlined" onClick={loadMapData}>
                    Обновить
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={3}>
                {/* КАРТА - левая часть */}
                <Grid item xs={12} md={9}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">
                                    Карта магазина
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Button variant="outlined" startIcon={<ZoomOut />} onClick={handleZoomOut}>
                                        -
                                    </Button>
                                    <Typography>{(zoom * 100).toFixed(0)}%</Typography>
                                    <Button variant="outlined" startIcon={<ZoomIn />} onClick={handleZoomIn}>
                                        +
                                    </Button>
                                    <Button variant="outlined" startIcon={<FitScreen />} onClick={handleFitToScreen}>
                                        По размеру
                                    </Button>
                                </Box>
                            </Box>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                Масштаб: 1 метр = {defaultConfig.scale} пикселей
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
                                        cursor: currentTool === 'select' ? 'default' :
                                            currentTool === 'move' ? 'grab' : 'crosshair',
                                        display: 'block',
                                        width: '100%',
                                        height: '100%'
                                    }}
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                />
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>

                {/* ИНСТРУМЕНТЫ - правая часть */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '700px', overflow: 'auto' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Инструменты
                            </Typography>

                            {/* Основные инструменты */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Основные инструменты
                                </Typography>
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Button
                                            fullWidth
                                            variant={currentTool === 'select' ? 'contained' : 'outlined'}
                                            onClick={() => handleToolChange('select')}
                                            sx={{ mb: 1 }}
                                        >
                                            Выбор
                                        </Button>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Button
                                            fullWidth
                                            variant={currentTool === 'move' ? 'contained' : 'outlined'}
                                            onClick={() => handleToolChange('move')}
                                            startIcon={<PanTool />}
                                            sx={{ mb: 1 }}
                                        >
                                            Перемещение
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Элементы для создания */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Добавить элементы
                                </Typography>
                                <Grid container spacing={1}>
                                    {elementTypes.filter(t => t.value !== 'sector').map(type => (
                                        <Grid item xs={6} key={type.value}>
                                            <Button
                                                fullWidth
                                                variant={currentTool === type.value ? 'contained' : 'outlined'}
                                                onClick={() => handleToolChange(type.value)}
                                                sx={{
                                                    mb: 1,
                                                    backgroundColor: currentTool === type.value ? type.color : 'inherit',
                                                    color: currentTool === type.value ? 'white' : 'inherit'
                                                }}
                                            >
                                                {type.label}
                                            </Button>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* Управление буфером обмена */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Буфер обмена
                                </Typography>
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            startIcon={<ContentCopy />}
                                            onClick={copyElement}
                                            disabled={!selectedElement || selectedElement.isSector}
                                            sx={{ mb: 1 }}
                                        >
                                            Копировать
                                        </Button>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            startIcon={<ContentPaste />}
                                            onClick={pasteElement}
                                            disabled={!clipboard}
                                            sx={{ mb: 1 }}
                                        >
                                            Вставить
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Выбранный элемент */}
                            {selectedElement && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Выбранный элемент
                                    </Typography>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="body2">
                                            Тип: {selectedElement.isSector ? 'Сектор' : elementTypes.find(t => t.value === selectedElement.type)?.label}
                                        </Typography>
                                        <Typography variant="body2">
                                            Название: {selectedElement.name}
                                        </Typography>
                                        <Typography variant="body2">
                                            Позиция: {selectedElement.positionX?.toFixed(1)}м, {selectedElement.positionY?.toFixed(1)}м
                                        </Typography>
                                        <Box sx={{ mt: 1 }}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                color="error"
                                                startIcon={<Delete />}
                                                onClick={deleteElement}
                                                sx={{ mb: 1 }}
                                            >
                                                Удалить
                                            </Button>
                                            {selectedElement.isSector && (
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    startIcon={<Edit />}
                                                    onClick={() => editSector(selectedElement)}
                                                >
                                                    Настроить сектор
                                                </Button>
                                            )}
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                onClick={clearSelection}
                                                sx={{ mt: 1 }}
                                            >
                                                Снять выделение
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Box>
                            )}

                            {/* Список секторов */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Секторы ({mapData.sectors.length})
                                </Typography>
                                <Paper sx={{ maxHeight: '200px', overflow: 'auto' }}>
                                    <List dense>
                                        {mapData.sectors.map(sector => (
                                            <ListItem
                                                key={sector.id}
                                                button
                                                selected={selectedElement?.id === sector.id}
                                                onClick={() => setSelectedElement({ ...sector, isSector: true })}
                                            >
                                                <ListItemText
                                                    primary={sector.name}
                                                    secondary={`${sector.width || 0}×${sector.height || 0}м`}
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton
                                                        edge="end"
                                                        onClick={() => editSector(sector)}
                                                        size="small"
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            </Box>

                            {/* Статистика */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Статистика
                                </Typography>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="body2">
                                        Секторов: {mapData.sectors.length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Элементов: {mapData.elements.length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Буфер: {clipboard ? 'Заполнен' : 'Пуст'}
                                    </Typography>
                                </Paper>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Диалог редактирования сектора */}
            <Dialog open={sectorDialogOpen} onClose={() => setSectorDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Настройка сектора
                </DialogTitle>
                <DialogContent>
                    {editingSector && (
                        <Box sx={{ pt: 2 }}>
                            <TextField
                                label="Название сектора"
                                fullWidth
                                value={editingSector.name || ''}
                                onChange={(e) => setEditingSector({ ...editingSector, name: e.target.value })}
                                sx={{ mb: 2 }}
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Ширина (метры)"
                                        type="number"
                                        fullWidth
                                        value={editingSector.width || 0}
                                        onChange={(e) => setEditingSector({ ...editingSector, width: parseFloat(e.target.value) })}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Высота (метры)"
                                        type="number"
                                        fullWidth
                                        value={editingSector.height || 0}
                                        onChange={(e) => setEditingSector({ ...editingSector, height: parseFloat(e.target.value) })}
                                    />
                                </Grid>
                            </Grid>
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                                Позиция: {editingSector.positionX?.toFixed(1)}м, {editingSector.positionY?.toFixed(1)}м
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSectorDialogOpen(false)}>Отмена</Button>
                    <Button onClick={saveSector} variant="contained">
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default StoreMapEditor;