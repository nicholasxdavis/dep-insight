# @blacnova/dep-insight

![](https://img.shields.io/npm/v/@blacnova/dep-insight.svg)
![](https://img.shields.io/npm/dt/@blacnova/dep-insight.svg)

> Interactive dependency visualization and impact analysis for JavaScript projects.

## Features
* Build dependency graphs from package.json and ES6 imports
* Detect circular dependencies
* Impact analysis: "if I change this file, what breaks?"
* Dependency health scoring (outdated, unmaintained packages)
* Interactive console visualization with console-grid
* Interactive HTML visualization with impact analysis
* Zero runtime dependencies (except acorn for parsing)
* TypeScript support
* ESM and CommonJS dual format

## Install
```
npm i @blacnova/dep-insight
```

## Usage

### CommonJS
```js
const DepInsight = require("@blacnova/dep-insight");
```

### ESM
```js
import DepInsight from "@blacnova/dep-insight";
// or
import DepInsight, { DepInsight as DepInsightClass } from "@blacnova/dep-insight";
```

## Examples

### Basic Analysis
```js
const DepInsight = require("@blacnova/dep-insight");

const di = new DepInsight({
    rootDir: './my-project',
    includeDev: false,
    includePeer: false
});

// Build the dependency graph
await di.build();

// Detect circular dependencies
const circular = di.detectCircular();
console.log(`Found ${circular.length} circular dependencies`);

// Score dependency health
const healthScores = await di.scoreHealth();

// Generate console report
di.reportConsole();
```

### Impact Analysis
```js
const DepInsight = require("@blacnova/dep-insight");

const di = new DepInsight();
await di.build();

// Analyze impact of changing a specific file
const impact = di.analyzeImpact('src/utils/helpers.js');

console.log(`Impact Level: ${impact.impact.level}`);
console.log(`Direct Dependents: ${impact.directDependents.length}`);
console.log(`Transitive Dependents: ${impact.transitiveDependents.length}`);
console.log('Recommendations:', impact.recommendations);
```

### Generate HTML Report
```js
const DepInsight = require("@blacnova/dep-insight");

const di = new DepInsight();
await di.build();
di.detectCircular();
await di.scoreHealth();

// Generate interactive HTML report
const reportPath = await di.reportHtml('./dependency-report.html');
console.log(`Report generated: ${reportPath}`);
```

### Complete Analysis
```js
const DepInsight = require("@blacnova/dep-insight");

const di = new DepInsight();

// Run complete analysis
const results = await di.analyze();

console.log('Graph:', results.graph);
console.log('Circular Dependencies:', results.circularDependencies);
console.log('Health Scores:', results.healthScores);
```

## API

### `new DepInsight(options)`
Creates a new DepInsight instance.

#### Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rootDir` | `string` | `process.cwd()` | Root directory to analyze |
| `includeDev` | `boolean` | `false` | Include dev dependencies |
| `includePeer` | `boolean` | `false` | Include peer dependencies |
| `maxDepth` | `number` | `10` | Maximum depth for dependency traversal |

### Methods

#### `build(): Promise<DependencyGraph>`
Build the dependency graph from package.json and source files.

#### `detectCircular(): string[][]`
Detect circular dependencies in the graph. Returns an array of cycles, where each cycle is an array of node IDs.

#### `analyzeImpact(filePath): ImpactResult`
Analyze the impact of changing a specific file.

#### `scoreHealth(): Promise<Map<string, HealthScore>>`
Score the health of all dependencies based on npm registry data.

#### `reportConsole(): string[]`
Generate a console report using console-grid.

#### `reportHtml(outputPath?: string): Promise<string>`
Generate an interactive HTML report.

#### `analyze(): Promise<AnalysisResult>`
Run complete analysis (build, circular detection, health scoring).

## Console Report Example

```
=== Dependency Graph Summary ===
┌─────────────────────────┬──────────┐
│ Metric                  │ Value    │
├─────────────────────────┼──────────┤
│ Total Files             │ 45       │
│ Total Packages          │ 12       │
│ Total Dependencies      │ 67       │
│ Circular Dependencies   │ 2        │
└─────────────────────────┴──────────┘

=== Circular Dependencies ===
Found 2 circular dependency cycle(s)
┌────────┬──────────────────────────────────┐
│ Cycle  │ Path                             │
├────────┼──────────────────────────────────┤
│ Cycle1 │ src/a.js → src/b.js → src/a.js   │
│ Cycle2 │ src/x.js → src/y.js → src/x.js   │
└────────┴──────────────────────────────────┘

=== Dependency Health Scores ===
┌─────────────────┬──────────────┬───────┬───────┐
│ Package         │ Version      │ Grade │ Score │
├─────────────────┼──────────────┼───────┼───────┤
│ lodash          │ 4.17.21      │ A     │  95   │
│ express         │ 4.18.2       │ B     │  82   │
│ outdated-pkg    │ 1.0.0        │ F     │  45   │
└─────────────────┴──────────────┴───────┴───────┘
```

## HTML Report Features

The HTML report includes:
- **Summary Tab**: Overview of dependency metrics
- **Graph Tab**: Interactive dependency graph visualization
- **Circular Dependencies Tab**: List of all circular dependency cycles
- **Health Scores Tab**: Detailed health scores for each dependency
- **Impact Analysis Tab**: Interactive tool to analyze impact of file changes

## Health Scoring

Dependency health is scored based on:
- **Outdated versions**: Major/minor/patch updates available
- **Maintenance**: How recently the package was updated
- **Deprecation**: Whether the package is marked as deprecated
- **Age**: Package maturity (new vs established packages)

Scores range from 0-100 with letter grades:
- **A (90-100)**: Excellent health
- **B (80-89)**: Good health
- **C (70-79)**: Fair health
- **D (60-69)**: Poor health
- **F (0-59)**: Critical health

## Impact Analysis Levels

- **Low**: Changes affect few files, minimal risk
- **Medium**: Changes affect multiple files, moderate risk
- **High**: Changes affect many files, high risk
- **Critical**: Changes affect large portions of codebase, very high risk

## Circular Dependency Detection

Uses depth-first search (DFS) to detect cycles in the dependency graph. Each cycle is reported with the full path of dependencies.

## License
MIT
