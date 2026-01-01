
const today = new Date();
today.setHours(0, 0, 0, 0);
console.log('Today (Local Midnight):', today.toString());
console.log('Today (ISO):', today.toISOString());
console.log('Today (getTime):', today.getTime());

const dateStr = "2026-01-01";
const target = new Date(dateStr);
console.log('Target (Raw Parse):', target.toString());
console.log('Target (ISO):', target.toISOString());
console.log('Target (getTime):', target.getTime());

console.log('Target > Today:', target > today);

// fix approach
const targetFixed = new Date(dateStr);
targetFixed.setHours(0, 0, 0, 0);
console.log('Target Fixed (Local Midnight):', targetFixed.toString());
console.log('Target Fixed > Today:', targetFixed > today);
