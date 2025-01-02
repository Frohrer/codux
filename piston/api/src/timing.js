class JobTimer {
    constructor() {
        this.timings = new Map();
    }

    startTiming(jobId) {
        const timing = {
            startTime: Date.now(),
            stages: {},
            currentStage: null,
            metrics: {
                cpuTime: 0,
                wallTime: 0,
                memory: 0
            }
        };
        this.timings.set(jobId, timing);
        return timing;
    }

    startStage(jobId, stageName) {
        const timing = this.timings.get(jobId);
        if (!timing) return;

        // End previous stage if exists
        if (timing.currentStage) {
            this.endStage(jobId);
        }

        timing.currentStage = stageName;
        timing.stages[stageName] = {
            startTime: Date.now(),
            endTime: null,
            duration: null,
            cpuTime: 0,
            wallTime: 0,
            memory: 0
        };
    }

    endStage(jobId) {
        const timing = this.timings.get(jobId);
        if (!timing || !timing.currentStage) return;

        const stage = timing.stages[timing.currentStage];
        stage.endTime = Date.now();
        stage.duration = stage.endTime - stage.startTime;
        timing.currentStage = null;
    }

    updateMetrics(jobId, metrics) {
        const timing = this.timings.get(jobId);
        if (!timing) return;

        // Update overall metrics
        timing.metrics.cpuTime += metrics.cpuTime || 0;
        timing.metrics.wallTime += metrics.wallTime || 0;
        timing.metrics.memory = Math.max(timing.metrics.memory, metrics.memory || 0);

        // Update stage metrics if in a stage
        if (timing.currentStage) {
            const stage = timing.stages[timing.currentStage];
            stage.cpuTime += metrics.cpuTime || 0;
            stage.wallTime += metrics.wallTime || 0;
            stage.memory = Math.max(stage.memory, metrics.memory || 0);
        }
    }

    endTiming(jobId) {
        const timing = this.timings.get(jobId);
        if (!timing) return;

        // End current stage if exists
        if (timing.currentStage) {
            this.endStage(jobId);
        }

        timing.endTime = Date.now();
        timing.totalDuration = timing.endTime - timing.startTime;

        return {
            jobId,
            startTime: new Date(timing.startTime).toISOString(),
            endTime: new Date(timing.endTime).toISOString(),
            totalDuration: timing.totalDuration,
            stages: timing.stages,
            metrics: timing.metrics
        };
    }

    getTimingReport(jobId) {
        const timing = this.timings.get(jobId);
        if (!timing) return null;

        return {
            jobId,
            startTime: new Date(timing.startTime).toISOString(),
            currentStage: timing.currentStage,
            stages: Object.entries(timing.stages).map(([name, stage]) => ({
                name,
                startTime: new Date(stage.startTime).toISOString(),
                endTime: stage.endTime ? new Date(stage.endTime).toISOString() : null,
                duration: stage.duration,
                cpuTime: stage.cpuTime,
                wallTime: stage.wallTime,
                memory: stage.memory
            })),
            metrics: timing.metrics,
            totalDuration: timing.endTime ? (timing.endTime - timing.startTime) : (Date.now() - timing.startTime)
        };
    }

    cleanup(jobId) {
        this.timings.delete(jobId);
    }
}

// Create singleton instance
const jobTimer = new JobTimer();

module.exports = { jobTimer };