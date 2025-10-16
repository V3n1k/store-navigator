import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Typography,
    Box,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Snackbar,
    Chip,
    CircularProgress
} from '@mui/material';
import { Edit, Delete, Add, LocationOn, Refresh } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

function StoresManagement() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const { getAuthHeader, token } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        address: ''
    });

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            setLoading(true);
            setError('');

            console.log('Current token:', token);
            console.log('Auth header:', getAuthHeader());

            const response = await axios.get('http://localhost:8080/api/stores', {
                headers: getAuthHeader()
            });

            console.log('API Response:', response.data);

            // Обрабатываем разные форматы ответа
            let storesData = [];
            if (response.data && response.data.stores) {
                storesData = response.data.stores;
            } else if (Array.isArray(response.data)) {
                storesData = response.data;
            } else {
                console.warn('Unexpected response format, using empty array');
                storesData = [];
            }

            setStores(storesData);

        } catch (error) {
            console.error('Full error details:', error);

            if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
                setError('Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на localhost:8080');
            } else if (error.response) {
                // Сервер ответил с статусом ошибки
                const status = error.response.status;
                const message = error.response.data?.error || error.response.statusText;

                if (status === 401) {
                    setError('Ошибка авторизации. Возможно, токен устарел.');
                } else if (status === 403) {
                    setError('Доступ запрещен.');
                } else if (status === 404) {
                    setError('Эндпоинт не найден.');
                } else {
                    setError(`Ошибка сервера: ${status} - ${message}`);
                }
            } else if (error.request) {
                // Запрос был сделан, но ответ не получен
                setError('Сервер не отвечает. Проверьте подключение и запущен ли бэкенд.');
            } else {
                // Другие ошибки
                setError(`Ошибка: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (store = null) => {
        setEditingStore(store);
        setFormData({
            name: store?.name || '',
            address: store?.address || ''
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingStore(null);
        setFormData({ name: '', address: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStore) {
                await axios.put(`http://localhost:8080/api/admin/stores/${editingStore.id}`, formData, {
                    headers: getAuthHeader()
                });
                setSuccess('Магазин успешно обновлен');
            } else {
                await axios.post('http://localhost:8080/api/admin/stores', formData, {
                    headers: getAuthHeader()
                });
                setSuccess('Магазин успешно создан');
            }
            handleCloseDialog();
            fetchStores();
        } catch (error) {
            console.error('Error saving store:', error);
            setError('Ошибка сохранения магазина: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (storeId) => {
        if (window.confirm('Вы уверены, что хотите удалить магазин? Все связанные секторы и данные будут удалены.')) {
            try {
                await axios.delete(`http://localhost:8080/api/admin/stores/${storeId}`, {
                    headers: getAuthHeader()
                });
                setSuccess('Магазин успешно удален');
                fetchStores();
            } catch (error) {
                console.error('Error deleting store:', error);
                setError('Ошибка удаления магазина: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const handleCloseSnackbar = () => {
        setError('');
        setSuccess('');
    };

    const handleRetry = () => {
        fetchStores();
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CircularProgress />
                    <Typography>Загрузка магазинов...</Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Управление магазинами</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleRetry}
                        disabled={loading}
                    >
                        Обновить
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                    >
                        Добавить магазин
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    onClose={handleCloseSnackbar}
                    action={
                        <Button color="inherit" size="small" onClick={handleRetry}>
                            Повторить
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={handleCloseSnackbar}>
                    {success}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Название</TableCell>
                            <TableCell>Адрес</TableCell>
                            <TableCell>Статус</TableCell>
                            <TableCell align="center">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stores.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Box sx={{ py: 3 }}>
                                        <Typography variant="body1" color="textSecondary" gutterBottom>
                                            Магазины не найдены
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Создайте первый магазин или проверьте подключение к базе данных
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            stores.map((store) => (
                                <TableRow key={store.id} hover>
                                    <TableCell>{store.id}</TableCell>
                                    <TableCell>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {store.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                                            {store.address}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label="Активен"
                                            color="success"
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleOpenDialog(store)}
                                                title="Редактировать"
                                            >
                                                <Edit />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDelete(store.id)}
                                                title="Удалить"
                                            >
                                                <Delete />
                                            </IconButton>
                                            <Button
                                                component={Link}
                                                to={`/store-map-editor/${store.id}`}
                                                variant="outlined"
                                                size="small"
                                                startIcon={<LocationOn />}
                                            >
                                                Редактор карты
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingStore ? 'Редактировать магазин' : 'Добавить магазин'}
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Название магазина"
                            fullWidth
                            variant="outlined"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <TextField
                            margin="dense"
                            label="Адрес"
                            fullWidth
                            variant="outlined"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                            sx={{ mt: 2 }}
                            multiline
                            rows={2}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Отмена</Button>
                        <Button type="submit" variant="contained">
                            {editingStore ? 'Сохранить' : 'Создать'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert onClose={handleCloseSnackbar} severity="error">
                    {error}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default StoresManagement;