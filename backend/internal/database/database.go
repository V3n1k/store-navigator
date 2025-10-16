package database

import (
    "log"
    
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func InitDB() (*gorm.DB, error) {  // Теперь возвращаем и ошибку
    dsn := "host=localhost user=store_user password=store_password dbname=store_navigator port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, err  // Возвращаем ошибку вместо log.Fatal
    }
    
    log.Println("✅ Database connection established")
    return db, nil
}