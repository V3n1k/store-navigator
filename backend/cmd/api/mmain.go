package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"
    
    "store-navigator/internal/database"
    "store-navigator/internal/handlers"
    "store-navigator/internal/models"
    "store-navigator/internal/services"
    
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

func main() {
    // Инициализация с контекстом для graceful shutdown
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()
    
    // Инициализация базы данных
    db := database.InitDB()
    
    // Автомиграция с таймаутом
    migrationCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()
    
    if err := db.WithContext(migrationCtx).AutoMigrate(
        &models.Store{}, 
        &models.Sector{}, 
        &models.Product{},
    ); err != nil {
        log.Fatal("Failed to migrate database:", err)
    }
    
    // Инициализация сервисов
    queueService := services.NewQueueService()
    
    // Инициализация обработчиков
    storeHandler := handlers.NewStoreHandler(db, queueService)
    
    // Настройка Gin с улучшениями для 2025
    r := gin.Default()
    
    // Глобальный middleware для времени жизни запроса
    r.Use(func(c *gin.Context) {
        reqCtx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
        defer cancel()
        c.Request = c.Request.WithContext(reqCtx)
        c.Next()
    })
    
    // API routes
    api := r.Group("/api")
    {
        api.GET("/stores", storeHandler.GetStores)
        api.GET("/stores/:id/map", storeHandler.GetStoreMap)
        api.GET("/stores/:id/products", storeHandler.SearchProducts)
        api.GET("/stores/:id/queues", storeHandler.GetQueues)
        api.POST("/stores/:id/queues", storeHandler.UpdateQueue)
    }
    
    // Запуск сервера с graceful shutdown
    server := &http.Server{
        Addr:    ":8080",
        Handler: r,
    }
    
    go func() {
        log.Println("Server starting on :8080")
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal("Server failed to start:", err)
        }
    }()
    
    // Ожидание сигнала завершения
    <-ctx.Done()
    
    // Graceful shutdown
    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer shutdownCancel()
    
    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Fatal("Server forced to shutdown:", err)
    }
    
    log.Println("Server exited properly")
}