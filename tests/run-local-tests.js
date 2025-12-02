/**
 * Automated Test Runner for Local Server
 * Run with: node run-local-tests.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const ADMIN_KEY = 'admin123';
const USER_KEY = 'user123';

// Test results
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

// Helper to make HTTP requests
function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        if (data && method === 'POST') {
            const params = new URLSearchParams(data);
            req.write(params.toString());
        }

        req.end();
    });
}

// Helper to run a test
async function runTest(name, testFn) {
    results.total++;
    try {
        await testFn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(`  ✓ ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: error.message });
        console.log(`  ✗ ${name}: ${error.message}`);
    }
}

// Helper to assert
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

// Main test suite
async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 RUNNING LOCAL SERVER TESTS');
    console.log('='.repeat(60) + '\n');

    // Test 1: Server Health
    console.log('📊 Server Health Tests\n');
    
    await runTest('Server is running', async () => {
        const result = await request('GET', '/debug');
        assert(result.expenses !== undefined, 'Server should respond with data');
    });

    await runTest('Debug endpoint returns stats', async () => {
        const result = await request('GET', '/debug');
        assert(result.stats !== undefined, 'Should have stats');
        assert(result.stats.totalExpenses >= 0, 'Should have expense count');
    });

    // Test 2: Authentication
    console.log('\n🔐 Authentication Tests\n');

    await runTest('Valid admin key accepted', async () => {
        const result = await request('GET', `/api?action=getExpenses&key=${ADMIN_KEY}`);
        assert(result.success === true, 'Should accept admin key');
    });

    await runTest('Valid user key accepted', async () => {
        const result = await request('GET', `/api?action=getExpenses&key=${USER_KEY}`);
        assert(result.success === true, 'Should accept user key');
    });

    await runTest('Invalid key rejected', async () => {
        const result = await request('GET', '/api?action=getExpenses&key=invalid123');
        assert(result.success === false, 'Should reject invalid key');
        assert(result.error === 'Invalid access key', 'Should have error message');
    });

    // Test 3: Read Operations
    console.log('\n📖 Read Operations Tests\n');

    await runTest('Get all expenses', async () => {
        const result = await request('GET', `/api?action=getExpenses&key=${ADMIN_KEY}`);
        assert(result.success === true, 'Should succeed');
        assert(Array.isArray(result.expenses), 'Should return expenses array');
    });

    await runTest('Get pending expenses (admin only)', async () => {
        const result = await request('GET', `/api?action=getPendingExpenses&key=${ADMIN_KEY}`);
        assert(result.success === true, 'Should succeed');
        assert(Array.isArray(result.pending), 'Should return pending array');
    });

    await runTest('Get pending expenses fails for user', async () => {
        const result = await request('GET', `/api?action=getPendingExpenses&key=${USER_KEY}`);
        assert(result.success === false, 'Should fail for non-admin');
        assert(result.error === 'Admin access required', 'Should have error message');
    });

    await runTest('Get participants', async () => {
        const result = await request('GET', `/api?action=getParticipants&key=${USER_KEY}`);
        assert(result.success === true, 'Should succeed');
        assert(Array.isArray(result.participants), 'Should return participants array');
        assert(result.participants.length >= 3, 'Should have initial participants');
    });

    // Test 4: ID Generation
    console.log('\n🔢 ID Generation Tests\n');

    let newExpenseId;
    
    await runTest('Auto-increment ID generation', async () => {
        const debugBefore = await request('GET', '/debug');
        const countBefore = debugBefore.stats.totalExpenses;
        
        const expense = {
            date: '2025-12-10',
            description: 'Test Expense',
            amount: 100,
            paidBy: 'Alice',
            splitBetween: ['Alice', 'Bob'],
            submittedBy: 'Alice'
        };
        
        const result = await request('POST', '/api', {
            action: 'addExpense',
            key: USER_KEY,
            expense: JSON.stringify(expense)
        });
        
        assert(result.success === true, 'Should add expense');
        assert(result.expense.id > 0, 'Should have numeric ID');
        newExpenseId = result.expense.id;
        
        const debugAfter = await request('GET', '/debug');
        assert(debugAfter.stats.totalExpenses === countBefore + 1, 'Should increment count');
    });

    // Test 5: Approval Workflow (No Duplicates!)
    console.log('\n✅ Approval Workflow Tests\n');

    await runTest('User expense starts as pending', async () => {
        const result = await request('GET', `/api?action=getPendingExpenses&key=${ADMIN_KEY}`);
        const pendingExpense = result.pending.find(e => e.id === newExpenseId);
        assert(pendingExpense !== undefined, 'Should find expense in pending');
        assert(pendingExpense.status === 'pending', 'Status should be pending');
    });

    await runTest('Approve expense by ID', async () => {
        const result = await request('POST', '/api', {
            action: 'approveExpense',
            key: ADMIN_KEY,
            id: newExpenseId
        });
        
        assert(result.success === true, 'Should approve successfully');
        assert(result.approvedBy === 'Admin', 'Should have approver name');
    });

    await runTest('Approved expense removed from pending', async () => {
        const result = await request('GET', `/api?action=getPendingExpenses&key=${ADMIN_KEY}`);
        const pendingExpense = result.pending.find(e => e.id === newExpenseId);
        assert(pendingExpense === undefined, 'Should not be in pending list');
    });

    await runTest('NO DUPLICATE ROW CREATED', async () => {
        const debug = await request('GET', '/debug');
        const matchingExpenses = debug.expenses.filter(e => e.id === newExpenseId);
        assert(matchingExpenses.length === 1, `Should have exactly 1 row with ID ${newExpenseId}, found ${matchingExpenses.length}`);
    });

    await runTest('Approved expense status updated', async () => {
        const result = await request('GET', `/api?action=getExpenses&key=${USER_KEY}`);
        const expense = result.expenses.find(e => e.id === newExpenseId);
        assert(expense !== undefined, 'Should find expense');
        assert(expense.status === 'approved', 'Status should be approved');
    });

    // Test 6: ID Immutability
    console.log('\n🔒 ID Immutability Tests\n');

    let testExpenseId;

    await runTest('Create expense with ID', async () => {
        const expense = {
            date: '2025-12-11',
            description: 'ID Test Expense',
            amount: 200,
            paidBy: 'Bob',
            splitBetween: ['Bob', 'Charlie'],
            submittedBy: 'Bob'
        };
        
        const result = await request('POST', '/api', {
            action: 'addExpense',
            key: USER_KEY,
            expense: JSON.stringify(expense)
        });
        
        testExpenseId = result.expense.id;
        assert(typeof testExpenseId === 'number', 'ID should be number');
    });

    await runTest('Update expense preserves ID', async () => {
        const updatedExpense = {
            date: '2025-12-12',
            description: 'Updated Description',
            amount: 250,
            paidBy: 'Bob',
            splitBetween: ['Bob', 'Charlie'],
            userName: 'Bob'
        };
        
        const result = await request('POST', '/api', {
            action: 'updateExpense',
            key: USER_KEY,
            id: testExpenseId,
            expense: JSON.stringify(updatedExpense)
        });
        
        assert(result.success === true, 'Update should succeed');
        
        // Verify ID unchanged
        const debug = await request('GET', '/debug');
        const expense = debug.expenses.find(e => e.id === testExpenseId);
        assert(expense !== undefined, 'Should still find expense');
        assert(expense.id === testExpenseId, 'ID should not change');
        assert(expense.description === 'Updated Description', 'Description should update');
    });

    // Test 7: String/Number ID Compatibility
    console.log('\n🔄 String/Number ID Tests\n');

    await runTest('Find expense with numeric ID', async () => {
        const result = await request('POST', '/api', {
            action: 'approveExpense',
            key: ADMIN_KEY,
            id: testExpenseId // numeric
        });
        assert(result.success === true, 'Should work with numeric ID');
    });

    await runTest('Find expense with string ID', async () => {
        const result = await request('POST', '/api', {
            action: 'approveExpense',
            key: ADMIN_KEY,
            id: String(testExpenseId) // string
        });
        assert(result.success === true, 'Should work with string ID');
    });

    // Test 8: Rejection Workflow
    console.log('\n❌ Rejection Tests\n');

    let rejectExpenseId;

    await runTest('Create expense to reject', async () => {
        const expense = {
            date: '2025-12-13',
            description: 'To Be Rejected',
            amount: 50,
            paidBy: 'Charlie',
            splitBetween: ['Charlie'],
            submittedBy: 'Charlie'
        };
        
        const result = await request('POST', '/api', {
            action: 'addExpense',
            key: USER_KEY,
            expense: JSON.stringify(expense)
        });
        
        rejectExpenseId = result.expense.id;
    });

    await runTest('Reject expense updates status', async () => {
        const result = await request('POST', '/api', {
            action: 'rejectExpense',
            key: ADMIN_KEY,
            id: rejectExpenseId
        });
        
        assert(result.success === true, 'Should reject successfully');
        
        // Verify status
        const debug = await request('GET', '/debug');
        const expense = debug.expenses.find(e => e.id === rejectExpenseId);
        assert(expense.status === 'rejected', 'Status should be rejected');
    });

    await runTest('Rejected expense not in pending', async () => {
        const result = await request('GET', `/api?action=getPendingExpenses&key=${ADMIN_KEY}`);
        const found = result.pending.find(e => e.id === rejectExpenseId);
        assert(found === undefined, 'Should not be in pending');
    });

    // Test 9: Participant Management
    console.log('\n👥 Participant Management Tests\n');

    await runTest('Add participant (admin only)', async () => {
        const result = await request('POST', '/api', {
            action: 'addParticipant',
            key: ADMIN_KEY,
            name: 'Dave'
        });
        
        assert(result.success === true, 'Should add participant');
        
        // Verify added
        const participants = await request('GET', `/api?action=getParticipants&key=${USER_KEY}`);
        assert(participants.participants.includes('Dave'), 'Should include new participant');
    });

    await runTest('Remove participant (admin only)', async () => {
        const result = await request('POST', '/api', {
            action: 'removeParticipant',
            key: ADMIN_KEY,
            name: 'Dave'
        });
        
        assert(result.success === true, 'Should remove participant');
        
        // Verify removed
        const participants = await request('GET', `/api?action=getParticipants&key=${USER_KEY}`);
        assert(!participants.participants.includes('Dave'), 'Should not include removed participant');
    });

    // Print Results
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total:  ${results.total}`);
    console.log(`✓ Pass: ${results.passed}`);
    console.log(`✗ Fail: ${results.failed}`);
    console.log('='.repeat(60));

    if (results.failed > 0) {
        console.log('\nFailed Tests:');
        results.tests.filter(t => t.status === 'FAIL').forEach(t => {
            console.log(`  ✗ ${t.name}: ${t.error}`);
        });
    }

    console.log(`\n${results.failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed'}\n`);

    return results.failed === 0 ? 0 : 1;
}

// Run tests
runTests().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error('\n❌ Test runner error:', error.message);
    process.exit(1);
});
