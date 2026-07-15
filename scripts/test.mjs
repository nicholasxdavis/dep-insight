import DepInsight from '../lib/index.js';

console.log('Testing @blacnova/dep-insight...');

const di = new DepInsight({
    rootDir: process.cwd()
});

try {
    // Test 1: Build graph
    console.log('Test 1: Building dependency graph...');
    await di.build();
    const graph = di.graph;
    console.log('✓ Graph built successfully');
    console.log(`  Nodes: ${graph.getNodes().size}`);
    console.log(`  Edges: ${graph.getEdges().size}`);
    
    // Test 2: Circular detection
    console.log('\nTest 2: Detecting circular dependencies...');
    const circular = di.detectCircular();
    console.log(`✓ Found ${circular.length} circular dependencies`);
    
    // Test 3: Health scoring
    console.log('\nTest 3: Scoring dependency health...');
    const healthScores = await di.scoreHealth();
    console.log(`✓ Scored ${healthScores.size} dependencies`);
    
    // Test 4: Console report
    console.log('\nTest 4: Generating console report...');
    di.reportConsole();
    console.log('✓ Console report generated');
    
    // Test 5: Impact analysis
    console.log('\nTest 5: Testing impact analysis...');
    const nodes = graph.getNodes();
    const firstFile = Array.from(nodes.keys()).find(id => nodes.get(id).type === 'file');
    if (firstFile) {
        const impact = di.analyzeImpact(firstFile);
        console.log(`✓ Impact analysis for ${firstFile}`);
        console.log(`  Impact level: ${impact.impact.level}`);
        console.log(`  Total affected: ${impact.totalAffected}`);
    } else {
        console.log('  No files found for impact analysis test');
    }
    
    // Test 6: HTML report
    console.log('\nTest 6: Generating HTML report...');
    const htmlPath = await di.reportHtml('./test-report.html');
    console.log(`✓ HTML report generated: ${htmlPath}`);
    
    console.log('\n✅ All tests passed!');
} catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}
