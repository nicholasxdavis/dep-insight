const fs = require('fs');
const path = require('path');

class HtmlReporter {
    constructor(graph, options = {}) {
        this.graph = graph;
        this.options = {
            circularDependencies: [],
            healthScores: new Map(),
            ...options
        };
    }

    /**
     * Generate HTML report
     * @param {string} outputPath - Path to output HTML file
     * @returns {Promise<string>} Path to generated HTML file
     */
    async generate(outputPath) {
        const html = this.buildHtml();
        
        if (!outputPath) {
            outputPath = path.join(process.cwd(), 'dep-insight-report.html');
        }
        
        fs.writeFileSync(outputPath, html, 'utf8');
        
        return outputPath;
    }

    /**
     * Build HTML content
     * @returns {string} HTML content
     */
    buildHtml() {
        const nodes = this.graph.getNodes();
        const edges = this.graph.getEdges();
        
        const circularData = JSON.stringify(this.options.circularDependencies);
        const healthData = JSON.stringify(Array.from(this.options.healthScores.entries()));
        
        // Convert nodes and edges to JSON for the visualization
        const graphData = {
            nodes: Array.from(nodes.values()).map(n => ({
                id: n.id,
                type: n.type,
                name: n.name || n.id,
                version: n.version
            })),
            edges: Array.from(edges.values()).map(e => ({
                from: e.from,
                to: e.to,
                type: e.type
            }))
        };
        
        const graphJson = JSON.stringify(graphData);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dep Insight - Dependency Analysis</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background: radial-gradient(circle at top, #0f172a, #020617);
            color: #f1f5f9;
            min-height: 100vh;
            line-height: 1.5;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        header {
            margin-bottom: 40px;
            text-align: center;
        }
        
        h1 {
            font-size: 3rem;
            font-weight: 700;
            background: linear-gradient(to right, #38bdf8, #818cf8, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
            letter-spacing: -0.025em;
        }
        
        .subtitle {
            font-size: 1.1rem;
            color: #94a3b8;
            font-weight: 300;
        }
        
        .tabs {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 30px;
            background: rgba(15, 23, 42, 0.4);
            padding: 6px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            max-width: max-content;
            margin-left: auto;
            margin-right: auto;
        }
        
        .tab {
            padding: 10px 24px;
            cursor: pointer;
            background: transparent;
            border: none;
            color: #94a3b8;
            font-weight: 500;
            border-radius: 8px;
            transition: all 0.2s ease-in-out;
            font-size: 0.95rem;
        }
        
        .tab:hover {
            color: #f8fafc;
            background: rgba(255, 255, 255, 0.03);
        }
        
        .tab.active {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.3);
        }
        
        .tab-content {
            display: none;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 30px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.4s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .tab-content.active {
            display: block;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 24px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 24px;
            border-radius: 12px;
            text-align: center;
            transition: transform 0.2s, border-color 0.2s;
        }
        
        .summary-card:hover {
            transform: translateY(-4px);
            border-color: rgba(56, 189, 248, 0.3);
            background: rgba(30, 41, 59, 0.6);
        }
        
        .summary-card h3 {
            color: #94a3b8;
            font-size: 0.95rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
        }
        
        .summary-card .value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #f8fafc;
            background: linear-gradient(to right, #f8fafc, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .grid-layout {
            display: grid;
            grid-template-columns: 1fr;
            gap: 30px;
        }
        
        @media (min-width: 1024px) {
            .grid-layout {
                grid-template-columns: 3fr 1fr;
            }
        }
        
        #graph-container {
            width: 100%;
            height: 650px;
            background: rgba(15, 23, 42, 0.8);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            overflow: hidden;
        }
        
        .sidebar {
            background: rgba(30, 41, 59, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 24px;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .sidebar h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #38bdf8;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 10px;
        }
        
        .sidebar-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .sidebar-label {
            font-size: 0.8rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .sidebar-value {
            font-size: 1rem;
            color: #f8fafc;
            word-break: break-all;
        }
        
        .list-container {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.2);
        }
        
        .list-item {
            padding: 6px 10px;
            font-size: 0.9rem;
            border-radius: 4px;
            color: #cbd5e1;
        }
        
        .list-item:nth-child(even) {
            background: rgba(255, 255, 255, 0.02);
        }
        
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 15px;
        }
        
        th, td {
            padding: 14px 16px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        th {
            background: rgba(30, 41, 59, 0.5);
            color: #38bdf8;
            font-weight: 600;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        th:first-child { border-top-left-radius: 8px; }
        th:last-child { border-top-right-radius: 8px; }
        
        tr:hover td {
            background: rgba(255, 255, 255, 0.02);
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            letter-spacing: 0.025em;
        }
        
        .badge-A { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-B { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
        .badge-C { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-D { background: rgba(249, 115, 22, 0.15); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.3); }
        .badge-F { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
        
        .btn {
            background: linear-gradient(135deg, #38bdf8, #6366f1);
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.1s;
            font-size: 0.95rem;
        }
        
        .btn:hover {
            opacity: 0.9;
        }
        
        .btn:active {
            transform: scale(0.98);
        }
        
        .btn-outline {
            background: transparent;
            border: 1px solid rgba(56, 189, 248, 0.4);
            color: #38bdf8;
            outline: none;
        }
        
        .btn-outline:hover {
            background: rgba(56, 189, 248, 0.08);
        }
        
        .search-box {
            position: relative;
            margin-bottom: 20px;
        }
        
        .search-box input {
            width: 100%;
            padding: 12px 16px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #f8fafc;
            border-radius: 8px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .search-box input:focus {
            border-color: #38bdf8;
        }
        
        .input-group {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
        }
        
        .input-group input {
            flex: 1;
            padding: 12px 16px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #f8fafc;
            border-radius: 8px;
            font-size: 1rem;
            outline: none;
        }
        
        .input-group input:focus {
            border-color: #38bdf8;
        }
        
        .impact-results-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
            margin-top: 24px;
        }
        
        @media (min-width: 768px) {
            .impact-results-container {
                grid-template-columns: 1fr 1.5fr;
            }
        }
        
        .panel {
            background: rgba(30, 41, 59, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 24px;
            border-radius: 12px;
        }
        
        .panel h3 {
            font-size: 1.2rem;
            margin-bottom: 16px;
            color: #38bdf8;
        }
        
        .risk-meter {
            height: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            overflow: hidden;
            margin: 15px 0;
            position: relative;
        }
        
        .risk-fill {
            height: 100%;
            width: 0;
            transition: width 0.8s ease-in-out, background-color 0.8s;
        }
        
        .risk-text {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        
        .recommendation-list {
            margin-left: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            color: #cbd5e1;
        }
        
        .recommendation-list li {
            font-size: 0.95rem;
        }
        
        .health-summary-panel {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .health-metric-card {
            background: rgba(30, 41, 59, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.03);
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }
        
        .health-metric-card .title {
            font-size: 0.8rem;
            color: #94a3b8;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        
        .health-metric-card .num {
            font-size: 1.75rem;
            font-weight: 600;
        }
        
        .success-text {
            color: #10b981;
            font-weight: 500;
        }
        
        .details-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 0.85rem;
            color: #94a3b8;
            list-style: none;
        }
        
        .details-list li {
            padding-left: 12px;
            position: relative;
        }
        
        .details-list li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #38bdf8;
        }
    </style>
    <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
</head>
<body>
    <div class="container">
        <header>
            <h1>Dep Insight</h1>
            <p class="subtitle">Interactive Dependency Analysis and Impact Assessment</p>
        </header>
        
        <div class="tabs">
            <button id="tab-btn-summary" class="tab active" onclick="showTab('summary', this)">Summary</button>
            <button id="tab-btn-graph" class="tab" onclick="showTab('graph', this)">Graph</button>
            <button id="tab-btn-circular" class="tab" onclick="showTab('circular', this)">Circular Dependencies</button>
            <button id="tab-btn-health" class="tab" onclick="showTab('health', this)">Health Scores</button>
            <button id="tab-btn-impact" class="tab" onclick="showTab('impact', this)">Impact Analysis</button>
        </div>
        
        <div id="summary" class="tab-content active">
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Files</h3>
                    <div class="value" id="total-files">0</div>
                </div>
                <div class="summary-card">
                    <h3>Total Packages</h3>
                    <div class="value" id="total-packages">0</div>
                </div>
                <div class="summary-card">
                    <h3>Total Dependencies</h3>
                    <div class="value" id="total-deps">0</div>
                </div>
                <div class="summary-card">
                    <h3>Circular Dependencies</h3>
                    <div class="value" id="total-circular">0</div>
                </div>
            </div>
        </div>
        
        <div id="graph" class="tab-content">
            <div class="search-box">
                <input type="text" id="graph-search" placeholder="Search nodes by path or package name..." onkeyup="filterGraph()">
            </div>
            <div class="grid-layout">
                <div id="graph-container"></div>
                <div class="sidebar">
                    <h3>Node Details</h3>
                    <div class="sidebar-item">
                        <div class="sidebar-label">Name</div>
                        <div class="sidebar-value" id="sidebar-name">No node selected</div>
                    </div>
                    <div class="sidebar-item">
                        <div class="sidebar-label">Type</div>
                        <div class="sidebar-value" id="sidebar-type">-</div>
                    </div>
                    <div class="sidebar-item">
                        <div class="sidebar-label">Full Path</div>
                        <div class="sidebar-value" id="sidebar-path">-</div>
                    </div>
                    <div class="sidebar-item">
                        <div class="sidebar-label">Direct Dependencies</div>
                        <div class="list-container" id="sidebar-deps">
                            <div style="color: #64748b; font-size: 0.9rem;">Select a node in the graph to view details.</div>
                        </div>
                    </div>
                    <div class="sidebar-item">
                        <div class="sidebar-label">Direct Dependents</div>
                        <div class="list-container" id="sidebar-dependents">
                            <div style="color: #64748b; font-size: 0.9rem;">Select a node in the graph to view details.</div>
                        </div>
                    </div>
                    <div id="sidebar-action" style="display: none; margin-top: 10px;"></div>
                </div>
            </div>
        </div>
        
        <div id="circular" class="tab-content">
            <h2 style="margin-bottom: 20px;">Circular Dependencies</h2>
            <div id="circular-list"></div>
        </div>
        
        <div id="health" class="tab-content">
            <h2 style="margin-bottom: 20px;">Dependency Health Scores</h2>
            <div class="health-summary-panel" id="health-summary"></div>
            <table>
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Version</th>
                        <th>Grade</th>
                        <th>Score</th>
                        <th>Issues and Maintenance Info</th>
                    </tr>
                </thead>
                <tbody id="health-table"></tbody>
            </table>
        </div>
        
        <div id="impact" class="tab-content">
            <h2 style="margin-bottom: 20px;">Impact Analysis</h2>
            <div class="input-group">
                <input type="text" list="files-list" id="impact-file" placeholder="Search or select a file path...">
                <datalist id="files-list"></datalist>
                <button class="btn" onclick="analyzeImpact()">Analyze Impact</button>
            </div>
            <div id="impact-results" class="impact-results-container" style="display: none;"></div>
        </div>
    </div>
    
    <script>
        const graphData = ${graphJson};
        const circularData = ${circularData};
        const healthData = ${healthData};
        
        let network = null;
        
        function showTab(tabId, el) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const btn = el || document.getElementById('tab-btn-' + tabId);
            if (btn) btn.classList.add('active');
            
            document.getElementById(tabId).classList.add('active');
            
            if (tabId === 'graph' && network) {
                network.fit();
            }
        }
        
        function initSummary() {
            const fileCount = graphData.nodes.filter(n => n.type === 'file').length;
            const packageCount = graphData.nodes.filter(n => n.type === 'package').length;
            
            document.getElementById('total-files').textContent = fileCount;
            document.getElementById('total-packages').textContent = packageCount;
            document.getElementById('total-deps').textContent = graphData.edges.length;
            document.getElementById('total-circular').textContent = circularData.length;
        }
        
        function initCircular() {
            const container = document.getElementById('circular-list');
            
            if (circularData.length === 0) {
                container.innerHTML = '<div class="panel"><p class="success-text" style="font-size: 1.1rem;">No circular dependencies found in this project.</p></div>';
                return;
            }
            
            let html = '<table><thead><tr><th>Cycle</th><th>Dependency Loop Path</th></tr></thead><tbody>';
            
            circularData.forEach((cycle, i) => {
                html += '<tr><td><strong>Cycle ' + (i + 1) + '</strong></td><td>' + cycle.join(' &rarr; ') + '</td></tr>';
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
        }
        
        function initHealth() {
            const tbody = document.getElementById('health-table');
            const summaryContainer = document.getElementById('health-summary');
            
            if (healthData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">No health data available</td></tr>';
                return;
            }
            
            let html = '';
            let excellent = 0;
            let good = 0;
            let fair = 0;
            let poor = 0;
            let critical = 0;
            
            healthData.forEach(([name, score]) => {
                const grade = score.grade || 'A';
                if (grade === 'A') excellent++;
                else if (grade === 'B') good++;
                else if (grade === 'C') fair++;
                else if (grade === 'D') poor++;
                else critical++;
                
                const badgeClass = 'badge badge-' + grade;
                
                const allDetails = [];
                if (score.issues) score.issues.forEach(i => allDetails.push(i));
                if (score.warnings) score.warnings.forEach(w => allDetails.push(w));
                if (score.info) score.info.forEach(inf => allDetails.push(inf));
                
                const detailsText = allDetails.length > 0 
                    ? '<ul class="details-list">' + allDetails.map(d => '<li>' + d + '</li>').join('') + '</ul>'
                    : '<span class="success-text">Excellent health</span>';
                
                html += '<tr>';
                html += '<td><strong style="color: #f8fafc;">' + name + '</strong></td>';
                html += '<td>' + score.version + '</td>';
                html += '<td><span class="' + badgeClass + '">' + grade + '</span></td>';
                html += '<td><strong style="font-size: 1.1rem; color: #f8fafc;">' + score.score + '</strong>/100</td>';
                html += '<td>' + detailsText + '</td>';
                html += '</tr>';
            });
            
            tbody.innerHTML = html;
            
            summaryContainer.innerHTML = 
                '<div class="health-metric-card">' +
                    '<div class="title" style="color: #10b981;">Excellent (A)</div>' +
                    '<div class="num" style="color: #10b981;">' + excellent + '</div>' +
                '</div>' +
                '<div class="health-metric-card">' +
                    '<div class="title" style="color: #38bdf8;">Good (B)</div>' +
                    '<div class="num" style="color: #38bdf8;">' + good + '</div>' +
                '</div>' +
                '<div class="health-metric-card">' +
                    '<div class="title" style="color: #f59e0b;">Fair (C)</div>' +
                    '<div class="num" style="color: #f59e0b;">' + fair + '</div>' +
                '</div>' +
                '<div class="health-metric-card">' +
                    '<div class="title" style="color: #f97316;">Poor (D)</div>' +
                    '<div class="num" style="color: #f97316;">' + poor + '</div>' +
                '</div>' +
                '<div class="health-metric-card">' +
                    '<div class="title" style="color: #ef4444;">Critical (F)</div>' +
                    '<div class="num" style="color: #ef4444;">' + critical + '</div>' +
                '</div>';
        }
        
        function initGraph() {
            const container = document.getElementById('graph-container');
            
            const colors = {
                project: { background: '#10b981', border: '#059669', highlight: { background: '#34d399', border: '#10b981' } },
                package: { background: '#a855f7', border: '#7e22ce', highlight: { background: '#c084fc', border: '#a855f7' } },
                file: { background: '#3b82f6', border: '#1d4ed8', highlight: { background: '#60a5fa', border: '#3b82f6' } }
            };
            
            const nodes = graphData.nodes.map(n => {
                const col = colors[n.type] || colors.file;
                return {
                    id: n.id,
                    label: n.name,
                    title: n.id + (n.version ? ' (v' + n.version + ')' : ''),
                    shape: 'dot',
                    size: n.type === 'project' ? 22 : n.type === 'package' ? 18 : 12,
                    color: {
                        background: col.background,
                        border: col.border,
                        highlight: col.highlight
                    },
                    font: {
                        color: '#f8fafc',
                        face: 'Outfit',
                        size: 11
                    },
                    borderWidth: 2,
                    shadow: true
                };
            });
            
            const edges = graphData.edges.map(e => ({
                from: e.from,
                to: e.to,
                arrows: {
                    to: { enabled: true, scaleFactor: 0.5 }
                },
                color: {
                    color: 'rgba(148, 163, 184, 0.3)',
                    highlight: '#38bdf8'
                },
                width: 1.5,
                smooth: {
                    type: 'continuous',
                    roundness: 0.5
                }
            }));
            
            const data = {
                nodes: new vis.DataSet(nodes),
                edges: new vis.DataSet(edges)
            };
            
            const options = {
                physics: {
                    solver: 'forceAtlas2Based',
                    forceAtlas2Based: {
                        gravitationalConstant: -50,
                        centralGravity: 0.01,
                        springLength: 100,
                        springConstant: 0.08
                    },
                    stabilization: {
                        iterations: 150,
                        updateInterval: 25
                    }
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 200,
                    selectable: true
                }
            };
            
            network = new vis.Network(container, data, options);
            
            network.on('click', function(params) {
                if (params.nodes.length > 0) {
                    const selectedNodeId = params.nodes[0];
                    updateSidebar(selectedNodeId);
                } else {
                    resetSidebar();
                }
            });
        }
        
        function updateSidebar(nodeId) {
            const node = graphData.nodes.find(n => n.id === nodeId);
            if (!node) return;
            
            document.getElementById('sidebar-name').textContent = node.name;
            document.getElementById('sidebar-type').textContent = node.type.toUpperCase();
            document.getElementById('sidebar-path').textContent = node.id;
            
            const deps = graphData.edges.filter(e => e.from === nodeId).map(e => e.to);
            const dependents = graphData.edges.filter(e => e.to === nodeId).map(e => e.from);
            
            const depsContainer = document.getElementById('sidebar-deps');
            if (deps.length === 0) {
                depsContainer.innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">None</div>';
            } else {
                depsContainer.innerHTML = deps.map(d => '<div class="list-item">' + d + '</div>').join('');
            }
            
            const dependentsContainer = document.getElementById('sidebar-dependents');
            if (dependents.length === 0) {
                dependentsContainer.innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">None</div>';
            } else {
                dependentsContainer.innerHTML = dependents.map(d => '<div class="list-item">' + d + '</div>').join('');
            }
            
            const actionContainer = document.getElementById('sidebar-action');
            actionContainer.style.display = 'block';
            actionContainer.innerHTML = '<button class="btn btn-outline" style="width: 100%;" id="sidebar-analyze-btn">Analyze Change Impact</button>';
            document.getElementById('sidebar-analyze-btn').onclick = function() {
                analyzeNodeImpact(nodeId);
            };
        }
        
        function resetSidebar() {
            document.getElementById('sidebar-name').textContent = 'No node selected';
            document.getElementById('sidebar-type').textContent = '-';
            document.getElementById('sidebar-path').textContent = '-';
            document.getElementById('sidebar-deps').innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">Select a node in the graph to view details.</div>';
            document.getElementById('sidebar-dependents').innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">Select a node in the graph to view details.</div>';
            document.getElementById('sidebar-action').style.display = 'none';
        }
        
        function analyzeNodeImpact(nodeId) {
            document.getElementById('impact-file').value = nodeId;
            showTab('impact');
            analyzeImpact();
        }
        
        function filterGraph() {
            const search = document.getElementById('graph-search').value.toLowerCase();
            if (!network) return;
            
            if (search === '') {
                network.fit();
                return;
            }
            
            const matchingNodeIds = graphData.nodes
                .filter(n => n.name.toLowerCase().includes(search) || n.id.toLowerCase().includes(search))
                .map(n => n.id);
            
            if (matchingNodeIds.length > 0) {
                network.selectNodes(matchingNodeIds);
                network.focus(matchingNodeIds[0], {
                    scale: 1.4,
                    animation: {
                        duration: 500,
                        easingFunction: 'easeInOutQuad'
                    }
                });
                updateSidebar(matchingNodeIds[0]);
            }
        }
        
        function initImpactAutocomplete() {
            const datalist = document.getElementById('files-list');
            const options = graphData.nodes
                .filter(n => n.type !== 'project')
                .map(n => '<option value="' + n.id + '">')
                .join('');
            datalist.innerHTML = options;
        }
        
        function analyzeImpact() {
            const filePath = document.getElementById('impact-file').value.trim();
            const resultsDiv = document.getElementById('impact-results');
            
            if (!filePath) {
                alert('Please enter or select a file path');
                return;
            }
            
            const node = graphData.nodes.find(n => n.id === filePath);
            
            if (!node) {
                resultsDiv.innerHTML = '<p style="color: #ef4444; font-weight: 500;">File or package not found in dependency graph</p>';
                return;
            }
            
            const direct = graphData.edges.filter(e => e.to === filePath).map(e => e.from);
            const transitive = getTransitiveDependents(filePath);
            
            let level = 'low';
            let color = '#10b981';
            let percent = 25;
            
            if (transitive.length > 50) {
                level = 'critical';
                color = '#ef4444';
                percent = 100;
            } else if (transitive.length > 20) {
                level = 'high';
                color = '#f97316';
                percent = 75;
            } else if (transitive.length > 10) {
                level = 'medium';
                color = '#f59e0b';
                percent = 50;
            } else if (direct.length > 5) {
                level = 'medium';
                color = '#f59e0b';
                percent = 50;
            }
            
            const recommendations = getRecommendations(level);
            
            resultsDiv.style.display = 'grid';
            resultsDiv.innerHTML = 
                '<div class="panel">' +
                    '<h3>Impact Severity</h3>' +
                    '<div class="risk-text" style="color: ' + color + ';">' + level + ' impact</div>' +
                    '<div class="risk-meter">' +
                        '<div class="risk-fill" style="width: ' + percent + '%; background-color: ' + color + ';"></div>' +
                    '</div>' +
                    '<div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">' +
                        '<div class="health-metric-card">' +
                            '<div class="title">Direct Dependents</div>' +
                            '<div class="num">' + direct.length + '</div>' +
                        '</div>' +
                        '<div class="health-metric-card">' +
                            '<div class="title">Transitive Dependents</div>' +
                            '<div class="num">' + transitive.length + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="panel">' +
                    '<h3>Change Recommendations</h3>' +
                    '<ul class="recommendation-list" style="margin-bottom: 20px;">' +
                        recommendations.map(function(r) { return '<li>' + r + '</li>'; }).join('') +
                    '</ul>' +
                    '<h3>Affected Files Propagation Path</h3>' +
                    '<div class="list-container" style="max-height: 250px; margin-top: 10px;">' +
                        (transitive.length === 0 ? '<div style="color: #64748b; padding: 10px;">No other files are affected by changing this file.</div>' : 
                          transitive.map(function(t) { return '<div class="list-item">' + t + '</div>'; }).join('')) +
                    '</div>' +
                '</div>';
        }
        
        function getTransitiveDependents(nodeId) {
            const transitive = new Set();
            const queue = [nodeId];
            const visited = new Set();
            
            while (queue.length > 0) {
                const current = queue.shift();
                
                if (visited.has(current)) continue;
                visited.add(current);
                
                const dependents = graphData.edges.filter(e => e.to === current).map(e => e.from);
                
                dependents.forEach(dep => {
                    if (!visited.has(dep) && dep !== nodeId) {
                        transitive.add(dep);
                        queue.push(dep);
                    }
                });
            }
            
            return Array.from(transitive);
        }
        
        function getRecommendations(level) {
            const recommendations = {
                critical: [
                    'Consider breaking this file into smaller modules',
                    'Run full test suite before deploying',
                    'Notify team members of high-risk change',
                    'Consider feature flagging the change'
                ],
                high: [
                    'Run comprehensive tests',
                    'Review all affected files'
                ],
                medium: [
                    'Run related tests',
                    'Review direct dependents'
                ],
                low: [
                    'Run unit tests for the file'
                ]
            };
            
            return recommendations[level] || recommendations.low;
        }
        
        // Initialize
        initSummary();
        initCircular();
        initHealth();
        initGraph();
        initImpactAutocomplete();
    </script>
</body>
</html>`;
    }
}

module.exports = HtmlReporter;
