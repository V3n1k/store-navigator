package models



type StoreLayout struct {
    ID          uint    `json:"id" gorm:"primaryKey"`
    StoreID     uint    `json:"store_id"`
    Name        string  `json:"name"`
    Description string  `json:"description"`
    Width       float64 `json:"width"`  // Размеры магазина в метрах
    Height      float64 `json:"height"`
    Scale       float64 `json:"scale"`  // Масштаб (пикселей на метр)
}
type Sector struct {
    ID          uint    `json:"id" gorm:"primaryKey"`
    StoreID     uint    `json:"store_id"`
    Name        string  `json:"name"`
    Description string  `json:"description"`
    PositionX   float64 `json:"position_x"` // В метрах
    PositionY   float64 `json:"position_y"` // В метрах
    Width       float64 `json:"width"`      // В метрах
    Height      float64 `json:"height"`     // В метрах
    Level       int     `json:"level"`
    ParentID    *uint   `json:"parent_id"`
    Products    []Product `json:"products" gorm:"foreignKey:SectorID"`
    SubSectors  []Sector  `json:"sub_sectors" gorm:"foreignKey:ParentID"`
}
type StoreMapConfig struct {
    ID          uint    `json:"id" gorm:"primaryKey"`
    StoreID     uint    `json:"store_id" gorm:"uniqueIndex"`
    RealWidth   float64 `json:"real_width"`  // Реальная ширина магазина в метрах
    RealHeight  float64 `json:"real_height"` // Реальная высота магазина в метрах
    MapWidth    float64 `json:"map_width"`   // Ширина карты в пикселях
    MapHeight   float64 `json:"map_height"`  // Высота карты в пикселях
    Scale       float64 `json:"scale"`       // Масштаб (пикселей на метр)
    OriginX     float64 `json:"origin_x"`    // Смещение начала координат X
    OriginY     float64 `json:"origin_y"`    // Смещение начала координат Y
}

type StructuralElement struct {
    ID        uint    `json:"id" gorm:"primaryKey"`
    LayoutID  uint    `json:"layout_id"`
    Type      string  `json:"type"` // wall, entrance, cashier, column, obstacle
    StartX    float64 `json:"start_x"`
    StartY    float64 `json:"start_y"`
    EndX      float64 `json:"end_x"`   // Для стен
    EndY      float64 `json:"end_y"`   // Для стен
    Width     float64 `json:"width"`   // Ширина элемента
    Height    float64 `json:"height"`  // Высота элемента
    Rotation  float64 `json:"rotation"` // Поворот в градусах
    Metadata  string  `json:"metadata" gorm:"type:json"` // Дополнительные данные
}

type Beacon struct {
    ID        uint    `json:"id" gorm:"primaryKey"`
    StoreID   uint    `json:"store_id"`
    MAC       string  `json:"mac" gorm:"unique"`
    PositionX float64 `json:"position_x"`
    PositionY float64 `json:"position_y"`
    PositionZ float64 `json:"position_z"` // Высота установки
    Type      string  `json:"type"`       // ibeacon, eddystone
    UUID      string  `json:"uuid"`
    Major     uint16  `json:"major"`
    Minor     uint16  `json:"minor"`
    TxPower   int8    `json:"tx_power"`
    IsActive  bool    `json:"is_active" gorm:"default:true"`
}

type MapElement struct {
    ID        uint    `json:"id" gorm:"primaryKey"`
    StoreID   uint    `json:"store_id"`
    Type      string  `json:"type"` // sector, wall, cashier, beacon, entrance, exit, passage
    Name      string  `json:"name"`
    PositionX float64 `json:"position_x"`
    PositionY float64 `json:"position_y"`
    Width     float64 `json:"width"`
    Height    float64 `json:"height"`
    Rotation  float64 `json:"rotation"`
    Color     string  `json:"color"`
    Metadata  string  `json:"metadata" gorm:"type:json"` // Дополнительные данные
    
    // Ссылки на другие модели
    SectorID  *uint  `json:"sector_id"`
    BeaconID  *uint  `json:"beacon_id"`
}

type Wall struct {
    ID        uint    `json:"id" gorm:"primaryKey"`
    StoreID   uint    `json:"store_id"`
    StartX    float64 `json:"start_x"`
    StartY    float64 `json:"start_y"`
    EndX      float64 `json:"end_x"`
    EndY      float64 `json:"end_y"`
    Thickness float64 `json:"thickness" gorm:"default:0.1"`
}