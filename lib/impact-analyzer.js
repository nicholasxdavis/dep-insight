class ImpactAnalyzer {
    constructor(graph) {
        this.graph = graph;
    }

    /**
     * Analyze impact of changing a file
     * @param {string} filePath - Path to the file being changed
     * @returns {Object} Impact analysis results
     */
    analyze(filePath) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        // Find the node
        const node = this.graph.getNodes().get(normalizedPath);
        
        if (!node) {
            return {
                file: normalizedPath,
                found: false,
                message: 'File not found in dependency graph'
            };
        }

        // Get all dependents (what depends on this file)
        const directDependents = this.graph.getDependents(normalizedPath);
        
        // Get transitive dependents
        const transitiveDependents = this.getTransitiveDependents(normalizedPath);
        
        // Categorize impact
        const impact = this.categorizeImpact(directDependents, transitiveDependents);
        
        // Get affected packages
        const affectedPackages = this.getAffectedPackages(transitiveDependents);
        
        return {
            file: normalizedPath,
            found: true,
            node,
            directDependents: Array.from(directDependents),
            transitiveDependents: Array.from(transitiveDependents),
            totalAffected: transitiveDependents.size,
            impact,
            affectedPackages,
            recommendations: this.getRecommendations(impact)
        };
    }

    /**
     * Get all transitive dependents using BFS
     * @param {string} nodeId - Starting node
     * @returns {Set} Set of all transitive dependents
     */
    getTransitiveDependents(nodeId) {
        const transitive = new Set();
        const queue = [nodeId];
        const visited = new Set();

        while (queue.length > 0) {
            const current = queue.shift();
            
            if (visited.has(current)) {
                continue;
            }
            
            visited.add(current);
            
            const dependents = this.graph.getDependents(current);
            
            for (const dep of dependents) {
                if (!visited.has(dep) && dep !== nodeId) {
                    transitive.add(dep);
                    queue.push(dep);
                }
            }
        }

        return transitive;
    }

    /**
     * Categorize impact level
     * @param {Set} directDependents - Direct dependents
     * @param {Set} transitiveDependents - All transitive dependents
     * @returns {Object} Impact categorization
     */
    categorizeImpact(directDependents, transitiveDependents) {
        const directCount = directDependents.size;
        const transitiveCount = transitiveDependents.size;
        
        let level = 'low';
        let risk = 'minimal';
        
        if (transitiveCount > 50) {
            level = 'critical';
            risk = 'very-high';
        } else if (transitiveCount > 20) {
            level = 'high';
            risk = 'high';
        } else if (transitiveCount > 10) {
            level = 'medium';
            risk = 'moderate';
        } else if (directCount > 5) {
            level = 'medium';
            risk = 'moderate';
        }
        
        return {
            level,
            risk,
            directCount,
            transitiveCount
        };
    }

    /**
     * Get affected packages from transitive dependents
     * @param {Set} transitiveDependents - Transitive dependents
     * @returns {Array} Array of affected package info
     */
    getAffectedPackages(transitiveDependents) {
        const packages = new Map();
        const nodes = this.graph.getNodes();
        
        for (const depId of transitiveDependents) {
            const node = nodes.get(depId);
            
            if (node && node.type === 'package') {
                if (!packages.has(node.name)) {
                    packages.set(node.name, {
                        name: node.name,
                        version: node.version,
                        files: []
                    });
                }
                packages.get(node.name).files.push(depId);
            }
        }
        
        return Array.from(packages.values());
    }

    /**
     * Get recommendations based on impact
     * @param {Object} impact - Impact categorization
     * @returns {Array} Array of recommendations
     */
    getRecommendations(impact) {
        const recommendations = [];
        
        if (impact.level === 'critical') {
            recommendations.push('Consider breaking this file into smaller modules');
            recommendations.push('Run full test suite before deploying');
            recommendations.push('Notify team members of high-risk change');
            recommendations.push('Consider feature flagging the change');
        } else if (impact.level === 'high') {
            recommendations.push('Run comprehensive tests');
            recommendations.push('Review all affected files');
        } else if (impact.level === 'medium') {
            recommendations.push('Run related tests');
            recommendations.push('Review direct dependents');
        } else {
            recommendations.push('Run unit tests for the file');
        }
        
        return recommendations;
    }

    /**
     * Analyze impact of multiple files
     * @param {Array} filePaths - Array of file paths
     * @returns {Object} Combined impact analysis
     */
    analyzeMultiple(filePaths) {
        const results = filePaths.map(path => this.analyze(path));
        
        const allAffected = new Set();
        const allPackages = new Map();
        
        for (const result of results) {
            if (result.found) {
                for (const dep of result.transitiveDependents) {
                    allAffected.add(dep);
                }
                for (const pkg of result.affectedPackages) {
                    if (!allPackages.has(pkg.name)) {
                        allPackages.set(pkg.name, pkg);
                    }
                }
            }
        }
        
        return {
            files: filePaths,
            results,
            totalAffected: allAffected.size,
            affectedFiles: Array.from(allAffected),
            affectedPackages: Array.from(allPackages.values()),
            combinedImpact: this.categorizeImpact(
                new Set(),
                allAffected
            )
        };
    }
}

module.exports = ImpactAnalyzer;
