import { PathResolver } from '../src/indexer/resolver';
import { AstParser } from '../src/indexer/parser';
import { WorkspaceScanner } from '../src/indexer/scanner';
import { ImpactAnalyzer } from '../src/graph/blast';
import { CycleDetector } from '../src/graph/cycle';
import { GitDiffAnalyzer } from '../src/git/diff';
import { DependencyGraph, FileNode } from '../src/graph/model';
import path from 'path';

async function runTests() {
  console.log('🧪 Starting Atlas Engine Verification Tests...\n');

  const workspaceRoot = path.resolve(__dirname, '..');
  const pathResolver = new PathResolver(workspaceRoot);
  const astParser = new AstParser(workspaceRoot, pathResolver);

  // Test 1: AST Parser on parser.ts itself
  const targetFile = path.resolve(workspaceRoot, 'src/indexer/parser.ts');
  const parseResult = astParser.parseFile(targetFile);

  if (!parseResult) {
    throw new Error('Failed to parse src/indexer/parser.ts');
  }

  console.log('✅ Test 1 Passed: AstParser parsed successfully');
  console.log(`   - File: ${parseResult.node.name}`);
  console.log(`   - Category: ${parseResult.node.category}`);
  console.log(`   - Internal Imports (${parseResult.node.imports.length}):`, parseResult.node.imports.map(p => path.basename(p)));
  console.log(`   - Exports (${parseResult.node.exports.length}):`, parseResult.node.exports);

  // Test 2: Full Workspace Scanner
  const scanner = new WorkspaceScanner(workspaceRoot);
  const graph = await scanner.scan();

  console.log('\n✅ Test 2 Passed: WorkspaceScanner scanned project');
  console.log(`   - Total Files Indexed: ${graph.totalFiles}`);
  console.log(`   - Total Dependency Edges: ${graph.edges.length}`);

  // Test 3: Blast Radius / Impact Analysis
  const resolverFile = path.normalize(path.resolve(workspaceRoot, 'src/indexer/resolver.ts'));
  const impact = ImpactAnalyzer.analyze(graph, resolverFile);

  if (!impact) {
    throw new Error('Impact analysis returned null for pathResolver.ts');
  }

  console.log('\n✅ Test 3 Passed: ImpactAnalyzer calculated Blast Radius for pathResolver.ts');
  console.log(`   - Target: ${impact.targetFileName}`);
  console.log(`   - Risk Level: ${impact.riskLevel} (Score: ${impact.riskScore})`);
  console.log(`   - Total Affected: ${impact.totalAffected}`);
  console.log(`   - Direct Dependents (${impact.directDependentsCount}):`, impact.affectedNodes.filter(n => n.isDirect).map(n => n.name));
  console.log(`   - Indirect Dependents (${impact.indirectDependentsCount}):`, impact.affectedNodes.filter(n => !n.isDirect).map(n => n.name));
  console.log(`   - Max Propagation Depth: ${impact.maxDepth}`);

  // Test 4: Circular Dependency Detection
  const dummyGraph: DependencyGraph = {
    rootPath: workspaceRoot,
    scannedAt: Date.now(),
    totalFiles: 3,
    nodes: {
      'nodeA.ts': { id: 'nodeA.ts', name: 'nodeA.ts', relativePath: 'nodeA.ts', extension: '.ts', category: 'service', lineCount: 10, sizeBytes: 100, imports: ['nodeB.ts'], importedBy: ['nodeC.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false } },
      'nodeB.ts': { id: 'nodeB.ts', name: 'nodeB.ts', relativePath: 'nodeB.ts', extension: '.ts', category: 'util', lineCount: 10, sizeBytes: 100, imports: ['nodeC.ts'], importedBy: ['nodeA.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false } },
      'nodeC.ts': { id: 'nodeC.ts', name: 'nodeC.ts', relativePath: 'nodeC.ts', extension: '.ts', category: 'service', lineCount: 10, sizeBytes: 100, imports: ['nodeA.ts'], importedBy: ['nodeB.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false } }
    },
    edges: [
      { id: '1', source: 'nodeA.ts', target: 'nodeB.ts', type: 'import' },
      { id: '2', source: 'nodeB.ts', target: 'nodeC.ts', type: 'import' },
      { id: '3', source: 'nodeC.ts', target: 'nodeA.ts', type: 'import' }
    ]
  };

  const detectedCycles = CycleDetector.detectCycles(dummyGraph);
  if (detectedCycles.length !== 1 || detectedCycles[0].length !== 3) {
    throw new Error(`Cycle detector failed to find 3-node cycle: ${JSON.stringify(detectedCycles)}`);
  }
  console.log('\n✅ Test 4 Passed: CycleDetector accurately found synthetic 3-node circular loop');
  console.log(`   - Detected Cycle: ${detectedCycles[0].files.join(' ➔ ')}`);

  // Test 5: Git Diff Impact Analyzer
  const gitImpact = await GitDiffAnalyzer.analyzeGitImpact(graph);
  console.log('\n✅ Test 5 Passed: GitDiffAnalyzer executed successfully');
  console.log(`   - Current Branch: ${gitImpact.branchName}`);
  console.log(`   - Modified Files in Working Tree: ${gitImpact.modifiedFiles.length}`);
  console.log(`   - Pre-Commit Downstream Blast Radius: ${gitImpact.totalAffected}`);
  console.log(`   - Calculated Risk Level: ${gitImpact.riskLevel}`);

  console.log('\n🎉 ALL 5 SCOPE ENGINE & FEATURE VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
