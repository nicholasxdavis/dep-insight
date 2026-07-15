const DependencyGraph = require('./dependency-graph.js');
const CircularDetector = require('./circular-detector.js');
const ImpactAnalyzer = require('./impact-analyzer.js');
const HealthScorer = require('./health-scorer.js');
const ConsoleReporter = require('./console-reporter.js');
const HtmlReporter = require('./html-reporter.js');

class DepInsight {
    constructor(options = {}) {
        this.options = {
            rootDir: process.cwd(),
            includeDev: false,
            includePeer: false,
            maxDepth: 10,
            ...options
        };
        
        this.graph = null;
        this.circularDependencies = [];
        this.healthScores = new Map();
    }

    /**
     * Build the dependency graph
     * @returns {Promise<DependencyGraph>}
     */
    async build() {
        const graphBuilder = new DependencyGraph(this.options);
        this.graph = await graphBuilder.build();
        return this.graph;
    }

    /**
     * Detect circular dependencies
     * @returns {Array} Array of circular dependency paths
     */
    detectCircular() {
        if (!this.graph) {
            throw new Error('Graph not built. Call build() first.');
        }
        const detector = new CircularDetector(this.graph);
        this.circularDependencies = detector.detect();
        return this.circularDependencies;
    }

    /**
     * Analyze impact of changing a file
     * @param {string} filePath - Path to the file being changed
     * @returns {Object} Impact analysis results
     */
    analyzeImpact(filePath) {
        if (!this.graph) {
            throw new Error('Graph not built. Call build() first.');
        }
        const analyzer = new ImpactAnalyzer(this.graph);
        return analyzer.analyze(filePath);
    }

    /**
     * Score dependency health
     * @returns {Map} Map of dependency names to health scores
     */
    async scoreHealth() {
        if (!this.graph) {
            throw new Error('Graph not built. Call build() first.');
        }
        const scorer = new HealthScorer(this.graph);
        this.healthScores = await scorer.score();
        return this.healthScores;
    }

    /**
     * Generate console report
     * @returns {Array} Array of output lines
     */
    reportConsole() {
        if (!this.graph) {
            throw new Error('Graph not built. Call build() first.');
        }
        const reporter = new ConsoleReporter(this.graph, {
            circularDependencies: this.circularDependencies,
            healthScores: this.healthScores
        });
        return reporter.generate();
    }

    /**
     * Generate HTML report
     * @param {string} outputPath - Path to output HTML file
     * @returns {Promise<string>} Path to generated HTML file
     */
    async reportHtml(outputPath) {
        if (!this.graph) {
            throw new Error('Graph not built. Call build() first.');
        }
        const reporter = new HtmlReporter(this.graph, {
            circularDependencies: this.circularDependencies,
            healthScores: this.healthScores
        });
        return reporter.generate(outputPath);
    }

    /**
     * Run full analysis
     * @returns {Promise<Object>} Complete analysis results
     */
    async analyze() {
        await this.build();
        this.detectCircular();
        await this.scoreHealth();
        
        return {
            graph: this.graph,
            circularDependencies: this.circularDependencies,
            healthScores: this.healthScores
        };
    }
}

/**
 * Main entry point for @blacnova/dep-insight
 * @param {Object} options - Configuration options
 * @returns {DepInsight} DepInsight instance
 */
const DepInsightMain = function(options = {}) {
    return new DepInsight(options);
};

module.exports = DepInsightMain;
module.exports.DepInsight = DepInsight;
module.exports.DepInsightClass = DepInsight;
