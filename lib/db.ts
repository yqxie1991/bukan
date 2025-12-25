import { MongoClient, Db } from 'mongodb';

// 获取 MongoDB 连接 URI
function getMongoURI(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI 环境变量未设置');
  }
  return uri;
}

// 使用 globalThis 缓存连接，确保在 Next.js 热重载和无服务器环境中正确复用
const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
  mongoDb: Db | undefined;
  mongoClientPromise: Promise<MongoClient> | undefined;
};

// 获取数据库实例
export async function getDatabase(): Promise<Db> {
  // 如果已有数据库实例，直接返回
  if (globalForMongo.mongoDb) {
    return globalForMongo.mongoDb;
  }

  try {
    const uri = getMongoURI();
    const dbName = process.env.MONGODB_DB_NAME || 'kerkerker';
    
    // 如果没有 client promise，创建一个
    if (!globalForMongo.mongoClientPromise) {
      const client = new MongoClient(uri);
      globalForMongo.mongoClientPromise = client.connect();
    }
    
    // 等待连接完成
    globalForMongo.mongoClient = await globalForMongo.mongoClientPromise;
    globalForMongo.mongoDb = globalForMongo.mongoClient.db(dbName);
    
    // 初始化数据库集合和索引
    await initializeDatabase(globalForMongo.mongoDb);
    
    console.log('✅ MongoDB 连接成功');
    return globalForMongo.mongoDb;
  } catch (error) {
    // 连接失败时清理状态，允许重试
    globalForMongo.mongoClientPromise = undefined;
    globalForMongo.mongoClient = undefined;
    globalForMongo.mongoDb = undefined;
    console.error('❌ MongoDB 连接失败:', error);
    throw error;
  }
}

// 初始化数据库集合和索引
async function initializeDatabase(db: Db) {
  try {
    // 创建 vod_sources 集合的索引
    const vodSourcesCollection = db.collection('vod_sources');
    await vodSourcesCollection.createIndex({ key: 1 }, { unique: true });
    await vodSourcesCollection.createIndex({ enabled: 1 });
    await vodSourcesCollection.createIndex({ sort_order: 1 });

    // 创建 vod_source_selection 集合的索引
    const selectionCollection = db.collection('vod_source_selection');
    await selectionCollection.createIndex({ id: 1 }, { unique: true });

    // 创建 dailymotion_channels 集合的索引
    const dailymotionChannelsCollection = db.collection('dailymotion_channels');
    await dailymotionChannelsCollection.createIndex({ id: 1 }, { unique: true });
    await dailymotionChannelsCollection.createIndex({ username: 1 });
    await dailymotionChannelsCollection.createIndex({ isActive: 1 });

    // 创建 dailymotion_config 集合的索引
    const dailymotionConfigCollection = db.collection('dailymotion_config');
    await dailymotionConfigCollection.createIndex({ id: 1 }, { unique: true });

    console.log('✅ MongoDB 数据库初始化完成');
  } catch (error) {
    console.error('⚠️ 数据库初始化警告:', error);
    // 不抛出错误，因为索引可能已经存在
  }
}

// 关闭数据库连接
export async function closeDatabase() {
  if (globalForMongo.mongoClient) {
    await globalForMongo.mongoClient.close();
    globalForMongo.mongoClient = undefined;
    globalForMongo.mongoDb = undefined;
    globalForMongo.mongoClientPromise = undefined;
    console.log('✅ MongoDB 连接已关闭');
  }
}
