const https = require('https');

class HealthScorer {
    constructor(graph) {
        this.graph = graph;
        this.scores = new Map();
    }

    /**
     * Score health of all dependencies
     * @returns {Promise<Map>} Map of dependency names to health scores
     */
    async score() {
        const nodes = this.graph.getNodes();
        const packageNodes = [];

        // Collect package nodes
        for (const [id, node] of nodes) {
            if (node.type === 'package') {
                packageNodes.push(node);
            }
        }

        // Score each package
        for (const pkg of packageNodes) {
            const score = await this.scorePackage(pkg);
            this.scores.set(score.name, score);
        }

        return this.scores;
    }

    /**
     * Score health of a single package
     * @param {Object} pkgNode - Package node
     * @returns {Promise<Object>} Health score object
     */
    async scorePackage(pkgNode) {
        const packageName = pkgNode.name || pkgNode.id;
        const packageVersion = pkgNode.version || '0.0.0';
        
        const score = {
            name: packageName,
            version: packageVersion,
            score: 100,
            issues: [],
            warnings: [],
            info: []
        };

        // Skip built-in Node.js modules
        if (this.isBuiltinModule(packageName)) {
            score.info.push('Built-in Node.js module');
            return score;
        }

        try {
            const npmInfo = await this.getNpmInfo(packageName);
            
            if (npmInfo) {
                this.checkOutdated(packageVersion, npmInfo, score);
                this.checkMaintenance(npmInfo, score);
                this.checkPopularity(npmInfo, score);
                this.checkAge(npmInfo, score);
            }
        } catch (error) {
            score.warnings.push('Could not fetch npm information');
            score.score -= 10;
        }

        // Ensure score is between 0 and 100
        score.score = Math.max(0, Math.min(100, score.score));
        score.grade = this.getGrade(score.score);

        return score;
    }

    /**
     * Check if module is a built-in Node.js module
     * @param {string} name - Module name
     * @returns {boolean} True if built-in
     */
    isBuiltinModule(name) {
        const builtins = [
            'fs', 'path', 'http', 'https', 'url', 'querystring', 'util', 'events',
            'stream', 'buffer', 'child_process', 'cluster', 'net', 'dgram', 'dns',
            'readline', 'repl', 'vm', 'crypto', 'tls', 'zlib', 'os', 'process',
            'assert', 'module', 'console', 'timers', 'tty', 'domain', 'v8'
        ];
        return builtins.includes(name);
    }

