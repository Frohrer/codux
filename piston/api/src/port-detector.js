// host-port-detector.js
const cp = require("child_process");

/**
 * Poll the host for any newly opened port that matches your process criteria
 * (e.g., "python" or "node"). Requires the isolate box to be started with --share-net.
 *
 * @param {RegExp} [options.processRegex] - Which processes to watch for (e.g., /python/)
 * @param {Number} [options.timeoutMs] - how long (ms) to wait
 * @param {Number} [options.pollInterval] - how often (ms) to poll netstat
 * @returns {Promise<number>} resolves to the newly opened port
 */
async function detectPortFromHost({ processRegex = /python/, timeoutMs = 30000, pollInterval = 1000 } = {}) {
	const start = Date.now();
	const knownPorts = new Set();

	while (Date.now() - start < timeoutMs) {
		const netstatOutput = await runHostNetstat();
		const listeningPorts = parseListeningPorts(netstatOutput, processRegex);

		// Check for any new ports we haven't seen before
		for (const port of listeningPorts) {
			if (!knownPorts.has(port)) {
				// Found a newly opened port
				return port;
			}
		}

		// Add these ports to knownPorts so we don't return duplicates next loop
		for (const port of listeningPorts) {
			knownPorts.add(port);
		}

		// Sleep a bit, then poll again
		await new Promise((resolve) => setTimeout(resolve, pollInterval));
	}
	throw new Error(`Timeout after ${timeoutMs}ms waiting for a new port`);
}

/**
 * Run netstat (or 'ss -lntp') on the host
 */
function runHostNetstat() {
	return new Promise((resolve, reject) => {
		cp.exec("netstat -tunlp", (error, stdout, stderr) => {
			if (error) return reject(error);
			resolve(stdout);
		});
	});
}

/**
 * Parse netstat output lines, look for lines in LISTEN state,
 * and match them to a specific process name or pid using `processRegex`.
 */
function parseListeningPorts(netstatOutput, processRegex) {
	const ports = [];
	const lines = netstatOutput.split("\n");

	for (const line of lines) {
		if (!line.includes("LISTEN")) continue;

		// Example line:
		// "tcp   0   0 0.0.0.0:8501   0.0.0.0:*   LISTEN   12345/python"
		const match = line.match(/0\.0\.0\.0:(\d+)\s+.*LISTEN\s+(\S+)/);
		if (!match) continue;

		const portStr = match[1]; // e.g. "8501"
		const processField = match[2]; // e.g. "12345/python"

		const port = parseInt(portStr, 10);
		if (!isNaN(port) && processRegex.test(processField)) {
			ports.push(port);
		}
	}
	return ports;
}

module.exports = { detectPortFromHost };
