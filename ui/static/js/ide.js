// Initialize Ace editor
const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/python");
editor.setOptions({
    fontSize: "14px",
    showPrintMargin: false,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    highlightActiveLine: true,
    showGutter: true,
    displayIndentGuides: true,
    enableLiveAutocompletion: true,
    enableSnippets: true,
});

// Elements
const languageSelect = document.getElementById('languageSelect');
const runButton = document.getElementById('runCode');
const output = document.getElementById('output');
const outputSpinner = document.getElementById('outputSpinner');
const webAppUrlContainer = document.getElementById('webAppUrlContainer');
const webAppUrl = document.getElementById('webAppUrl');
const urlText = webAppUrl.querySelector('.url-text');
const executionDetails = document.getElementById('executionDetails');
const totalDuration = document.getElementById('totalDuration');
const cpuTime = document.getElementById('cpuTime');
const memoryUsage = document.getElementById('memoryUsage');
const installMetrics = document.getElementById('installMetrics');
const executeMetrics = document.getElementById('executeMetrics');


// Fetch available runtimes and populate language select
async function fetchRuntimes() {
    try {
        const response = await fetch('/api/runtimes');
        const runtimes = await response.json();

        // Sort runtimes by language
        const languages = [...new Set(runtimes.map(r => r.language))].sort();

        // Clear existing options except the placeholder
        while (languageSelect.options.length > 1) {
            languageSelect.remove(1);
        }

        // Populate select
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
            languageSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching runtimes:', error);
        showError('Failed to load available languages');
    }
}

