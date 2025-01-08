const { Job } = require("./job");
const fs = require("fs/promises");
const path = require("path");
const { jobTimer } = require("./timing");
const { processHistory } = require("./process-history");
const EventEmitter = require("events");
const PortDetector = require("./port-detector");
const ProxyManager = require("./proxy-handler");
const proxyManager = new ProxyManager();

const runningProcesses = new Map();

class WebEnabledJob extends Job {
	constructor(options) {
		super({
			runtime: options.runtime,
			files: options.files,
			args: options.args,
			stdin: options.stdin,
			timeouts: options.timeouts,
			cpu_times: options.cpu_times,
			memory_limits: options.memory_limits,
			dependencies: options.dependencies,
			long_running: options.long_running,
		});

		this.proxies = new Map();
		this.portDetector = null;
		this.processPromise = null;
		this.additionalEnvVars = {};

		jobTimer.startTiming(this.uuid);

		if (this.long_running) {
			runningProcesses.set(this.uuid, this);
		}
	}

	async installDependencies(box, event_bus = null) {
		if (!this.dependencies || this.dependencies.length === 0) {
			this.logger.debug("No dependencies to install");
			return { code: 0, status: "success" };
		}

		const packageInstallCommands = {
			python: (dependencies) => ["install", "--target=/box/submission", ...dependencies],
			streamlit: (dependencies) => ["install", "--target=/box/submission", ...dependencies],
			javascript: (dependencies) => ["install", "--prefix", "/box/submission", ...dependencies],
		};

		const installCommandArgs = packageInstallCommands[this.runtime.language];

		if (!installCommandArgs) {
			throw new Error(`Package installation not implemented for language ${this.runtime.language}`);
		}

		const args = installCommandArgs(this.dependencies);

		this.logger.info(`Running install command: packagemanager ${args.join(" ")}`);

		const installResult = await this.safe_call(box, "packagemanager", args, this.timeouts.run, this.cpu_times.run, this.memory_limits.run, event_bus);

		if (installResult.code !== 0) {
			this.logger.error(`Failed to install dependencies:`);
			this.logger.error(`stdout: ${installResult.stdout}`);
			this.logger.error(`stderr: ${installResult.stderr}`);
			this.logger.error(`message: ${installResult.message}`);
			if (event_bus) {
				event_bus.emit("exit", "install", {
					error: installResult.error,
					code: installResult.code,
					signal: installResult.signal,
				});
			}
			return installResult;
		}

		this.logger.debug("Dependencies installed successfully");
	}

	async setupProxyForPort(port) {
		if (this.proxies.has(port)) return this.proxies.get(port);

		const proxyInfo = proxyManager.createProxy(this.uuid);
		proxyInfo.port = port; // Use the actual detected port
		this.proxies.set(port, proxyInfo);

		this.logger.debug(`Created proxy for port ${port} -> ${proxyInfo.path}`);
		return proxyInfo;
	}

	async execute(box, event_bus = null) {
		this.logger.debug(`Executing with runtime language: ${this.runtime.language}`);
		jobTimer.startStage(this.uuid, "execute");
		const localEventBus = event_bus || new EventEmitter();

		try {
			const combinedEnv = {
				...this.runtime.env_vars,
				...this.additionalEnvVars,
			};

			// Start port detection
			this.portDetector = new PortDetector(box);

			// Start the process
			this.processPromise = super.execute(box, localEventBus);

			// Monitor for port opening
			let portResult = null;
			try {
				const port = await this.portDetector.detectNewPort();
				const proxyInfo = await this.setupProxyForPort(port);
				portResult = {
					port,
					proxyUrl: proxyManager.getBaseUrl() + proxyInfo.path,
				};
			} catch (error) {
				this.logger.debug(`No ports were opened: ${error.message}`);
			}

			// Wait for process completion or keep running for long-running jobs
			const result = await this.processPromise;

			// Update metrics
			if (result.run) {
				jobTimer.updateMetrics(this.uuid, {
					cpuTime: result.run.cpu_time,
					wallTime: result.run.wall_time,
					memory: result.run.memory,
				});

				// Add proxy information if a port was detected
				if (portResult) {
					result.run.webAppUrl = portResult.proxyUrl;
					result.run.port = portResult.port;
				}
			}

			// Add to process history
			processHistory.addProcess(this.uuid, {
				language: this.runtime.language,
				version: this.runtime.version.raw,
				startTime: new Date(this.startTime),
				status: result.run?.code === 0 ? "completed" : "failed",
				timing: jobTimer.getTimingReport(this.uuid),
				result: result,
			});

			return result;
		} catch (error) {
			// Clean up any proxies if execution failed
			for (const [port, proxyInfo] of this.proxies.entries()) {
				proxyManager.removeProxy(this.uuid);
			}

			// Record failed process
			processHistory.addProcess(this.uuid, {
				language: this.runtime.language,
				version: this.runtime.version.raw,
				startTime: new Date(this.startTime),
				status: "failed",
				timing: jobTimer.getTimingReport(this.uuid),
				error: error.message,
				stdout: error.stdout,
				stderr: error.stderr,
			});

			throw error;
		} finally {
			if (this.portDetector) {
				await this.portDetector.cleanup();
			}
			jobTimer.endStage(this.uuid);
		}
	}

	async terminate() {
		this.logger.info("Terminating job");

		// Kill any running process
		if (this.process) {
			try {
				process.kill(this.process.pid, "SIGKILL");
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (error) {
				this.logger.error(`Error killing process: ${error.message}`);
			}
		}

		// Clean up all proxies
		for (const [port, proxyInfo] of this.proxies.entries()) {
			this.logger.debug(`Cleaning up proxy for port ${port}`);
			proxyManager.removeProxy(this.uuid);
		}

		// Wait for ongoing operations
		await new Promise((resolve) => setTimeout(resolve, 2000));

		try {
			await super.cleanup();
		} catch (error) {
			this.logger.error(`Error in cleanup: ${error.message}`);
			const boxIds = this.getBoxIds();
			for (const boxId of boxIds) {
				await this.forceCleanupBox(boxId);
			}
		}

		// End timing and get final report
		const timingReport = jobTimer.endTiming(this.uuid);
		this.logger.debug("Job timing report:", timingReport);

		// Save to history
		processHistory.addProcess(this.uuid, {
			language: this.runtime.language,
			version: this.runtime.version.raw,
			startTime: new Date(this.startTime),
			status: "terminated",
			timing: timingReport,
		});

		runningProcesses.delete(this.uuid);
	}

	async cleanup() {
		// Clean up all proxies
		for (const [port, proxyInfo] of this.proxies.entries()) {
			this.logger.debug(`Cleaning up proxy for port ${port}`);
			proxyManager.removeProxy(this.uuid);
		}
		this.proxies.clear();

		if (this.portDetector) {
			await this.portDetector.cleanup();
		}

		await super.cleanup();
	}

	async setupEnvironment(box) {
		const homeDir = path.join(box.dir, "submission", "home");
		await fs.mkdir(homeDir, { recursive: true });

		this.additionalEnvVars = {
			HOME: "/box/submission/home",
		};
	}

	isWebApp() {
		const webFrameworks = ["flask", "dash", "gradio"];
		return this.files.some((file) => webFrameworks.some((framework) => file.content.includes(`import ${framework}`) || file.content.includes(`from ${framework}`)));
	}
}

module.exports = { WebEnabledJob, runningProcesses };
