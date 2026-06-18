import { uid } from "./model";

// A fresh, empty plan to start from.
export function emptyPlan() {
  const year = new Date().getFullYear();
  return {
    version: 1,
    context: {
      businessName: "",
      planningYear: year,
      dateUpdated: new Date().toISOString().slice(0, 10),
      qualityOfLife: "",
      profitPct: 0.5, // the Savory default: set aside up to 50% as profit
    },
    issues: [], // logjams, adverse factors, weak links, control plans
    enterprises: [
      { id: uid("ent"), name: "Enterprise 1", items: [] },
    ],
    // General Income & Expenses — costs that span enterprises or are too
    // small to break out, plus logjam/adverse-factor spending.
    general: { items: [] },
  };
}

// A fabricated worked example, so users can see a complete plan before
// building their own. All figures are illustrative — not real operating data.
export function examplePlan() {
  const I = (type, item, amount, assumptions, mode = "even", month = 0) => ({
    id: uid("item"),
    type,
    item,
    assumptions,
    amount,
    mode,
    month,
  });

  return {
    version: 1,
    context: {
      businessName: "Example Ranch & Education Hub",
      planningYear: 2025,
      dateUpdated: "2024-10-01",
      qualityOfLife:
        "A profitable, regenerative ranch and education hub that supports the family and the land.",
      profitPct: 0.5,
    },
    issues: [
      {
        id: uid("iss"),
        type: "Adverse Factor",
        enterprise: "All",
        title: "Dry-Season Forage Shortfall",
        issue: "Reduced forage in summer pastures during dry spells.",
        rootCause: "Drought-stressed perennials and thin ground cover.",
        nextStep:
          "Adjust the grazing rotation and trial cover species on two pastures.",
        costOfNothing: "$12k/year in purchased hay",
        costOfResolving: "$2k for seed and a monitoring trial",
      },
      {
        id: uid("iss"),
        type: "Weak Link",
        enterprise: "Yearlings",
        title: "Limited Working Capital",
        issue: "Not fully stocking yearlings, leaving margin on the table.",
        rootCause: "Not enough working capital to buy in at scale.",
        nextStep:
          "Build a simple investor offer to unlock more of this enterprise.",
        costOfNothing: "Up to $60k of unrealized margin",
        costOfResolving: "$10k for legal work and packaging",
      },
      {
        id: uid("iss"),
        type: "Weak Link",
        enterprise: "Online Courses",
        title: "No Online Payments",
        issue: "Cannot accept course payments online.",
        rootCause: "No e-commerce checkout in place.",
        nextStep: "Add a checkout linked to the business bank account.",
        costOfNothing: "Lost online enrollments",
        costOfResolving: "$40/month for hosting with payments",
      },
    ],
    enterprises: [
      {
        id: uid("ent"),
        name: "Yearlings",
        items: [
          I("Income", "Yearling Sales", 500000, "250 head at $2k each", "single", 8),
          I("Wealth Generating Expense", "Yearling Purchase", 375000, "250 head at $1.5k each", "single", 4),
          I("Wealth Generating Expense", "Weak Link - Financing Package", 10000, "Legal and packaging", "single", 0),
          I("Maintenance Expense", "Labor for Cattle Management", 24000, "$2k/month", "even"),
          I("Maintenance Expense", "Vet / Med Bill", 3750, "$15/head", "single", 4),
          I("Maintenance Expense", "Salt and Mineral", 2500, "$10/head", "single", 4),
          I("Maintenance Expense", "Freight and Trucking", 5000, "$20/head", "single", 4),
          I("Maintenance Expense", "Fuel", 3000, "$250/month", "even"),
          I("Maintenance Expense", "Ranch Supplies", 6000, "$500/month", "even"),
        ],
      },
      {
        id: uid("ent"),
        name: "Grazing Leasing",
        items: [
          I("Income", "Leasing Income", 30000, "150 head at avg $1.10/day", "even"),
          I("Maintenance Expense", "Labor for Cattle Management", 18000, "$1.5k/month", "even"),
          I("Maintenance Expense", "Vet / Med Bill", 2250, "$15/head", "even"),
          I("Maintenance Expense", "Fuel", 2000, "$167/month", "even"),
          I("Maintenance Expense", "Ranch Supplies", 3000, "$250/month", "even"),
        ],
      },
      {
        id: uid("ent"),
        name: "Online Courses",
        items: [
          I("Income", "Online Course Sales", 9000, "", "even"),
          I("Income", "Affiliate Commissions", 1200, "", "even"),
          I("Wealth Generating Expense", "Website Content Development", 1500, "", "even"),
          I("Wealth Generating Expense", "Social Media Boosting and Ads", 0, "No ad buys this year", "even"),
        ],
      },
      {
        id: uid("ent"),
        name: "In-Person Courses",
        items: [
          I("Income", "Tuition for Grazing Course", 13200, "", "even"),
          I("Income", "Tuition for Ranching Course", 15000, "", "even"),
          I("Income", "Grant Funding", 0, "", "even"),
          I("Wealth Generating Expense", "Class Staff and Instructors", 16000, "", "even"),
          I("Maintenance Expense", "Class Materials", 1200, "", "even"),
          I("Maintenance Expense", "Venue Fees", 1000, "", "even"),
          I("Maintenance Expense", "Insurance", 1000, "", "even"),
          I("Maintenance Expense", "Travel", 1800, "", "even"),
          I("Maintenance Expense", "Lodging", 240, "", "even"),
          I("Maintenance Expense", "Food", 1500, "", "even"),
          I("Maintenance Expense", "Credit Card Merchant Fees", 800, "", "even"),
        ],
      },
    ],
    general: {
      items: [
        I("Inescapable Expense", "Land Expense", 60000, "Taxes included; all land costs divided over enterprise usage", "even"),
        I("Maintenance Expense", "Utilities", 18000, "$1,500/month", "even"),
        I("Maintenance Expense", "Ranch Truck", 18000, "$1,500/month", "even"),
        I("Wealth Generating Expense", "Forage Trial", 2000, "Seed and monitoring", "even"),
        I("Wealth Generating Expense", "Professional Membership", 2000, "$2,000/year", "single", 0),
        I("Wealth Generating Expense", "Website Hosting", 720, "$60/month incl. merchant account", "even"),
        I("Wealth Generating Expense", "Business Website", 240, "$20/month", "even"),
        I("Wealth Generating Expense", "Video and Web Content", 2400, "$200/month", "even"),
      ],
    },
  };
}
