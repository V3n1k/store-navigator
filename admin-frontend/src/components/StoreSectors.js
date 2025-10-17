import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Grid,
    Card,
    CardContent,
    IconButton,
    Chip
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

function StoreSectors() {
    const { storeId } = useParams();
    const [sectors, setSectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openSectorDialog, setOpenSectorDialog] = useState(false);
    const [openProductDialog, setOpenProductDialog] = useState(false);
    const [editingSector, setEditingSector] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedSector, setSelectedSector] = useState(null);
    const [expandedSectors, setExpandedSectors] = useState({});
    const { getAuthHeader } = useAuth();

    const [sectorForm, setSectorForm] = useState({
        name: '',
        description: '',
        positionX: 0,
        positionY: 0,
        width: 100,
        height: 50
    });

    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: 0
    });

    useEffect(() => {
        fetchSectors();
    }, [storeId]);

    const fetchSectors = async () => {
        try {
            const response = await api.get(`/api/admin/stores/${storeId}/sectors`);
            setSectors(response.data.sectors || []);
        } catch (error) {
            setError('Ошибка загрузки секторов');
        } finally {
            setLoading(false);
        }
    };

    const toggleSectorExpansion = (sectorId) => {
        setExpandedSectors(prev => ({
            ...prev,
            [sectorId]: !prev[sectorId]
        }));
    };

    const handleOpenSectorDialog = (sector = null) => {
        setEditingSector(sector);
        setSectorForm({
            name: sector?.name || '',
            description: sector?.description || '',
            positionX: sector?.positionX || 0,
            positionY: sector?.positionY || 0,
            width: sector?.width || 100,
            height: sector?.height || 50
        });
        setOpenSectorDialog(true);
    };

    const handleOpenProductDialog = (sector, product = null) => {
        setSelectedSector(sector);
        setEditingProduct(product);
        setProductForm({
            name: product?.name || '',
            description: product?.description || '',
            price: product?.price || 0
        });
        setOpenProductDialog(true);
    };

    const handleCloseDialogs = () => {
        setOpenSectorDialog(false);
        setOpenProductDialog(false);
        setEditingSector(null);
        setEditingProduct(null);
        setSelectedSector(null);
        setSectorForm({ name: '', description: '', positionX: 0, positionY: 0, width: 100, height: 50 });
        setProductForm({ name: '', description: '', price: 0 });
    };

    const handleSectorSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSector) {
                await api.put(`/api/admin/sectors/${editingSector.id}`, {
                    ...sectorForm,
                    storeId: parseInt(storeId)
                });
                setSuccess('Сектор успешно обновлен');
            } else {
                await api.post(`/api/admin/stores/${storeId}/sectors`, {
                    ...sectorForm,
                    storeId: parseInt(storeId)
                });
                setSuccess('Сектор успешно создан');
            }
            handleCloseDialogs();
            fetchSectors();
        } catch (error) {
            setError('Ошибка сохранения сектора');
        }
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await api.put(`/api/admin/products/${editingProduct.id}`, productForm);
                setSuccess('Товар успешно обновлен');
            } else {
                await api.post(`/api/admin/sectors/${selectedSector.id}/products`, productForm);
                setSuccess('Товар успешно создан');
            }
            handleCloseDialogs();
            fetchSectors();
        } catch (error) {
            setError('Ошибка сохранения товара');
        }
    };

    const handleDeleteSector = async (sectorId) => {
        if (window.confirm('Удалить сектор и все товары в нем?')) {
            try {
                await api.delete(`/api/admin/sectors/${sectorId}`);
                setSuccess('Сектор удален');
                fetchSectors();
            } catch (error) {
                setError('Ошибка удаления сектора');
            }
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm('Удалить товар?')) {
            try {
                await api.delete(`/api/admin/products/${productId}`);
                setSuccess('Товар удален');
                fetchSectors();
            } catch (error) {
                setError('Ошибка удаления товара');
            }
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography>Загрузка...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Управление секторами магазина</Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenSectorDialog()}
                >
                    Добавить сектор
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={3}>
                {sectors.map((sector) => (
                    <Grid item xs={12} key={sector.id}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6" gutterBottom>
                                            {sector.name}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                            {sector.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                            <Chip label={`Позиция: ${sector.positionX}, ${sector.positionY}`} size="small" />
                                            <Chip label={`Размер: ${sector.width}×${sector.height}`} size="small" />
                                            <Chip label={`Товаров: ${sector.products?.length || 0}`} size="small" color="primary" />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <IconButton
                                            color="primary"
                                            onClick={() => handleOpenSectorDialog(sector)}
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDeleteSector(sector.id)}
                                        >
                                            <Delete />
                                        </IconButton>
                                        <Button
                                            startIcon={expandedSectors[sector.id] ? <ExpandLess /> : <ExpandMore />}
                                            onClick={() => toggleSectorExpansion(sector.id)}
                                        >
                                            Товары
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<Add />}
                                            onClick={() => handleOpenProductDialog(sector)}
                                        >
                                            Добавить товар
                                        </Button>
                                    </Box>
                                </Box>

                                {expandedSectors[sector.id] && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle1" gutterBottom>
                                            Товары в секторе:
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {(sector.products || []).map((product) => (
                                                <Grid item xs={12} sm={6} md={4} key={product.id}>
                                                    <Paper sx={{ p: 2, position: 'relative' }}>
                                                        <Typography variant="subtitle2" gutterBottom>
                                                            {product.name}
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                                            {product.description}
                                                        </Typography>
                                                        <Typography variant="h6" color="primary">
                                                            {product.price} ₽
                                                        </Typography>
                                                        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => handleOpenProductDialog(sector, product)}
                                                            >
                                                                <Edit />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteProduct(product.id)}
                                                            >
                                                                <Delete />
                                                            </IconButton>
                                                        </Box>
                                                    </Paper>
                                                </Grid>
                                            ))}
                                            {(sector.products || []).length === 0 && (
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                                                        Товары не добавлены
                                                    </Typography>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Диалог сектора */}
            <Dialog open={openSectorDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingSector ? 'Редактировать сектор' : 'Добавить сектор'}
                </DialogTitle>
                <form onSubmit={handleSectorSubmit}>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Название сектора"
                            fullWidth
                            value={sectorForm.name}
                            onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                            required
                        />
                        <TextField
                            margin="dense"
                            label="Описание"
                            fullWidth
                            multiline
                            rows={2}
                            value={sectorForm.description}
                            onChange={(e) => setSectorForm({ ...sectorForm, description: e.target.value })}
                        />
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <TextField
                                label="Позиция X"
                                type="number"
                                value={sectorForm.positionX}
                                onChange={(e) => setSectorForm({ ...sectorForm, positionX: parseFloat(e.target.value) })}
                            />
                            <TextField
                                label="Позиция Y"
                                type="number"
                                value={sectorForm.positionY}
                                onChange={(e) => setSectorForm({ ...sectorForm, positionY: parseFloat(e.target.value) })}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <TextField
                                label="Ширина"
                                type="number"
                                value={sectorForm.width}
                                onChange={(e) => setSectorForm({ ...sectorForm, width: parseFloat(e.target.value) })}
                            />
                            <TextField
                                label="Высота"
                                type="number"
                                value={sectorForm.height}
                                onChange={(e) => setSectorForm({ ...sectorForm, height: parseFloat(e.target.value) })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialogs}>Отмена</Button>
                        <Button type="submit" variant="contained">
                            {editingSector ? 'Сохранить' : 'Создать'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Диалог товара */}
            <Dialog open={openProductDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
                </DialogTitle>
                <form onSubmit={handleProductSubmit}>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Название товара"
                            fullWidth
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            required
                        />
                        <TextField
                            margin="dense"
                            label="Описание"
                            fullWidth
                            multiline
                            rows={3}
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Цена"
                            type="number"
                            fullWidth
                            value={productForm.price}
                            onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                            InputProps={{
                                endAdornment: '₽'
                            }}
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialogs}>Отмена</Button>
                        <Button type="submit" variant="contained">
                            {editingProduct ? 'Сохранить' : 'Создать'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Container>
    );
}

export default StoreSectors;