const EventEmitter = require('events');
const os = require('os');
const process = require('process');

/**
 * Comprehensive Performance Monitoring Service
 * Tracks application metrics, database performance, API response times, and system health
 */
class PerformanceMonitor extends EventEmitter {

  constructor() {
    super();

    // Metrics storage
    this.metrics = {
      requests: {
        total: 0,
        byStatus: {},
        byRoute: {},
        responseTimes: [],
        errors: 0
      },
      database: {
        queries: {
          total: 0,
          slow: 0,
          failed: 0,
          averageTime: 0,
          times: []
        },
        connections: {
          active: 0,
          poolSize: 0,
          waiting: 0
        }
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        operations: 0
      },
      system: {
        memory: {
          used: 0,
          free: 0,
          heapUsed: 0,
          heapTotal: 0
        },
        cpu: {
          usage: 0,
          load: []
        },
        uptime: 0
      },
      business: {
        partnerRequests: {
          created: 0,
          approved: 0,
          rejected: 0,
          pending: 0
        },
        compliance: {
          checksPerformed: 0,
          passRate: 0,
          averageTime: 0
        },
        duplicates: {
          checksPerformed: 0,
          foundRate: 0,
          averageTime: 0
        }
      }
    };

    // Performance thresholds
    this.thresholds = {
      responseTime: {
        warn: 2000,    // 2 seconds
        critical: 5000 // 5 seconds
      },
      dbQueryTime: {
        warn: 1000,    // 1 second
        critical: 3000 // 3 seconds
      },
      memoryUsage: {
        warn: 0.8,     // 80%
        critical: 0.9  // 90%
      },
      cpuUsage: {
        warn: 0.7,     // 70%
        critical: 0.9  // 90%
      },
      errorRate: {
        warn: 0.05,    // 5%
        critical: 0.1  // 10%
      }
    };

    // Time windows for calculations
    this.windows = {
      responseTime: 100,  // Keep last 100 response times
      dbQuery: 100,       // Keep last 100 query times
      sampling: 60000     // 1 minute sampling interval
    };

    // Alerts
    this.alerts = [];
    this.alertCooldown = new Map(); // Prevent spam alerts

    // Start monitoring
    this.startSystemMonitoring();
    console.log('📊 Performance monitoring initialized');
  }

