import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Button, Alert, Grid, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Switch, FormControlLabel, Slider
} from '@mui/material';
import {
    Save, Clear, Delete, Add, Settings, ZoomIn, ZoomOut, FitScreen, BugReport
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

function StoreMapEditorDebug() {
    const { storeId } = useParams();
    const [elements, setElements] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [walls, setWalls] = useState([]);
    const [mapConfig, setMapConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedElement, setSelectedElement] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [currentTool, setCurrentTool] = useState('select');
    const [drawingWall, setDrawingWall] = useState(null);
    const [openConfigDialog, setOpenConfigDialog] = useState(false);
    const [showDebug, setShowDebug] = useState(true);
    const [debugInfo, setDebugInfo] = useState('');
    const [zoom, setZoom] = useState(1.0);
    const canvasRef = useRef(null);
    const { getAuthHeader } = useAuth();

    const defaultConfig = {
        real_width: 50.0,
        real_height: 30.0,
        map_width: 1200,
        map_height: 800,
        scale: 20.0,
        origin_x: 0,
        origin_y: 0
    };

    const [configForm, setConfigForm] = useState({ ...defaultConfig });

    const elementTypes = useMemo(() => [
        { value: 'sector', label: 'Сектор', color: '#4CAF50', icon: <SquareFoot />, defaultWidth: 5, defaultHeight: 3 },
        { value: 'wall', label: 'Стена', color: '#795548', icon: <SquareIcon />, defaultWidth: 0.2, defaultHeight: 3 },
        { value: 'cashier', label: 'Касса', color: '#FF9800', icon: <PointOfSale />, defaultWidth: 1.5, defaultHeight: 1 },
        { value: 'beacon', label: 'Маячок', color: '#2196F3', icon: <Bluetooth />, defaultWidth: 0.5, defaultHeight: 0.5 },
        { value: 'entrance', label: 'Вход', color: '#8BC34A', icon: <DoorFront />, defaultWidth: 2, defaultHeight: 0.2 },
        { value: 'exit', label: 'Выход', color: '#F44336', icon: <ExitToApp />, defaultWidth: 2, defaultHeight: 0.2 },
        { value: 'passage', label: 'Проход', color: '#9E9E9E', icon: <DoorFront />, defaultWidth: 2, defaultHeight: 0.2 }
    ], []);

    // Функции для преобразования координат
    const metersToPixels = useCallback((meters) => {
        if (!mapConfig) {
            console.log('No map config, using default scale');
            return meters * 20; // fallback scale
        }
        return meters * mapConfig.scale;
    }, [mapConfig]);

    const pixelsToMeters = useCallback((pixels) => {
        if (!mapConfig) {
            return pixels / 20; // fallback scale
        }
        return pixels / mapConfig.scale;
    }, [mapConfig]);

    const applyZoom = useCallback((value) => {
        return value * zoom;
    }, [zoom]);

    // Загрузка данных с отладкой
    const fetchMapData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            let debugText = 'Начало загрузки данных...\n';

            debugText += `Store ID: ${storeId}\n`;
            debugText += `Auth headers: ${JSON.stringify(getAuthHeader())}\n\n`;

            const [elementsRes, wallsRes, sectorsRes, configRes] = await Promise.all([
                axios.get(`http://localhost:8080/api/admin/stores/${storeId}/map-elements`, {
                    headers: getAuthHeader()
                }),
                axios.get(`http://localhost:8080/api/admin/stores/${storeId}/walls`, {
                    headers: getAuthHeader()
                }),
                axios.get(`http://localhost:8080/api/admin/stores/${storeId}/sectors`, {
                    headers: getAuthHeader()
                }),
                axios.get(`http://localhost:8080/api/admin/stores/${storeId}/map-config`, {
                    headers: getAuthHeader()
                })
            ]);

            debugText += `Elements response: ${JSON.stringify(elementsRes.data, null, 2)}\n\n`;
            debugText += `Walls response: ${JSON.stringify(wallsRes.data, null, 2)}\n\n`;
            debugText += `Sectors response: ${JSON.stringify(sectorsRes.data, null, 2)}\n\n`;
            debugText += `Config response: ${JSON.stringify(configRes.data, null, 2)}\n`;

            setElements(elementsRes.data.elements || []);
            setWalls(wallsRes.data.walls || []);
            setSectors(sectorsRes.data.sectors || []);
            setMapConfig(configRes.data);
            setConfigForm(configRes.data);

            debugText += `\nУстановлены состояния:\n`;
            debugText += `- Elements: ${elementsRes.data.elements?.length || 0}\n`;
            debugText += `- Walls: ${wallsRes.data.walls?.length || 0}\n`;
            debugText += `- Sectors: ${sectorsRes.data.sectors?.length || 0}\n`;
            debugText += `- Map Config: ${configRes.data ? 'Да' : 'Нет'}\n`;

            setDebugInfo(debugText);

        } catch (error) {
            console.error('Error fetching map data:', error);
            let errorText = `Ошибка загрузки данных:\n${error.message}\n\n`;

            if (error.response) {
                errorText += `Status: ${error.response.status}\n`;
                errorText += `Data: ${JSON.stringify(error.response.data)}\n`;
            } else if (error.request) {
                errorText += `No response received. Check if backend is running.\n`;
            }

            setDebugInfo(errorText);
            setError('Ошибка загрузки данных карты');
        } finally {
            setLoading(false);
        }
    }, [storeId, getAuthHeader]);

    useEffect(() => {
        fetchMapData();
    }, [fetchMapData]);

    // Отрисовка карты с отладкой
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log('Canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.log('Canvas context not found');
            return;
        }

        // Используем фиксированные размеры если конфиг не загружен
        const width = mapConfig ? applyZoom(mapConfig.map_width) : applyZoom(1200);
        const height = mapConfig ? applyZoom(mapConfig.map_height) : applyZoom(800);

        console.log(`Setting canvas size: ${width}x${height}`);
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);

        // Рисуем фон
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);

        // Рисуем сетку
        const gridSize = mapConfig ? applyZoom(mapConfig.scale) : applyZoom(20);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Рисуем границы
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);

        // Рисуем стены
        console.log(`Drawing ${walls.length} walls`);
        walls.forEach((wall, index) => {
            const startX = applyZoom(metersToPixels(wall.startX || 0));
            const startY = applyZoom(metersToPixels(wall.startY || 0));
            const endX = applyZoom(metersToPixels(wall.endX || 0));
            const endY = applyZoom(metersToPixels(wall.endY || 0));

            console.log(`Wall ${index}: (${startX},${startY}) to (${endX},${endY})`);

            ctx.strokeStyle = '#795548';
            ctx.lineWidth = applyZoom(8);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        });

        // Рисуем сектора
        console.log(`Drawing ${sectors.length} sectors`);
        sectors.forEach((sector, index) => {
            const x = applyZoom(metersToPixels(sector.positionX || 0));
            const y = applyZoom(metersToPixels(sector.positionY || 0));
            const sectorWidth = applyZoom(metersToPixels(sector.width || 5));
            const sectorHeight = applyZoom(metersToPixels(sector.height || 3));

            console.log(`Sector ${index}: (${x},${y}) ${sectorWidth}x${sectorHeight}`);

            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.strokeStyle = selectedElement?.id === sector.id ? '#FF0000' : '#4CAF50';
            ctx.lineWidth = selectedElement?.id === sector.id ? 3 : 2;

            ctx.fillRect(x, y, sectorWidth, sectorHeight);
            ctx.strokeRect(x, y, sectorWidth, sectorHeight);

            // Текст названия
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText(sector.name || 'Без названия', x + 5, y + 15);
        });

        // Рисуем элементы карты
        console.log(`Drawing ${elements.length} map elements`);
        elements.forEach((element, index) => {
            const typeConfig = elementTypes.find(t => t.value === element.type);
            const x = applyZoom(metersToPixels(element.positionX || 0));
            const y = applyZoom(metersToPixels(element.positionY || 0));
            const elementWidth = applyZoom(metersToPixels(element.width || 1));
            const elementHeight = applyZoom(metersToPixels(element.height || 1));

            console.log(`Element ${index} (${element.type}): (${x},${y}) ${elementWidth}x${elementHeight}`);

            ctx.fillStyle = element.color || typeConfig?.color || '#4CAF50';
            ctx.strokeStyle = selectedElement?.id === element.id ? '#FF0000' : '#000000';
            ctx.lineWidth = selectedElement?.id === element.id ? 3 : 1;

            switch (element.type) {
                case 'sector':
                    ctx.fillRect(x, y, elementWidth, elementHeight);
                    ctx.strokeRect(x, y, elementWidth, elementHeight);
                    ctx.fillStyle = '#000000';
                    ctx.font = '12px Arial';
                    ctx.fillText(element.name || 'Сектор', x + 5, y + 15);
                    break;

                case 'wall':
                    ctx.fillRect(x, y, elementWidth, elementHeight);
                    ctx.strokeRect(x, y, elementWidth, elementHeight);
                    break;

                case 'cashier':
                    ctx.fillRect(x, y, elementWidth, elementHeight);
                    ctx.strokeRect(x, y, elementWidth, elementHeight);
                    ctx.fillStyle = '#000000';
                    ctx.font = '10px Arial';
                    ctx.fillText('💰 КАССА', x + 5, y + 15);
                    break;

                case 'beacon':
                    const radius = applyZoom(8);
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '8px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('BLE', x, y + 3);
                    ctx.textAlign = 'left';
                    break;

                case 'entrance':
                    ctx.strokeStyle = '#8BC34A';
                    ctx.lineWidth = applyZoom(8);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + elementWidth, y);
                    ctx.stroke();
                    ctx.fillStyle = '#000000';
                    ctx.font = '10px Arial';
                    ctx.fillText('🚪 ВХОД', x, y - 5);
                    break;

                case 'exit':
                    ctx.strokeStyle = '#F44336';
                    ctx.lineWidth = applyZoom(8);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + elementWidth, y);
                    ctx.stroke();
                    ctx.fillStyle = '#000000';
                    ctx.font = '10px Arial';
                    ctx.fillText('🚪 ВЫХОД', x, y - 5);
                    break;

                case 'passage':
                    ctx.strokeStyle = '#9E9E9E';
                    ctx.lineWidth = applyZoom(4);
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + elementWidth, y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    break;
                default:
                    break;
            }
        });

        // Рисуем временную стену при рисовании
        if (drawingWall) {
            const startX = applyZoom(metersToPixels(drawingWall.startX));
            const startY = applyZoom(metersToPixels(drawingWall.startY));
            const currentX = applyZoom(metersToPixels(drawingWall.currentX));
            const currentY = applyZoom(metersToPixels(drawingWall.currentY));

            ctx.strokeStyle = '#795548';
            ctx.lineWidth = applyZoom(5);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        }

        console.log('Canvas drawing completed');
    }, [elements, walls, sectors, selectedElement, drawingWall, elementTypes, mapConfig, metersToPixels, applyZoom]);

    useEffect(() => {
        console.log('useEffect drawCanvas triggered');
        drawCanvas();
    }, [drawCanvas]);

    // Остальные функции остаются такими же как в предыдущей версии
    const getMousePosInMeters = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const pixelX = (e.clientX - rect.left) / zoom;
        const pixelY = (e.clientY - rect.top) / zoom;

        return {
            x: pixelsToMeters(pixelX),
            y: pixelsToMeters(pixelY)
        };
    };

    const handleCanvasMouseDown = (e) => {
        console.log('Canvas mouse down');
        const pos = getMousePosInMeters(e);
        console.log(`Mouse position: ${pos.x}, ${pos.y} meters`);

        if (currentTool === 'select') {
            const allElements = [...elements, ...sectors.map(s => ({ ...s, isSector: true }))];
            const clickedElement = allElements.find(item => {
                const itemEndX = (item.positionX || 0) + (item.width || 0);
                const itemEndY = (item.positionY || 0) + (item.height || 0);
                return pos.x >= (item.positionX || 0) && pos.x <= itemEndX &&
                    pos.y >= (item.positionY || 0) && pos.y <= itemEndY;
            });

            setSelectedElement(clickedElement || null);
            if (clickedElement) {
                setIsDragging(true);
            }
        } else if (currentTool === 'wall') {
            setDrawingWall({
                startX: pos.x,
                startY: pos.y,
                currentX: pos.x,
                currentY: pos.y
            });
        } else {
            const typeConfig = elementTypes.find(t => t.value === currentTool);
            const newElement = {
                type: currentTool,
                name: typeConfig?.label || 'Новый элемент',
                positionX: pos.x,
                positionY: pos.y,
                width: typeConfig?.defaultWidth || 1,
                height: typeConfig?.defaultHeight || 1,
                color: typeConfig?.color || '#4CAF50'
            };

            console.log('Creating new element:', newElement);
            createElement(newElement);
        }
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

    const createWall = async (wallData) => {
        try {
            const response = await axios.post(
                `http://localhost:8080/api/admin/stores/${storeId}/walls`,
                wallData,
                { headers: getAuthHeader() }
            );
            setWalls([...walls, response.data]);
            setSuccess('Стена создана');
        } catch (error) {
            console.error('Error creating wall:', error);
            setError('Ошибка создания стены: ' + error.message);
        }
    };

    const handleToolChange = (tool) => {
        setCurrentTool(tool);
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
                    Редактор карты магазина (Отладка)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showDebug}
                                onChange={(e) => setShowDebug(e.target.checked)}
                            />
                        }
                        label="Отладка"
                    />
                    <Button variant="outlined" startIcon={<BugReport />} onClick={fetchMapData}>
                        Обновить данные
                    </Button>
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

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={3}>
                <Grid item xs={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Инструменты
                            </Typography>

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
                                            variant={currentTool === 'wall' ? 'contained' : 'outlined'}
                                            onClick={() => handleToolChange('wall')}
                                            startIcon={<SquareIcon />}
                                            sx={{ mb: 1 }}
                                        >
                                            Стена
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Элементы
                                </Typography>
                                <Grid container spacing={1}>
                                    {elementTypes.filter(t => t.value !== 'wall').map(type => (
                                        <Grid item xs={6} key={type.value}>
                                            <Button
                                                fullWidth
                                                variant={currentTool === type.value ? 'contained' : 'outlined'}
                                                onClick={() => handleToolChange(type.value)}
                                                startIcon={type.icon}
                                                sx={{
                                                    mb: 1,
                                                    backgroundColor: currentTool === type.value ? type.color : 'inherit'
                                                }}
                                            >
                                                {type.label}
                                            </Button>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Статистика
                                </Typography>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="body2">
                                        Секторов: {sectors.length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Элементов: {elements.length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Стен: {walls.length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Конфиг: {mapConfig ? 'Да' : 'Нет'}
                                    </Typography>
                                </Paper>
                            </Box>
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
                                    overflow: 'auto',
                                    position: 'relative'
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        cursor: currentTool === 'select' ? 'default' : 'crosshair',
                                        background: '#fafafa',
                                        width: '100%',
                                        height: '100%'
                                    }}
                                    onMouseDown={handleCanvasMouseDown}
                                />
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {showDebug && (
                <Card sx={{ mt: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Отладочная информация
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: '400px', overflow: 'auto' }}>
                            <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                                {debugInfo || 'Нет отладочной информации'}
                            </pre>
                        </Paper>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
}

export default StoreMapEditorDebug;