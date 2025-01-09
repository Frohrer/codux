const { EventEmitter } = require("events");

class PortDetector extends EventEmitter {
	constructor(job, box) {
		super();
		this.job = job; // The actual WebEnabledJob instance
		this.box = box;
		this.initialPorts = new Set();
		this.detectedPorts = new Set();
		this.isMonitoring = false;
	}

	async listListeningPorts() {
		// Now we can just call `this.job.safe_call(...)`
		const result = await this.job.safe_call(
			this.box,
			"netstat",
			["-tunlp"],
			5000, // Short timeout
			5000, // Short CPU time
			128 * 1024 * 1024, // 128 MB memory limit
			null
		);

		if (result.code !== 0) {
			return [];
		}

		const ports = [];
		const lines = result.stdout.split("\n");
		for (const line of lines) {
			if (line.includes("LISTEN")) {
				// Example parse: "tcp 0 0 0.0.0.0:8501 0.0.0.0:* LISTEN 123/python"
				const match = line.match(/0\.0\.0\.0:(\d+)/);
				if (match) {
					const port = parseInt(match[1], 10);
					if (!isNaN(port)) {
						ports.push(port);
					}
				}
			}
		}
		return ports;
	}

	async detectNewPort(timeoutMs = 30000) {
		const startTime = Date.now();
		const pollInterval = 1000; // Poll every second

		// Get initial state of ports
		this.initialPorts = new Set(await this.listListeningPorts());

		while (Date.now() - startTime < timeoutMs) {
			await new Promise((resolve) => setTimeout(resolve, pollInterval));

			const currentPorts = await this.listListeningPorts();

			// Look for new ports that weren't in the initial set
			for (const port of currentPorts) {
				if (!this.initialPorts.has(port) && !this.detectedPorts.has(port)) {
					this.detectedPorts.add(port);
					this.emit("port-opened", port);
					return port;
				}
			}
		}

		throw new Error("Timeout waiting for port to open");
	}

	async cleanup() {
		this.initialPorts.clear();
		this.detectedPorts.clear();
		this.isMonitoring = false;
	}
}

module.exports = PortDetector;
