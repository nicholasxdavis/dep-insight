const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

class DependencyGraph {
    constructor(options = {}) {
        this.options = {
            rootDir: process.cwd(),
            includeDev: false,
            includePeer: false,
            maxDepth: 10,
            ...options
        };
        
        this.nodes = new Map();
        this.edges = new Map();
        this.adjacency = new Map();
        
        this.builtinModules = new Set([
            'fs', 'path', 'http', 'https', 'url', 'querystring', 'util', 'events',
            'stream', 'buffer', 'child_process', 'cluster', 'net', 'dgram', 'dns',
            'readline', 'repl', 'vm', 'crypto', 'tls', 'zlib', 'os', 'process',
            'assert', 'module', 'console', 'timers', 'tty', 'domain', 'v8'
        ]);
    }

    /**
     * Build the complete dependency graph
     * @returns {Promise<DependencyGraph>}
     */
    async build() {
        // Build package.json dependency graph
        await this.buildPackageGraph();
        
        // Build import dependency graph
        await this.buildImportGraph();
        
        return this;
    }

    /**
     * Build graph from package.json dependencies
     * @returns {Promise<void>}
     */
    async buildPackageGraph() {
        const packageJsonPath = path.join(this.options.rootDir, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            return;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = this.mergeDependencies(packageJson);

        // Add root node
        this.addNode('root', {
            type: 'project',
            name: packageJson.name || 'root',
            version: packageJson.version || '0.0.0'
        });

        // Add dependency nodes and edges
        for (const [name, version] of Object.entries(dependencies)) {
            this.addNode(name, {
                type: 'package',
                name,
                version: this.cleanVersion(version)
            });
            
            this.addEdge('root', name, {
                type: 'package'
            });
        }
    }

    /**
     * Clean version string by removing prefixes
     * @param {string} version - Version string
     * @returns {string} Cleaned version
     */
    cleanVersion(version) {
        if (!version) return '0.0.0';
        return version.replace(/^[\^~]/, '');
    }

    /**
     * Merge all dependency types based on options
     * @param {Object} packageJson - Parsed package.json
     * @returns {Object} Merged dependencies
     */
    mergeDependencies(packageJson) {
        const deps = { ...packageJson.dependencies };
        
        if (this.options.includeDev && packageJson.devDependencies) {
            Object.assign(deps, packageJson.devDependencies);
        }
        
        if (this.options.includePeer && packageJson.peerDependencies) {
            Object.assign(deps, packageJson.peerDependencies);
        }
        
        return deps;
    }

    /**
     * Build graph from ES6 imports in source files
     * @returns {Promise<void>}
     */
    async buildImportGraph() {
        const sourceDir = this.options.rootDir;
        
        // Find all JS/TS files
        const files = this.findSourceFiles(sourceDir);
        
        for (const file of files) {
            await this.processFile(file, sourceDir);
        }
    }

    /**
     * Find all source files in directory
     * @param {string} dir - Directory to search
     * @returns {Array} Array of file paths
     */
    findSourceFiles(dir) {
        const files = [];
        const extensions = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx'];
        
        const walk = (currentDir) => {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Skip node_modules and hidden directories
                    if (item !== 'node_modules' && !item.startsWith('.')) {
                        walk(fullPath);
                    }
                } else if (stat.isFile()) {
                    const ext = path.extname(item);
                    if (extensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        };
        
        walk(dir);
        return files;
    }

    /**
     * Process a single source file and extract imports
     * @param {string} filePath - Path to the file
     * @param {string} rootDir - Root directory for relative paths
     * @returns {Promise<void>}
     */
    async processFile(filePath, rootDir) {
        const relativePath = path.relative(rootDir, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        // Add file node
        this.addNode(normalizedPath, {
            type: 'file',
            path: normalizedPath,
            fullPath: filePath
        });
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const imports = this.extractImports(content);
            
            for (const imp of imports) {
                let targetPath;
                
                if (imp.startsWith('.')) {
                    // Relative import
                    targetPath = this.resolveRelativeImport(filePath, imp, rootDir);
                } else {
                    // Package import - skip built-in modules
                    let cleanImp = imp;
                    if (imp.startsWith('node:')) {
                        cleanImp = imp.slice(5);
                    }
                    const basePkg = this.getBasePackageName(cleanImp);
                    if (this.builtinModules.has(basePkg) || this.builtinModules.has(cleanImp)) {
                        continue;
                    }
                    targetPath = basePkg;
                }
                
                if (targetPath) {
                    this.addEdge(normalizedPath, targetPath, {
                        type: 'import',
                        importType: this.getImportType(imp)
                    });
                }
            }
        } catch (error) {
            // Skip files that can't be parsed
        }
    }

    /**
     * Extract imports from source code using Acorn
     * @param {string} content - Source code
     * @returns {Array} Array of import paths
     */
    extractImports(content) {
        const imports = [];
        
        try {
            const ast = acorn.parse(content, {
                sourceType: 'module',
                ecmaVersion: 'latest'
            });
            
            const walk = (node) => {
                if (node.type === 'ImportDeclaration') {
                    imports.push(node.source.value);
                } else if (node.type === 'ExportNamedDeclaration' && node.source) {
                    imports.push(node.source.value);
                } else if (node.type === 'ExportAllDeclaration') {
                    imports.push(node.source.value);
                } else if (node.type === 'ImportExpression' && node.source && node.source.type === 'Literal') {
                    imports.push(node.source.value);
                } else if (node.type === 'CallExpression' && node.callee.name === 'require' && node.arguments.length === 1 && node.arguments[0].type === 'Literal') {
                    imports.push(node.arguments[0].value);
                }
                
                for (const key in node) {
                    if (node[key] && typeof node[key] === 'object') {
                        walk(node[key]);
                    }
                }
            };
            
            walk(ast);
        } catch (error) {
            // Fallback parser using regexes for TypeScript/JSX files where standard Acorn fails
            const regexes = [
                // import { ... } from 'pkg' or export { ... } from 'pkg'
                /\b(?:import|export)\b[^'"]*\bfrom\s+['"]([^'"]+)['"]/g,
                // import 'pkg'
                /\bimport\s+['"]([^'"]+)['"]/g,
                // import('pkg')
                /\bimport\s*\(['"]([^'"]+)['"]\)/g,
                // require('pkg')
                /\brequire\s*\(['"]([^'"]+)['"]\)/g
            ];
            
            for (const regex of regexes) {
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const imp = match[1];
                    if (imp && !imports.includes(imp)) {
                        imports.push(imp);
                    }
                }
            }
        }
        
        return imports;
    }

    /**
     * Resolve relative import to absolute path
     * @param {string} filePath - Current file path
     * @param {string} importPath - Relative import path
     * @param {string} rootDir - Root directory
     * @returns {string|null} Resolved path or null
     */
    resolveRelativeImport(filePath, importPath, rootDir) {
        const fileDir = path.dirname(filePath);
        const resolved = path.resolve(fileDir, importPath);
        
        // If the path exists directly and is a file, return it
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
            return path.relative(rootDir, resolved).replace(/\\/g, '/');
        }
        
        // Try different extensions
        const extensions = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '/index.js', '/index.mjs', '/index.cjs', '/index.ts'];
        
