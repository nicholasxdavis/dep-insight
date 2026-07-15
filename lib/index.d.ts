export interface DepInsightOptions {
    rootDir?: string;
    includeDev?: boolean;
    includePeer?: boolean;
    maxDepth?: number;
}

export interface NodeMetadata {
    type: 'project' | 'package' | 'file';
    name?: string;
    version?: string;
    path?: string;
    fullPath?: string;
}

export interface EdgeMetadata {
    type: 'package' | 'import';
    importType?: 'relative' | 'package';
}

export interface DependencyGraph {
    getNodes(): Map<string, NodeMetadata>;
    getEdges(): Map<string, EdgeMetadata>;
    getAdjacency(): Map<string, Set<string>>;
    getDependents(nodeId: string): Set<string>;
    getDependencies(nodeId: string): Set<string>;
}

export interface ImpactResult {
    file: string;
    found: boolean;
    message?: string;
    node?: NodeMetadata;
    directDependents: string[];
    transitiveDependents: string[];
    totalAffected: number;
    impact: {
        level: 'low' | 'medium' | 'high' | 'critical';
        risk: 'minimal' | 'moderate' | 'high' | 'very-high';
        directCount: number;
        transitiveCount: number;
    };
    affectedPackages: Array<{
        name: string;
        version: string;
        files: string[];
    }>;
    recommendations: string[];
}

export interface HealthScore {
    name: string;
    version: string;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    issues: string[];
    warnings: string[];
    info: string[];
}

export interface AnalysisResult {
    graph: DependencyGraph;
    circularDependencies: string[][];
    healthScores: Map<string, HealthScore>;
}

export class DepInsightClass {
    constructor(options?: DepInsightOptions);
    build(): Promise<DependencyGraph>;
    detectCircular(): string[][];
    analyzeImpact(filePath: string): ImpactResult;
    scoreHealth(): Promise<Map<string, HealthScore>>;
    reportConsole(): string[];
    reportHtml(outputPath?: string): Promise<string>;
    analyze(): Promise<AnalysisResult>;
}

declare const DepInsightMain: (options?: DepInsightOptions) => DepInsightClass;

export default DepInsightMain;
export { DepInsightClass as DepInsight };
