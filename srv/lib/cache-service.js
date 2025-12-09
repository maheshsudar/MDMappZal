const cds = require('@sap/cds');
const redis = require('redis');

/**
 * Caching Service for Performance Optimization
 * Implements multi-tier caching with TTL and intelligent invalidation
 */
class CacheService {

  constructor() {
    // In-memory cache with TTL
    this.memoryCache = new Map();
    this.cacheMetadata = new Map();

    // Redis client for distributed caching
    this.redisClient = null;
    this.useRedis = process.env.REDIS_URL || process.env.NODE_ENV === 'production';
    this.initializeRedis();

    // Cache configuration
    this.config = {
      // Default TTL in milliseconds
      defaultTTL: 15 * 60 * 1000, // 15 minutes

      // Specific TTL for different data types
      ttl: {
        'vat_validation': 24 * 60 * 60 * 1000, // 24 hours
        'compliance_check': 1 * 60 * 60 * 1000, // 1 hour
        'duplicate_search': 5 * 60 * 1000, // 5 minutes
        'partner_data': 30 * 60 * 1000, // 30 minutes
        'configuration': 60 * 60 * 1000, // 1 hour
        'user_roles': 30 * 60 * 1000, // 30 minutes
        'business_channels': 2 * 60 * 60 * 1000, // 2 hours
        'existing_partners': 10 * 60 * 1000, // 10 minutes
      },

      // Maximum cache size (number of entries)
      maxSize: 10000,

      // Cleanup interval
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
    };

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      errors: 0
    };

