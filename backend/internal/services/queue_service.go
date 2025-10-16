package services

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    
    "github.com/redis/go-redis/v9"
)

type QueueService struct {
    redisClient *redis.Client
}

func NewQueueService() *QueueService {
    client := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })
    return &QueueService{redisClient: client}
}

func (qs *QueueService) UpdateQueue(storeID uint, checkoutNumber int, peopleCount int) error {
    ctx := context.Background()
    
    queueData := map[string]interface{}{
        "people_count": peopleCount,
        "updated_at":   time.Now(),
    }
    
    jsonData, _ := json.Marshal(queueData)
    key := fmt.Sprintf("store:%d:queue:%d", storeID, checkoutNumber)
    
    return qs.redisClient.Set(ctx, key, jsonData, 10*time.Minute).Err()
}

func (qs *QueueService) GetQueues(storeID uint) (map[int]int, error) {
    // Пока заглушка с тестовыми данными
    queues := map[int]int{
        1: 3,
        2: 5,
        3: 1,
    }
    return queues, nil
}