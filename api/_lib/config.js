/* ============================================================
   Contractor Dashboard — Airtable schema config
   All table/field names live here so renames never touch logic.
   ============================================================ */
module.exports = {
  // Hub base ("LeadIntel CRM") — base ID comes from AIRTABLE_HUB_BASE_ID env var
  CUSTOMERS_TABLE: 'Customers',
  CUSTOMER_ID_FIELD: 'Customer ID',
  CUSTOMER_BASE_ID_FIELD: 'Base ID',

  AUTHORIZED_TABLE: 'AuthorizedContractors',
  AUTHORIZED_EMAIL_FIELD: 'Email',
  AUTHORIZED_CUSTOMER_ID_FIELD: 'Customer ID',

  MAGIC_LINKS_TABLE: 'MagicLinks',
  MAGIC_TOKEN_HASH_FIELD: 'Token Hash',
  MAGIC_EMAIL_FIELD: 'Email',
  MAGIC_EXPIRES_FIELD: 'Expires At',
  MAGIC_USED_FIELD: 'Used',

  // Per-contractor bases
  LEADS_TABLE: 'Leads',
  LEAD_FIELDS: {
    name: 'Lead Name',
    phone: 'Phone',
    email: 'Email',
    details: 'Details',
    score: 'AI Score',
    priority: 'Priority',
    estimatedValue: 'Estimated Value',
    recommendedAction: 'Recommended Action',
    status: 'Status'
  },

  MAGIC_LINK_TTL_MS: 15 * 60 * 1000,        // 15 minutes
  SESSION_TTL_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  MAX_ACTIVE_LINKS_PER_EMAIL: 3
};