    // Start periodic cleanup
    this.startCleanupTimer();
  }

  /**
   * Initialize Redis client for distributed caching
   */
  async initializeRedis() {
    if (!this.useRedis) {
      console.log('💾 Redis disabled - using in-memory cache only');
      return;
    }

    try {
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error('❌ Redis connection failed after 3 retries - falling back to memory cache');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        },
        database: parseInt(process.env.REDIS_DB || '0'),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME
      };

      this.redisClient = redis.createClient(redisConfig);

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        this.redisClient = null;
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      this.redisClient.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      this.redisClient.on('end', () => {
        console.log('⚠️ Redis connection closed');
      });

      await this.redisClient.connect();
      console.log('✅ Redis cache service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * Get cached value
   *
   * @param {string} key - Cache key
   * @param {string} type - Data type for TTL configuration
   * @returns {any} Cached value or null if not found/expired
   */
  async get(key, type = 'default') {
    try {
      const fullKey = this.buildKey(key, type);

      // Try Redis first if available
      if (this.redisClient) {
        try {
          const redisValue = await this.redisClient.get(`mdm:${fullKey}`);
          if (redisValue !== null) {
            this.stats.hits++;
            console.log(`💾 Redis Cache HIT for key: ${fullKey}`);
            return JSON.parse(redisValue);
          }
        } catch (redisError) {
          console.warn('Redis get error, falling back to memory:', redisError.message);
        }
      }

      // Fallback to memory cache
      if (!this.memoryCache.has(fullKey)) {
        this.stats.misses++;
        return null;
      }

      const metadata = this.cacheMetadata.get(fullKey);
      const now = Date.now();

      // Check if expired
      if (metadata && metadata.expiresAt < now) {
        this.memoryCache.delete(fullKey);
        this.cacheMetadata.delete(fullKey);
        this.stats.misses++;
        this.stats.evictions++;
        return null;
      }

      const value = this.memoryCache.get(fullKey);

      // Update access time
      if (metadata) {
        metadata.lastAccessed = now;
        metadata.accessCount++;
      }

      this.stats.hits++;
      console.log(`💾 Memory Cache HIT for key: ${fullKey}`);
      return value;

    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set cached value
   *
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {string} type - Data type for TTL configuration
   * @param {number} customTTL - Custom TTL in milliseconds (optional)
   * @returns {boolean} Success indicator
   */
  async set(key, value, type = 'default', customTTL = null) {
    try {
      const fullKey = this.buildKey(key, type);
      const ttl = customTTL || this.config.ttl[type] || this.config.defaultTTL;
      const now = Date.now();

      // Store in Redis if available
      if (this.redisClient) {
        try {
          const serializedValue = JSON.stringify(value);
          const ttlSeconds = Math.ceil(ttl / 1000);
          await this.redisClient.setEx(`mdm:${fullKey}`, ttlSeconds, serializedValue);
          console.log(`💾 Redis Cache SET for key: ${fullKey} (TTL: ${ttlSeconds}s)`);
        } catch (redisError) {
          console.warn('Redis set error, continuing with memory cache:', redisError.message);
        }
      }

      // Check cache size and evict if necessary
      if (this.memoryCache.size >= this.config.maxSize) {
        await this.evictLeastRecentlyUsed();
      }

      // Store in memory cache as fallback/L1 cache
      this.memoryCache.set(fullKey, value);
      this.cacheMetadata.set(fullKey, {
        key: fullKey,
        type,
        createdAt: now,
        lastAccessed: now,
        expiresAt: now + ttl,
        accessCount: 1,
        size: this.estimateSize(value)
      });

      this.stats.sets++;
      console.log(`💾 Memory Cache SET for key: ${fullKey} (TTL: ${ttl}ms)`);
      return true;

    } catch (error) {
      console.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete cached value
   *
   * @param {string} key - Cache key
   * @param {string} type - Data type
   * @returns {boolean} Success indicator
   */
  async delete(key, type = 'default') {
    try {
      const fullKey = this.buildKey(key, type);

      const existed = this.memoryCache.has(fullKey);
      this.memoryCache.delete(fullKey);
      this.cacheMetadata.delete(fullKey);

      if (existed) {
        console.log(`💾 Cache DELETE for key: ${fullKey}`);
      }

      return existed;

    } catch (error) {
      console.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Clear all cache entries or entries of specific type
   *
   * @param {string} type - Optional type to clear specific entries
   * @returns {number} Number of entries cleared
   */
  async clear(type = null) {
    try {
      let cleared = 0;

      if (type) {
        // Clear specific type
        for (const [key, metadata] of this.cacheMetadata.entries()) {
          if (metadata.type === type) {
            this.memoryCache.delete(key);
            this.cacheMetadata.delete(key);
            cleared++;
          }
        }
        console.log(`💾 Cache CLEAR type '${type}': ${cleared} entries`);
      } else {
        // Clear all
        cleared = this.memoryCache.size;
        this.memoryCache.clear();
        this.cacheMetadata.clear();
        console.log(`💾 Cache CLEAR ALL: ${cleared} entries`);
      }

      return cleared;

    } catch (error) {
      console.error('Cache clear error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Invalidate cache entries by pattern
   *
   * @param {string} pattern - Key pattern to match
   * @returns {number} Number of entries invalidated
   */
  async invalidateByPattern(pattern) {
    try {
      let invalidated = 0;
      const regex = new RegExp(pattern);

      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          this.cacheMetadata.delete(key);
          invalidated++;
        }
      }

      console.log(`💾 Cache INVALIDATE pattern '${pattern}': ${invalidated} entries`);
      return invalidated;

    } catch (error) {
      console.error('Cache invalidate error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   *
   * @param {string} key - Cache key
   * @param {Function} loader - Function to load data if not cached
   * @param {string} type - Data type
   * @param {number} customTTL - Custom TTL
   * @returns {any} Cached or loaded value
   */
  async getOrSet(key, loader, type = 'default', customTTL = null) {
    let value = await this.get(key, type);

    if (value === null) {
      console.log(`💾 Cache MISS for key: ${this.buildKey(key, type)} - loading...`);

      try {
        value = await loader();
        if (value !== null && value !== undefined) {
          await this.set(key, value, type, customTTL);
        }
      } catch (error) {
        console.error('Cache loader error:', error);
        throw error;
      }
    }

    return value;
  }

  /**
   * VAT validation caching helper
   *
   * @param {string} country - Country code
   * @param {string} vatNumber - VAT number
   * @param {Function} validator - VAT validation function
   * @returns {any} Validation result
   */
  async cacheVatValidation(country, vatNumber, validator) {
    const key = `${country}:${vatNumber}`;
    return await this.getOrSet(key, validator, 'vat_validation');
  }

  /**
   * Compliance check caching helper
   *
   * @param {string} partnerName - Partner name
   * @param {string} searchTerm - Search term
   * @param {Function} checker - Compliance check function
   * @returns {any} Compliance result
   */
  async cacheComplianceCheck(partnerName, searchTerm, checker) {
    const key = `${partnerName}:${searchTerm || ''}`;
    return await this.getOrSet(key, checker, 'compliance_check');
  }

  /**
   * Duplicate search caching helper
   *
   * @param {string} partnerName - Partner name
   * @param {Array} vatIds - VAT IDs
   * @param {number} threshold - Match threshold
   * @param {Function} searcher - Duplicate search function
   * @returns {any} Search results
   */
  async cacheDuplicateSearch(partnerName, vatIds, threshold, searcher) {
    const key = `${partnerName}:${vatIds.join(',')}:${threshold}`;
    return await this.getOrSet(key, searcher, 'duplicate_search');
  }

  /**
   * Configuration caching helper
   *
   * @param {string} configKey - Configuration key
   * @param {Function} loader - Configuration loader function
   * @returns {any} Configuration value
   */
  async cacheConfiguration(configKey, loader) {
    return await this.getOrSet(configKey, loader, 'configuration');
  }

  /**
   * User roles caching helper
   *
   * @param {string} userId - User ID
   * @param {Function} loader - Role loader function
   * @returns {any} User roles
   */
  async cacheUserRoles(userId, loader) {
    return await this.getOrSet(`user:${userId}`, loader, 'user_roles');
  }

  /**
   * Business channels caching helper
   *
   * @param {Function} loader - Business channels loader function
   * @returns {any} Business channels
   */
  async cacheBusinessChannels(loader) {
    return await this.getOrSet('all', loader, 'business_channels');
  }

  /**
   * Existing partners caching helper
   *
   * @param {string} searchCriteria - Search criteria
   * @param {Function} loader - Partners loader function
   * @returns {any} Existing partners
   */
  async cacheExistingPartners(searchCriteria, loader) {
    return await this.getOrSet(searchCriteria, loader, 'existing_partners');
  }

  /**
   * Build cache key
   *
   * @param {string} key - Base key
   * @param {string} type - Data type
   * @returns {string} Full cache key
   */
  buildKey(key, type) {
    return `${type}:${key}`;
  }

  /**
   * Estimate size of cached value
   *
   * @param {any} value - Value to estimate
   * @returns {number} Estimated size in bytes
   */
  estimateSize(value) {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    } catch (error) {
      return 1000; // Default estimate
    }
  }

  /**
   * Evict least recently used entries
   */
  async evictLeastRecentlyUsed() {
    const entries = Array.from(this.cacheMetadata.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toEvict = Math.ceil(this.config.maxSize * 0.1); // Evict 10%

    for (let i = 0; i < toEvict && entries.length > 0; i++) {
      const [key] = entries[i];
      this.memoryCache.delete(key);
      this.cacheMetadata.delete(key);
      this.stats.evictions++;
    }

    console.log(`💾 Cache EVICTED ${toEvict} LRU entries`);
  }

  /**
   * Cleanup expired entries
   */
  async cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (metadata.expiresAt < now) {
        this.memoryCache.delete(key);
        this.cacheMetadata.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`💾 Cache CLEANUP: ${cleaned} expired entries`);
      this.stats.evictions += cleaned;
    }

    return cleaned;
  }

  /**
   * Start periodic cleanup timer
   */
  startCleanupTimer() {
    setInterval(async () => {
      await this.cleanupExpired();
    }, this.config.cleanupInterval);

    console.log(`💾 Cache cleanup timer started (interval: ${this.config.cleanupInterval}ms)`);
  }

  /**
   * Get cache statistics
   *
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;

    // Calculate total memory usage
    let totalSize = 0;
    for (const metadata of this.cacheMetadata.values()) {
      totalSize += metadata.size;
    }

    // Get cache breakdown by type
    const typeBreakdown = {};
    for (const metadata of this.cacheMetadata.values()) {
      if (!typeBreakdown[metadata.type]) {
        typeBreakdown[metadata.type] = { count: 0, size: 0 };
      }
      typeBreakdown[metadata.type].count++;
      typeBreakdown[metadata.type].size += metadata.size;
    }

    return {
      // Performance metrics
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,

      // Cache size metrics
      totalEntries: this.memoryCache.size,
      maxSize: this.config.maxSize,
      utilizationRate: `${(this.memoryCache.size / this.config.maxSize * 100).toFixed(2)}%`,

      // Memory metrics
      estimatedMemoryUsage: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,

      // Operations metrics
      sets: this.stats.sets,
      evictions: this.stats.evictions,
      errors: this.stats.errors,

      // Type breakdown
      typeBreakdown,

      // Configuration
      config: {
        defaultTTL: `${this.config.defaultTTL / 1000}s`,
        maxSize: this.config.maxSize,
        cleanupInterval: `${this.config.cleanupInterval / 1000}s`
      }
    };
  }

  /**
   * Health check for cache service
   *
   * @returns {Object} Health status
   */
  async healthCheck() {
    const stats = this.getStats();
    const isHealthy = this.stats.errors < 100 && this.memoryCache.size < this.config.maxSize;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics: {
        hitRate: stats.hitRate,
        totalEntries: stats.totalEntries,
        utilizationRate: stats.utilizationRate,
        errors: stats.errors
      },
      issues: isHealthy ? [] : [
        ...(this.stats.errors >= 100 ? ['High error count'] : []),
        ...(this.memoryCache.size >= this.config.maxSize ? ['Cache at maximum capacity'] : [])
      ]
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      errors: 0
    };
    console.log('💾 Cache statistics reset');
  }

  /**
   * Warm up cache with commonly accessed data
   *
   * @returns {Promise<Object>} Warmup result
   */
  async warmup() {
    console.log('💾 Starting cache warmup...');
    const startTime = Date.now();
    let warmedItems = 0;

    try {
      // Warm up business channels
      try {
        const channels = await SELECT.from('mdm.db.BusinessChannels').where({ isActive: true });
        await this.set('all', channels, 'business_channels');
        warmedItems++;
      } catch (error) {
        console.warn('Failed to warm up business channels:', error.message);
      }

      // Warm up system configuration
      try {
        const configs = await SELECT.from('mdm.db.SystemConfiguration').where({ isActive: true });
        for (const config of configs) {
          await this.set(config.configKey, config.configValue, 'configuration');
          warmedItems++;
        }
      } catch (error) {
        console.warn('Failed to warm up system configuration:', error.message);
      }

      // Warm up workflow steps
      try {
        const workflows = await SELECT.from('mdm.db.WorkflowSteps');
        const workflowMap = {};
        workflows.forEach(step => {
          if (!workflowMap[step.workflowName]) {
            workflowMap[step.workflowName] = [];
          }
          workflowMap[step.workflowName].push(step);
        });

        for (const [workflowName, steps] of Object.entries(workflowMap)) {
          await this.set(workflowName, steps, 'configuration');
          warmedItems++;
        }
      } catch (error) {
        console.warn('Failed to warm up workflow steps:', error.message);
      }

      const duration = Date.now() - startTime;
      console.log(`💾 Cache warmup completed: ${warmedItems} items in ${duration}ms`);

      return {
        success: true,
        itemsWarmed: warmedItems,
        duration,
        message: 'Cache warmup completed successfully'
      };

    } catch (error) {
      console.error('Cache warmup error:', error);
      return {
        success: false,
        error: error.message,
        itemsWarmed: warmedItems
      };
    }
  }
}

// Export singleton instance
module.exports = new CacheService();