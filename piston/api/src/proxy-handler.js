const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { v4: uuidv4 } = require("uuid");
const logger = require("logplease").create("proxy-handler");
const config = require("./config");

class ProxyManager {
	constructor() {
		if (ProxyManager.instance) {
			return ProxyManager.instance;
		}
		ProxyManager.instance = this;

		this.proxies = new Map();
		this.nextPort = 10001;

		this.app = express();
		this.app.use(cors());
		this.server = require("http").createServer(this.app);

		this.setupLogging();

		this.server.listen(2020, () => {
			logger.info("Proxy server running on port 2020");
		});

		return this;
	}

	setupLogging() {
		setInterval(() => {
			const proxies = Array.from(this.proxies.entries())
				.map(([id, info]) => `${id}: ${info.path} -> ${info.port}`)
				.join("\n");
			logger.debug(`Current active proxies:\n${proxies}`);
		}, 10000);
	}

	getNextAvailablePort() {
		return this.nextPort++;
	}

	createProxy(jobId) {
		const port = this.getNextAvailablePort();
		const proxyId = uuidv4();
		const proxyPath = `/proxy/${proxyId}`;

		const proxyInfo = {
			port,
			path: proxyPath,
			active: true,
			id: proxyId,
		};

		const proxy = createProxyMiddleware({
			target: `http://localhost:${port}`,
			changeOrigin: true,
			ws: true,
			pathFilter: proxyPath,
			logger: logger,
			onProxyReq: (proxyReq, req, res) => {
				logger.debug("Proxying request:", {
					from: req.originalUrl,
					to: `http://localhost:${port}${req.originalUrl}`,
					headers: proxyReq.getHeaders(),
				});
			},
		});

		this.app.use(proxy);
		this.server.on("upgrade", proxy.upgrade);
		this.proxies.set(jobId, proxyInfo);
		logger.debug(`Created proxy: ${jobId} -> ${JSON.stringify(proxyInfo)}`);

		return proxyInfo;
	}

	removeProxy(jobId) {
		const proxyInfo = this.proxies.get(jobId);
		if (proxyInfo) {
			logger.debug(`Removing proxy: ${jobId} -> ${JSON.stringify(proxyInfo)}`);
			this.proxies.delete(jobId);
		}
	}

	getProxyInfo(jobId) {
		return this.proxies.get(jobId);
	}

	getBaseUrl() {
		return config.proxy_domain;
	}
}

module.exports = ProxyManager;