  /**
   * Start system monitoring (CPU, memory, etc.)
   */
  startSystemMonitoring() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.windows.sampling);

    // Initial collection
    this.collectSystemMetrics();
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    try {
      // Memory metrics
      const memUsage = process.memoryUsage();
      const systemMem = {
        total: os.totalmem(),
        free: os.freemem()
      };

      this.metrics.system.memory = {
        used: systemMem.total - systemMem.free,
        free: systemMem.free,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        usagePercentage: ((systemMem.total - systemMem.free) / systemMem.total * 100).toFixed(2)
      };

      // CPU metrics
      const cpus = os.cpus();
      const load = os.loadavg();

      this.metrics.system.cpu = {
        cores: cpus.length,
        load: load,
        model: cpus[0]?.model || 'unknown'
      };

      // Uptime
      this.metrics.system.uptime = process.uptime();

      // Check thresholds and generate alerts
      this.checkSystemThresholds();

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Track HTTP request
   */
  trackRequest(req, res, responseTime) {
    try {
      const route = this.extractRoute(req.path);
      const status = res.statusCode;

      // Update request metrics
      this.metrics.requests.total++;

      // Track by status
      this.metrics.requests.byStatus[status] = (this.metrics.requests.byStatus[status] || 0) + 1;

      // Track by route
      if (!this.metrics.requests.byRoute[route]) {
        this.metrics.requests.byRoute[route] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }

      const routeMetric = this.metrics.requests.byRoute[route];
      routeMetric.count++;
      routeMetric.totalTime += responseTime;
      routeMetric.avgTime = routeMetric.totalTime / routeMetric.count;
      routeMetric.minTime = Math.min(routeMetric.minTime, responseTime);
      routeMetric.maxTime = Math.max(routeMetric.maxTime, responseTime);

      // Track response times (sliding window)
      this.metrics.requests.responseTimes.push(responseTime);
      if (this.metrics.requests.responseTimes.length > this.windows.responseTime) {
        this.metrics.requests.responseTimes.shift();
      }

      // Track errors
      if (status >= 400) {
        this.metrics.requests.errors++;
      }

      // Check response time thresholds
      this.checkResponseTimeThreshold(route, responseTime);

      // Emit event for real-time monitoring
      this.emit('request', {
        route,
        status,
        responseTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error tracking request:', error);
    }
  }

  /**
   * Track database query
   */
  trackDatabaseQuery(query, executionTime, success = true) {
    try {
      this.metrics.database.queries.total++;

      if (!success) {
        this.metrics.database.queries.failed++;
      }

      // Track query times (sliding window)
      this.metrics.database.queries.times.push(executionTime);
      if (this.metrics.database.queries.times.length > this.windows.dbQuery) {
        this.metrics.database.queries.times.shift();
      }

      // Calculate average
      const times = this.metrics.database.queries.times;
      this.metrics.database.queries.averageTime = times.reduce((a, b) => a + b, 0) / times.length;

      // Track slow queries
      if (executionTime > this.thresholds.dbQueryTime.warn) {
        this.metrics.database.queries.slow++;

        if (executionTime > this.thresholds.dbQueryTime.critical) {
          this.generateAlert('database', 'critical', `Very slow database query: ${executionTime}ms`, {
            query: query.substring(0, 100) + '...',
            executionTime
          });
        }
      }

      // Emit event
      this.emit('database-query', {
        query: query.substring(0, 200),
        executionTime,
        success,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error tracking database query:', error);
    }
  }

  /**
   * Track cache operation
   */
  trackCacheOperation(operation, hit = null) {
    try {
      this.metrics.cache.operations++;

      if (hit === true) {
        this.metrics.cache.hits++;
      } else if (hit === false) {
        this.metrics.cache.misses++;
      }

      // Calculate hit rate
      const total = this.metrics.cache.hits + this.metrics.cache.misses;
      this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total * 100).toFixed(2) : 0;

      this.emit('cache-operation', {
        operation,
        hit,
        hitRate: this.metrics.cache.hitRate,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error tracking cache operation:', error);
    }
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(category, action, metadata = {}) {
    try {
      if (category === 'partner-request') {
        if (action === 'created') {
          this.metrics.business.partnerRequests.created++;
        } else if (action === 'approved') {
          this.metrics.business.partnerRequests.approved++;
        } else if (action === 'rejected') {
          this.metrics.business.partnerRequests.rejected++;
        }
      } else if (category === 'compliance') {
        this.metrics.business.compliance.checksPerformed++;

        if (metadata.executionTime) {
          // Update average time (simple moving average)
          const current = this.metrics.business.compliance.averageTime;
          const count = this.metrics.business.compliance.checksPerformed;
          this.metrics.business.compliance.averageTime =
            (current * (count - 1) + metadata.executionTime) / count;
        }

        if (metadata.passed) {
          // Update pass rate
          const totalChecks = this.metrics.business.compliance.checksPerformed;
          this.metrics.business.compliance.passRate =
            (this.metrics.business.compliance.passRate * (totalChecks - 1) +
             (metadata.passed ? 1 : 0)) / totalChecks * 100;
        }
      } else if (category === 'duplicate-check') {
        this.metrics.business.duplicates.checksPerformed++;

        if (metadata.executionTime) {
          const current = this.metrics.business.duplicates.averageTime;
          const count = this.metrics.business.duplicates.checksPerformed;
          this.metrics.business.duplicates.averageTime =
            (current * (count - 1) + metadata.executionTime) / count;
        }

        if (typeof metadata.found === 'boolean') {
          const totalChecks = this.metrics.business.duplicates.checksPerformed;
          this.metrics.business.duplicates.foundRate =
            (this.metrics.business.duplicates.foundRate * (totalChecks - 1) +
             (metadata.found ? 1 : 0)) / totalChecks * 100;
        }
      }

      this.emit('business-metric', {
        category,
        action,
        metadata,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error tracking business metric:', error);
    }
  }

  /**
   * Check system thresholds and generate alerts
   */
  checkSystemThresholds() {
    const memory = this.metrics.system.memory;
    const memoryUsage = parseFloat(memory.usagePercentage) / 100;

    // Memory usage check
    if (memoryUsage > this.thresholds.memoryUsage.critical) {
      this.generateAlert('system', 'critical', `Critical memory usage: ${memory.usagePercentage}%`, {
        memoryUsage: memory.usagePercentage,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal
      });
    } else if (memoryUsage > this.thresholds.memoryUsage.warn) {
      this.generateAlert('system', 'warning', `High memory usage: ${memory.usagePercentage}%`, {
        memoryUsage: memory.usagePercentage
      });
    }

    // CPU load check (using 1-minute load average)
    const load1 = this.metrics.system.cpu.load[0];
    const cores = this.metrics.system.cpu.cores;
    const cpuUsage = load1 / cores;

    if (cpuUsage > this.thresholds.cpuUsage.critical) {
      this.generateAlert('system', 'critical', `Critical CPU usage: ${(cpuUsage * 100).toFixed(2)}%`, {
        load: load1,
        cores,
        usage: cpuUsage
      });
    } else if (cpuUsage > this.thresholds.cpuUsage.warn) {
      this.generateAlert('system', 'warning', `High CPU usage: ${(cpuUsage * 100).toFixed(2)}%`, {
        load: load1,
        cores,
        usage: cpuUsage
      });
    }
  }

  /**
   * Check response time threshold
   */
  checkResponseTimeThreshold(route, responseTime) {
    if (responseTime > this.thresholds.responseTime.critical) {
      this.generateAlert('performance', 'critical', `Very slow response: ${route} took ${responseTime}ms`, {
        route,
        responseTime,
        threshold: this.thresholds.responseTime.critical
      });
    } else if (responseTime > this.thresholds.responseTime.warn) {
      this.generateAlert('performance', 'warning', `Slow response: ${route} took ${responseTime}ms`, {
        route,
        responseTime,
        threshold: this.thresholds.responseTime.warn
      });
    }
  }

  /**
   * Generate alert with cooldown to prevent spam
   */
  generateAlert(category, severity, message, metadata = {}) {
    const alertKey = `${category}:${severity}:${message}`;
    const now = Date.now();

    // Check cooldown (5 minutes)
    const cooldownPeriod = 5 * 60 * 1000;
    const lastAlert = this.alertCooldown.get(alertKey);

    if (lastAlert && (now - lastAlert) < cooldownPeriod) {
      return; // Skip alert due to cooldown
    }

    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      severity,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.alerts.push(alert);
    this.alertCooldown.set(alertKey, now);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    console.warn(`🚨 ALERT [${severity.toUpperCase()}] ${category}: ${message}`);

    // Emit alert event
    this.emit('alert', alert);

    return alert;
  }

  /**
   * Extract route pattern from URL path
   */
  extractRoute(path) {
    if (!path) return 'unknown';

    // Replace IDs with placeholders
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[A-Z0-9]{10,}/g, '/:token');
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    // Calculate derived metrics
    const totalRequests = this.metrics.requests.total;
    const errorRate = totalRequests > 0 ?
      (this.metrics.requests.errors / totalRequests * 100).toFixed(2) : 0;

    const avgResponseTime = this.metrics.requests.responseTimes.length > 0 ?
      this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.requests.responseTimes.length : 0;

    return {
      ...this.metrics,
      derived: {
        errorRate: parseFloat(errorRate),
        averageResponseTime: Math.round(avgResponseTime),
        requestsPerMinute: this.calculateRequestsPerMinute(),
        healthScore: this.calculateHealthScore()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate requests per minute
   */
  calculateRequestsPerMinute() {
    // This is a simplified calculation
    // In a real implementation, you'd track requests over time windows
    const uptimeMinutes = this.metrics.system.uptime / 60;
    return uptimeMinutes > 0 ? Math.round(this.metrics.requests.total / uptimeMinutes) : 0;
  }

  /**
   * Calculate overall health score (0-100)
   */
  calculateHealthScore() {
    let score = 100;

    // Deduct points for high error rate
    const errorRate = this.metrics.requests.total > 0 ?
      this.metrics.requests.errors / this.metrics.requests.total : 0;
    score -= errorRate * 100;

    // Deduct points for slow responses
    const avgResponseTime = this.metrics.requests.responseTimes.length > 0 ?
      this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.requests.responseTimes.length : 0;
    if (avgResponseTime > this.thresholds.responseTime.warn) {
      score -= 20;
    }
    if (avgResponseTime > this.thresholds.responseTime.critical) {
      score -= 30;
    }

    // Deduct points for high resource usage
    const memoryUsage = parseFloat(this.metrics.system.memory.usagePercentage) / 100;
    if (memoryUsage > this.thresholds.memoryUsage.warn) {
      score -= 15;
    }
    if (memoryUsage > this.thresholds.memoryUsage.critical) {
      score -= 25;
    }

    // Deduct points for database issues
    const dbErrorRate = this.metrics.database.queries.total > 0 ?
      this.metrics.database.queries.failed / this.metrics.database.queries.total : 0;
    score -= dbErrorRate * 50;

    return Math.max(0, Math.round(score));
  }

  /**
   * Get active alerts
   */
  getAlerts(unacknowledgedOnly = false) {
    if (unacknowledgedOnly) {
      return this.alerts.filter(alert => !alert.acknowledged);
    }
    return [...this.alerts];
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get performance summary for dashboard
   */
  getSummary() {
    const metrics = this.getMetrics();
    const alerts = this.getAlerts(true); // Unacknowledged only

    return {
      health: {
        score: metrics.derived.healthScore,
        status: this.getHealthStatus(metrics.derived.healthScore)
      },
      performance: {
        averageResponseTime: metrics.derived.averageResponseTime,
        requestsPerMinute: metrics.derived.requestsPerMinute,
        errorRate: metrics.derived.errorRate
      },
      system: {
        memoryUsage: metrics.system.memory.usagePercentage,
        cpuLoad: metrics.system.cpu.load[0],
        uptime: Math.round(metrics.system.uptime / 3600) // Hours
      },
      business: {
        totalRequests: metrics.business.partnerRequests.created,
        approvalRate: this.calculateApprovalRate(),
        compliancePassRate: metrics.business.compliance.passRate
      },
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get health status based on score
   */
  getHealthStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'critical';
  }

  /**
   * Calculate approval rate
   */
  calculateApprovalRate() {
    const { approved, rejected } = this.metrics.business.partnerRequests;
    const total = approved + rejected;
    return total > 0 ? (approved / total * 100).toFixed(2) : 0;
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.requests = {
      total: 0,
      byStatus: {},
      byRoute: {},
      responseTimes: [],
      errors: 0
    };

    this.metrics.database.queries = {
      total: 0,
      slow: 0,
      failed: 0,
      averageTime: 0,
      times: []
    };

    this.metrics.cache = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      operations: 0
    };

    console.log('📊 Performance metrics reset');
  }

  /**
   * Create Express middleware for automatic request tracking
   */
  createMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Track the response when it finishes
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.trackRequest(req, res, responseTime);
      });

      next();
    };
  }

  /**
   * Export metrics for external monitoring systems (Prometheus format)
   */
  exportPrometheusMetrics() {
    const metrics = this.getMetrics();
    let output = '';

    // HTTP metrics
    output += `# HELP mdm_http_requests_total Total number of HTTP requests\n`;
    output += `# TYPE mdm_http_requests_total counter\n`;
    output += `mdm_http_requests_total ${metrics.requests.total}\n\n`;

    output += `# HELP mdm_http_request_duration_seconds HTTP request duration in seconds\n`;
    output += `# TYPE mdm_http_request_duration_seconds histogram\n`;
    if (metrics.derived.averageResponseTime > 0) {
      output += `mdm_http_request_duration_seconds_sum ${metrics.derived.averageResponseTime / 1000}\n`;
      output += `mdm_http_request_duration_seconds_count ${metrics.requests.total}\n`;
    }

    // Database metrics
    output += `# HELP mdm_database_queries_total Total number of database queries\n`;
    output += `# TYPE mdm_database_queries_total counter\n`;
    output += `mdm_database_queries_total ${metrics.database.queries.total}\n\n`;

    output += `# HELP mdm_database_query_duration_seconds Database query duration in seconds\n`;
    output += `# TYPE mdm_database_query_duration_seconds histogram\n`;
    output += `mdm_database_query_duration_seconds_sum ${metrics.database.queries.averageTime / 1000}\n`;
    output += `mdm_database_query_duration_seconds_count ${metrics.database.queries.total}\n\n`;

    // System metrics
    output += `# HELP mdm_memory_usage_percent Memory usage percentage\n`;
    output += `# TYPE mdm_memory_usage_percent gauge\n`;
    output += `mdm_memory_usage_percent ${metrics.system.memory.usagePercentage}\n\n`;

    output += `# HELP mdm_cpu_load_average CPU load average\n`;
    output += `# TYPE mdm_cpu_load_average gauge\n`;
    output += `mdm_cpu_load_average ${metrics.system.cpu.load[0]}\n\n`;

    // Health score
    output += `# HELP mdm_health_score Overall health score (0-100)\n`;
    output += `# TYPE mdm_health_score gauge\n`;
    output += `mdm_health_score ${metrics.derived.healthScore}\n\n`;

    return output;
  }
}

// Export singleton instance
module.exports = new PerformanceMonitor();