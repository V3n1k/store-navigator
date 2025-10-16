package middleware

import (
    "net/http"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "store-navigator/internal/models"
)

// AdminMiddleware проверяет права администратора
func AdminMiddleware(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }

        // Формат: Bearer {token}
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
            c.Abort()
            return
        }

        token := parts[1]

        // Проверяем сессию
        var session models.UserSession
        result := db.Where("token = ? AND expires_at > ?", token, time.Now()).First(&session)
        if result.Error != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
            c.Abort()
            return
        }

        // Проверяем пользователя
        var user models.User
        result = db.First(&user, session.UserID)
        if result.Error != nil || user.Role != "admin" {
            c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
            c.Abort()
            return
        }

        c.Set("user", user)
        c.Next()
    }
}