class CircularDetector {
    constructor(graph) {
        this.graph = graph;
        this.cycles = [];
    }

    /**
     * Detect all circular dependencies in the graph
     * @returns {Array} Array of circular dependency paths
     */
    detect() {
        this.cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];

        const nodes = this.graph.getNodes();
        
        for (const nodeId of nodes.keys()) {
            if (!visited.has(nodeId)) {
                this.dfs(nodeId, visited, recursionStack, path);
            }
        }

        return this.cycles;
    }

    /**
     * Depth-first search to detect cycles
     * @param {string} nodeId - Current node
     * @param {Set} visited - Visited nodes
     * @param {Set} recursionStack - Current recursion stack
     * @param {Array} path - Current path
     */
    dfs(nodeId, visited, recursionStack, path) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        const dependencies = this.graph.getDependencies(nodeId);

        for (const depId of dependencies) {
            if (!visited.has(depId)) {
                this.dfs(depId, visited, recursionStack, path);
            } else if (recursionStack.has(depId)) {
                // Found a cycle
                const cycleStart = path.indexOf(depId);
                const cycle = path.slice(cycleStart);
                cycle.push(depId); // Close the cycle
                this.cycles.push(cycle);
            }
        }

        path.pop();
        recursionStack.delete(nodeId);
    }

    /**
     * Get circular dependencies grouped by file
     * @returns {Object} Object with file as key and cycles as value
     */
    getCyclesByFile() {
        const byFile = {};

        for (const cycle of this.cycles) {
            for (const nodeId of cycle) {
                if (!byFile[nodeId]) {
                    byFile[nodeId] = [];
                }
                byFile[nodeId].push(cycle);
            }
        }

        return byFile;
    }

    /**
     * Get severity of circular dependencies
     * @returns {Object} Severity information
     */
    getSeverity() {
        const total = this.cycles.length;
        const uniqueNodes = new Set();

        for (const cycle of this.cycles) {
            for (const nodeId of cycle) {
                uniqueNodes.add(nodeId);
            }
        }

        let severity = 'low';
        if (total > 10 || uniqueNodes.size > 20) {
            severity = 'high';
        } else if (total > 5 || uniqueNodes.size > 10) {
            severity = 'medium';
        }

        return {
            total,
            uniqueNodes: uniqueNodes.size,
            severity
        };
    }
}

module.exports = CircularDetector;
