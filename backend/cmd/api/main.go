package main

import (
    "log"
    "fmt"
    "net/http"
    "strconv"
    "time"
    
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    
    "store-navigator/internal/database"
    "store-navigator/internal/models"
    "store-navigator/internal/middleware" 
    "store-navigator/internal/utils"
)

// Рекурсивная функция для загрузки подсекторов и товаров
func loadSubSectorsAndProducts(db *gorm.DB, sector *models.Sector) {
    // Загружаем подсекторы
    var subSectors []models.Sector
    db.Where("parent_id = ?", sector.ID).Find(&subSectors)
    
    log.Printf("Loading sub-sectors for sector %d (%s): found %d", 
        sector.ID, sector.Name, len(subSectors))
    
    // Для каждого подсектора загружаем товары и рекурсивно подсекторы
    for i := range subSectors {
        var products []models.Product
        db.Where("sector_id = ?", subSectors[i].ID).Find(&products)
        subSectors[i].Products = products
        
        log.Printf("Sub-sector %d (%s): %d products", 
            subSectors[i].ID, subSectors[i].Name, len(products))
        
        // Рекурсивно загружаем подсекторы следующего уровня
        loadSubSectorsAndProducts(db, &subSectors[i])
    }
    
    sector.SubSectors = subSectors
    
    // Загружаем товары для текущего сектора
    var products []models.Product
    db.Where("sector_id = ?", sector.ID).Find(&products)
    sector.Products = products
    
    log.Printf("Sector %d (%s): %d products, %d sub-sectors", 
        sector.ID, sector.Name, len(products), len(subSectors))
}

