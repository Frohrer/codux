class DashboardCharts {
    constructor() {
        this.memoryChart = null;
        this.cpuChart = null;
        this.initCharts();
    }

    initCharts() {
        // Memory usage chart
        const memoryCtx = document.getElementById('memoryChart').getContext('2d');
        this.memoryChart = new Chart(memoryCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Memory Usage',
                    data: [],
                    borderColor: '#0dcaf0',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(13, 202, 240, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Memory Usage (MB)'
                        }
                    }
                }
            }
        });

        // CPU load chart
        const cpuCtx = document.getElementById('cpuChart').getContext('2d');
        this.cpuChart = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU Load Average',
                    data: [],
                    borderColor: '#198754',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(25, 135, 84, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'CPU Load'
                        }
                    }
                }
            }
        });
    }

    updateCharts(metrics) {
        const timestamp = new Date().toLocaleTimeString();

        // Update memory chart
        this.memoryChart.data.labels.push(timestamp);
        this.memoryChart.data.datasets[0].data.push(
            (metrics.system.totalMemory - metrics.system.freeMemory) / (1024 * 1024)
        );

        // Keep last 10 data points
        if (this.memoryChart.data.labels.length > 10) {
            this.memoryChart.data.labels.shift();
            this.memoryChart.data.datasets[0].data.shift();
        }

        // Update CPU chart
        this.cpuChart.data.labels.push(timestamp);
        this.cpuChart.data.datasets[0].data.push(metrics.system.cpuLoad[0]);

        if (this.cpuChart.data.labels.length > 10) {
            this.cpuChart.data.labels.shift();
            this.cpuChart.data.datasets[0].data.shift();
        }

        this.memoryChart.update();
        this.cpuChart.update();
    }
}
