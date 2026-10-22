import assert from "node:assert";
import { getStore, isHackathonRecord, parseRecordAmount } from "../src/server/data/index.ts";

async function runTests() {
  console.log("=================================================");
  console.log("TESTING APPLICATION SEPARATION (INTERNSHIP vs HACKATHON)");
  console.log("=================================================\n");

  // Test 1: isHackathonRecord unit tests
  console.log("--- Test 1: isHackathonRecord Unit Tests ---");
  assert.strictEqual(isHackathonRecord({ amount: 99 }), true, "amount: 99 is hackathon");
  assert.strictEqual(isHackathonRecord({ amount: "99" }), true, "amount: '99' is hackathon");
  assert.strictEqual(isHackathonRecord({ amount: "₹99" }), true, "amount: '₹99' is hackathon");
  assert.strictEqual(isHackathonRecord({ amount: 9900 }), true, "amount: 9900 (paise) is hackathon");
  assert.strictEqual(isHackathonRecord({ paymentAmount: "99" }), true, "paymentAmount: '99' is hackathon");
  assert.strictEqual(isHackathonRecord({ domain: "hack2skill" }), true, "domain: hack2skill is hackathon");
  assert.strictEqual(isHackathonRecord({ event: "PromptWars" }), true, "event: PromptWars is hackathon");
  assert.strictEqual(isHackathonRecord({ program: "PromptWars x KickToTech" }), true, "program: PromptWars is hackathon");
  assert.strictEqual(isHackathonRecord({ teamName: "Alpha Squad" }), true, "teamName without mentor is hackathon");
  
  // Negative tests
  assert.strictEqual(isHackathonRecord({ domain: "python", amount: 449 }), false, "python 449 is internship");
  assert.strictEqual(isHackathonRecord({ domain: "java", amount: 449 }), false, "java 449 is internship");
  assert.strictEqual(isHackathonRecord({ domain: "python", mentorId: "m1", teamName: "intern team" }), false, "python with mentor is internship");
  console.log("✓ All isHackathonRecord assertions passed!");

  // Test 2: parseRecordAmount unit tests
  console.log("\n--- Test 2: parseRecordAmount Unit Tests ---");
  assert.strictEqual(parseRecordAmount({ amount: 99 }, 0), 99);
  assert.strictEqual(parseRecordAmount({ amount: "99" }, 0), 99);
  assert.strictEqual(parseRecordAmount({ amount: "₹99" }, 0), 99);
  assert.strictEqual(parseRecordAmount({ amount: 9900 }, 0), 99);
  assert.strictEqual(parseRecordAmount({ amount: 449 }, 0), 449);
  assert.strictEqual(parseRecordAmount({ amount: 44900 }, 0), 449);
  assert.strictEqual(parseRecordAmount({ amount: "₹449" }, 0), 449);
  console.log("✓ All parseRecordAmount assertions passed!");

  const store = getStore();

  // Test A: Create an internship application (₹449)
  const internshipId = store.newId();
  const internshipRecord = {
    id: internshipId,
    applicationId: "APP-INTERN-001",
    name: "Internship Candidate",
    email: "intern@example.com",
    phone: "9876543210",
    college: "Tech Institute of Engineering",
    domain: "python",
    mentorId: "mentor-py",
    mentorName: "Python Mentor",
    amount: 449,
    status: "PAYMENT_PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dedupeKey: "intern@example.com:python",
  };
  await store.createApplication(internshipRecord);
  console.log("\n✓ Created ₹449 Internship application");

  // Test B: Create a hackathon application (₹99)
  const hackathonId = store.newId();
  const hackathonRecord = {
    id: hackathonId,
    applicationId: "APP-HACK-001",
    name: "Hackathon Participant",
    email: "hacker@example.com",
    phone: "9123456789",
    college: "Silicon College",
    course: "Computer Science",
    year: "3rd",
    teamName: "Code Warriors",
    schoolName: "Code Warriors",
    domain: "hack2skill",
    amount: 99,
    status: "PAYMENT_VERIFIED",
    razorpayOrderId: "order_hack_123",
    razorpayPaymentId: "pay_hack_123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dedupeKey: "hacker@example.com:hack2skill",
  };
  await store.createApplication(hackathonRecord);
  console.log("✓ Created ₹99 Hackathon application with teamName and Razorpay IDs");

  // Test C: Verify listApplications returns both
  const allRows = await store.listApplications();
  assert.ok(allRows.some(r => r.applicationId === "APP-INTERN-001"), "Internship record must exist in store");
  assert.ok(allRows.some(r => r.applicationId === "APP-HACK-001"), "Hackathon record must exist in store");
  console.log("✓ Store contains both applications");

  // Test D: Simulate internship filtering logic (as in GET /api/v1/admin/applications?type=internship)
  const internshipRows = allRows.filter(r => !isHackathonRecord(r));
  assert.ok(internshipRows.every(r => !isHackathonRecord(r)), "No hackathon or 99rs records in internship view");
  assert.ok(internshipRows.some(r => r.applicationId === "APP-INTERN-001"), "Internship record present in internship filtered list");
  assert.ok(!internshipRows.some(r => r.applicationId === "APP-HACK-001"), "Hackathon record excluded from internship filtered list");
  console.log("✓ Internship filtering strictly excludes ₹99 Hackathon entries");

  // Test E: Simulate hackathon filtering logic (as in GET /api/v1/admin/applications?type=hackathon)
  const hackathonRows = allRows.filter(r => isHackathonRecord(r));
  assert.ok(hackathonRows.every(r => isHackathonRecord(r)), "Only hackathon/99rs records in hackathon view");
  assert.ok(hackathonRows.some(r => r.applicationId === "APP-HACK-001"), "Hackathon record present in hackathon filtered list");
  assert.ok(!hackathonRows.some(r => r.applicationId === "APP-INTERN-001"), "Internship record excluded from hackathon filtered list");
  console.log("✓ Hackathon filtering strictly isolates ₹99 Hackathon entries");

  // Test F: Team name and metadata integrity
  const fetchedHackathon = hackathonRows.find(r => r.applicationId === "APP-HACK-001");
  assert.strictEqual(fetchedHackathon.teamName, "Code Warriors", "Team Name preserved");
  assert.strictEqual(fetchedHackathon.amount, 99, "Amount is 99");
  assert.strictEqual(fetchedHackathon.razorpayPaymentId, "pay_hack_123", "Razorpay Payment ID preserved");
  console.log("✓ Team name and registration metadata preserved");

  console.log("\n=================================================");
  console.log("ALL APPLICATION SEPARATION TESTS PASSED!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
