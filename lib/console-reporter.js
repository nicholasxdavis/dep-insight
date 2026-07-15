const CG = require('console-grid');
const EC = require('eight-colors');

class ConsoleReporter {
    constructor(graph, options = {}) {
        this.graph = graph;
        this.options = {
            circularDependencies: [],
            healthScores: new Map(),
            ...options
        };
    }

    /**
     * Generate console report
     * @returns {Array} Array of output lines
     */
    generate() {
        const lines = [];
        
        lines.push(...this.reportSummary());
        lines.push('');
        lines.push(...this.reportCircularDependencies());
        lines.push('');
        lines.push(...this.reportHealthScores());
        lines.push('');
        lines.push(...this.reportDependencyGraph());
        
        return lines;
    }

    /**
     * Report summary
     * @returns {Array} Summary lines
     */
    reportSummary() {
        const nodes = this.graph.getNodes();
        const edges = this.graph.getEdges();
        
        const fileCount = Array.from(nodes.values()).filter(n => n.type === 'file').length;
        const packageCount = Array.from(nodes.values()).filter(n => n.type === 'package').length;
        
        console.log(EC.cyan('=== Dependency Graph Summary ==='));
        
        CG({
            columns: ['Metric', 'Value'],
            rows: [
                ['Total Files', fileCount],
                ['Total Packages', packageCount],
                ['Total Dependencies', edges.size],
                ['Circular Dependencies', this.options.circularDependencies.length]
            ]
        });
        
        return [];
    }

    /**
     * Report circular dependencies
     * @returns {Array} Circular dependency lines
     */
    reportCircularDependencies() {
        const cycles = this.options.circularDependencies;
        
        console.log(EC.yellow('=== Circular Dependencies ==='));
        
        if (cycles.length === 0) {
            console.log(EC.green('No circular dependencies found'));
            return [];
        }
        
        console.log(EC.red(`Found ${cycles.length} circular dependency cycle(s)`));
        
        const rows = [];
        for (let i = 0; i < cycles.length; i++) {
            const cycle = cycles[i];
            rows.push([`Cycle ${i + 1}`, cycle.join(' → ')]);
        }
        
        CG({
            columns: ['Cycle', 'Path'],
            rows
        });
        
        return [];
    }

    /**
     * Report health scores
     * @returns {Array} Health score lines
     */
    reportHealthScores() {
        const scores = this.options.healthScores;
        
        console.log(EC.cyan('=== Dependency Health Scores ==='));
        
        if (scores.size === 0) {
            console.log(EC.yellow('No health scores available'));
            return [];
        }
        
        const rows = [];
        for (const [name, score] of scores) {
            rows.push({
                name: name,
                version: score.version || 'N/A',
                grade: score.grade || '-',
                score: score.score || 0
            });
        }
        
        CG({
            columns: [{
                id: 'name',
                name: 'Package',
                maxWidth: 30
            }, {
                id: 'version',
                name: 'Version',
                maxWidth: 15
            }, {
                id: 'grade',
                name: 'Grade',
                align: 'center',
                formatter: (value, rowItem, columnItem) => {
                    const gradeColor = this.getGradeColor(value);
                    return gradeColor(value);
                }
            }, {
                id: 'score',
                name: 'Score',
                type: 'number',
                align: 'right'
            }],
            rows
        });
        
        return [];
    }

    /**
     * Get color for grade
     * @param {string} grade - Grade letter
     * @returns {Function} Color function
     */
    getGradeColor(grade) {
        switch (grade) {
            case 'A': return EC.green;
            case 'B': return EC.cyan;
            case 'C': return EC.yellow;
            case 'D': return EC.red;
            case '-': return (s) => s;
            default: return EC.red;
        }
    }

    /**
     * Report dependency graph
     * @returns {Array} Graph lines
     */
    reportDependencyGraph() {
        const nodes = this.graph.getNodes();
        const adjacency = this.graph.getAdjacency();
        
        console.log(EC.cyan('=== Dependency Graph ==='));
        
        const rows = [];
        for (const [id, node] of nodes) {
            const deps = adjacency.get(id);
            const depCount = deps ? deps.size : 0;
            const dependents = this.graph.getDependents(id);
            const dependentCount = dependents.size;
            
            rows.push({
                file: id,
                type: node.type,
                dependencies: depCount,
                dependents: dependentCount
            });
        }
        
        CG({
            columns: [{
                id: 'file',
                name: 'File/Package',
                maxWidth: 40
            }, {
                id: 'type',
                name: 'Type',
                align: 'center'
            }, {
                id: 'dependencies',
                name: 'Deps',
                type: 'number',
                align: 'right'
            }, {
                id: 'dependents',
                name: 'Dependents',
                type: 'number',
                align: 'right'
            }],
            rows
        });
        
        return [];
    }
}

module.exports = ConsoleReporter;
