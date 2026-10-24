import { MongoClient } from "mongodb";
import { readFileSync, existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI environment variable.");
  process.exit(1);
}

const rawData = [
  {
    kttId: "KTT01",
    applicationId: "APP-2026-R5HC2Y",
    name: "Nishant Patil",
    email: "patil.nish@yahoo.com",
    phone: "+919922785407",
    college: "AISSMS COE",
    course: "BE Comp Engg",
    year: "Final Year",
    teamName: "ta1rc",
    fee: 99,
    paymentId: "pay_TrLs4n7uKpl4GF",
    orderId: "order_TrLrmns4nVRMDU",
    date: "2026-10-23T12:35:43.393Z",
  },
  {
    kttId: "KTT02",
    applicationId: "APP-2026-WNFF5N",
    name: "Parth Dahiphale",
    email: "parthdahiphale6363@gmail.com",
    phone: "9011907215",
    college: "Vishwakarma institute of technology Pune",
    course: "CSE(AI)",
    year: "2nd year",
    teamName: "Hackmens",
    fee: 99,
    paymentId: "pay_TrM0Z48imoy37G",
    orderId: "order_TrM0KjjAwL6Bv1",
    date: "2026-10-23T12:43:48.621Z",
  },
  {
    kttId: "KTT03",
    applicationId: "APP-2026-V9QPYV",
    name: "Arnav Agarwal",
    email: "arnav.1251130495@vit.edu",
    phone: "+919307764831",
    college: "Vishwakarma Institute of technology",
    course: "IT",
    year: "2",
    teamName: "TFS",
    fee: 99,
    paymentId: "pay_TrQNRW1V8slDve",
    orderId: "order_TrQNL0nKRpe0wJ",
    date: "2026-10-23T17:00:21.694Z",
  },
  {
    kttId: "KTT04",
    applicationId: "APP-2026-HZ8WTF",
    name: "Tejas Bankar",
    email: "tejas.bankar24@vit.edu",
    phone: "+918468879330",
    college: "Vit Pune",
    course: "",
    year: "",
    teamName: "",
    fee: 99,
    paymentId: "pay_TrQl2VhotSwAmZ",
    orderId: "order_TrQkz0gylKR822",
    date: "2026-10-23T17:22:45.025Z",
  },
  {
    kttId: "KTT05",
    applicationId: "APP-2026-ZW985S",
    name: "Kaustubh Pawar",
    email: "kaustubh1006p@gmail.com",
    phone: "9373529729",
    college: "JSPM UNI",
    course: "B.Tech (AIML)",
    year: "4th",
    teamName: "HYDL",
    fee: 99,
    paymentId: "pay_Tr4PUatQqYm4Pk",
    orderId: "order_Tr4PH7sZpapO1Y",
    date: "2026-10-23T18:11:36.712Z",
  },
  {
    kttId: "KTT06",
    applicationId: "APP-2026-CVHGZ2",
    name: "Kp",
    email: "kp064901@gmail.com",
    phone: "9373529729",
    college: "jspm",
    course: "",
    year: "",
    teamName: "",
    fee: 99,
    paymentId: "pay_TrejlKdmcjDnlR",
    orderId: "order_TrejOloIWgFVej",
    date: "2026-10-24T03:24:28.722Z",
  },
  {
    kttId: "KTT07",
    applicationId: "APP-2026-RSSBY2",
    name: "Kanchan Patil",
    email: "kanchanpatil1006@gmail.com",
    phone: "9762512689",
    college: "jspm",
    course: "BTech",
    year: "3rd",
    teamName: "coders",
    fee: 99,
    paymentId: "pay_Tr4fNM0STqjsiS",
    orderId: "order_TrfFTFd065M3SF",
    date: "2026-10-24T06:14:45.350Z",
  },
  {
    kttId: "KTT08",
    applicationId: "APP-2026-M7K7DP",
    name: "Shahebaz khan pathan",
    email: "pathanshahebazkhan61@gmail.com",
    phone: "9923567370",
    college: "Mgm college of engineering Nanded",
    course: "B tech IT",
    year: "2nd year",
    teamName: "Wild card",
    fee: 99,
    paymentId: "",
    orderId: "order_TrfA4dX5pRp9nu",
    date: "2026-10-24T10:04:50.325Z",
  },
  {
    kttId: "KTT09",
    applicationId: "APP-2026-WXKPFA",
    name: "Shravani Deshmukh",
    email: "s25_shravani_deshmukh@mgmcen.ac.in",
    phone: "96375 64161",
    college: "Mgm college of engineering",
    course: "Btech",
    year: "2nd yr",
    teamName: "Wildcard",
    fee: 99,
    paymentId: "pay_Trk8eNhRuVd0nX",
    orderId: "order_Trk8R0wqWVTlf3",
    date: "2026-10-24T10:13:21.437Z",
  },
  {
    kttId: "KTT10",
    applicationId: "APP-2026-8HFM26",
    name: "Gaurav Mali",
    email: "gauravanilmali@gmail.com",
    phone: "9699080943",
    college: "JSPM University Wagholi Pune",
    course: "B.Tech CSE",
    year: "",
    teamName: "Akatsuki",
    fee: 99,
    paymentId: "pay_TrlEYK39wYTnta",
    orderId: "order_TrlDLhVkSKZVPv",
    date: "2026-10-24T13:20:29.049Z",
  },
  {
    kttId: "KTT11",
    applicationId: "APP-2026-AKADBR",
    name: "Shrideep shaurya",
    email: "shrideep.shaurya@gmail.com",
    phone: "",
    college: "Vishwakarma institute of technology Pune",
    course: "Btech Aiml",
    year: "2nd year",
    teamName: "Sobremessa",
    fee: 99,
    paymentId: "pay_TrlGCvz7kZ325f",
    orderId: "order_TrlG8XdvrOnDAt",
    date: "2026-10-24T13:26:06.740Z",
  },
  {
    kttId: "KTT12",
    applicationId: "APP-2026-BME2NA",
    name: "Shaikh sarfaraz Shaikh Saleem",
    email: "s25_shaikh_sarfaraz@mgmcen.ac.in",
    phone: "8767849313",
    college: "MGM COE NANDED",
    course: "BTech IT",
    year: "2nd year",
    teamName: "Wild card",
    fee: 99,
    paymentId: "pay_TrlMUt46n6AvbS",
    orderId: "order_TrlLhrZnaA8Aix",
    date: "2026-10-24T13:31:23.122Z",
  },
];

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("kicktotech");

  console.log("Connected to MongoDB.");

  for (const item of rawData) {
    const normEmail = item.email.trim().toLowerCase();
    const phone = item.phone.includes("#") ? "" : item.phone.trim();

    // 1. Upsert Application Record
    const appDoc = {
      id: item.applicationId,
      applicationId: item.applicationId,
      kttId: item.kttId,
      name: item.name.trim(),
      email: normEmail,
      phone,
      college: item.college || undefined,
      course: item.course || undefined,
      year: item.year || undefined,
      teamName: item.teamName || undefined,
      schoolName: item.teamName || item.college || undefined,
      domain: "hack2skill",
      amount: item.fee || 99,
      status: "PAYMENT_VERIFIED",
      razorpayOrderId: item.orderId || undefined,
      razorpayPaymentId: item.paymentId || undefined,
      paymentMethod: item.paymentId ? "Razorpay" : "UPI / Verified",
      dedupeKey: `${normEmail}:hack2skill`,
      verifiedBy: "Razorpay / Admin",
      verifiedAt: item.date,
      createdAt: item.date,
      updatedAt: item.date,
    };

    await db.collection("applications").updateOne(
      { applicationId: item.applicationId },
      { $set: appDoc },
      { upsert: true }
    );

    // 2. Upsert User Record if not exists
    const existingUser = await db.collection("users").findOne({ email: normEmail });
    if (!existingUser) {
      const userDoc = {
        id: item.applicationId,
        type: "student",
        role: "student",
        name: item.name.trim(),
        email: normEmail,
        phone,
        college: item.college || undefined,
        status: "active",
        passwordSalt: "",
        passwordHash: "",
        createdAt: item.date,
        updatedAt: item.date,
      };
      await db.collection("users").insertOne(userDoc);
    }

    console.log(`✓ Processed ${item.kttId} (${item.applicationId}): ${item.name}`);
  }

  const appCount = await db.collection("applications").countDocuments();
  const userCount = await db.collection("users").countDocuments();

  console.log(`\nDone! Total Applications: ${appCount}, Total Users: ${userCount}`);
  await client.close();
}

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
