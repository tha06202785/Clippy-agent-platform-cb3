export type CrmOption = {
  id: string;
  name: string;
  category: "Sales CRM" | "Property management" | "General CRM" | "Other";
  description: string;
  initials: string;
};

export const CRM_OPTIONS: CrmOption[] = [
  {
    id: "rex",
    name: "Rex",
    category: "Sales CRM",
    description: "Contacts, listings, activities and buyer requirements",
    initials: "RX",
  },
  {
    id: "agentbox",
    name: "Agentbox",
    category: "Sales CRM",
    description: "Sales database, listings and enquiry management",
    initials: "AB",
  },
  {
    id: "vaultre",
    name: "VaultRE",
    category: "Sales CRM",
    description: "Listings, contacts and property campaigns",
    initials: "VR",
  },
  {
    id: "boxdice",
    name: "MRI Box+Dice",
    category: "Sales CRM",
    description: "Contacts, listings, enquiries and campaign activity",
    initials: "BD",
  },
  {
    id: "lockedon",
    name: "LockedOn",
    category: "Sales CRM",
    description: "Real-estate CRM and agency workflow",
    initials: "LO",
  },
  {
    id: "reapit",
    name: "Reapit",
    category: "Sales CRM",
    description: "Agency CRM, contacts and property records",
    initials: "RP",
  },
  {
    id: "propertyme",
    name: "PropertyMe",
    category: "Property management",
    description: "Rental properties, owners, tenants and inspections",
    initials: "PM",
  },
  {
    id: "propertytree",
    name: "MRI Property Tree",
    category: "Property management",
    description: "Property-management portfolio and communications",
    initials: "PT",
  },
  {
    id: "console",
    name: "Console Cloud",
    category: "Property management",
    description: "Property management, trust and tenant workflows",
    initials: "CC",
  },
  {
    id: "inspectrealestate",
    name: "Inspect Real Estate",
    category: "Property management",
    description: "Rental enquiries, inspections and applications",
    initials: "IRE",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "General CRM",
    description: "Contacts, pipelines, communications and automation",
    initials: "HS",
  },
  {
    id: "other",
    name: "Another CRM",
    category: "Other",
    description: "Tell us what your agency currently uses",
    initials: "+",
  },
  {
    id: "none",
    name: "No CRM yet",
    category: "Other",
    description: "Start with Clippy and connect a CRM later",
    initials: "—",
  },
];

export const CRM_IDS = new Set(CRM_OPTIONS.map((crm) => crm.id));

export function crmName(crmId: string) {
  return CRM_OPTIONS.find((crm) => crm.id === crmId)?.name ?? "Selected CRM";
}
