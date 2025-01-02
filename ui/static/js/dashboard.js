class Dashboard {
    constructor() {
        this.charts = new DashboardCharts();
        this.refreshInterval = 5000; // 5 seconds
        this.currentPage = 1;
        this.pageSize = 10;
        this.sortField = 'timestamp';
        this.sortOrder = 'desc';
        this.init();
    }

    init() {
        this.startAutoRefresh();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Sort headers
        document.querySelectorAll('.sort-header').forEach(header => {
            header.addEventListener('click', async (e) => {
                e.preventDefault();
                const field = header.dataset.field;

                // Toggle sort order if clicking the same field
                if (this.sortField === field) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortField = field;
                    this.sortOrder = 'desc';
                }

                // Reset to first page when sorting changes
                this.currentPage = 1;
                await this.refreshData();
            });
        });

        // Pagination clicks
        document.getElementById('historyPagination').addEventListener('click', async (e) => {
            e.preventDefault();
            const link = e.target.closest('.page-link');
            if (!link || link.parentElement.classList.contains('disabled')) return;

            const page = parseInt(link.dataset.page);
            if (!isNaN(page)) {
                this.currentPage = page;
                await this.refreshData();
            }
        });

        // Process actions
        document.addEventListener('click', async (e) => {
            const terminateBtn = e.target.closest('.btn-terminate');
            if (terminateBtn) {
                const id = terminateBtn.dataset.id;
                if (confirm(`Are you sure you want to terminate process ${id}?`)) {
                    await this.terminateProcess(id);
                }
            }

            const detailsBtn = e.target.closest('.btn-details');
            if (detailsBtn) {
                await this.showExecutionDetails(detailsBtn.dataset.id);
            }
        });
    }

    async refreshData() {
        try {
            const [metrics, historyData] = await Promise.all([
                this.fetchWithErrorHandling('/api/metrics'),
                this.fetchWithErrorHandling(
                    `/api/history?page=${this.currentPage}&limit=${this.pageSize}&sort_by=${this.sortField}&order=${this.sortOrder}`
                )
            ]);

            this.hideApiError();
            this.updateSystemMetrics(metrics);
            this.updateProcessTable(metrics.processes || []);
            this.updateHistoryTable(historyData);
            this.charts.updateCharts(metrics);
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showApiError(error.message || 'Failed to fetch monitoring data');
        }
    }

    updateHistoryTable(data) {
        const tbody = document.getElementById('historyTable');
        const pagination = document.getElementById('historyPagination');
        if (!tbody || !pagination) return;

        // Update table content
        if (!data.items || !data.items.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No execution history available</td></tr>';
            pagination.innerHTML = '';
            return;
        }

        // Update table rows
        tbody.innerHTML = data.items.map(entry => `
            <tr>
                <td>${entry.id || 'N/A'}</td>
                <td>${entry.language || 'N/A'} ${entry.version || ''}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(entry.status)}">
                        ${entry.status || 'unknown'}
                    </span>
                </td>
                <td>${new Date(entry.timestamp).toLocaleString()}</td>
                <td>
                    <button class="btn btn-info btn-sm btn-details" data-id="${entry.id}">
                        <i class="fas fa-chart-line me-2"></i>
                        Details
                    </button>
                </td>
            </tr>
        `).join('');

        // Update sort indicators
        document.querySelectorAll('.sort-header').forEach(header => {
            const icon = header.querySelector('.fas');
            if (header.dataset.field === this.sortField) {
                icon.className = `fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'}`;
                header.classList.add('active');
            } else {
                icon.className = 'fas fa-sort';
                header.classList.remove('active');
            }
        });

        // Simple pagination
        if (data.pages > 1) {
            pagination.innerHTML = `
                <li class="page-item ${data.page <= 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.page - 1}">Previous</a>
                </li>
                <li class="page-item disabled">
                    <span class="page-link">Page ${data.page} of ${data.pages}</span>
                </li>
                <li class="page-item ${data.page >= data.pages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.page + 1}">Next</a>
                </li>
            `;
        } else {
            pagination.innerHTML = '';
        }
    }

    async fetchWithErrorHandling(url) {
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }

    showApiError(message) {
        let errorDiv = document.getElementById('apiError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'apiError';
            errorDiv.className = 'alert alert-danger alert-dismissible fade show';
            errorDiv.innerHTML = `
                <strong>Error:</strong> <span></span>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.querySelector('.container-fluid').prepend(errorDiv);
        }
        errorDiv.querySelector('span').textContent = message;
        errorDiv.style.display = 'block';
    }

    hideApiError() {
        const errorDiv = document.getElementById('apiError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    async terminateProcess(id) {
        try {
            const response = await fetch(`/api/process/${id}`, { method: 'DELETE' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to terminate process');
            }

            await this.refreshData();
        } catch (error) {
            console.error('Error terminating process:', error);
            this.showApiError(error.message || 'Failed to terminate process');
        }
    }

    updateSystemMetrics(metrics) {
        if (!metrics?.system) {
            console.warn('Invalid metrics data:', metrics);
            return;
        }

        const system = metrics.system;

        // Update system metrics displays safely
        this.updateElementText('systemUptime', this.formatUptime(system.uptime));
        this.updateElementText('activeProcesses', (metrics.processes || []).length);
        this.updateElementText('memoryUsage', this.formatBytes(system.totalMemory - system.freeMemory));

        // Update CPU load averages
        const cpuLoads = system.cpuLoad || [0, 0, 0];
        this.updateElementText('cpuLoad', `
            <div class="d-flex justify-content-between">
                <span>1m: ${cpuLoads[0]?.toFixed(2) || '0.00'}</span>
                <span>5m: ${cpuLoads[1]?.toFixed(2) || '0.00'}</span>
                <span>15m: ${cpuLoads[2]?.toFixed(2) || '0.00'}</span>
            </div>
        `);
    }

    updateElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = text;
        }
    }

    updateProcessTable(processes) {
        const tbody = document.getElementById('processTable');
        if (!tbody) return;

        tbody.innerHTML = processes.length ? '' : '<tr><td colspan="5" class="text-center">No active processes</td></tr>';

        processes.forEach(process => {
            if (!process) return;

            const row = `
                <tr>
                    <td>${process.id || 'N/A'}</td>
                    <td>${process.runtime?.language || 'N/A'} ${process.runtime?.version || ''}</td>
                    <td><span class="badge bg-${this.getStatusColor(process.status)}">${process.status || 'unknown'}</span></td>
                    <td>${this.formatProcessMetrics(process)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-danger btn-terminate" data-id="${process.id}">
                                <i class="fas fa-stop me-2"></i>
                                Stop
                            </button>
                            <button class="btn btn-info btn-details" data-id="${process.id}">
                                <i class="fas fa-chart-line me-2"></i>
                                Metrics
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    formatProcessMetrics(process) {
        if (!process?.memoryUsage) return 'N/A';

        return `
            <div class="d-flex flex-column">
                <small>RSS: ${this.formatBytes(process.memoryUsage.rss)}</small>
                <small>Heap: ${this.formatBytes(process.memoryUsage.heapUsed)}/${this.formatBytes(process.memoryUsage.heapTotal)}</small>
            </div>
        `;
    }

    startAutoRefresh() {
        this.refreshData();
        setInterval(() => this.refreshData(), this.refreshInterval);
    }


    async showExecutionDetails(id) {
        const modal = new bootstrap.Modal(document.getElementById('executionModal'));

        try {
            // Fetch both execution details and timing information in parallel
            const [details, timing] = await Promise.all([
                this.fetchWithErrorHandling(`/api/history/${id}`),
                this.fetchWithErrorHandling(`/api/process/${id}/timing`)
            ]);

            // Update modal content
            document.getElementById('executionOutput').textContent =
                details.stages?.execute?.stdout || 'No output';
            document.getElementById('executionError').textContent =
                details.stages?.execute?.stderr || 'No errors';

            // Format timing metrics
            const formattedMetrics = {
                'Execution Summary': {
                    'Total Duration': `${timing.totalDuration}ms`,
                    'Start Time': new Date(timing.startTime).toLocaleString(),
                    'End Time': new Date(timing.endTime).toLocaleString()
                }
            };

            // Add stage-specific timing information
            timing.stages?.forEach(stage => {
                formattedMetrics[`${stage.name} Stage`] = {
                    'Duration': `${stage.duration}ms`,
                    'CPU Time': `${stage.cpuTime}ms`,
                    'Wall Time': `${stage.wallTime}ms`,
                    'Memory': this.formatBytes(stage.memory)
                };
            });

            // Add overall metrics
            if (timing.metrics) {
                formattedMetrics['Overall Metrics'] = {
                    'CPU Time': `${timing.metrics.cpuTime}ms`,
                    'Wall Time': `${timing.metrics.wallTime}ms`,
                    'Memory': this.formatBytes(timing.metrics.memory)
                };
            }

            const metricsHtml = Object.entries(formattedMetrics)
                .map(([category, values]) => `
                    <div class="mb-3">
                        <h6>${category}</h6>
                        <dl class="row mb-0">
                            ${Object.entries(values)
                                .map(([key, value]) => `
                                    <dt class="col-sm-4">${key}:</dt>
                                    <dd class="col-sm-8">${value}</dd>
                                `)
                                .join('')}
                        </dl>
                    </div>
                `)
                .join('');

            document.getElementById('executionMetrics').innerHTML = metricsHtml;
            modal.show();
        } catch (error) {
            console.error('Error fetching execution details:', error);
            this.showApiError('Failed to fetch execution details. Please try again.');
        }
    }

    getStatusColor(status) {
        const colors = {
            'running': 'primary',
            'completed': 'success',
            'failed': 'danger',
            'terminated': 'warning'
        };
        return colors[status] || 'secondary';
    }

    formatBytes(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }

        return `${value.toFixed(2)} ${units[unitIndex]}`;
    }

    formatUptime(seconds) {
        if (!seconds) return '0d 0h 0m';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        return `${days}d ${hours}h ${minutes}m`;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});