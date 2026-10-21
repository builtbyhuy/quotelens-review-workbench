'use strict';

// Synthetic, fixed inputs and hand-annotated contract outcomes. These are not
// supplier quotes or customer results. All names below are fictional.
// The evaluator expands these rows to normal schema-v2 workspaces.
module.exports = {
  version: 1,
  date: '2026-10-21',
  defaults: {
    currency: 'EUR', reviewDate: '2026-10-21',
    item: { unit: 'pieces', maxLeadDays: null },
    offer: { minPacks: 1, stockPacks: 100, leadDays: 2, validUntil: '2026-12-31', deliveryFee: '0.00' }
  },
  cases: [
    {
      id: 'whole-packs-countercase', intent: 'The lowest nominal unit price loses after whole-pack rounding and line fees.',
      items: [{ id: 'screw', label: 'Enclosure screws', quantity: 51 }],
      offers: [
        { id: 'bulk', itemId: 'screw', supplier: 'Harbor Fasteners', packSize: 100, packPrice: '9.00', deliveryFee: '1.00', expect: { packs: 1, units: 100, total: '10.00', eligible: true } },
        { id: 'small', itemId: 'screw', supplier: 'Finch Workshop', packSize: 10, packPrice: '1.30', deliveryFee: '0.20', expect: { packs: 6, units: 60, total: '8.00', eligible: true } }
      ],
      selections: { screw: 'small' }, expect: { subtotal: '8.00', complete: true, cheapest: { screw: 'small' } },
      naiveUnitPrice: { itemId: 'screw', chosen: 'bulk', wholePurchase: '10.00', correctChoice: 'small', correctWholePurchase: '8.00' }
    },
    {
      id: 'minimum-order', intent: 'Minimum packs can exceed the quantity-based pack count.', currency: 'GBP',
      items: [{ id: 'roll', label: 'Cable identification rolls', quantity: 7 }],
      offers: [
        { id: 'moq', itemId: 'roll', supplier: 'Maple Labels', packSize: 4, packPrice: '2.35', minPacks: 5, deliveryFee: '0.40', expect: { packs: 5, units: 20, total: '12.15', eligible: true } },
        { id: 'flex', itemId: 'roll', supplier: 'Larch Labels', packSize: 2, packPrice: '1.25', deliveryFee: '0.25', expect: { packs: 4, units: 8, total: '5.25', eligible: true } }
      ],
      selections: { roll: 'flex' }, expect: { subtotal: '5.25', complete: true, cheapest: { roll: 'flex' } }
    },
    {
      id: 'delivery-reverses-ranking', intent: 'A lower goods price need not have the lowest line-inclusive total.', currency: 'USD',
      items: [{ id: 'bracket', label: 'Sensor brackets', quantity: 24 }],
      offers: [
        { id: 'low-goods', itemId: 'bracket', supplier: 'Cove Metal', packSize: 6, packPrice: '3.00', deliveryFee: '9.00', expect: { packs: 4, units: 24, total: '21.00', eligible: true } },
        { id: 'no-fee', itemId: 'bracket', supplier: 'Marsh Metal', packSize: 8, packPrice: '4.40', expect: { packs: 3, units: 24, total: '13.20', eligible: true } }
      ],
      selections: { bracket: 'no-fee' }, expect: { subtotal: '13.20', complete: true, cheapest: { bracket: 'no-fee' } }
    },
    {
      id: 'unknown-is-not-zero', intent: 'Unprovided commercial facts warn without inventing facts; unconstrained lead time may remain unknown.',
      items: [{ id: 'tray', label: 'Component trays', quantity: 13 }],
      offers: [{ id: 'unverified', itemId: 'tray', supplier: 'Fern Storage', packSize: 5, packPrice: '0.85', deliveryFee: '1.05', stockPacks: null, leadDays: null, validUntil: '', expect: { packs: 3, units: 15, total: '3.60', eligible: true, warnings: ['stock-unknown', 'lead-unknown', 'validity-unknown'] } }],
      selections: { tray: 'unverified' }, expect: { subtotal: '3.60', complete: true, cheapest: { tray: 'unverified' } }
    },
    {
      id: 'unknown-deadline', intent: 'Unknown lead time cannot establish compliance with a maximum lead time.',
      items: [{ id: 'tray', label: 'Deadline-bound trays', quantity: 13, maxLeadDays: 3 }],
      offers: [{ id: 'unknown-lead', itemId: 'tray', supplier: 'Fir Storage', packSize: 5, packPrice: '0.85', deliveryFee: '1.05', leadDays: null, expect: { packs: 3, units: 15, total: '3.60', eligible: false, blocked: ['lead-required'], warnings: ['lead-unknown'] } }],
      selections: { tray: 'unknown-lead' }, expect: { subtotal: '0.00', complete: false, cheapest: { tray: null } }
    },
    {
      id: 'inclusive-calendar-and-lead', intent: 'A valid leap-day expiry is inclusive; one day expired and one day too slow both block.', reviewDate: '2028-02-29',
      items: [{ id: 'cap', label: 'Instrument caps', quantity: 12, maxLeadDays: 0 }],
      offers: [
        { id: 'boundary', itemId: 'cap', supplier: 'Alder Instruments', packSize: 6, packPrice: '7.05', stockPacks: 2, leadDays: 0, validUntil: '2028-02-29', expect: { packs: 2, units: 12, total: '14.10', eligible: true } },
        { id: 'expired', itemId: 'cap', supplier: 'Ash Instruments', packSize: 6, packPrice: '7.05', leadDays: 0, validUntil: '2028-02-28', expect: { packs: 2, units: 12, total: '14.10', eligible: false, blocked: ['expired'] } },
        { id: 'too-slow', itemId: 'cap', supplier: 'Elm Instruments', packSize: 6, packPrice: '7.05', leadDays: 1, validUntil: '2028-03-01', expect: { packs: 2, units: 12, total: '14.10', eligible: false, blocked: ['lead-exceeded'] } }
      ],
      selections: { cap: 'boundary' }, expect: { subtotal: '14.10', complete: true, cheapest: { cap: 'boundary' } }
    },
    {
      id: 'stock-counts-packs', intent: 'Stock counts available packs: three is insufficient when four are needed, zero is explicit unavailability.', currency: 'VND',
      items: [{ id: 'tube', label: 'Protective tubing', quantity: 31 }],
      offers: [
        { id: 'short', itemId: 'tube', supplier: 'Pine Tubing', packSize: 10, packPrice: '2100.00', deliveryFee: '900.00', stockPacks: 3, expect: { packs: 4, units: 40, total: '9300.00', eligible: false, blocked: ['stock-insufficient'] } },
        { id: 'none', itemId: 'tube', supplier: 'Spruce Tubing', packSize: 10, packPrice: '2100.00', deliveryFee: '900.00', stockPacks: 0, expect: { packs: 4, units: 40, total: '9300.00', eligible: false, blocked: ['stock-insufficient'] } },
        { id: 'enough', itemId: 'tube', supplier: 'Birch Tubing', packSize: 10, packPrice: '2100.00', deliveryFee: '900.00', stockPacks: 4, expect: { packs: 4, units: 40, total: '9300.00', eligible: true } }
      ],
      selections: { tube: 'enough' }, expect: { subtotal: '9300.00', complete: true, cheapest: { tube: 'enough' } }
    },
    {
      id: 'invalid-terms', intent: 'Malformed money, pack counts, dates and fees stay blocked instead of being coerced.',
      items: [{ id: 'clip', label: 'Retaining clips', quantity: 8 }],
      offers: [
        { id: 'precision', itemId: 'clip', supplier: 'Yew Clips', packSize: 4, packPrice: '4.001', expect: { packs: 2, units: 8, total: null, eligible: false, blocked: ['invalid-price'] } },
        { id: 'zero-pack', itemId: 'clip', supplier: 'Rowan Clips', packSize: 0, packPrice: '4.00', expect: { packs: null, units: null, total: null, eligible: false, blocked: ['invalid-pack'] } },
        { id: 'bad-date', itemId: 'clip', supplier: 'Willow Clips', packSize: 4, packPrice: '4.00', validUntil: '2026-02-30', expect: { packs: 2, units: 8, total: '8.00', eligible: false, blocked: ['invalid-validity'] } },
        { id: 'negative-fee', itemId: 'clip', supplier: 'Cedar Clips', packSize: 4, packPrice: '4.00', deliveryFee: '-0.01', expect: { packs: 2, units: 8, total: null, eligible: false, blocked: ['invalid-delivery'] } }
      ],
      selections: {}, expect: { subtotal: '0.00', complete: false, cheapest: { clip: null } }
    },
    {
      id: 'exact-duplicates', intent: 'Exact duplicate supplier/quote/item identities block both rows, even with different row IDs.',
      items: [{ id: 'pin', label: 'Alignment pins', quantity: 9 }],
      offers: [
        { id: 'copy-a', itemId: 'pin', supplier: 'Hazel Precision', quoteId: 'HP-42', packSize: 3, packPrice: '2.00', expect: { packs: 3, units: 9, total: '6.00', eligible: false, blocked: ['duplicate-exact'] } },
        { id: 'copy-b', itemId: 'pin', supplier: 'Hazel Precision', quoteId: 'HP-42', packSize: 3, packPrice: '2.00', expect: { packs: 3, units: 9, total: '6.00', eligible: false, blocked: ['duplicate-exact'] } },
        { id: 'distinct', itemId: 'pin', supplier: 'Aspen Precision', packSize: 3, packPrice: '2.10', expect: { packs: 3, units: 9, total: '6.30', eligible: true } }
      ],
      selections: { pin: 'distinct' }, expect: { subtotal: '6.30', complete: true, cheapest: { pin: 'distinct' } }
    },
    {
      id: 'conflicting-duplicates', intent: 'A conflicting duplicate cannot be resolved by silently taking its cheaper version.',
      items: [{ id: 'pin', label: 'Guide pins', quantity: 9 }],
      offers: [
        { id: 'conflict-a', itemId: 'pin', supplier: 'Holly Precision', quoteId: 'HP-51', packSize: 3, packPrice: '2.00', expect: { packs: 3, units: 9, total: '6.00', eligible: false, blocked: ['duplicate-conflicting'] } },
        { id: 'conflict-b', itemId: 'pin', supplier: 'Holly Precision', quoteId: 'HP-51', packSize: 3, packPrice: '2.01', expect: { packs: 3, units: 9, total: '6.03', eligible: false, blocked: ['duplicate-conflicting'] } },
        { id: 'resolved', itemId: 'pin', supplier: 'Hawthorn Precision', packSize: 3, packPrice: '2.10', expect: { packs: 3, units: 9, total: '6.30', eligible: true } }
      ],
      selections: { pin: 'resolved' }, expect: { subtotal: '6.30', complete: true, cheapest: { pin: 'resolved' } }
    },
    {
      id: 'partial-selection', intent: 'An unselected item leaves a subtotal rather than a completed approval.',
      items: [{ id: 'pump', label: 'Dosing pump clips', quantity: 17 }, { id: 'filter', label: 'Filter supports', quantity: 8 }],
      offers: [
        { id: 'pumps', itemId: 'pump', supplier: 'Juniper Components', packSize: 6, packPrice: '3.11', deliveryFee: '0.09', expect: { packs: 3, units: 18, total: '9.42', eligible: true } },
        { id: 'filters', itemId: 'filter', supplier: 'Laurel Components', packSize: 5, packPrice: '1.35', deliveryFee: '0.20', expect: { packs: 2, units: 10, total: '2.90', eligible: true } }
      ],
      selections: { pump: 'pumps' }, expect: { subtotal: '9.42', complete: false, cheapest: { pump: 'pumps', filter: 'filters' } }
    },
    {
      id: 'blocked-selection-excluded', intent: 'A selected blocked line is explained but never added to the eligible subtotal.',
      items: [{ id: 'pump', label: 'Pump mounts', quantity: 17 }, { id: 'filter', label: 'Filter mounts', quantity: 8 }],
      offers: [
        { id: 'mounts', itemId: 'pump', supplier: 'Acacia Components', packSize: 6, packPrice: '3.11', deliveryFee: '0.09', expect: { packs: 3, units: 18, total: '9.42', eligible: true } },
        { id: 'no-stock', itemId: 'filter', supplier: 'Magnolia Components', packSize: 5, packPrice: '1.35', deliveryFee: '0.20', stockPacks: 0, expect: { packs: 2, units: 10, total: '2.90', eligible: false, blocked: ['stock-insufficient'] } }
      ],
      selections: { pump: 'mounts', filter: 'no-stock' }, expect: { subtotal: '9.42', complete: false, cheapest: { pump: 'mounts', filter: null } }
    },
    {
      id: 'no-implicit-fx', intent: 'A numerically low foreign-currency offer cannot enter a GBP total.', currency: 'GBP',
      items: [{ id: 'seal', label: 'Weather seals', quantity: 7 }],
      offers: [
        { id: 'foreign', itemId: 'seal', supplier: 'Beech Seals', packSize: 4, packPrice: '2.70', currency: 'USD', expect: { packs: 2, units: 8, total: '5.40', eligible: false, blocked: ['currency'] } },
        { id: 'domestic', itemId: 'seal', supplier: 'Chestnut Seals', packSize: 4, packPrice: '3.10', expect: { packs: 2, units: 8, total: '6.20', eligible: true } }
      ],
      selections: { seal: 'domestic' }, expect: { subtotal: '6.20', complete: true, cheapest: { seal: 'domestic' } }
    },
    {
      id: 'large-exact-decimals', intent: 'Rational reference and production minor-unit arithmetic agree beyond safe numeric cents.', currency: 'USD',
      items: [{ id: 'calibration', label: 'Synthetic high-value calibration units', quantity: 7 }, { id: 'washer', label: 'Calibration washers', quantity: 3 }],
      offers: [
        { id: 'large', itemId: 'calibration', supplier: 'Redwood Metrology', packSize: 2, packPrice: '888888888888888.88', deliveryFee: '0.07', expect: { packs: 4, units: 8, total: '3555555555555555.59', eligible: true } },
        { id: 'tiny', itemId: 'washer', supplier: 'Oak Metrology', packSize: 1, packPrice: '0.10', expect: { packs: 3, units: 3, total: '0.30', eligible: true } }
      ],
      selections: { calibration: 'large', washer: 'tiny' }, expect: { subtotal: '3555555555555555.89', complete: true, cheapest: { calibration: 'large', washer: 'tiny' } }
    },
    {
      id: 'same-total-new-review', intent: 'Changed quantity needs a new review even when the whole-pack total does not change; reverting values does not revive the older revision.',
      items: [{ id: 'pad', label: 'Insulating pads', quantity: 23 }],
      offers: [{ id: 'pads', itemId: 'pad', supplier: 'Poplar Insulation', packSize: 10, packPrice: '5.75', deliveryFee: '1.25', expect: { packs: 3, units: 30, total: '18.50', eligible: true } }],
      selections: { pad: 'pads' }, expect: { subtotal: '18.50', complete: true, cheapest: { pad: 'pads' } },
      revisionSequence: [{ revision: 1, quantity: 23, subtotal: '18.50', currentApproval: true }, { revision: 1, quantity: 24, subtotal: '18.50', currentApproval: false }, { revision: 2, quantity: 24, subtotal: '18.50', currentApproval: false }, { revision: 3, quantity: 23, subtotal: '18.50', currentApproval: false }]
    }
  ]
};
