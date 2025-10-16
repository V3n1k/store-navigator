package models

import (
    "gorm.io/gorm"
    "time"
)

type User struct {
    gorm.Model
    Username string `json:"username" gorm:"unique;not null"`
    Password string `json:"-" gorm:"not null"`
    Role     string `json:"role" gorm:"default:'user'"`
}

type UserSession struct {
    gorm.Model
    UserID    uint      `json:"user_id"`
    Token     string    `json:"token" gorm:"unique;not null"`
    ExpiresAt time.Time `json:"expires_at"`
}