func main() {
    // Инициализация базы данных
    db := initDatabase()
    
    r := gin.Default()

    r.Use(func(c *gin.Context) {
    c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
    c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
    c.Writer.Header().Set("Access-Control-Max-Age", "86400")
    
    if c.Request.Method == "OPTIONS" {
        c.AbortWithStatus(204)
        return
    }
    
    c.Next()
    })
    
    // Базовые endpoints
    r.GET("/api/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":  "OK",
            "message": "Server is running!",
        })
    })
    
    r.GET("/api/stores", func(c *gin.Context) {
        if db != nil {
            var stores []models.Store
            db.Find(&stores)
            c.JSON(http.StatusOK, gin.H{"stores": stores})
        } else {
            c.JSON(http.StatusOK, gin.H{
                "stores": []gin.H{
                    {
                        "id":      1,
                        "name":    "Тестовый магазин (без БД)",
                        "address": "Режим без базы данных",
                    },
                },
            })
        }
    })
    
    // Проверка подключения к БД
    r.GET("/api/db-check", func(c *gin.Context) {
        if db == nil {
            c.JSON(http.StatusServiceUnavailable, gin.H{
                "database_status": "disconnected",
                "message": "Database not available",
            })
            return
        }
        
        var stores []models.Store
        db.Find(&stores)
        c.JSON(http.StatusOK, gin.H{
            "database_status": "connected",
            "stores_count": len(stores),
            "stores": stores,
        })
    })
    // Эндпоинт для проверки тестовых данных
    r.GET("/api/debug/test-data", func(c *gin.Context) {
        var stores []models.Store
        db.Find(&stores)
    
        var sectors []models.Sector
        db.Find(&sectors)
    
        var elements []models.MapElement
        db.Find(&elements)
    
        c.JSON(http.StatusOK, gin.H{
            "stores": stores,
            "sectors": sectors,
            "elements": elements,
            "counts": gin.H{
                "stores": len(stores),
                "sectors": len(sectors),
                "elements": len(elements),
            },
        })
    })

    // Отладочные эндпоинты для проверки данных
    r.GET("/api/debug/store-data/:id", func(c *gin.Context) {
        storeID := c.Param("id")
    
        var stores []models.Store
        db.Find(&stores)
    
        var sectors []models.Sector
        db.Where("store_id = ?", storeID).Find(&sectors)
    
        var elements []models.MapElement
        db.Where("store_id = ?", storeID).Find(&elements)
    
        var walls []models.Wall
        db.Where("store_id = ?", storeID).Find(&walls)
    
        var config models.StoreMapConfig
        db.Where("store_id = ?", storeID).First(&config)
    
        c.JSON(http.StatusOK, gin.H{
            "stores_count": len(stores),
            "sectors_count": len(sectors),
            "sectors": sectors,
            "elements_count": len(elements),
            "elements": elements,
            "walls_count": len(walls),
            "walls": walls,
            "config": config,
            "store_id": storeID,
        })
    })

    r.POST("/api/auth/login", func(c *gin.Context) {
        var loginData struct {
            Username string `json:"username"`
            Password string `json:"password"`
        }
        
        if err := c.BindJSON(&loginData); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        
        var user models.User
        result := db.Where("username = ?", loginData.Username).First(&user)
        if result.Error != nil {
            log.Printf("User not found: %s", loginData.Username)
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
            return
        }
        
        if !utils.CheckPasswordHash(loginData.Password, user.Password) {
            log.Printf("Invalid password for user: %s", loginData.Username)
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
            return
        }
        
        // Создаем сессию
        token := utils.GenerateToken()
        session := models.UserSession{
            UserID:    user.ID,
            Token:     token,
            ExpiresAt: time.Now().Add(24 * time.Hour),
        }
        db.Create(&session)
        
        c.JSON(http.StatusOK, gin.H{
            "token": token,
            "user": gin.H{
                "id":       user.ID,
                "username": user.Username,
                "role":     user.Role,
            },
        })
    })

    // Группа эндпоинтов для администратора - ПЕРЕМЕЩЕНА ВНУТРЬ ФУНКЦИИ MAIN
    adminGroup := r.Group("/api/admin")
    if db != nil {
        adminGroup.Use(middleware.AdminMiddleware(db))
    }
    {
        // Управление магазинами
        adminGroup.POST("/stores", func(c *gin.Context) {
            var store models.Store
            if err := c.BindJSON(&store); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid store data"})
                return
            }
            
            db.Create(&store)
            c.JSON(http.StatusOK, store)
        })
        
        adminGroup.PUT("/stores/:id", func(c *gin.Context) {
            storeID := c.Param("id")
            var store models.Store
            
            if err := db.First(&store, storeID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Store not found"})
                return
            }
            
            if err := c.BindJSON(&store); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid store data"})
                return
            }
            
            db.Save(&store)
            c.JSON(http.StatusOK, store)
        })

        adminGroup.DELETE("/stores/:id", func(c *gin.Context) {
            storeID := c.Param("id")
            var store models.Store
            
            if err := db.First(&store, storeID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Store not found"})
                return
            }
            
            // Каскадное удаление связанных данных
            db.Where("store_id = ?", storeID).Delete(&models.Sector{})
            db.Where("store_id = ?", storeID).Delete(&models.Beacon{})
            db.Where("store_id = ?", storeID).Delete(&models.MapElement{})
            db.Where("store_id = ?", storeID).Delete(&models.Wall{})
            
            // Удаляем сам магазин
            db.Delete(&store)
            
            c.JSON(http.StatusOK, gin.H{"message": "Store deleted successfully"})
        })
        
        // Управление секторами
        adminGroup.POST("/stores/:id/sectors", func(c *gin.Context) {
            storeID := c.Param("id")
            var sector models.Sector
            
            if err := c.BindJSON(&sector); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sector data"})
                return
            }
            
            sector.StoreID = utils.StringToUint(storeID)
            db.Create(&sector)
            c.JSON(http.StatusOK, sector)
        })
        
        adminGroup.PUT("/sectors/:id", func(c *gin.Context) {
            sectorID := c.Param("id")
            var sector models.Sector
            
            if err := db.First(&sector, sectorID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Sector not found"})
                return
            }
            
            if err := c.BindJSON(&sector); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sector data"})
                return
            }
            
            db.Save(&sector)
            c.JSON(http.StatusOK, sector)
        })

        adminGroup.GET("/stores/:id/sectors", func(c *gin.Context) {
            storeID := c.Param("id")
            var sectors []models.Sector
            
            db.Where("store_id = ?", storeID).Find(&sectors)
            c.JSON(http.StatusOK, gin.H{"sectors": sectors})
        })

        adminGroup.DELETE("/sectors/:id", func(c *gin.Context) {
            sectorID := c.Param("id")
            var sector models.Sector
            
            if err := db.First(&sector, sectorID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Sector not found"})
                return
            }
            
            // Удаляем связанные товары
            db.Where("sector_id = ?", sectorID).Delete(&models.Product{})
            
            // Удаляем сектор
            db.Delete(&sector)
            
            c.JSON(http.StatusOK, gin.H{"message": "Sector deleted successfully"})
        })
        
        // Управление товарами
        adminGroup.POST("/sectors/:id/products", func(c *gin.Context) {
            sectorID := c.Param("id")
            var product models.Product
            
            if err := c.BindJSON(&product); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product data"})
                return
            }
            
            product.SectorID = utils.StringToUint(sectorID)
            db.Create(&product)
            c.JSON(http.StatusOK, product)
        })

        adminGroup.PUT("/products/:id", func(c *gin.Context) {
            productID := c.Param("id")
            var product models.Product
            
            if err := db.First(&product, productID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
                return
            }
            
            if err := c.BindJSON(&product); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product data"})
                return
            }
            
            db.Save(&product)
            c.JSON(http.StatusOK, product)
        })

        adminGroup.DELETE("/products/:id", func(c *gin.Context) {
            productID := c.Param("id")
            var product models.Product
            
            if err := db.First(&product, productID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
                return
            }
            
            db.Delete(&product)
            c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
        })
        
        // Управление маячками
        adminGroup.POST("/beacons", func(c *gin.Context) {
            var beacon models.Beacon
            if err := c.BindJSON(&beacon); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid beacon data"})
                return
            }
            
            db.Create(&beacon)
            c.JSON(http.StatusOK, beacon)
        })
        
        adminGroup.GET("/beacons/:storeId", func(c *gin.Context) {
            storeID := c.Param("storeId")
            var beacons []models.Beacon
            
            db.Where("store_id = ?", storeID).Find(&beacons)
            c.JSON(http.StatusOK, gin.H{"beacons": beacons})
        })
        
        adminGroup.PUT("/beacons/:id", func(c *gin.Context) {
            beaconID := c.Param("id")
            var beacon models.Beacon
            
            if err := db.First(&beacon, beaconID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Beacon not found"})
                return
            }
            
            if err := c.BindJSON(&beacon); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid beacon data"})
                return
            }
            
            db.Save(&beacon)
            c.JSON(http.StatusOK, beacon)
        })

        // Управление элементами карты
        adminGroup.GET("/stores/:id/map-elements", func(c *gin.Context) {
            storeID := c.Param("id")
            var elements []models.MapElement
            
            db.Where("store_id = ?", storeID).Find(&elements)
            c.JSON(http.StatusOK, gin.H{"elements": elements})
        })

        adminGroup.POST("/stores/:id/map-elements", func(c *gin.Context) {
            storeID := c.Param("id")
            var element models.MapElement
            
            if err := c.BindJSON(&element); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid element data"})
                return
            }
            
            element.StoreID = utils.StringToUint(storeID)
            db.Create(&element)
            c.JSON(http.StatusOK, element)
        })

        adminGroup.PUT("/map-elements/:id", func(c *gin.Context) {
            elementID := c.Param("id")
            var element models.MapElement
            
            if err := db.First(&element, elementID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Element not found"})
                return
            }
            
            if err := c.BindJSON(&element); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid element data"})
                return
            }
            
            db.Save(&element)
            c.JSON(http.StatusOK, element)
        })

        adminGroup.DELETE("/map-elements/:id", func(c *gin.Context) {
            elementID := c.Param("id")
            var element models.MapElement
            
            if err := db.First(&element, elementID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Element not found"})
                return
            }
            
            db.Delete(&element)
            c.JSON(http.StatusOK, gin.H{"message": "Element deleted successfully"})
        })

        

        // Управление стенами
        adminGroup.GET("/stores/:id/walls", func(c *gin.Context) {
            storeID := c.Param("id")
            var walls []models.Wall
            
            db.Where("store_id = ?", storeID).Find(&walls)
            c.JSON(http.StatusOK, gin.H{"walls": walls})
        })

        adminGroup.POST("/stores/:id/walls", func(c *gin.Context) {
            storeID := c.Param("id")
            var wall models.Wall
            
            if err := c.BindJSON(&wall); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid wall data"})
                return
            }
            
            wall.StoreID = utils.StringToUint(storeID)
            db.Create(&wall)
            c.JSON(http.StatusOK, wall)
        })

        adminGroup.DELETE("/walls/:id", func(c *gin.Context) {
            wallID := c.Param("id")
            var wall models.Wall
            
            if err := db.First(&wall, wallID).Error; err != nil {
                c.JSON(http.StatusNotFound, gin.H{"error": "Wall not found"})
                return
            }
            
            db.Delete(&wall)
            c.JSON(http.StatusOK, gin.H{"message": "Wall deleted successfully"})
        })

        // Конфигурация карты магазина
        adminGroup.GET("/stores/:id/map-config", func(c *gin.Context) {
            storeID := c.Param("id")
            var config models.StoreMapConfig
            
            result := db.Where("store_id = ?", storeID).First(&config)
            if result.Error != nil {
                // Возвращаем конфигурацию по умолчанию
                c.JSON(http.StatusOK, gin.H{
                    "real_width": 50.0,
                    "real_height": 30.0,
                    "map_width": 1200.0,
                    "map_height": 800.0,
                    "scale": 20.0, // 20 пикселей на метр
                    "origin_x": 0.0,
                    "origin_y": 0.0,
                })
                return
            }
            
            c.JSON(http.StatusOK, config)
        })

        adminGroup.POST("/stores/:id/map-config", func(c *gin.Context) {
            storeID := c.Param("id")
            var config models.StoreMapConfig
            
            if err := c.BindJSON(&config); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid config data"})
                return
            }
            
            config.StoreID = utils.StringToUint(storeID)
            
            // Проверяем существующую конфигурацию
            var existingConfig models.StoreMapConfig
            result := db.Where("store_id = ?", storeID).First(&existingConfig)
            
            if result.Error == nil {
                // Обновляем существующую
                config.ID = existingConfig.ID
                db.Save(&config)
            } else {
                // Создаем новую
                db.Create(&config)
            }
            
            c.JSON(http.StatusOK, config)
        })
    }



