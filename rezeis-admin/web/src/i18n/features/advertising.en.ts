/**
 * Lazy-loaded i18n feature bundle (en): advertising
 *
 * Contains namespaces: advertisingPage.
 */

export const en = {
  advertisingPage: {
    title: 'Advertising cabinet',
    subtitle:
      'External paid promotion: opens, registrations, first purchases, revenue, spend and ROI per placement.',
    loadError: 'Failed to load the advertising cabinet',
    overview: {
      campaigns: 'Campaigns',
      activePlacements: 'Active placements',
      opens: 'Opens',
      registrations: 'Registrations',
      conversions: 'Conversions',
      revenue: 'Revenue',
    },
    actions: {
      newCampaign: 'New campaign',
      newPlacement: 'Add placement',
      archive: 'Archive',
      copy: 'Copy link',
      copied: 'Link copied',
      create: 'Create',
      cancel: 'Cancel',
      refresh: 'Refresh',
    },
    campaign: {
      nameLabel: 'Campaign name',
      namePlaceholder: 'October launch',
      notesLabel: 'Notes',
      empty: 'No campaigns yet. Create one to generate tracking links.',
      placementsEmpty: 'No placements in this campaign yet.',
    },
    placement: {
      platformLabel: 'Platform',
      channelLabel: 'Channel / blogger',
      ownerLabel: 'Owner',
      windowLabel: 'Attribution window (days)',
      bonusLabel: 'Signup bonus',
      partnerIdLabel: 'Partner id',
      trialDurationLabel: 'Trial duration (days)',
      tariffPlanIdLabel: 'Tariff plan id',
      tariffDurationLabel: 'Subscription duration (days)',
      created: 'Placement created',
      archived: 'Placement archived',
    },
    owner: {
      COMPANY: 'Company',
      PARTNER: 'Partner',
    },
    bonus: {
      NONE: 'None (tracking only)',
      TRIAL: 'Trial subscription',
      TARIFF: 'Full subscription',
    },
    platforms: {
      TELEGRAM: 'Telegram',
      TELEGRAM_ADS: 'Telegram Ads',
      YOUTUBE: 'YouTube',
      TIKTOK: 'TikTok',
      INSTAGRAM: 'Instagram',
      VK: 'VK',
      WEBSITE: 'Website',
      INFLUENCER: 'Influencer',
      OTHER: 'Other',
    },
    status: {
      DRAFT: 'Draft',
      ACTIVE: 'Active',
      PAUSED: 'Paused',
      ARCHIVED: 'Archived',
    },
    metrics: {
      title: 'Metrics',
      opens: 'Opens',
      registrations: 'Registrations',
      conversions: 'Conversions',
      revenue: 'Revenue',
      cost: 'Cost',
      cac: 'CAC',
      roas: 'ROAS',
      roi: 'ROI',
      openToReg: 'Open → registration',
      regToPurchase: 'Registration → purchase',
      avgFirstPayment: 'Avg first payment',
      arpu: 'ARPU',
      daysToPurchase: 'Days to purchase',
      na: 'n/a',
    },
    requests: {
      title: 'Partner requests',
      empty: 'No partner advertising requests.',
      approve: 'Approve',
      reject: 'Reject',
      proposedWindow: 'Proposed window: {{days}} days',
      platforms: 'Platforms',
      approved: 'Request approved',
      rejected: 'Request rejected',
    },
    help: {
      infoAria: 'More info',
      attributionWindow:
        'How long after the first touch a first purchase still counts for this placement. Example: a partner proposes 90 days, you approve 30 — a purchase on day 40 is organic and not attributed.',
      ownerType:
        'COMPANY: you fund the ad — cost = the budget you enter. PARTNER: the partner spends their own money and earns the usual commission — your cost = that paid commission, not a budget.',
      signupBonus:
        'Optional reward granted once to a new user who registers through this campaign (trial or full subscription). Granting it suppresses the standard trial offer to avoid double-granting.',
      trackingCode:
        'The unique code embedded in the deep link as ad_<code>. Paste the link into your ad on any platform; the platform is known because each placement has its own link.',
      cac: 'Customer Acquisition Cost = cost / conversions. Example: 3000 spent, 15 first purchases → CAC 200.',
      roas: 'Return On Ad Spend = revenue / cost. Above 1 means the placement earned more than it cost.',
      roi: 'Return On Investment = (revenue − cost) / cost. Example: revenue 9000, cost 3000 → ROI 2.0 (200%).',
      cost: 'COMPANY placements: the budget you entered. PARTNER placements: the commission actually paid to the partner for users this placement acquired.',
    },
  },
} as const
