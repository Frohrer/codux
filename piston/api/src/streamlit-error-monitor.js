const EventEmitter = require("events");
const { processOutputManager } = require("./process-output-manager");

class StreamlitErrorMonitor {
	constructor(job) {
		this.job = job;
		this.errorBuffer = "";
		this.hasStarted = false;
		this.errorPatterns = [/Exception: (.*)/i, /Error: (.*)/i, /Traceback \(most recent call last\):/, /RuntimeError: (.*)/i, /ImportError: (.*)/i, /ModuleNotFoundError: (.*)/i];
	}

	monitorStreamlitOutput(eventBus) {
		return new Promise((resolve, reject) => {
			let startupTimeout;
			let errorTimeout;

			const checkForErrors = (data) => {
				const chunk = data.toString();
				this.errorBuffer += chunk;

				// Store output in ProcessOutputManager
				processOutputManager.addOutput(this.job.uuid, "stdout", chunk);

				// Check for startup success
				if (!this.hasStarted && (chunk.includes("You can now view your Streamlit app in your browser") || chunk.includes("Network URL: http"))) {
					this.hasStarted = true;
					clearTimeout(startupTimeout);
					resolve({ status: "started" });
				}

				// Check for errors and emit them as events
				for (const pattern of this.errorPatterns) {
					if (pattern.test(this.errorBuffer)) {
						const error = this.parseError(this.errorBuffer);
						// Emit error event instead of just rejecting
						eventBus.emit("streamlit-error", {
							type: "error",
							message: error,
							timestamp: new Date().toISOString(),
						});
						// Clear the error buffer after emitting
						this.errorBuffer = "";
					}
				}
			};

			// Set timeout for initial startup
			startupTimeout = setTimeout(() => {
				reject(new Error("Timeout: Streamlit failed to start within 30 seconds"));
			}, 30000);

			// Continue monitoring for errors after startup
			errorTimeout = setTimeout(() => {
				if (!this.hasStarted) {
					reject(new Error("Timeout: No Streamlit activity detected"));
				}
			}, 45000);

			eventBus.on("stdout", (data) => {
				checkForErrors(data);
				processOutputManager.addOutput(this.job.uuid, "stdout", data);
			});

			eventBus.on("stderr", (data) => {
				checkForErrors(data);
				processOutputManager.addOutput(this.job.uuid, "stderr", data);
			});

			// Handle process exit
			eventBus.on("exit", (stage, info) => {
				if (info.code !== 0) {
					reject(new Error(`Process exited with code ${info.code}: ${this.errorBuffer}`));
				}
			});
		});
	}

	parseError(buffer) {
		const lines = buffer.split("\n");
		let errorMessage = "";
		let inTraceback = false;

		for (const line of lines) {
			if (line.includes("Traceback (most recent call last)")) {
				inTraceback = true;
				errorMessage = "Python Error: ";
				continue;
			}
			if (inTraceback) {
				if (line.match(/^\s*File/)) continue;
				if (line.trim().length > 0) {
					errorMessage += line.trim() + " ";
				}
			}
		}

		return errorMessage.trim() || buffer;
	}
}

module.exports = StreamlitErrorMonitor;
