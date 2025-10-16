package models

import "gorm.io/gorm"

type Store struct {
    gorm.Model
    Name    string   `json:"name"`
    Address string   `json:"address"`
    Sectors []Sector `json:"sectors" gorm:"foreignKey:StoreID"`
}



type Product struct {
    gorm.Model
    Name        string  `json:"name"`
    Description string  `json:"description"`
    Price       float64 `json:"price"`
    SectorID    uint    `json:"sector_id"`
}