    /**
     * Get package information from npm registry
     * @param {string} packageName - Package name
     * @returns {Promise<Object|null>} Package info or null
     */
    async getNpmInfo(packageName) {
        return new Promise((resolve, reject) => {
            const url = `https://registry.npmjs.org/${packageName}`;
            
            const req = https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    res.resume();
                    reject(new Error(`Request failed with status code ${res.statusCode}`));
                    return;
                }
                
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            req.on('error', reject);
            
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Check if package is outdated
     * @param {string} currentVersion - Current version
     * @param {Object} npmInfo - npm package info
     * @param {Object} score - Score object to update
     */
    checkOutdated(currentVersion, npmInfo, score) {
        const latestVersion = npmInfo['dist-tags']?.latest;
        
        if (!latestVersion) {
            return;
        }

        if (this.isOutdated(currentVersion, latestVersion)) {
            const severity = this.getVersionDiffSeverity(currentVersion, latestVersion);
            
            if (severity === 'major') {
                score.issues.push(`Major update available: ${currentVersion} → ${latestVersion}`);
                score.score -= 30;
            } else if (severity === 'minor') {
                score.warnings.push(`Minor update available: ${currentVersion} → ${latestVersion}`);
                score.score -= 15;
            } else {
                score.info.push(`Patch update available: ${currentVersion} → ${latestVersion}`);
                score.score -= 5;
            }
        }
    }

    /**
     * Check if current version is outdated
     * @param {string} current - Current version
     * @param {string} latest - Latest version
     * @returns {boolean} True if outdated
     */
    isOutdated(current, latest) {
        const currentParts = current.split('.').map(Number);
        const latestParts = latest.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (latestParts[i] > currentParts[i]) {
                return true;
            } else if (latestParts[i] < currentParts[i]) {
                return false;
            }
        }
        
        return false;
    }

    /**
     * Get severity of version difference
     * @param {string} current - Current version
     * @param {string} latest - Latest version
     * @returns {string} Severity level
     */
    getVersionDiffSeverity(current, latest) {
        const currentMajor = parseInt(current.split('.')[0]);
        const latestMajor = parseInt(latest.split('.')[0]);
        
        if (latestMajor > currentMajor) {
            return 'major';
        }
        
        const currentMinor = parseInt(current.split('.')[1]);
        const latestMinor = parseInt(latest.split('.')[1]);
        
        if (latestMinor > currentMinor) {
            return 'minor';
        }
        
        return 'patch';
    }

    /**
     * Check maintenance status
     * @param {Object} npmInfo - npm package info
     * @param {Object} score - Score object to update
     */
    checkMaintenance(npmInfo, score) {
        const time = npmInfo.time;
        const latestVersion = npmInfo['dist-tags']?.latest;
        const latestTime = time?.[latestVersion];
        
        if (!latestTime) {
            return;
        }

        const now = new Date();
        const lastUpdate = new Date(latestTime);
        const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate > 730) { // 2 years
            score.issues.push(`Package not updated in ${Math.floor(daysSinceUpdate / 365)} years`);
            score.score -= 25;
        } else if (daysSinceUpdate > 365) { // 1 year
            score.warnings.push(`Package not updated in ${Math.floor(daysSinceUpdate / 30)} months`);
            score.score -= 15;
        } else if (daysSinceUpdate > 180) { // 6 months
            score.info.push(`Package last updated ${Math.floor(daysSinceUpdate / 30)} months ago`);
            score.score -= 5;
        }

        // Check for deprecated
        if (npmInfo.deprecated) {
            score.issues.push('Package is deprecated');
            score.score -= 50;
        }
    }

    /**
     * Check popularity based on downloads
     * @param {Object} npmInfo - npm package info
     * @param {Object} score - Score object to update
     */
    checkPopularity(npmInfo, score) {
        // Note: This would require additional API calls to get download counts
        // For now, we'll use a simple heuristic based on repository stars if available
        const repository = npmInfo.repository;
        
        if (repository && repository.url) {
            score.info.push('Has repository');
            score.score += 5;
        }
    }

    /**
     * Check package age
     * @param {Object} npmInfo - npm package info
     * @param {Object} score - Score object to update
     */
    checkAge(npmInfo, score) {
        const time = npmInfo.time;
        const createdTime = time?.created;
        
        if (!createdTime) {
            return;
        }

        const now = new Date();
        const created = new Date(createdTime);
        const ageInDays = (now - created) / (1000 * 60 * 60 * 24);

        if (ageInDays < 30) {
            score.warnings.push('Package is very new (< 30 days)');
            score.score -= 10;
        } else if (ageInDays > 365) {
            score.score += 10; // Mature package
            score.info.push('Mature package (> 1 year old)');
        }
    }

    /**
     * Get grade letter from score
     * @param {number} score - Health score
     * @returns {string} Grade letter
     */
    getGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Get overall health summary
     * @returns {Object} Health summary
     */
    getSummary() {
        const summary = {
            total: this.scores.size,
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0,
            critical: 0
        };

        for (const score of this.scores.values()) {
            if (score.grade === 'A') summary.excellent++;
            else if (score.grade === 'B') summary.good++;
            else if (score.grade === 'C') summary.fair++;
            else if (score.grade === 'D') summary.poor++;
            else summary.critical++;
        }

        return summary;
    }
}

module.exports = HealthScorer;
