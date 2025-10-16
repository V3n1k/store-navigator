package utils

import (
    "crypto/md5"
    "fmt"
    "strconv"
    "time"

    "golang.org/x/crypto/bcrypt"
)

// HashPassword создает хэш пароля
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}

// CheckPasswordHash проверяет пароль с хэшем
func CheckPasswordHash(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

// GenerateToken генерирует случайный токен
func GenerateToken() string {
    return fmt.Sprintf("%x", md5.Sum([]byte(time.Now().String())))
}

// StringToUint преобразует строку в uint
func StringToUint(s string) uint {
    i, err := strconv.ParseUint(s, 10, 32)
    if err != nil {
        return 0
    }
    return uint(i)
}