        for (const ext of extensions) {
            const fullPath = resolved + ext;
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                return path.relative(rootDir, fullPath).replace(/\\/g, '/');
            }
        }
        
        // Check if it's a directory with package.json
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
            const pkgPath = path.join(resolved, 'package.json');
            if (fs.existsSync(pkgPath)) {
                return path.relative(rootDir, resolved).replace(/\\/g, '/');
            }
        }
        
        return null;
    }

    /**
     * Determine import type
     * @param {string} importPath - Import path
     * @returns {string} Import type
     */
    getImportType(importPath) {
        if (importPath.startsWith('.')) {
            return 'relative';
        }
        return 'package';
    }

    /**
     * Add a node to the graph
     * @param {string} id - Node identifier
     * @param {Object} metadata - Node metadata
     */
    addNode(id, metadata = {}) {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, {
                id,
                ...metadata
            });
            this.adjacency.set(id, new Set());
        }
    }

    /**
     * Add an edge to the graph
     * @param {string} from - Source node
     * @param {string} to - Target node
     * @param {Object} metadata - Edge metadata
     */
    addEdge(from, to, metadata = {}) {
        if (!this.nodes.has(to)) {
            const isPackage = metadata.type === 'import' && metadata.importType === 'package';
            this.addNode(to, {
                type: isPackage ? 'package' : 'file',
                name: to
            });
        }
        
        const edgeId = `${from}->${to}`;
        this.edges.set(edgeId, {
            from,
            to,
            ...metadata
        });
        
        this.adjacency.get(from).add(to);
    }

    /**
     * Get the base package name from a package import path
     * @param {string} importPath - Package import path
     * @returns {string} Base package name
     */
    getBasePackageName(importPath) {
        if (importPath.startsWith('@')) {
            const parts = importPath.split('/');
            return parts.slice(0, 2).join('/');
        }
        return importPath.split('/')[0];
    }

    /**
     * Get all nodes
     * @returns {Map} Node map
     */
    getNodes() {
        return this.nodes;
    }

    /**
     * Get all edges
     * @returns {Map} Edge map
     */
    getEdges() {
        return this.edges;
    }

    /**
     * Get adjacency list
     * @returns {Map} Adjacency map
     */
    getAdjacency() {
        return this.adjacency;
    }

    /**
     * Get dependents of a node (what depends on this)
     * @param {string} nodeId - Node identifier
     * @returns {Set} Set of dependent node IDs
     */
    getDependents(nodeId) {
        const dependents = new Set();
        
        for (const [from, toSet] of this.adjacency) {
            if (toSet.has(nodeId)) {
                dependents.add(from);
            }
        }
        
        return dependents;
    }

    /**
     * Get dependencies of a node (what this depends on)
     * @param {string} nodeId - Node identifier
     * @returns {Set} Set of dependency node IDs
     */
    getDependencies(nodeId) {
        return this.adjacency.get(nodeId) || new Set();
    }
}

module.exports = DependencyGraph;
