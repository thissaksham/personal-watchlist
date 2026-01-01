
const today = new Date();
today.setHours(0, 0, 0, 0);
console.log('Today (Local Midnight):', today.toString());

const dateStr = "2026-01-01";

// Proposed Fix: Parse manually to avoid UTC offset issues
function parseLocal(str) {
    const parts = str.split('-');
    if (parts.length === 3) {
        // new Date(y, mIndex, d) creates Local Date at 00:00
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(str);
}

const target = parseLocal(dateStr);
console.log('Target (Parse Local):', target.toString());
console.log('Target > Today:', target > today); // Should be false for same day

// Test previous day
const prevStr = "2025-12-31";
const prevTarget = parseLocal(prevStr);
console.log('Prev Target (Parse Local):', prevTarget.toString());
console.log('Prev Target > Today:', prevTarget > today); // Should be false

// Test future day
const futureStr = "2026-01-02";
const futureTarget = parseLocal(futureStr);
console.log('Future Target (Parse Local):', futureTarget.toString());
console.log('Future Target > Today:', futureTarget > today); // Should be true
