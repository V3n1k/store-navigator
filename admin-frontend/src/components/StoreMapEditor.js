import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Button, Alert, Grid, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Switch, FormControlLabel, Slider
} from '@mui/material';
import {
    Save, Clear, Delete, Add, Settings, ZoomIn, ZoomOut, FitScreen
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
    const [showRealScale, setShowRealScale] = useState(true);
    const [zoom, setZoom] = useState(1.0);
    const canvasRef = useRef(null);
    const { getAuthHeader } = useAuth();

    // Отладочные логи
    console.log('🔵 StoreMapEditor component rendered');
    console.log('Loading:', loading);
    console.log('MapConfig:', mapConfig);
    console.log('Elements count:', elements.length);
    console.log('Sectors count:', sectors.length);
    console.log('Walls count:', walls.length);

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

    // Функции для преобразования координат с fallback значениями
    const metersToPixels = useCallback((meters, config = mapConfig) => {
        const effectiveConfig = config || defaultConfig;
        const result = meters * effectiveConfig.scale;
        console.log(`📏 metersToPixels: ${meters}m -> ${result}px (scale: ${effectiveConfig.scale})`);
        return result;
    }, [mapConfig]);

    const pixelsToMeters = useCallback((pixels, config = mapConfig) => {
        const effectiveConfig = config || defaultConfig;
        return pixels / effectiveConfig.scale;
    }, [mapConfig]);

    const applyZoom = useCallback((value) => {
        return value * zoom;
    }, [zoom]);

    // Загрузка данных с улучшенной обработкой ошибок
    const fetchMapData = useCallback(async () => {
        try {
            console.log('🚨 fetchMapData STARTED');
            setLoading(true);
            setError('');

            console.log('🔄 Starting data fetch for store:', storeId);
            console.log('Auth header:', getAuthHeader());

            // Загружаем данные последовательно для лучшей отладки
            try {
                const elementsRes = await axios.get(`http://localhost:8080/api/admin/stores/${storeId}/map-elements`, {
                    headers: getAuthHeader()
                });
                setElements(elementsRes.data.elements || []);
                console.log('✅ Elements loaded:', elementsRes.data.elements?.length);
            } catch (err) {
                console.error('❌ Elements error:', err);
                setElements([]);
            }

            try {
                const wallsRes = await axios.get(`http://localhost:8080/api/admin/stores/${storeId}/walls`, {
                    headers: getAuthHeader()
                });
                setWalls(wallsRes.data.walls || []);
                console.log('✅ Walls loaded:', wallsRes.data.walls?.length);
            } catch (err) {
                console.error('❌ Walls error:', err);
                setWalls([]);
            }

            try {
                const sectorsRes = await axios.get(`http://localhost:8080/api/admin/stores/${storeId}/sectors`, {
                    headers: getAuthHeader()
                });
                setSectors(sectorsRes.data.sectors || []);
                console.log('✅ Sectors loaded:', sectorsRes.data.sectors?.length);
            } catch (err) {
                console.error('❌ Sectors error:', err);
                setSectors([]);
            }

            try {
                const configRes = await axios.get(`http://localhost:8080/api/admin/stores/${storeId}/map-config`, {
                    headers: getAuthHeader()
                });
                setMapConfig(configRes.data);
                setConfigForm(configRes.data);
                console.log('✅ Config loaded:', configRes.data);
            } catch (err) {
                console.error('❌ Config error:', err);
                console.log('🔄 Using default config');
                setMapConfig(defaultConfig);
                setConfigForm(defaultConfig);
            }

            console.log('📊 Final state:', {
                elements: elements.length,
                sectors: sectors.length,
                walls: walls.length,
                mapConfig: mapConfig ? 'loaded' : 'default'
            });

        } catch (error) {
            console.error('💥 General fetch error:', error);
            setError('Ошибка загрузки данных карты: ' + error.message);
        } finally {
            console.log('🏁 fetchMapData COMPLETED');
            setLoading(false);
        }
    }, [storeId, getAuthHeader]);

    useEffect(() => {
        console.log('🟡 useEffect triggered, calling fetchMapData');
        fetchMapData();
    }, [fetchMapData]);

    // Отслеживание изменений состояния
    useEffect(() => {
        console.log('🔄 State updated:', {
            loading,
            elementsCount: elements.length,
            sectorsCount: sectors.length,
            wallsCount: walls.length,
            hasMapConfig: !!mapConfig
        });
    }, [loading, elements, sectors, walls, mapConfig]);

    // Отрисовка карты с улучшенной обработкой
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

        // Используем эффективный конфиг (загруженный или по умолчанию)
        const effectiveConfig = mapConfig || defaultConfig;
        const width = applyZoom(effectiveConfig.map_width);
        const height = applyZoom(effectiveConfig.map_height);

        console.log(`🎨 Drawing canvas: ${width}x${height}, zoom: ${zoom}`);
        console.log(`🎨 Elements: ${elements.length}, Sectors: ${sectors.length}, Walls: ${walls.length}`);

        // Устанавливаем размеры canvas
        canvas.width = width;
        canvas.height = height;

        // Очистка canvas
        ctx.clearRect(0, 0, width, height);

        // Рисуем фон
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);

        // Рисуем сетку
        const gridSize = applyZoom(effectiveConfig.scale);
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

        // ТЕСТОВАЯ ОТРИСОВКА - красный прямоугольник для проверки
        ctx.fillStyle = 'red';
        ctx.fillRect(50, 50, 100, 60);
        ctx.fillStyle = 'blue';
        ctx.font = '14px Arial';
        ctx.fillText('Canvas is working!', 60, 80);

        // Рисуем стены
        console.log(`🎨 Drawing ${walls.length} walls`);
        walls.forEach((wall, index) => {
            const startX = applyZoom(metersToPixels(wall.startX || 0, effectiveConfig));
            const startY = applyZoom(metersToPixels(wall.startY || 0, effectiveConfig));
            const endX = applyZoom(metersToPixels(wall.endX || 0, effectiveConfig));
            const endY = applyZoom(metersToPixels(wall.endY || 0, effectiveConfig));

            console.log(`🎨 Wall ${index}: (${startX},${startY}) to (${endX},${endY})`);

            ctx.strokeStyle = '#795548';
            ctx.lineWidth = applyZoom(8);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        });

        // Рисуем сектора
        console.log(`🎨 Drawing ${sectors.length} sectors`);
        sectors.forEach((sector, index) => {
            const x = applyZoom(metersToPixels(sector.positionX || 0, effectiveConfig));
            const y = applyZoom(metersToPixels(sector.positionY || 0, effectiveConfig));
            const sectorWidth = applyZoom(metersToPixels(sector.width || 5, effectiveConfig));
            const sectorHeight = applyZoom(metersToPixels(sector.height || 3, effectiveConfig));

            console.log(`🎨 Sector ${index}: (${x},${y}) ${sectorWidth}x${sectorHeight}`);

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
        console.log(`🎨 Drawing ${elements.length} map elements`);
        elements.forEach((element, index) => {
            const typeConfig = elementTypes.find(t => t.value === element.type);
            const x = applyZoom(metersToPixels(element.positionX || 0, effectiveConfig));
            const y = applyZoom(metersToPixels(element.positionY || 0, effectiveConfig));
            const elementWidth = applyZoom(metersToPixels(element.width || 1, effectiveConfig));
            const elementHeight = applyZoom(metersToPixels(element.height || 1, effectiveConfig));

            console.log(`🎨 Element ${index} (${element.type}): (${x},${y}) ${elementWidth}x${elementHeight}`);

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
            const startX = applyZoom(metersToPixels(drawingWall.startX, effectiveConfig));
            const startY = applyZoom(metersToPixels(drawingWall.startY, effectiveConfig));
            const currentX = applyZoom(metersToPixels(drawingWall.currentX, effectiveConfig));
            const currentY = applyZoom(metersToPixels(drawingWall.currentY, effectiveConfig));

            ctx.strokeStyle = '#795548';
            ctx.lineWidth = applyZoom(5);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        }

        console.log('🎨 Canvas drawing completed');
    }, [elements, walls, sectors, selectedElement, drawingWall, elementTypes, mapConfig, metersToPixels, applyZoom, zoom]);

    useEffect(() => {
        console.log('🎨 useEffect drawCanvas triggered');
        drawCanvas();
    }, [drawCanvas]);

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

    const handleCanvasMouseMove = (e) => {
        const pos = getMousePosInMeters(e);

        if (isDragging && selectedElement) {
            // Перемещение элемента
            if (selectedElement.isSector) {
                const updatedSectors = sectors.map(sector =>
                    sector.id === selectedElement.id
                        ? { ...sector, positionX: pos.x, positionY: pos.y }
                        : sector
                );
                setSectors(updatedSectors);
            } else {
                const updatedElements = elements.map(el =>
                    el.id === selectedElement.id
                        ? { ...el, positionX: pos.x, positionY: pos.y }
                        : el
                );
                setElements(updatedElements);
            }
        } else if (drawingWall) {
            setDrawingWall({
                ...drawingWall,
                currentX: pos.x,
                currentY: pos.y
            });
        }
    };

    const handleCanvasMouseUp = (e) => {
        if (isDragging && selectedElement) {
            if (selectedElement.isSector) {
                updateSector(selectedElement.id, {
                    positionX: selectedElement.positionX,
                    positionY: selectedElement.positionY
                });
            } else {
                updateElement(selectedElement.id, {
                    positionX: selectedElement.positionX,
                    positionY: selectedElement.positionY
                });
            }
        } else if (drawingWall) {
            const pos = getMousePosInMeters(e);
            if (Math.abs(drawingWall.startX - pos.x) > 0.1 || Math.abs(drawingWall.startY - pos.y) > 0.1) {
                createWall({
                    startX: drawingWall.startX,
                    startY: drawingWall.startY,
                    endX: pos.x,
                    endY: pos.y,
                    thickness: 0.1
                });
            }
        }

        setIsDragging(false);
        setDrawingWall(null);
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

    const updateElement = async (elementId, updateData) => {
        try {
            await axios.put(
                `http://localhost:8080/api/admin/map-elements/${elementId}`,
                updateData,
                { headers: getAuthHeader() }
            );
            setSuccess('Элемент обновлен');
        } catch (error) {
            console.error('Error updating element:', error);
            setError('Ошибка обновления элемента');
        }
    };

    const updateSector = async (sectorId, updateData) => {
        try {
            await axios.put(
                `http://localhost:8080/api/admin/sectors/${sectorId}`,
                updateData,
                { headers: getAuthHeader() }
            );
            setSuccess('Сектор обновлен');
        } catch (error) {
            console.error('Error updating sector:', error);
            setError('Ошибка обновления сектора');
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
            setError('Ошибка создания стены');
        }
    };

    const deleteElement = async (elementId) => {
        try {
            await axios.delete(
                `http://localhost:8080/api/admin/map-elements/${elementId}`,
                { headers: getAuthHeader() }
            );
            setElements(elements.filter(el => el.id !== elementId));
            setSelectedElement(null);
            setSuccess('Элемент удален');
        } catch (error) {
            console.error('Error deleting element:', error);
            setError('Ошибка удаления элемента');
        }
    };

    const handleToolChange = (tool) => {
        setCurrentTool(tool);
        setSelectedElement(null);
    };

    const saveMapConfig = async () => {
        try {
            await axios.post(
                `http://localhost:8080/api/admin/stores/${storeId}/map-config`,
                configForm,
                { headers: getAuthHeader() }
            );
            setMapConfig(configForm);
            setOpenConfigDialog(false);
            setSuccess('Конфигурация карты сохранена');
        } catch (error) {
            setError('Ошибка сохранения конфигурации');
        }
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.1, 3.0));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.1, 0.5));
    };

    const handleFitToScreen = () => {
        setZoom(1.0);
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
                <Typography variant="h4">
                    Редактор карты магазина {mapConfig && `(${mapConfig.real_width}м × ${mapConfig.real_height}м)`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showRealScale}
                                onChange={(e) => setShowRealScale(e.target.checked)}
                            />
                        }
                        label="Реальный масштаб"
                    />
                    <Button variant="outlined" startIcon={<Settings />} onClick={() => setOpenConfigDialog(true)}>
                        Настройки
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

            {!mapConfig && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Карта не настроена. Установите реальные размеры магазина для точной навигации.
                </Alert>
            )}

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

                            {selectedElement && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Выбранный элемент
                                    </Typography>
                                    <Paper sx={{ p: 2, mb: 2 }}>
                                        <Typography variant="body2">
                                            Тип: {selectedElement.isSector ? 'Сектор' : elementTypes.find(t => t.value === selectedElement.type)?.label}
                                        </Typography>
                                        <Typography variant="body2">
                                            Название: {selectedElement.name}
                                        </Typography>
                                        <Typography variant="body2">
                                            Позиция: {selectedElement.positionX?.toFixed(1)}м, {selectedElement.positionY?.toFixed(1)}м
                                        </Typography>
                                        {!selectedElement.isSector && (
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                color="error"
                                                startIcon={<Delete />}
                                                onClick={() => deleteElement(selectedElement.id)}
                                                sx={{ mt: 1 }}
                                            >
                                                Удалить
                                            </Button>
                                        )}
                                    </Paper>
                                </Box>
                            )}

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
                                        Конфиг: {mapConfig ? 'Загружен' : 'По умолчанию'}
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
                                Карта магазина {mapConfig && `- Масштаб: 1:${mapConfig.scale}`}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                {currentTool === 'select'
                                    ? 'Выберите элемент для перемещения'
                                    : currentTool === 'wall'
                                        ? 'Нажмите и проведите для создания стены'
                                        : `Нажмите на карту для добавления ${elementTypes.find(t => t.value === currentTool)?.label?.toLowerCase()}`
                                }
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
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                />
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Диалог настройки карты */}
            <Dialog open={openConfigDialog} onClose={() => setOpenConfigDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Настройки карты магазина
                </DialogTitle>
                <DialogContent>
                    <Typography variant="subtitle1" gutterBottom>
                        Реальные размеры магазина
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <TextField
                            label="Ширина (метры)"
                            type="number"
                            value={configForm.real_width}
                            onChange={(e) => setConfigForm({ ...configForm, real_width: parseFloat(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="Высота (метры)"
                            type="number"
                            value={configForm.real_height}
                            onChange={(e) => setConfigForm({ ...configForm, real_height: parseFloat(e.target.value) })}
                            fullWidth
                        />
                    </Box>

                    <Typography variant="subtitle1" gutterBottom>
                        Масштаб карты
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                        <Typography gutterBottom>
                            Пикселей на метр: {configForm.scale}
                        </Typography>
                        <Slider
                            value={configForm.scale}
                            onChange={(e, newValue) => setConfigForm({ ...configForm, scale: newValue })}
                            min={5}
                            max={100}
                            step={5}
                            valueLabelDisplay="auto"
                        />
                    </Box>

                    <Typography variant="subtitle1" gutterBottom>
                        Размеры карты в пикселях
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Ширина (пиксели)"
                            type="number"
                            value={configForm.map_width}
                            onChange={(e) => setConfigForm({ ...configForm, map_width: parseFloat(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="Высота (пиксели)"
                            type="number"
                            value={configForm.map_height}
                            onChange={(e) => setConfigForm({ ...configForm, map_height: parseFloat(e.target.value) })}
                            fullWidth
                        />
                    </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        Рекомендуемый масштаб: 20-50 пикселей на метр для точной навигации.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfigDialog(false)}>Отмена</Button>
                    <Button onClick={saveMapConfig} variant="contained">
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default StoreMapEditor;