const events = require('events');
const os = require('os');
const { runningProcesses } = require('./web-enabled-job');
const logger = require('logplease').create('monitoring');

class ExecutionHistory {
    constructor() {
        this.history = new Map(); // UUID -> execution record
        this.MAX_HISTORY_SIZE = 1000; // Keep last 1000 executions
    }

    addExecution(jobId, record) {
        if (this.history.size >= this.MAX_HISTORY_SIZE) {
            // Remove oldest entry
            const firstKey = this.history.keys().next().value;
            this.history.delete(firstKey);
        }
        this.history.set(jobId, {
            ...record,
            timestamp: new Date(),
        });
    }

    getExecutionHistory(limit = 50) {
        const entries = Array.from(this.history.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, limit)
            .map(([id, record]) => ({
                id,
                ...record
            }));
        return entries;
    }

    getExecution(jobId) {
        return this.history.get(jobId);
    }
}

class ResourceMonitor {
    constructor() {
        this.metrics = new Map(); // UUID -> resource metrics
        this.updateInterval = 5000; // Update every 5 seconds
        this.monitoring = false;
    }

    startMonitoring() {
        if (!this.monitoring) {
            this.monitoring = true;
            this.monitorInterval = setInterval(() => this.updateMetrics(), this.updateInterval);
        }
    }

    stopMonitoring() {
        if (this.monitoring) {
            clearInterval(this.monitorInterval);
            this.monitoring = false;
        }
    }

    async updateMetrics() {
        for (const [uuid, job] of runningProcesses.entries()) {
            try {
                const processMetrics = await this.getProcessMetrics(job);
                this.metrics.set(uuid, {
                    ...processMetrics,
                    timestamp: new Date()
                });
            } catch (error) {
                logger.error(`Error updating metrics for job ${uuid}:`, error);
            }
        }
    }

    async getProcessMetrics(job) {
        const processInfo = job.process ? process._getActiveHandles().find(handle => handle.pid === job.process.pid) : null;
        
        return {
            memoryUsage: processInfo ? process.memoryUsage() : null,
            cpuUsage: processInfo ? process.cpuUsage() : null,
            status: job.status || 'running',
            runtime: {
                language: job.runtime.language,
                version: job.runtime.version.raw
            },
            resourceLimits: {
                memory: job.memory_limits,
                cpu: job.cpu_times
            }
        };
    }

    getCurrentMetrics() {
        const systemMetrics = {
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuLoad: os.loadavg(),
            uptime: os.uptime()
        };

        const processMetrics = Array.from(this.metrics.entries()).map(([id, metrics]) => ({
            id,
            ...metrics
        }));

        return {
            system: systemMetrics,
            processes: processMetrics
        };
    }

    getProcessMetrics(jobId) {
        return this.metrics.get(jobId);
    }
}

// Create singleton instances
const executionHistory = new ExecutionHistory();
const resourceMonitor = new ResourceMonitor();

// Start monitoring on module load
resourceMonitor.startMonitoring();

// Additional router endpoints
function setupMonitoringRoutes(router) {
    // Get execution history
    router.get('/history', (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const history = executionHistory.getExecutionHistory(limit);
        res.status(200).json(history);
    });

    // Get specific execution details
    router.get('/history/:id', (req, res) => {
        const execution = executionHistory.getExecution(req.params.id);
        if (!execution) {
            return res.status(404).json({ message: 'Execution not found' });
        }
        res.status(200).json(execution);
    });

    // Get current resource usage
    router.get('/metrics', (req, res) => {
        const metrics = resourceMonitor.getCurrentMetrics();
        res.status(200).json(metrics);
    });

    // Get specific process metrics
    router.get('/metrics/:id', (req, res) => {
        const metrics = resourceMonitor.getProcessMetrics(req.params.id);
        if (!metrics) {
            return res.status(404).json({ message: 'Process metrics not found' });
        }
        res.status(200).json(metrics);
    });
}

// Middleware to track execution history
function trackExecution(job, result) {
    const record = {
        language: job.runtime.language,
        version: job.runtime.version.raw,
        status: result.status || 'completed',
        duration: result.duration,
        stages: result.stages,
        webAppUrl: job.proxyPath || null,
        resourceUsage: resourceMonitor.getProcessMetrics(job.uuid)
    };
    
    executionHistory.addExecution(job.uuid, record);
}

module.exports = {
    setupMonitoringRoutes,
    trackExecution,
    executionHistory,
    resourceMonitor
};