// Format duration in milliseconds to human-readable format
function formatDuration(ms) {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}m ${remainingSeconds}s`;
}

// Format bytes to human-readable format
function formatBytes(bytes) {
    if (!bytes) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Update execution metrics display
function updateExecutionMetrics(result) {
    if (!result || !result.timing) {
        executionDetails.classList.add('d-none');
        return;
    }

    const { timing, run } = result;
    executionDetails.classList.remove('d-none');

    // Update summary metrics
    totalDuration.textContent = formatDuration(timing.totalDuration);
    cpuTime.textContent = formatDuration(timing.metrics?.cpuTime);
    memoryUsage.textContent = formatBytes(timing.metrics?.memory);

    // Update install stage metrics
    if (timing.stages?.install || result.stages?.install) {
        const installStage = timing.stages?.install || {};
        const installOutput = result.stages?.install || {};

        installMetrics.innerHTML = `
            <div class="row g-2">
                <div class="col-sm-4">
                    <div class="text-muted">Duration:</div>
                    <div>${formatDuration(installStage.duration)}</div>
                </div>
                <div class="col-sm-4">
                    <div class="text-muted">CPU Time:</div>
                    <div>${formatDuration(installStage.cpuTime)}</div>
                </div>
                <div class="col-sm-4">
                    <div class="text-muted">Memory:</div>
                    <div>${formatBytes(installStage.memory)}</div>
                </div>
            </div>
            ${installOutput.stdout || installOutput.stderr ? `
                <div class="mt-3">
                    ${installOutput.stdout ? `
                        <div class="mb-2">
                            <div class="text-muted">Output:</div>
                            <pre class="small mb-0">${installOutput.stdout}</pre>
                        </div>
                    ` : ''}
                    ${installOutput.stderr ? `
                        <div>
                            <div class="text-muted">Errors:</div>
                            <pre class="small mb-0 text-danger">${installOutput.stderr}</pre>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        `;
    }

    // Update execute stage metrics
    if (timing.stages?.execute || result.stages?.execute) {
        const executeStage = timing.stages?.execute || {};
        const executeOutput = result.stages?.execute || {};

        executeMetrics.innerHTML = `
            <div class="row g-2">
                <div class="col-sm-4">
                    <div class="text-muted">Duration:</div>
                    <div>${formatDuration(executeStage.duration)}</div>
                </div>
                <div class="col-sm-4">
                    <div class="text-muted">CPU Time:</div>
                    <div>${formatDuration(executeStage.cpuTime)}</div>
                </div>
                <div class="col-sm-4">
                    <div class="text-muted">Memory:</div>
                    <div>${formatBytes(executeStage.memory)}</div>
                </div>
            </div>
            <div class="row g-2 mt-2">
                <div class="col-sm-4">
                    <div class="text-muted">Exit Code:</div>
                    <div>${run?.code ?? '-'}</div>
                </div>
                <div class="col-sm-4">
                    <div class="text-muted">Wall Time:</div>
                    <div>${formatDuration(run?.wall_time)}</div>
                </div>
                <div class="col-sm-4">
                    <div class="text-muted">Status:</div>
                    <div>${run?.status || '-'}</div>
                </div>
            </div>
            ${executeOutput.stdout || executeOutput.stderr ? `
                <div class="mt-3">
                    ${executeOutput.stdout ? `
                        <div class="mb-2">
                            <div class="text-muted">Output:</div>
                            <pre class="small mb-0">${executeOutput.stdout}</pre>
                        </div>
                    ` : ''}
                    ${executeOutput.stderr ? `
                        <div>
                            <div class="text-muted">Errors:</div>
                            <pre class="small mb-0 text-danger">${executeOutput.stderr}</pre>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        `;
    }
}

// Execute code
async function executeCode() {
    const language = languageSelect.value;
    if (!language) {
        showError('Please select a language');
        return;
    }

    const code = editor.getValue();
    if (!code.trim()) {
        showError('Please enter some code');
        return;
    }

    // Update UI state
    runButton.disabled = true;
    outputSpinner.classList.remove('d-none');
    const originalButtonText = runButton.innerHTML;
    runButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Running...';
    output.textContent = 'Executing code...';
    webAppUrlContainer.classList.add('d-none');
    executionDetails.classList.add('d-none');

    try {
        const response = await fetch('/api/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: language,
                version: '*', // Latest version
                files: [{
                    name: 'main.' + getFileExtension(language),
                    content: code
                }]
            })
        });

        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError);
            showError('Invalid response from server');
            return;
        }

        if (!response.ok) {
            showError(result.message || 'Failed to execute code');
            return;
        }

        // Check if execution was successful
        if (result.run && result.run.code === 0) {
            // Display execution results
            const stdout = result.stages?.execute?.stdout || result.run?.stdout || '';
            const stderr = result.stages?.execute?.stderr || result.run?.stderr || '';
            output.textContent = stdout + (stderr ? '\nErrors:\n' + stderr : '');

            // Display web app URL if available
            if (result.webAppUrl) {
                webAppUrl.href = result.webAppUrl;
                urlText.textContent = result.webAppUrl;
                webAppUrlContainer.classList.remove('d-none');
            }

            // Update execution metrics
            updateExecutionMetrics(result);
        } else {
            const errorMessage = result.run?.message || 'Execution failed';
            const errorDetails = result.run?.stderr || '';
            showError(`${errorMessage}${errorDetails ? '\n' + errorDetails : ''}`);
        }
    } catch (error) {
        console.error('Error executing code:', error);
        showError('Failed to execute code');
    } finally {
        runButton.disabled = false;
        outputSpinner.classList.add('d-none');
        runButton.innerHTML = originalButtonText;
    }
}

// Get file extension for language
function getFileExtension(language) {
    const extensions = {
        python: 'py',
        javascript: 'js',
        typescript: 'ts',
        ruby: 'rb',
        go: 'go',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
    };
    return extensions[language.toLowerCase()] || language.toLowerCase();
}

// Show error in output
function showError(message) {
    output.textContent = `Error: ${message}`;
}

// Event listeners
languageSelect.addEventListener('change', (e) => {
    const language = e.target.value;
    editor.session.setMode(`ace/mode/${language.toLowerCase()}`);
});

runButton.addEventListener('click', executeCode);

// Initialize languages when the page loads
document.addEventListener('DOMContentLoaded', fetchRuntimes);