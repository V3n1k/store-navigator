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

function StoreMapEditorEnhanced() {
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

    // Конфигурация карты по умолчанию
    const defaultConfig = {
        real_width: 50.0,
        real_height: 30.0,
        map_width: 1200,
        map_height: 800,
        scale: 20.0, // 20 пикселей на метр
        origin_x: 0,
        origin_y: 0
    };

    const [configForm, setConfigForm] = useState({ ...defaultConfig });

    const elementTypes = useMemo(() => [
        { value: 'sector', label: 'Сектор', color: '#4CAF50', icon: <SquareFoot /> },
        { value: 'wall', label: 'Стена', color: '#795548', icon: <SquareIcon /> },
        { value: 'cashier', label: 'Касса', color: '#FF9800', icon: <PointOfSale /> },
        { value: 'beacon', label: 'Маячок', color: '#2196F3', icon: <Bluetooth /> },
        { value: 'entrance', label: 'Вход', color: '#8BC34A', icon: <DoorFront /> },
        { value: 'exit', label: 'Выход', color: '#F44336', icon: <ExitToApp /> },
        { value: 'passage', label: 'Проход', color: '#9E9E9E', icon: <DoorFront /> }
    ], []);

    // Функции для преобразования координат
    const pixelsToMeters = useCallback((pixels) => {
        if (!mapConfig) return pixels;
        return pixels / mapConfig.scale;
    }, [mapConfig]);

    const metersToPixels = useCallback((meters) => {
        if (!mapConfig) return meters;
        return meters * mapConfig.scale;
    }, [mapConfig]);

    const applyZoom = useCallback((value) => {
        return value * zoom;
    }, [zoom]);

    // Загрузка данных
    const fetchMapData = useCallback(async () => {
        try {
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

            setElements(elementsRes.data.elements || []);
            setWalls(wallsRes.data.walls || []);
            setSectors(sectorsRes.data.sectors || []);
            setMapConfig(configRes.data);
            setConfigForm(configRes.data);
        } catch (error) {
            console.error('Error fetching map data:', error);
            setError('Ошибка загрузки данных карты');
        } finally {
            setLoading(false);
        }
    }, [storeId, getAuthHeader]);

    useEffect(() => {
        fetchMapData();
    }, [fetchMapData]);

    // Отрисовка карты с учетом масштаба
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !mapConfig) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scaledWidth = applyZoom(mapConfig.map_width);
        const scaledHeight = applyZoom(mapConfig.map_height);

        // Устанавливаем размеры canvas
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;

        // Рисуем сетку в метрах
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        const meterSize = applyZoom(mapConfig.scale); // Размер метра в пикселях с учетом zoom

        for (let x = 0; x <= scaledWidth; x += meterSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, scaledHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= scaledHeight; y += meterSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(scaledWidth, y);
            ctx.stroke();
        }

        // Подписи осей (метры)
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        for (let x = 0; x <= mapConfig.real_width; x++) {
            const pixelX = applyZoom(x * mapConfig.scale);
            ctx.fillText(`${x}m`, pixelX + 2, 12);
        }
        for (let y = 0; y <= mapConfig.real_height; y++) {
            const pixelY = applyZoom(y * mapConfig.scale);
            ctx.fillText(`${y}m`, 2, pixelY - 2);
        }

        // Рисуем стены
        walls.forEach(wall => {
            const startX = applyZoom(metersToPixels(wall.startX));
            const startY = applyZoom(metersToPixels(wall.startY));
            const endX = applyZoom(metersToPixels(wall.endX));
            const endY = applyZoom(metersToPixels(wall.endY));

            ctx.strokeStyle = '#795548';
            ctx.lineWidth = applyZoom(wall.thickness || 0.1 * mapConfig.scale);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        });

        // Рисуем обычные сектора
        sectors.forEach(sector => {
            const x = applyZoom(metersToPixels(sector.positionX));
            const y = applyZoom(metersToPixels(sector.positionY));
            const width = applyZoom(metersToPixels(sector.width));
            const height = applyZoom(metersToPixels(sector.height));

            ctx.fillStyle = '#4CAF50';
            ctx.strokeStyle = selectedElement?.id === sector.id ? '#FF0000' : '#000000';
            ctx.lineWidth = selectedElement?.id === sector.id ? 3 : 1;

            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);

            // Текст названия
            ctx.fillStyle = '#000000';
            ctx.font = `${applyZoom(12)}px Arial`;
            ctx.fillText(sector.name, x + 5, y + 15);
        });

        // Рисуем элементы карты
        elements.forEach(element => {
            const typeConfig = elementTypes.find(t => t.value === element.type);
            const x = applyZoom(metersToPixels(element.positionX));
            const y = applyZoom(metersToPixels(element.positionY));
            const width = applyZoom(metersToPixels(element.width));
            const height = applyZoom(metersToPixels(element.height));

            ctx.fillStyle = element.color || typeConfig?.color || '#4CAF50';
            ctx.strokeStyle = selectedElement?.id === element.id ? '#FF0000' : '#000000';
            ctx.lineWidth = selectedElement?.id === element.id ? 3 : 1;

            switch (element.type) {
                case 'sector':
                    ctx.fillRect(x, y, width, height);
                    ctx.strokeRect(x, y, width, height);
                    ctx.fillStyle = '#000000';
                    ctx.font = `${applyZoom(12)}px Arial`;
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
                    ctx.font = `${applyZoom(10)}px Arial`;
                    ctx.fillText('КАССА', x + 5, y + 15);
                    break;

                case 'beacon':
                    ctx.beginPath();
                    ctx.arc(x, y, applyZoom(8), 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    // Подпись для маячка
                    ctx.fillStyle = '#000000';
                    ctx.font = `${applyZoom(10)}px Arial`;
                    ctx.fillText('BLE', x - 8, y - 10);
                    break;

                case 'entrance':
                    ctx.fillRect(x, y, width, height);
                    ctx.strokeRect(x, y, width, height);
                    ctx.fillStyle = '#000000';
                    ctx.font = `${applyZoom(10)}px Arial`;
                    ctx.fillText('ВХОД', x + 5, y + 15);
                    break;

                case 'exit':
                    ctx.fillRect(x, y, width, height);
                    ctx.strokeRect(x, y, width, height);
                    ctx.fillStyle = '#000000';
                    ctx.font = `${applyZoom(10)}px Arial`;
                    ctx.fillText('ВЫХОД', x + 5, y + 15);
                    break;

                case 'passage':
                    ctx.fillRect(x, y, width, height);
                    ctx.strokeRect(x, y, width, height);
                    ctx.fillStyle = '#000000';
                    ctx.font = `${applyZoom(10)}px Arial`;
                    ctx.fillText('ПРОХОД', x + 5, y + 15);
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
            ctx.lineWidth = applyZoom(0.1 * mapConfig.scale);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        }
    }, [elements, walls, sectors, selectedElement, drawingWall, elementTypes, mapConfig, metersToPixels, applyZoom]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    const getMousePosInMeters = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const pixelX = (e.clientX - rect.left) / zoom;
        const pixelY = (e.clientY - rect.top) / zoom;

        return {
            x: pixelsToMeters(pixelX),
            y: pixelsToMeters(pixelY)
        };
    };

    const handleCanvasMouseDown = (e) => {
        if (!mapConfig) return;

        const pos = getMousePosInMeters(e);

        if (currentTool === 'select') {
            // Поиск элемента под курсором (в метрах)
            const clickedElement = [...elements, ...sectors].find(item => {
                const itemEndX = item.positionX + (item.width || 0);
                const itemEndY = item.positionY + (item.height || 0);
                return pos.x >= item.positionX && pos.x <= itemEndX &&
                    pos.y >= item.positionY && pos.y <= itemEndY;
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
            // Создание нового элемента через диалог
            setOpenConfigDialog(true);
        }
    };

    const handleCanvasMouseMove = (e) => {
        if (!mapConfig) return;

        const pos = getMousePosInMeters(e);

        if (isDragging && selectedElement) {
            // Перемещение элемента в метрах
            if (selectedElement.products) {
                // Это сектор из модели Sector
                const updatedSectors = sectors.map(sector =>
                    sector.id === selectedElement.id
                        ? { ...sector, positionX: pos.x, positionY: pos.y }
                        : sector
                );
                setSectors(updatedSectors);
            } else {
                // Это элемент карты
                const updatedElements = elements.map(el =>
                    el.id === selectedElement.id
                        ? { ...el, positionX: pos.x, positionY: pos.y }
                        : el
                );
                setElements(updatedElements);
            }
        } else if (drawingWall) {
            // Обновление временной стены
            setDrawingWall({
                ...drawingWall,
                currentX: pos.x,
                currentY: pos.y
            });
        }
    };

    const handleCanvasMouseUp = (e) => {
        if (isDragging && selectedElement) {
            // Сохраняем новую позицию элемента в метрах
            if (selectedElement.products) {
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
            // Сохраняем новую стену в метрах
            const pos = getMousePosInMeters(e);
            createWall({
                startX: drawingWall.startX,
                startY: drawingWall.startY,
                endX: pos.x,
                endY: pos.y,
                thickness: 0.1 // 10 см
            });
        }

        setIsDragging(false);
        setDrawingWall(null);
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

    const createElement = async (elementData) => {
        try {
            const response = await axios.post(
                `http://localhost:8080/api/admin/stores/${storeId}/map-elements`,
                elementData,
                { headers: getAuthHeader() }
            );
            setElements([...elements, response.data]);
            return response.data;
        } catch (error) {
            console.error('Error creating element:', error);
            throw error;
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

                            {/* ... остальной код панели инструментов ... */}

                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={9}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Карта магазина {mapConfig && `- Масштаб: 1:${mapConfig.scale}`}
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
                                        background: '#fafafa'
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

export default StoreMapEditorEnhanced;