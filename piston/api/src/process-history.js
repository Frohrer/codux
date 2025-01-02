class ProcessHistory {
    constructor() {
        this.history = new Map(); // UUID -> process record
        this.MAX_HISTORY_SIZE = 1000; // Keep last 1000 processes
    }

    addProcess(processId, record) {
        if (this.history.size >= this.MAX_HISTORY_SIZE) {
            // Remove oldest entry when we hit the limit
            const oldestKey = Array.from(this.history.keys())[0];
            this.history.delete(oldestKey);
        }
        
        this.history.set(processId, {
            ...record,
            completedAt: new Date()
        });
    }

    getProcess(processId) {
        return this.history.get(processId);
    }

    getHistory(limit = 50) {
        return Array.from(this.history.entries())
            .sort((a, b) => b[1].completedAt - a[1].completedAt)
            .slice(0, limit)
            .map(([id, record]) => ({
                id,
                ...record
            }));
    }
}

// Create singleton instance
const processHistory = new ProcessHistory();

module.exports = { processHistory };