r.GET("/api/debug/stores", func(c *gin.Context) {
    if db == nil {
        c.JSON(http.StatusOK, gin.H{
            "message": "Database is nil",
            "stores": []gin.H{
                {
                    "id":      1,
                    "name":    "Тестовый магазин (без БД)",
                    "address": "Режим без базы данных",
                },
            },
        })
        return
    }
    
    var stores []models.Store
    result := db.Find(&stores)
    
    c.JSON(http.StatusOK, gin.H{
        "database_connected": true,
        "stores_count": len(stores),
        "stores": stores,
        "query_error": result.Error != nil,
        "error_message": fmt.Sprintf("%v", result.Error),
    })
})


    // Эндпоинт для получения деталей магазина
    r.GET("/api/stores/:id", func(c *gin.Context) {
        storeID := c.Param("id")
        
        if db != nil {
            var store models.Store
            result := db.First(&store, storeID)
            if result.Error != nil {
                c.JSON(http.StatusNotFound, gin.H{
                    "error": "Магазин не найден",
                })
                return
            }
            
            // Загружаем корневые секторы (у которых ParentID = NULL)
            var rootSectors []models.Sector
            db.Where("store_id = ? AND parent_id IS NULL", storeID).Find(&rootSectors)
            
            // Рекурсивно загружаем подсекторы и товары
            for i := range rootSectors {
                loadSubSectorsAndProducts(db, &rootSectors[i])
            }
            
            store.Sectors = rootSectors
            c.JSON(http.StatusOK, store)
        } else {
            // Режим без БД - возвращаем тестовые данные с подсекторами
            id, _ := strconv.ParseInt(storeID, 10, 64)
            c.JSON(http.StatusOK, gin.H{
                "id":      id,
                "name":    "Тестовый магазин " + storeID,
                "address": "Тестовый адрес для магазина " + storeID,
                "sectors": []gin.H{
                    {
                        "id":          1,
                        "name":        "Молочные продукты",
                        "description": "Сектор молочной продукции",
                        "positionX":   100.0,
                        "positionY":   100.0,
                        "width":       200.0,
                        "height":      150.0,
                        "level":       0,
                        "parent_id":   nil,
                        "products": []gin.H{
                            {
                                "id":          1,
                                "name":        "Молоко",
                                "description": "Молоко 2.5%",
                                "price":       75.00,
                            },
                        },
                        "sub_sectors": []gin.H{
                            {
                                "id":          2,
                                "name":        "Мороженое",
                                "description": "Мороженое и десерты",
                                "positionX":   110.0,
                                "positionY":   110.0,
                                "width":       80.0,
                                "height":      30.0,
                                "level":       1,
                                "parent_id":   1,
                                "products": []gin.H{
                                    {
                                        "id":          2,
                                        "name":        "Пломбир",
                                        "description": "Пломбир ванильный",
                                        "price":       50.00,
                                    },
                                },
                            },
                            {
                                "id":          3,
                                "name":        "Кисломолочные",
                                "description": "Кефир, йогурты, ряженка",
                                "positionX":   110.0,
                                "positionY":   150.0,
                                "width":       80.0,
                                "height":      40.0,
                                "level":       1,
                                "parent_id":   1,
                                "products": []gin.H{
                                    {
                                        "id":          3,
                                        "name":        "Кефир",
                                        "description": "Кефир 2.5%",
                                        "price":       60.00,
                                    },
                                },
                            },
                        },
                    },
                },
            })
        }
    })

    // Отладочный эндпоинт для создания администратора
    r.POST("/api/debug/create-admin", func(c *gin.Context) {
        var adminUser models.User
        result := db.Where("username = ?", "admin").First(&adminUser)
        
        if result.Error != nil {
            hashedPassword, err := utils.HashPassword("admin123")
            if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
                return
            }
            
            adminUser = models.User{
                Username: "admin",
                Password: hashedPassword,
                Role:     "admin",
            }
            db.Create(&adminUser)
            
            c.JSON(http.StatusOK, gin.H{
                "message": "Admin user created successfully",
                "username": "admin", 
                "password": "admin123",
                "hashed_password": hashedPassword,
            })
        } else {
            c.JSON(http.StatusOK, gin.H{
                "message": "Admin user already exists",
                "user": adminUser,
            })
        }
    })
    
    log.Println("🚀 Server starting on :8080")
    if err := r.Run(":8080"); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}

func initDatabase() *gorm.DB {
    db, err := database.InitDB()
    if err != nil {
        log.Printf("⚠️  Database connection failed: %v", err)
        log.Println("⚠️  Server starting without database connection")
        return nil
    }
    
    // Автомиграция для ВСЕХ моделей
    err = db.AutoMigrate(
        &models.Store{},
        &models.Sector{}, 
        &models.Product{},
        &models.User{},
        &models.UserSession{},
        &models.StoreLayout{},
        &models.StructuralElement{},
        &models.Beacon{},
        &models.MapElement{},  // Добавляем
        &models.Wall{},        // Добавляем
        &models.StoreMapConfig{}, // Добавляем
    )
    if err != nil {
        log.Printf("⚠️  Database migration failed: %v", err)
        return nil
    }
    
    // Добавляем тестовые данные
    seedTestData(db)
    
    log.Println("✅ Database initialized successfully")
    return db
}

func seedTestData(db *gorm.DB) {
    var count int64
    var adminUser models.User
    result := db.Where("username = ?", "admin").First(&adminUser)
    
    log.Printf("Searching for admin user. Found: %v, Error: %v", adminUser.ID, result.Error)
    
    if adminUser.ID == 0 {
        hashedPassword, err := utils.HashPassword("admin123")
        if err != nil {
            log.Printf("Error hashing password: %v", err)
            return
        }
        adminUser = models.User{
            Username: "admin",
            Password: hashedPassword,
            Role:     "admin",
        }
        db.Create(&adminUser)
        log.Println("👤 Default admin user created: admin / admin123")
    } else {
        log.Printf("Admin user already exists. ID: %d", adminUser.ID)
    }
    
    db.Model(&models.Store{}).Count(&count)
    if count == 0 {
        // Сначала создаем магазин
        store := models.Store{
            Name:    "Тестовый супермаркет",
            Address: "ул. Примерная, 123",
        }
        db.Create(&store)

        // Создаем основной сектор
        mainSector := models.Sector{
            Name:        "Молочные продукты",
            Description: "Все молочные продукты",
            PositionX:   10.0, // В метрах
            PositionY:   5.0,  // В метрах
            Width:       8.0,  // В метрах
            Height:      6.0,  // В метрах
            Level:       0,
            StoreID:     store.ID,
        }
        db.Create(&mainSector)

        // Добавляем товары к основному сектору
        products := []models.Product{
            {Name: "Молоко", Description: "Молоко 2.5%", Price: 85.50, SectorID: mainSector.ID},
            {Name: "Сыр", Description: "Сыр Российский", Price: 320.00, SectorID: mainSector.ID},
        }
        for i := range products {
            db.Create(&products[i])
        }

        // Создаем подсекторы
        subSectors := []models.Sector{
            {
                Name:        "Молоко и сливки",
                Description: "Различные виды молока и сливок",
                PositionX:   10.5, // В метрах
                PositionY:   5.5,  // В метрах
                Width:       3.0,  // В метрах
                Height:      2.0,  // В метрах
                Level:       1,
                StoreID:     store.ID,
                ParentID:    &mainSector.ID,
            },
            {
                Name:        "Йогурты и десерты",
                Description: "Йогурты, творожки, десерты",
                PositionX:   14.0, // В метрах
                PositionY:   5.5,  // В метрах
                Width:       3.0,  // В метрах
                Height:      2.0,  // В метрах
                Level:       1,
                StoreID:     store.ID,
                ParentID:    &mainSector.ID,
            },
        }

        for i := range subSectors {
            db.Create(&subSectors[i])
            
            // Добавляем товары к подсекторам
            var subProducts []models.Product
            if i == 0 {
                subProducts = []models.Product{
                    {Name: "Молоко 2.5%", Description: "Пастеризованное молоко", Price: 85.50, SectorID: subSectors[i].ID},
                    {Name: "Молоко 3.2%", Description: "Цельное молоко", Price: 92.00, SectorID: subSectors[i].ID},
                }
            } else {
                subProducts = []models.Product{
                    {Name: "Йогурт натуральный", Description: "Натуральный йогурт", Price: 45.00, SectorID: subSectors[i].ID},
                    {Name: "Йогурт фруктовый", Description: "Йогурт с персиком", Price: 55.00, SectorID: subSectors[i].ID},
                }
            }
            
            for j := range subProducts {
                db.Create(&subProducts[j])
            }
        }

        log.Println("📦 Test data added with sub-sectors")
    } else {
        log.Println("📦 Test data already exists")
    }
}